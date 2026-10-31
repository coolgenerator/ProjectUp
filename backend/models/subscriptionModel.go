package models

import (
	"time"
	"gorm.io/gorm"
)

type SubscriptionTier string

const (
	TierFree       SubscriptionTier = "free"
	TierBasic      SubscriptionTier = "basic"
	TierPro        SubscriptionTier = "pro"
	TierEnterprise SubscriptionTier = "enterprise"
)

type Subscription struct {
	ID                   uint             `gorm:"primaryKey" json:"id"`
	UserID               uint             `gorm:"not null" json:"user_id"`
	User                 User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	StripeCustomerID     string           `gorm:"type:varchar(255)" json:"stripe_customer_id"`
	StripeSubscriptionID string           `gorm:"type:varchar(255)" json:"stripe_subscription_id"`
	Tier                 SubscriptionTier `gorm:"type:varchar(50);default:'free'" json:"tier"`
	Status               string           `gorm:"type:varchar(50)" json:"status"`
	CurrentPeriodStart   time.Time        `json:"current_period_start"`
	CurrentPeriodEnd     time.Time        `json:"current_period_end"`
	CancelAtPeriodEnd    bool             `gorm:"default:false" json:"cancel_at_period_end"`
	CreatedAt            time.Time        `json:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at"`
	DeletedAt            gorm.DeletedAt   `gorm:"index" json:"deleted_at,omitempty"`
}

type PaymentMethod struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `gorm:"not null" json:"user_id"`
	User             User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	StripePaymentID  string         `gorm:"type:varchar(255)" json:"stripe_payment_id"`
	Brand            string         `gorm:"type:varchar(50)" json:"brand"`
	Last4            string         `gorm:"type:varchar(4)" json:"last4"`
	ExpMonth         int            `json:"exp_month"`
	ExpYear          int            `json:"exp_year"`
	IsDefault        bool           `gorm:"default:false" json:"is_default"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

type PaymentHistory struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	UserID              uint           `gorm:"not null" json:"user_id"`
	User                User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SubscriptionID      uint           `json:"subscription_id"`
	Subscription        Subscription   `gorm:"foreignKey:SubscriptionID" json:"subscription,omitempty"`
	StripePaymentIntent string         `gorm:"type:varchar(255)" json:"stripe_payment_intent"`
	Amount              int64          `json:"amount"` // Amount in cents
	Currency            string         `gorm:"type:varchar(3)" json:"currency"`
	Status              string         `gorm:"type:varchar(50)" json:"status"`
	Description         string         `gorm:"type:text" json:"description"`
	InvoiceURL          string         `gorm:"type:varchar(500)" json:"invoice_url"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// Pricing plans configuration
type PricingPlan struct {
	Tier        SubscriptionTier `json:"tier"`
	Name        string           `json:"name"`
	Price       int64            `json:"price"` // Price in cents
	Currency    string           `json:"currency"`
	Interval    string           `json:"interval"` // monthly, yearly
	Features    []string         `json:"features"`
	StripePriceID string         `json:"stripe_price_id"`
}

var PricingPlans = []PricingPlan{
	{
		Tier:     TierFree,
		Name:     "Free",
		Price:    0,
		Currency: "usd",
		Interval: "monthly",
		Features: []string{
			"Up to 3 projects",
			"Basic collaboration tools",
			"Community support",
			"5GB storage",
		},
	},
	{
		Tier:     TierBasic,
		Name:     "Basic",
		Price:    999, // $9.99
		Currency: "usd",
		Interval: "monthly",
		Features: []string{
			"Up to 10 projects",
			"Advanced collaboration tools",
			"Email support",
			"25GB storage",
			"Project analytics",
		},
	},
	{
		Tier:     TierPro,
		Name:     "Professional",
		Price:    2999, // $29.99
		Currency: "usd",
		Interval: "monthly",
		Features: []string{
			"Unlimited projects",
			"All collaboration features",
			"Priority support",
			"100GB storage",
			"Advanced analytics",
			"Custom integrations",
			"Team management",
		},
	},
	{
		Tier:     TierEnterprise,
		Name:     "Enterprise",
		Price:    9999, // $99.99
		Currency: "usd",
		Interval: "monthly",
		Features: []string{
			"Everything in Pro",
			"Unlimited storage",
			"Dedicated support",
			"Custom features",
			"SLA guarantee",
			"Advanced security",
			"API access",
			"White labeling",
		},
	},
}