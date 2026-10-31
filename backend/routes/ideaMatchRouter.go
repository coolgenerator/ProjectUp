package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupIdeaMatchRoutes registers the idea workbench and matching endpoints.
func SetupIdeaMatchRoutes(router *gin.Engine) {
	ideaGroup := router.Group("/api/ideas")
	ideaGroup.Use(middleware.Authenticate())
	{
		ideaGroup.POST("/questions", controllers.GetIdeaQuestions())
		ideaGroup.POST("/shape", controllers.ShapeIdea())
		ideaGroup.POST("/regenerate", controllers.RegenerateBriefField())
		ideaGroup.POST("/materialize", controllers.MaterializeIdea())
		ideaGroup.POST("/attach", controllers.AttachIdeaToProject())

		ideaGroup.GET("/drafts", controllers.ListIdeaDrafts())
		ideaGroup.POST("/drafts", controllers.CreateIdeaDraft())
		ideaGroup.PUT("/drafts/:id", controllers.UpdateIdeaDraft())
		ideaGroup.DELETE("/drafts/:id", controllers.DeleteIdeaDraft())
	}

	matchGroup := router.Group("/api/match")
	matchGroup.Use(middleware.Authenticate())
	{
		matchGroup.GET("/posts/:sid/candidates", controllers.GetPostCandidates())
		matchGroup.GET("/recommended-posts", controllers.GetRecommendedPosts())

		// Founder's review board across all of their recruiting posts
		matchGroup.GET("/applications", controllers.GetApplicationBoard())
		matchGroup.PUT("/applications/:id/stage", controllers.UpdateApplicationStage())
		matchGroup.POST("/applications/:id/summary", controllers.SummarizeApplication())

		// Project detail page, team dashboard and profile track record
		matchGroup.GET("/posts/:sid/team", controllers.GetPostTeam())
		matchGroup.GET("/projects/:sid/pulse", controllers.GetProjectPulse())
		matchGroup.PUT("/projects/:sid/checkin", controllers.SaveCheckin())
		matchGroup.POST("/projects/:sid/reopen", controllers.ReopenRecruiting())
		matchGroup.GET("/users/:sid/record", controllers.GetUserRecord())
		matchGroup.PUT("/projects/:sid/kickoff", controllers.UpdateKickoff())
		matchGroup.POST("/projects/:sid/decisions", controllers.AddDecision())
		matchGroup.GET("/projects/:sid/team-chat", controllers.GetTeamChat())
		matchGroup.POST("/projects/:sid/team-chat", controllers.PostTeamChatMessage())
		matchGroup.DELETE("/projects/:sid/decisions/:id", controllers.DeleteDecision())
		matchGroup.PUT("/projects/:sid/brief", controllers.UpdateProjectBrief())
		matchGroup.POST("/projects/:sid/brief/regenerate", controllers.RegenerateProjectBriefField())
		matchGroup.POST("/projects/:sid/roles", controllers.AddSuggestedRole())

		// Matching profile, to-do counts and the applicant's own applications
		matchGroup.GET("/profile", controllers.GetMatchProfile())
		matchGroup.PUT("/profile", controllers.UpdateMatchProfile())
		matchGroup.GET("/todo", controllers.GetMatchTodo())
		matchGroup.GET("/my-applications", controllers.GetMyApplications())
	}
}
