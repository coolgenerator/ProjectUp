package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func UserRoutes(router *gin.Engine) {
	// Public/optional auth endpoints - can be accessed with or without authentication
	publicGroup := router.Group("/api")
	publicGroup.Use(middleware.OptionalAuthenticate())
	{
		publicGroup.GET("profile", controllers.GetProfile()) // View profile by SID (respects privacy settings)
	}

	// Protected endpoints - require authentication
	userGroup := router.Group("/api")
	userGroup.Use(middleware.Authenticate())
	{
		// Multi-user chat: Get basic user info (public data)
		userGroup.GET("users/:id", controllers.GetUserBasicInfo())

		userGroup.POST("create-profile", controllers.UpdateProfile())
		userGroup.GET("get-profile", controllers.GetProfileById())
		userGroup.PUT("profile", controllers.UpdateProfile())
		userGroup.GET("my-profile", controllers.MyProfile())
		userGroup.GET("get-user-profile", controllers.GetUserProfile())
		userGroup.PUT("/update-skills", controllers.UpdateSkills())
		userGroup.PUT("/update-interests", controllers.UpdateInterests())
		userGroup.POST("/profile/skills", controllers.UpdateSkills())
		userGroup.POST("/profile/interests", controllers.UpdateInterests())

		// Preferences endpoints (using preferencesController.go)
		userGroup.GET("/preferences", controllers.GetAllPreferences())
		userGroup.PUT("/preferences", controllers.UpdateAllPreferences())
		userGroup.PUT("/preferences/display-name", controllers.UpdateDisplayNamePreferenceController())
		userGroup.PUT("/preferences/language", controllers.UpdateLanguagePreferenceController())
		userGroup.PUT("/preferences/notifications", controllers.UpdateNotificationPreferencesController())
		userGroup.PUT("/preferences/privacy", controllers.UpdatePrivacyPreferencesController())
		userGroup.PUT("/preferences/theme", controllers.UpdateThemePreferenceController())

		// AI Workflow Session endpoints (using aiWorkflowSessionController.go)
		userGroup.GET("/ai-workflow-session", controllers.GetWorkflowSession())
		userGroup.POST("/ai-workflow-session", controllers.SaveWorkflowSession())
		userGroup.DELETE("/ai-workflow-session", controllers.ClearWorkflowSession())

		// AI API Key endpoints (using aiApiKeyController.go)
		userGroup.GET("/ai-api-keys", controllers.GetAllAIAPIKeys())
		userGroup.GET("/ai-api-keys/active/:provider", controllers.GetActiveAPIKeyForProvider()) // Get active key for provider
		userGroup.GET("/ai-api-keys/:id", controllers.GetAIAPIKey())
		userGroup.POST("/ai-api-keys", controllers.CreateAIAPIKey())
		userGroup.PUT("/ai-api-keys/:id", controllers.UpdateAIAPIKey())
		userGroup.DELETE("/ai-api-keys/:id", controllers.DeleteAIAPIKey())
		userGroup.POST("/ai-api-keys/:id/test", controllers.TestAIAPIKey()) // Test API key

		// AI Service Preference endpoints (using aiServicePreferenceController.go)
		aiServicePrefController := controllers.NewAIServicePreferenceController()
		userGroup.GET("/ai-services", aiServicePrefController.GetAvailableServices())                      // List all available AI services
		userGroup.GET("/ai-service-preferences", aiServicePrefController.GetAllServicePreferences())       // Get all user's preferences
		userGroup.GET("/ai-service-preferences/available-providers", aiServicePrefController.GetAvailableProviders()) // Get available providers based on user tier
		userGroup.GET("/ai-service-preferences/:service_type", aiServicePrefController.GetServicePreference()) // Get preference for specific service
		userGroup.PUT("/ai-service-preferences", aiServicePrefController.UpdateServicePreferences())       // Update multiple preferences
		userGroup.PUT("/ai-service-preferences/:service_type", aiServicePrefController.UpdateSingleServicePreference()) // Update single preference
		userGroup.DELETE("/ai-service-preferences/:service_type", aiServicePrefController.DeleteServicePreference()) // Delete preference (revert to default)

		userGroup.POST("/update-username", controllers.UpdateUsername())
		userGroup.GET("/user/search", controllers.SearchUsersByUsername())
	}
}
