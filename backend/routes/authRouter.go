package routes

import (
	"projectup/config"
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(router *gin.Engine, cfg *config.Config) {
	authGroup := router.Group("/api")
	{
		// Public auth routes
		authGroup.POST("/signup", controllers.Signup())
		authGroup.POST("/login", controllers.Login())
		authGroup.POST("/logout", controllers.LogoutHandler())
		authGroup.POST("/send-verification-email", controllers.SendVerificationEmail())
		authGroup.GET("/verify", controllers.VerifyEmailHandler())
		authGroup.GET("/check-email-verified", controllers.IsEmailVerified())
		authGroup.POST("/send-reset-password", controllers.SendResetPasswordEmail())
		authGroup.POST("/update-password", controllers.UpdatePassword())
		authGroup.GET("/check-username", controllers.CheckUsernameHandler())
		authGroup.GET("/check-email", controllers.CheckEmailHandler())
		authGroup.POST("/refresh-token", controllers.RefreshTokenHandler())

		// Protected routes that require authentication
		protectedRoutes := authGroup.Group("")
		protectedRoutes.Use(middleware.Authenticate())
		{
			protectedRoutes.POST("/update-school-email", controllers.UpdateSchoolEmail())
		}

		// OAuth routes
		oauthController := controllers.NewOAuthController(cfg)

		authGroup.GET("/auth/google", oauthController.GoogleLogin)
		authGroup.GET("/auth/google/callback", oauthController.GoogleCallback)

		authGroup.GET("/auth/facebook", oauthController.FacebookLogin)
		authGroup.GET("/auth/facebook/callback", oauthController.FacebookCallback)

		authGroup.GET("/auth/discord", oauthController.DiscordLogin)
		authGroup.GET("/auth/discord/callback", oauthController.DiscordCallback)
	}
}
