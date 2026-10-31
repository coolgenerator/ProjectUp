package config

import (
	"os"
	"github.com/stripe/stripe-go/v76"
)

type StripeConfig struct {
	SecretKey      string
	PublishableKey string
	WebhookSecret  string
}

func InitStripe() *StripeConfig {
	config := &StripeConfig{
		SecretKey:      os.Getenv("STRIPE_SECRET_KEY"),
		PublishableKey: os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		WebhookSecret:  os.Getenv("STRIPE_WEBHOOK_SECRET"),
	}

	// Set the Stripe API key
	stripe.Key = config.SecretKey

	return config
}

// Price IDs for different subscription tiers
var (
	BasicPlanPriceID     = os.Getenv("STRIPE_BASIC_PRICE_ID")
	ProPlanPriceID       = os.Getenv("STRIPE_PRO_PRICE_ID")
	EnterprisePlanPriceID = os.Getenv("STRIPE_ENTERPRISE_PRICE_ID")
)