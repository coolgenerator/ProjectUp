package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func SetupLearningRoutes(router *gin.Engine) {
	learningGroup := router.Group("/api/learning")
	{
		// Public routes
		learningGroup.GET("/path/:topicId", controllers.GetLearningPath())
		learningGroup.GET("/public-courses", middleware.OptionalAuthenticate(), controllers.GetPublicCourses())
		learningGroup.POST("/course/:id/view", controllers.IncrementCourseView()) // Track views (no auth required)

		// Protected routes
		protected := learningGroup.Group("")
		protected.Use(middleware.Authenticate())
		{
			protected.POST("/generate-path", controllers.GenerateLearningPath())
			protected.POST("/generate-goals", controllers.GenerateLearningGoals())
			protected.POST("/save-course-request", controllers.SaveCourseRequest())
			protected.GET("/my-paths", controllers.GetUserLearningPaths())
			protected.POST("/tasks/:taskId/toggle", controllers.ToggleTaskCompletion())
			protected.PUT("/path/:pathId/progress", controllers.UpdateLearningProgress())
			protected.DELETE("/path/:topicId", controllers.DeleteLearningPath())
			protected.PATCH("/:topicId/visibility", controllers.UpdateLearningPathVisibility())
			protected.POST("/course/:id/copy", controllers.CopyCourseToMyCourses()) // Copy public course
			protected.POST("/course/:id/like", controllers.ToggleCourseLike())      // Toggle like on course
		}
	}
}
