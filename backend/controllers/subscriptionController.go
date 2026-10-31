package controllers

import (
	"io"
	"net/http"
	"projectup/database"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
)

type SubscriptionController struct {
	service *services.SubscriptionService
}

func NewSubscriptionController() *SubscriptionController {
	return &SubscriptionController{
		service: services.NewSubscriptionService(database.DB),
	}
}

// GetPricingPlans returns all available pricing plans
func (c *SubscriptionController) GetPricingPlans(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Pricing plans retrieved successfully",
		"data":    models.PricingPlans,
	})
}

// GetUserTier returns just the user's subscription tier (for AI service use)
func (c *SubscriptionController) GetUserTier(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}

	tier, err := c.service.GetUserTier(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get subscription tier",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"tier":    tier,
		"is_free": tier == models.TierFree,
	})
}

// GetSubscription returns the current user's subscription
func (c *SubscriptionController) GetSubscription(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	subscription, err := c.service.GetSubscription(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to get subscription",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Subscription retrieved successfully",
		"data":    subscription,
	})
}

// CreateCheckoutSession creates a Stripe checkout session
func (c *SubscriptionController) CreateCheckoutSession(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	var request struct {
		PlanTier   string `json:"plan_tier" binding:"required"`    // "basic", "professional", "team", "enterprise"
		IsAnnual   bool   `json:"is_annual"`                        // true for annual, false for monthly
		CouponCode string `json:"coupon_code,omitempty"`           // Optional coupon/promo code
		SuccessURL string `json:"success_url" binding:"required"`
		CancelURL  string `json:"cancel_url" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"status":  false,
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	var session *stripe.CheckoutSession
	var err error
	
	if request.CouponCode != "" {
		session, err = c.service.CreateCheckoutSessionWithCoupon(userID, request.PlanTier, request.IsAnnual, request.CouponCode, request.SuccessURL, request.CancelURL)
	} else {
		session, err = c.service.CreateCheckoutSessionByPlan(userID, request.PlanTier, request.IsAnnual, request.SuccessURL, request.CancelURL)
	}
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to create checkout session",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Checkout session created successfully",
		"data": gin.H{
			"checkout_url": session.URL,
			"session_id":   session.ID,
		},
	})
}

// CancelSubscription cancels the current user's subscription
func (c *SubscriptionController) CancelSubscription(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	if err := c.service.CancelSubscription(userID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to cancel subscription",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Subscription will be canceled at the end of the billing period",
	})
}

// UpdateSubscription updates the user's subscription plan
func (c *SubscriptionController) UpdateSubscription(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	var request struct {
		PriceID string `json:"price_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"status":  false,
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	if err := c.service.UpdateSubscription(userID, request.PriceID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to update subscription",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Subscription updated successfully",
	})
}

// GetPaymentMethods returns the user's payment methods
func (c *SubscriptionController) GetPaymentMethods(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	methods, err := c.service.GetPaymentMethods(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to get payment methods",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Payment methods retrieved successfully",
		"data":    methods,
	})
}

// AddPaymentMethod adds a new payment method
func (c *SubscriptionController) AddPaymentMethod(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	var request struct {
		PaymentMethodID string `json:"payment_method_id" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"status":  false,
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	if err := c.service.AddPaymentMethod(userID, request.PaymentMethodID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to add payment method",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Payment method added successfully",
	})
}

// GetPaymentHistory returns the user's payment history
func (c *SubscriptionController) GetPaymentHistory(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	if userID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	var payments []models.PaymentHistory
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&payments).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"status":  false,
			"error":   "Failed to get payment history",
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":  true,
		"message": "Payment history retrieved successfully",
		"data":    payments,
	})
}

// HandleStripeWebhook handles Stripe webhook events
func (c *SubscriptionController) HandleStripeWebhook(ctx *gin.Context) {
	payload, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	signature := ctx.GetHeader("Stripe-Signature")
	if signature == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Missing Stripe signature"})
		return
	}

	if err := c.service.ProcessWebhook(payload, signature); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"received": true})
}
