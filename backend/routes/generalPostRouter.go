package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterGeneralPostRoutes sets up the API routes for posts
func RegisterGeneralPostRoutes(router *gin.Engine) {
	postGroup := router.Group("/api/home")
	postGroup.Use(middleware.Authenticate())

	// Post CRUD
	postGroup.POST("/create-post", controllers.CreatePost())
	postGroup.GET("/posts", controllers.GetPosts())
	postGroup.GET("/user-posts", controllers.GetUserPosts())
	postGroup.PUT("/posts/:id", controllers.UpdatePost())
	postGroup.DELETE("/posts/:id", controllers.DeletePost())

	// Update by shortId (needed for frontend compatibility)
	contentGroup := router.Group("/api/content")
	contentGroup.Use(middleware.Authenticate())
	contentGroup.GET("/post/:shortId", controllers.GetPostByShortID())
	contentGroup.PUT("/post/:shortId", controllers.UpdatePostByShortID())

	// Note: All interaction endpoints are now handled by interactionRouter.go
}
