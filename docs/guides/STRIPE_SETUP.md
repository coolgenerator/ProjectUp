# Stripe Setup Guide for ProjectUp

## Product and Price Configuration

### 1. Setting Up Products in Stripe Dashboard

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create a product for each tier:
   - Basic Plan
   - Professional Plan  
   - Team Plan
   - Enterprise Plan

3. For each product, add two prices:
   - **Monthly Price**: Set recurring interval to "monthly"
   - **Annual Price**: Set recurring interval to "yearly" with discounted rate

### 2. Configure Environment Variables

Add your Stripe Product IDs to `.env`:

```env
# Replace with your actual Product IDs from Stripe Dashboard
STRIPE_PRODUCT_BASIC=prod_SyqwbuZMmRphlZ
STRIPE_PRODUCT_PRO=prod_xxxxx_professional
STRIPE_PRODUCT_TEAM=prod_xxxxx_team
STRIPE_PRODUCT_ENTERPRISE=prod_xxxxx_enterprise
```

### 3. How the System Works

- Each product has multiple price IDs (monthly and annual)
- The backend automatically fetches the correct price based on billing period
- If product IDs are not configured, it falls back to dynamic pricing

## Coupon and Discount Setup

### 1. Creating Coupons in Stripe

1. Go to [Stripe Dashboard > Coupons](https://dashboard.stripe.com/coupons)
2. Click "New coupon"
3. Configure your coupon:
   - **ID**: A unique code (e.g., `LAUNCH20`, `EARLYBIRD`)
   - **Type**: Percentage or Fixed amount
   - **Duration**: Once, Forever, or Repeating
   - **Restrictions**: Optional limits on redemptions

### 2. Common Coupon Examples

#### Launch Discount (20% off for 3 months)
- Name: Launch Special
- ID: `LAUNCH20`
- Percentage: 20%
- Duration: Repeating (3 months)

#### Early Bird (50% off first month)
- Name: Early Bird Special
- ID: `EARLYBIRD50`
- Percentage: 50%
- Duration: Once

#### Partner Discount (10% off forever)
- Name: Partner Program
- ID: `PARTNER10`
- Percentage: 10%
- Duration: Forever

### 3. Using Coupons in the Application

#### Frontend
Users can enter promo codes on the pricing page. The code will be applied at Stripe checkout.

#### Backend API
The checkout endpoint accepts an optional `coupon_code` parameter:

```json
POST /api/v1/subscription/checkout
{
  "plan_tier": "basic",
  "is_annual": false,
  "coupon_code": "LAUNCH20",
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/pricing"
}
```

### 4. Promotion Codes vs Coupons

- **Coupons**: Backend codes that you apply programmatically
- **Promotion Codes**: Customer-facing codes that users can enter

To create a Promotion Code:
1. Create a Coupon first
2. Go to the coupon details
3. Click "Add promotion code"
4. Set a customer-facing code (e.g., `SAVE20`)

### 5. Testing in Test Mode

When using Stripe test mode:
- Use test card numbers like `4242 4242 4242 4242`
- Coupons created in test mode only work with test transactions
- Switch to live mode for production coupons

## Webhook Configuration

For production, configure webhooks to handle subscription events:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourapi.com/api/v1/subscription/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. Copy the webhook secret and add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

## Troubleshooting

### Price Not Found Error
- Ensure product IDs are correctly set in `.env`
- Verify products have both monthly and annual prices
- Check that prices are active in Stripe Dashboard

### Coupon Not Working
- Verify coupon ID matches exactly (case-sensitive)
- Check coupon hasn't expired or reached redemption limit
- Ensure coupon is created in the same mode (test/live) as your API keys

### Dynamic Pricing Fallback
If product IDs are not configured, the system falls back to dynamic pricing:
- Basic: $19.99/mo or $15.99/mo (annual)
- Professional: $39.99/mo or $31.99/mo (annual)
- Team: $69.99/mo or $55.99/mo (annual)
- Enterprise: $99.99/mo or $79.99/mo (annual)