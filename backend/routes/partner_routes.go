package routes

import (
	"projectup/handlers"

	"github.com/gin-gonic/gin"
)

// RegisterPartnerRoutes registers routes for partner posts
func RegisterPartnerRoutes(router *gin.Engine, handler *handlers.PartnerHandler, authMiddleware gin.HandlerFunc) {
	partnerGroup := router.Group("/api/partner-posts")

	// Public routes - no auth required
	partnerGroup.GET("", handler.GetPartnerPosts)
	partnerGroup.GET("/:id", handler.GetPartnerPostByID)

	// Protected routes - auth required
	protected := partnerGroup.Group("/")
	protected.Use(authMiddleware)

	protected.POST("", handler.CreatePartnerPost)
	protected.DELETE("/:id", handler.DeletePartnerPost)
	protected.PUT("/:id", handler.UpdatePartnerPost)
}
