package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"projectup/config"
	"projectup/models"
	"time"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/price"
	"github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"
	"gorm.io/gorm"
)

type SubscriptionService struct {
	db           *gorm.DB
	stripeConfig *config.StripeConfig
}

func NewSubscriptionService(db *gorm.DB) *SubscriptionService {
	return &SubscriptionService{
		db:           db,
		stripeConfig: config.InitStripe(),
	}
}

// CreateCustomer creates a new Stripe customer for a user
func (s *SubscriptionService) CreateCustomer(user *models.User) (*stripe.Customer, error) {
	params := &stripe.CustomerParams{}
	
	// Email is a pointer, so we need to check if it's not nil
	if user.Email != nil {
		params.Email = stripe.String(*user.Email)
	}
	
	// Get user's profile for name
	var profile models.Profile
	if err := s.db.Where("user_id = ?", user.ID).First(&profile).Error; err == nil {
		var name string
		if profile.FirstName != nil && profile.LastName != nil {
			name = *profile.FirstName + " " + *profile.LastName
		} else if profile.PreferredName != nil {
			name = *profile.PreferredName
		}
		if name != "" {
			params.Name = stripe.String(name)
		}
	}
	
	params.AddMetadata("user_id", fmt.Sprintf("%d", user.ID))

	c, err := customer.New(params)
	if err != nil {
		return nil, err
	}

	// Update user with Stripe customer ID
	var subscription models.Subscription
	result := s.db.Where("user_id = ?", user.ID).First(&subscription)
	if result.Error != nil {
		// Create new subscription record
		subscription = models.Subscription{
			UserID:           user.ID,
			StripeCustomerID: c.ID,
			Tier:             models.TierFree,
			Status:           "active",
		}
		s.db.Create(&subscription)
	} else {
		// Update existing record
		subscription.StripeCustomerID = c.ID
		s.db.Save(&subscription)
	}

	return c, nil
}

// CreateCheckoutSessionByPlan creates a Stripe checkout session based on plan tier
func (s *SubscriptionService) CreateCheckoutSessionByPlan(userID uint, planTier string, isAnnual bool, successURL, cancelURL string) (*stripe.CheckoutSession, error) {
	return s.CreateCheckoutSessionWithCoupon(userID, planTier, isAnnual, "", successURL, cancelURL)
}

// CreateCheckoutSessionWithCoupon creates a Stripe checkout session with optional coupon
func (s *SubscriptionService) CreateCheckoutSessionWithCoupon(userID uint, planTier string, isAnnual bool, couponCode string, successURL, cancelURL string) (*stripe.CheckoutSession, error) {
	// Get the appropriate price ID based on product and billing period
	priceID, err := s.getPriceIDForPlan(planTier, isAnnual)
	if err != nil {
		// Fallback to dynamic pricing if price ID not found
		return s.createCheckoutWithDynamicPricing(userID, planTier, isAnnual, couponCode, successURL, cancelURL)
	}
	
	// Get user details
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		// Create subscription record if it doesn't exist
		sub = models.Subscription{
			UserID: userID,
			Tier:   models.TierFree,
			Status: "pending",
		}
		s.db.Create(&sub)
	}

	// Create or get Stripe customer
	var customerID string
	if sub.StripeCustomerID == "" {
		c, err := s.CreateCustomer(&user)
		if err != nil {
			return nil, err
		}
		customerID = c.ID
		
		// Save customer ID
		sub.StripeCustomerID = customerID
		s.db.Save(&sub)
	} else {
		customerID = sub.StripeCustomerID
	}

	// Create checkout session with price ID
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		AllowPromotionCodes: stripe.Bool(true), // Allow users to enter promo codes at checkout
	}
	
	// If a specific coupon code is provided, apply it
	if couponCode != "" {
		params.Discounts = []*stripe.CheckoutSessionDiscountParams{
			{
				Coupon: stripe.String(couponCode),
			},
		}
	}
	
	params.AddMetadata("user_id", fmt.Sprintf("%d", userID))
	params.AddMetadata("plan_tier", planTier)
	params.AddMetadata("is_annual", fmt.Sprintf("%v", isAnnual))

	return session.New(params)
}

// getPriceIDForPlan gets the Stripe price ID for a given plan and billing period
func (s *SubscriptionService) getPriceIDForPlan(planTier string, isAnnual bool) (string, error) {
	// Get product ID from environment
	productID := ""
	switch planTier {
	case "basic":
		productID = os.Getenv("STRIPE_PRODUCT_BASIC")
	case "professional", "pro":
		productID = os.Getenv("STRIPE_PRODUCT_PRO")
	case "team":
		productID = os.Getenv("STRIPE_PRODUCT_TEAM")
	case "enterprise":
		productID = os.Getenv("STRIPE_PRODUCT_ENTERPRISE")
	default:
		return "", fmt.Errorf("invalid plan tier: %s", planTier)
	}
	
	if productID == "" {
		return "", fmt.Errorf("product ID not configured for tier: %s", planTier)
	}
	
	// List all prices for this product
	params := &stripe.PriceListParams{
		Product: stripe.String(productID),
		Active:  stripe.Bool(true),
	}
	
	i := price.List(params)
	var selectedPrice *stripe.Price
	
	for i.Next() {
		p := i.Price()
		if p.Recurring == nil {
			continue // Skip one-time prices
		}
		
		// Match based on billing interval
		if isAnnual && p.Recurring.Interval == "year" {
			selectedPrice = p
			break
		} else if !isAnnual && p.Recurring.Interval == "month" {
			selectedPrice = p
			break
		}
	}
	
	if selectedPrice == nil {
		return "", fmt.Errorf("no matching price found for product %s with billing period %v", productID, isAnnual)
	}
	
	return selectedPrice.ID, nil
}

// createCheckoutWithDynamicPricing fallback method with dynamic pricing
func (s *SubscriptionService) createCheckoutWithDynamicPricing(userID uint, planTier string, isAnnual bool, couponCode string, successURL, cancelURL string) (*stripe.CheckoutSession, error) {
	// Get plan details including pricing
	planName, amount := s.getPlanDetails(planTier, isAnnual)
	if planName == "" || amount == 0 {
		return nil, errors.New("invalid plan tier")
	}
	
	// Get user details
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		// Create subscription record if it doesn't exist
		sub = models.Subscription{
			UserID: userID,
			Tier:   models.TierFree,
			Status: "pending",
		}
		s.db.Create(&sub)
	}

	// Create or get Stripe customer
	var customerID string
	if sub.StripeCustomerID == "" {
		c, err := s.CreateCustomer(&user)
		if err != nil {
			return nil, err
		}
		customerID = c.ID
		
		// Save customer ID
		sub.StripeCustomerID = customerID
		s.db.Save(&sub)
	} else {
		customerID = sub.StripeCustomerID
	}

	// Create checkout session with dynamic pricing
	billingPeriod := "month"
	if isAnnual {
		billingPeriod = "year"
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(planName),
						Description: stripe.String(fmt.Sprintf("ProjectUp %s Subscription", planName)),
					},
					UnitAmount: stripe.Int64(amount), // Amount in cents
					Recurring: &stripe.CheckoutSessionLineItemPriceDataRecurringParams{
						Interval: stripe.String(billingPeriod),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		AllowPromotionCodes: stripe.Bool(true), // Allow users to enter promo codes at checkout
	}
	
	// If a specific coupon code is provided, apply it
	if couponCode != "" {
		params.Discounts = []*stripe.CheckoutSessionDiscountParams{
			{
				Coupon: stripe.String(couponCode),
			},
		}
	}
	
	params.AddMetadata("user_id", fmt.Sprintf("%d", userID))
	params.AddMetadata("plan_tier", planTier)
	params.AddMetadata("is_annual", fmt.Sprintf("%v", isAnnual))

	return session.New(params)
}

// getPlanDetails returns the plan name and amount in cents
func (s *SubscriptionService) getPlanDetails(planTier string, isAnnual bool) (string, int64) {
	// Pricing in cents (multiply dollar amount by 100)
	monthlyPrices := map[string]int64{
		"basic":        1999,  // $19.99
		"professional": 3999,  // $39.99
		"pro":          3999,  // $39.99 (alias for professional)
		"team":         6999,  // $69.99
		"enterprise":   9999,  // $99.99
	}
	
	price, exists := monthlyPrices[planTier]
	if !exists {
		return "", 0
	}
	
	// Apply annual discount (20% off = 80% of monthly price)
	if isAnnual {
		// Annual billing: customer pays for 12 months upfront at discounted rate
		price = int64(float64(price) * 0.8) * 12 // Discounted monthly price * 12 months
	}
	
	// Format plan name
	planNames := map[string]string{
		"basic":        "Basic Plan",
		"professional": "Professional Plan",
		"pro":          "Professional Plan",  // alias for professional
		"team":         "Team Plan",
		"enterprise":   "Enterprise Plan",
	}
	
	planName := planNames[planTier]
	if isAnnual {
		planName += " (Annual)"
	} else {
		planName += " (Monthly)"
	}
	
	return planName, price
}

// CreateCheckoutSession creates a Stripe checkout session for subscription
func (s *SubscriptionService) CreateCheckoutSession(userID uint, priceID string, successURL, cancelURL string) (*stripe.CheckoutSession, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		// Create subscription record if it doesn't exist
		sub = models.Subscription{
			UserID: userID,
			Tier:   models.TierFree,
			Status: "pending",
		}
		s.db.Create(&sub)
	}

	// Create or get Stripe customer
	var customerID string
	if sub.StripeCustomerID == "" {
		c, err := s.CreateCustomer(&user)
		if err != nil {
			return nil, err
		}
		customerID = c.ID
	} else {
		customerID = sub.StripeCustomerID
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
	}
	params.AddMetadata("user_id", fmt.Sprintf("%d", userID))

	return session.New(params)
}

// CancelSubscription cancels a user's subscription
func (s *SubscriptionService) CancelSubscription(userID uint) error {
	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		return err
	}

	if sub.StripeSubscriptionID == "" {
		return errors.New("no active subscription found")
	}

	// Cancel at period end
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	}

	updatedSub, err := subscription.Update(sub.StripeSubscriptionID, params)
	if err != nil {
		return err
	}

	// Update local record
	sub.CancelAtPeriodEnd = updatedSub.CancelAtPeriodEnd
	return s.db.Save(&sub).Error
}

// UpdateSubscription updates a user's subscription tier
func (s *SubscriptionService) UpdateSubscription(userID uint, newPriceID string) error {
	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		return err
	}

	if sub.StripeSubscriptionID == "" {
		return errors.New("no active subscription found")
	}

	// Get the subscription from Stripe
	stripeSub, err := subscription.Get(sub.StripeSubscriptionID, nil)
	if err != nil {
		return err
	}

	// Update the subscription with new price
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(stripeSub.Items.Data[0].ID),
				Price: stripe.String(newPriceID),
			},
		},
	}

	_, err = subscription.Update(sub.StripeSubscriptionID, params)
	return err
}

// GetSubscription retrieves a user's subscription details
func (s *SubscriptionService) GetSubscription(userID uint) (*models.Subscription, error) {
	var sub models.Subscription
	err := s.db.Where("user_id = ?", userID).First(&sub).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create a free tier subscription if none exists
			sub = models.Subscription{
				UserID: userID,
				Tier:   models.TierFree,
				Status: "active",
			}
			s.db.Create(&sub)
			return &sub, nil
		}
		return nil, err
	}
	return &sub, nil
}

// GetUserTier retrieves a user's subscription tier (creates free tier if none exists)
func (s *SubscriptionService) GetUserTier(userID uint) (models.SubscriptionTier, error) {
	sub, err := s.GetSubscription(userID)
	if err != nil {
		return models.TierFree, err
	}
	return sub.Tier, nil
}

// AddPaymentMethod adds a new payment method for a user
func (s *SubscriptionService) AddPaymentMethod(userID uint, paymentMethodID string) error {
	var sub models.Subscription
	if err := s.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		return err
	}

	if sub.StripeCustomerID == "" {
		return errors.New("no Stripe customer found")
	}

	// Attach payment method to customer
	params := &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(sub.StripeCustomerID),
	}

	pm, err := paymentmethod.Attach(paymentMethodID, params)
	if err != nil {
		return err
	}

	// Save payment method details
	paymentMethodRecord := models.PaymentMethod{
		UserID:          userID,
		StripePaymentID: pm.ID,
		Brand:           string(pm.Card.Brand),
		Last4:           pm.Card.Last4,
		ExpMonth:        int(pm.Card.ExpMonth),
		ExpYear:         int(pm.Card.ExpYear),
	}

	return s.db.Create(&paymentMethodRecord).Error
}

// GetPaymentMethods retrieves all payment methods for a user
func (s *SubscriptionService) GetPaymentMethods(userID uint) ([]models.PaymentMethod, error) {
	var methods []models.PaymentMethod
	err := s.db.Where("user_id = ?", userID).Find(&methods).Error
	return methods, err
}

// ProcessWebhook handles Stripe webhook events
func (s *SubscriptionService) ProcessWebhook(payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.stripeConfig.WebhookSecret)
	if err != nil {
		return err
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return err
		}
		return s.handleCheckoutSessionCompleted(&session)

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		return s.handleSubscriptionUpdated(&sub)

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		return s.handleSubscriptionDeleted(&sub)

	case "invoice.payment_succeeded":
		var invoice stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
			return err
		}
		return s.handleInvoicePaymentSucceeded(&invoice)
	}

	return nil
}

// Helper methods for webhook handling
func (s *SubscriptionService) handleCheckoutSessionCompleted(session *stripe.CheckoutSession) error {
	userID := session.Metadata["user_id"]
	if userID == "" {
		return errors.New("user_id not found in session metadata")
	}

	var sub models.Subscription
	if err := s.db.Where("stripe_customer_id = ?", session.Customer.ID).First(&sub).Error; err != nil {
		return err
	}

	// Update subscription details
	sub.StripeSubscriptionID = session.Subscription.ID
	sub.Status = "active"
	
	// Determine tier based on price
	// You'll need to map price IDs to tiers
	if session.AmountTotal > 0 {
		// Update tier based on the price paid
		// This is simplified - you should check the actual price ID
		if session.AmountTotal == 999 {
			sub.Tier = models.TierBasic
		} else if session.AmountTotal == 2999 {
			sub.Tier = models.TierPro
		} else if session.AmountTotal == 9999 {
			sub.Tier = models.TierEnterprise
		}
	}

	return s.db.Save(&sub).Error
}

func (s *SubscriptionService) handleSubscriptionUpdated(sub *stripe.Subscription) error {
	var localSub models.Subscription
	if err := s.db.Where("stripe_subscription_id = ?", sub.ID).First(&localSub).Error; err != nil {
		return err
	}

	localSub.Status = string(sub.Status)
	localSub.CancelAtPeriodEnd = sub.CancelAtPeriodEnd
	localSub.CurrentPeriodStart = time.Unix(sub.CurrentPeriodStart, 0)
	localSub.CurrentPeriodEnd = time.Unix(sub.CurrentPeriodEnd, 0)

	return s.db.Save(&localSub).Error
}

func (s *SubscriptionService) handleSubscriptionDeleted(sub *stripe.Subscription) error {
	var localSub models.Subscription
	if err := s.db.Where("stripe_subscription_id = ?", sub.ID).First(&localSub).Error; err != nil {
		return err
	}

	localSub.Status = "canceled"
	localSub.Tier = models.TierFree

	return s.db.Save(&localSub).Error
}

func (s *SubscriptionService) handleInvoicePaymentSucceeded(invoice *stripe.Invoice) error {
	// Record payment history
	var sub models.Subscription
	if err := s.db.Where("stripe_customer_id = ?", invoice.Customer.ID).First(&sub).Error; err != nil {
		return err
	}

	payment := models.PaymentHistory{
		UserID:              sub.UserID,
		SubscriptionID:      sub.ID,
		StripePaymentIntent: invoice.PaymentIntent.ID,
		Amount:              invoice.AmountPaid,
		Currency:            string(invoice.Currency),
		Status:              "succeeded",
		Description:         invoice.Description,
		InvoiceURL:          invoice.InvoicePDF,
	}

	return s.db.Create(&payment).Error
}