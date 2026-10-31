package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// ProjectDashboardRoutes sets up project dashboard routes
func ProjectDashboardRoutes(router *gin.Engine) {
	// Project dashboard routes
	projectDashboard := router.Group("/api/project")
	projectDashboard.Use(middleware.Authenticate())
	{
		// Main project details endpoint
		projectDashboard.GET("/:sid", controllers.GetProjectDetails())

		// Project members endpoint
		projectDashboard.GET("/:sid/members", controllers.GetProjectMembers())

		// Member management endpoints
		projectDashboard.GET("/:sid/members/:userID/workspaces", controllers.GetMemberWorkspaces())
		projectDashboard.PUT("/:sid/members/:userID/workspace", controllers.UpdateProjectMemberWorkspace())
		projectDashboard.DELETE("/:sid/members/:userID/workspace/:groupID", controllers.RemoveProjectMemberFromWorkspace())

		// Resources endpoints
		projectDashboard.GET("/:sid/resources", controllers.GetResources)
		projectDashboard.POST("/:sid/resources", controllers.CreateResourceHandler)
		projectDashboard.PUT("/:sid/resources/:resourceId", controllers.UpdateResourceHandler)
		projectDashboard.DELETE("/:sid/resources/:resourceId", controllers.DeleteResourceHandler)

		// Workspaces endpoints
		projectDashboard.GET("/:sid/workspaces", controllers.GetWorkspaces)
		projectDashboard.POST("/:sid/workspaces", controllers.CreateWorkspaceHandler)
		projectDashboard.PUT("/:sid/workspaces/:workspaceId", controllers.UpdateWorkspaceHandler)
		projectDashboard.DELETE("/:sid/workspaces/:workspaceId", controllers.DeleteWorkspaceHandler)

		// Milestones endpoints
		projectDashboard.GET("/:sid/milestones", controllers.GetMilestones)
		projectDashboard.POST("/:sid/milestones", controllers.CreateMilestoneHandler)
		projectDashboard.PUT("/:sid/milestones/:milestoneId", controllers.UpdateMilestoneHandler)
		projectDashboard.DELETE("/:sid/milestones/:milestoneId", controllers.DeleteMilestoneHandler)
		projectDashboard.POST("/:sid/milestones/:milestoneId/convert-to-task", controllers.ConvertMilestoneToTask)

		// Project management actions
		projectDashboard.POST("/:sid/delete", controllers.DeleteProjectHandler)
		projectDashboard.POST("/:sid/archive", controllers.ArchiveProjectHandler)
		projectDashboard.POST("/:sid/complete", controllers.CompleteProjectHandler)
	}
}