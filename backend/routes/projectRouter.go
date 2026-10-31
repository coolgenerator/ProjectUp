package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

func SetupProjectRoutes(router *gin.Engine) {
	// Create main project group with authentication
	projectGroup := router.Group("/api/projects")
	projectGroup.Use(middleware.Authenticate())
	{
		// Project creation and listing
		projectGroup.POST("/create", controllers.CreateProject())
		projectGroup.POST("/save-all", controllers.SaveAllHandler())
		projectGroup.POST("/onboarding/create", controllers.CreateProjectWithOnboarding()) // New onboarding flow
		projectGroup.GET("", controllers.GetProjects())
		projectGroup.GET("/my-projects", controllers.GetProjectsByID())

		// Project posts
		projectGroup.GET("/posts", controllers.GetProjectPosts())
		projectGroup.POST("/posts", controllers.CreateProjectPost())
		projectGroup.GET("/posts/:postId", controllers.GetProjectsByID())
		projectGroup.GET("/post/:shortId", controllers.GetProjectPost())

		// Post sharing
		projectGroup.POST("/posts/:postId/share", controllers.CreatePostShare())
		projectGroup.GET("/posts/share/:token", controllers.GetSharedPost())
		projectGroup.DELETE("/posts/share/:shareId", controllers.DeletePostShare())

		// User profile
		projectGroup.GET("/user-profile", controllers.GetUserProfile())

		// Project applications
		projectGroup.GET("/:sid/details", controllers.GetProjectDetailsHandler())
		projectGroup.GET("/application-questions", controllers.GetApplicationQuestionsHandler())
		projectGroup.GET("/:sid/application-questions", controllers.GetApplicationQuestionsWithAnswersHandler())
		projectGroup.POST("/applications", controllers.SubmitApplicationHandler)
		projectGroup.PUT("/applications/:application_id", controllers.UpdateApplicationStatusHandler)
		projectGroup.GET("/applications/status", controllers.CheckApplicationStatusHandler)

		// Project resources - moved to resourceRouter.go

		// Project workspaces - moved to workspaceRouter.go (hierarchical workspace system)
		// Old flat workspace routes removed to prevent conflicts

		// Project plans
		projectGroup.GET("/:sid/plans", controllers.GetProjectPlansHandler())
		projectGroup.GET("/:sid/plans/:planId", controllers.GetPlanHandler())
		projectGroup.POST("/:sid/plans", controllers.CreatePlanHandler())
		projectGroup.PUT("/:sid/plans/:planId", controllers.UpdatePlanHandler())
		projectGroup.DELETE("/:sid/plans/:planId", controllers.DeletePlanHandler())

		// AI-powered roadmap generation and storage
		projectGroup.POST("/:sid/roadmap/store-ai-generated", controllers.StoreAIGeneratedRoadmapHandler())
		projectGroup.GET("/:sid/roadmap", controllers.GetProjectRoadmapHandler())
		projectGroup.DELETE("/:sid/roadmap", controllers.DeleteProjectRoadmapHandler())

		// Project groups
		projectGroup.GET("/:sid/groups", controllers.GetProjectGroups())
		projectGroup.POST("/:sid/groups", controllers.CreateGroup())
		projectGroup.PUT("/:sid/groups/:groupId", controllers.UpdateGroup())
		projectGroup.DELETE("/:sid/groups/:groupId", controllers.DeleteGroup())
		projectGroup.PUT("/:sid/members/:userId/group", controllers.UpdateMemberGroup())
		projectGroup.DELETE("/:sid/members/:userId", controllers.RemoveProjectMember())

		// Project membership
		projectGroup.POST("/:sid/invite", controllers.InviteMemberHandler)
		projectGroup.GET("/invitations/:token", controllers.GetInvitationDetailsHandler)
		projectGroup.POST("/invitations/accept", controllers.AcceptInvitationHandler)
		projectGroup.POST("/invitations/decline", controllers.DeclineInvitationHandler)

		// Project sharing
		projectGroup.POST("/:sid/share", controllers.CreateShareHandler)
		projectGroup.GET("/:sid/shares", controllers.ListProjectSharesHandler)
		projectGroup.DELETE("/:sid/shares/:shareId", controllers.DeleteShareHandler)
		projectGroup.GET("/shared", controllers.GetSharedProjectHandler)

		// Project ownership
		projectGroup.POST("/:sid/transfer", controllers.TransferOwnershipHandler)

		// Project publication
		projectGroup.POST("/:sid/toggle-publish", controllers.ToggleProjectPublishHandler())

		// Setup checklist (onboarding)
		projectGroup.GET("/:sid/setup-checklist", controllers.GetProjectSetupChecklist())
		projectGroup.PUT("/:sid/setup-checklist/:taskId", controllers.UpdateSetupChecklistTask())

		// Placeholder invites
		projectGroup.POST("/:sid/invites/placeholder", controllers.GeneratePlaceholderInvite())
		projectGroup.GET("/:sid/placeholders", controllers.GetProjectPlaceholders())

		// DEPRECATED: AI Project Board Generation (now handled by Python AI service)
		// These endpoints return HTTP 410 Gone - kept for backward compatibility
		// TODO: Remove these routes once confirmed no legacy clients are using them
		projectGroup.GET("/templates", controllers.GetProjectTemplates())
		projectGroup.GET("/templates/questions", controllers.GetGuidedQuestions())
		projectGroup.POST("/board/generate", controllers.GenerateProjectBoard())

		// AI-Guided Project Onboarding (Unified for all project types)
		// Proxy endpoints to AI service - supports 10 project types:
		// course, hackathon, capstone, research, competition, internship, opensource, portfolio, coursenote, examprep
		projectGroup.GET("/onboarding/types", controllers.GetSupportedProjectTypes())
		projectGroup.POST("/onboarding/:type/topics", controllers.SuggestOnboardingTopics())
		projectGroup.POST("/onboarding/:type/elaborate", controllers.ElaborateOnboardingTopic())
		projectGroup.POST("/onboarding/:type/details", controllers.GenerateOnboardingDetails())

		// NOTE: Legacy AI endpoints have been removed (suggest-topics, elaborate-topic, generate-details)
		// All AI functionality is now proxied to Python AI service via the unified onboarding endpoints above
	}

	// Public invite routes (no auth required for viewing invite info)
	inviteGroup := router.Group("/api/invites")
	{
		inviteGroup.GET("/:token/info", controllers.GetInviteInfo())
		inviteGroup.POST("/:token/accept", middleware.Authenticate(), controllers.AcceptInvite())
	}
}
