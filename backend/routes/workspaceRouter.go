package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupWorkspaceRoutes sets up all workspace-related routes
func SetupWorkspaceRoutes(router *gin.Engine) {
	// Workspace routes under project context
	workspaceGroup := router.Group("/api/projects/:sid/workspaces")
	workspaceGroup.Use(middleware.Authenticate())
	{
		// Workspace Management
		workspaceGroup.GET("", controllers.GetUserWorkspaces())                                     // Get user's accessible workspaces
		workspaceGroup.GET("/:workspaceId", controllers.GetWorkspaceDetails())                      // Get workspace details
		workspaceGroup.POST("/:workspaceId/children", controllers.CreateChildWorkspace())           // Create child workspace
		workspaceGroup.PUT("/:workspaceId", controllers.UpdateHierarchicalWorkspace())              // Update workspace
		workspaceGroup.DELETE("/:workspaceId", controllers.DeleteHierarchicalWorkspace())           // Delete workspace

		// Workspace Members
		workspaceGroup.GET("/:workspaceId/members", controllers.GetWorkspaceMembers())              // List members
		workspaceGroup.POST("/:workspaceId/members", controllers.AddWorkspaceMember())              // Add member
		workspaceGroup.PUT("/:workspaceId/members/:userId", controllers.UpdateWorkspaceMemberRole()) // Update member role
		workspaceGroup.DELETE("/:workspaceId/members/:userId", controllers.RemoveWorkspaceMember())   // Remove member

		// Workspace Content
		workspaceGroup.GET("/:workspaceId/milestones", controllers.GetWorkspaceMilestones())        // Get workspace milestones
		workspaceGroup.GET("/:workspaceId/idea-trees", controllers.GetWorkspaceIdeaTrees())         // Get workspace idea trees
		workspaceGroup.GET("/:workspaceId/resources", controllers.GetWorkspaceResources())          // Get workspace resources
	}

	// Dashboard route
	dashboardGroup := router.Group("/api/projects/:sid/dashboard")
	dashboardGroup.Use(middleware.Authenticate())
	{
		dashboardGroup.GET("", controllers.GetProjectDashboard()) // Get dashboard with workspace summaries
	}
}
