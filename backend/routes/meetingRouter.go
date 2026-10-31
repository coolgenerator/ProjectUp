package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterMeetingRoutes registers all meeting-related routes
func RegisterMeetingRoutes(router *gin.Engine) {
	meetingRoutes := router.Group("/api/meetings")
	meetingRoutes.Use(middleware.Authenticate())
	{
		meetingRoutes.POST("", controllers.CreateMeeting)              // Create a meeting
		meetingRoutes.GET("/:id", controllers.GetMeeting)              // Get a specific meeting
		meetingRoutes.PUT("/:id", controllers.UpdateMeeting)           // Update a meeting
		meetingRoutes.DELETE("/:id", controllers.DeleteMeeting)        // Delete a meeting
		meetingRoutes.PUT("/:id/attendees/status", controllers.UpdateAttendeeStatus) // Update attendee status
		meetingRoutes.POST("/:id/availability", controllers.SaveMeetingAvailability) // Save availability for pending meeting
		meetingRoutes.GET("/:id/availability", controllers.GetMeetingAvailability)   // Get all availability for pending meeting
	}

	// Project-specific meeting routes
	projectMeetingRoutes := router.Group("/api/projects/:sid/meetings")
	projectMeetingRoutes.Use(middleware.Authenticate())
	{
		projectMeetingRoutes.GET("", controllers.GetProjectMeetings) // Get all meetings for a project
	}
}
