from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class SubscriptionTier(str, Enum):
    """Subscription tier enumeration"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Subscription(BaseModel):
    """Subscription represents a user's subscription"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    stripe_customer_id: str = Field(..., max_length=255, description="Stripe customer ID")
    stripe_subscription_id: str = Field(..., max_length=255, description="Stripe subscription ID")
    tier: SubscriptionTier = Field(SubscriptionTier.FREE, description="Subscription tier")
    status: str = Field(..., max_length=50, description="Subscription status")
    current_period_start: datetime = Field(..., description="Current period start")
    current_period_end: datetime = Field(..., description="Current period end")
    cancel_at_period_end: bool = Field(False, description="Cancel at period end flag")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")

    class Config:
        from_attributes = True


class PaymentMethod(BaseModel):
    """PaymentMethod represents a user's payment method"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    stripe_payment_id: str = Field(..., max_length=255, description="Stripe payment method ID")
    brand: str = Field(..., max_length=50, description="Card brand")
    last4: str = Field(..., max_length=4, description="Last 4 digits")
    exp_month: int = Field(..., description="Expiration month")
    exp_year: int = Field(..., description="Expiration year")
    is_default: bool = Field(False, description="Default payment method flag")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")

    class Config:
        from_attributes = True


class PaymentHistory(BaseModel):
    """PaymentHistory represents a payment record"""
    id: Optional[int] = Field(None, description="Primary key")
    user_id: int = Field(..., description="User ID")
    subscription_id: int = Field(..., description="Subscription ID")
    stripe_payment_intent: str = Field(..., max_length=255, description="Stripe payment intent ID")
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(..., max_length=3, description="Currency code")
    status: str = Field(..., max_length=50, description="Payment status")
    description: str = Field(..., description="Payment description")
    invoice_url: str = Field(..., max_length=500, description="Invoice URL")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Deletion timestamp")

    class Config:
        from_attributes = True


class PricingPlan(BaseModel):
    """PricingPlan represents pricing plan configuration"""
    tier: SubscriptionTier = Field(..., description="Subscription tier")
    name: str = Field(..., description="Plan name")
    price: int = Field(..., description="Price in cents")
    currency: str = Field(..., description="Currency code")
    interval: str = Field(..., description="Billing interval (monthly, yearly)")
    features: List[str] = Field(..., description="List of features")
    stripe_price_id: str = Field(..., description="Stripe price ID")

    class Config:
        from_attributes = True


# Pricing plans configuration
PRICING_PLANS = [
    {
        "tier": SubscriptionTier.FREE,
        "name": "Free",
        "price": 0,
        "currency": "usd",
        "interval": "monthly",
        "features": [
            "Up to 3 projects",
            "Basic collaboration tools",
            "Community support",
            "5GB storage",
        ],
    },
    {
        "tier": SubscriptionTier.BASIC,
        "name": "Basic",
        "price": 999,
        "currency": "usd",
        "interval": "monthly",
        "features": [
            "Up to 10 projects",
            "Advanced collaboration tools",
            "Email support",
            "25GB storage",
            "Project analytics",
        ],
    },
    {
        "tier": SubscriptionTier.PRO,
        "name": "Professional",
        "price": 2999,
        "currency": "usd",
        "interval": "monthly",
        "features": [
            "Unlimited projects",
            "All collaboration features",
            "Priority support",
            "100GB storage",
            "Advanced analytics",
            "Custom integrations",
            "Team management",
        ],
    },
    {
        "tier": SubscriptionTier.ENTERPRISE,
        "name": "Enterprise",
        "price": 9999,
        "currency": "usd",
        "interval": "monthly",
        "features": [
            "Everything in Pro",
            "Unlimited storage",
            "Dedicated support",
            "Custom features",
            "SLA guarantee",
            "Advanced security",
            "API access",
            "White labeling",
        ],
    },
]
