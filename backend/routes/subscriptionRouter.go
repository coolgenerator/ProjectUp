package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func SetupSubscriptionRoutes(router *gin.Engine) {
	subscriptionController := controllers.NewSubscriptionController()

	// Public routes
	public := router.Group("/api/v1")
	{
		// Get pricing plans (public)
		public.GET("/pricing", subscriptionController.GetPricingPlans)
		
		// Stripe webhook (no auth required)
		public.POST("/stripe/webhook", subscriptionController.HandleStripeWebhook)
	}

	// Protected routes
	protected := router.Group("/api/v1")
	protected.Use(middleware.Authenticate())
	{
		// Subscription management
		protected.GET("/subscription", subscriptionController.GetSubscription)
		protected.GET("/subscription/tier", subscriptionController.GetUserTier) // For AI service to check user tier
		protected.POST("/subscription/checkout", subscriptionController.CreateCheckoutSession)
		protected.POST("/subscription/cancel", subscriptionController.CancelSubscription)
		protected.PUT("/subscription/update", subscriptionController.UpdateSubscription)

		// Payment methods
		protected.GET("/payment-methods", subscriptionController.GetPaymentMethods)
		protected.POST("/payment-methods", subscriptionController.AddPaymentMethod)

		// Payment history
		protected.GET("/payments/history", subscriptionController.GetPaymentHistory)
	}
}