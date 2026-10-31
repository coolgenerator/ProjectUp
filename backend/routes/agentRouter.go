package routes

import (
	"projectup/controllers"

	"github.com/gin-gonic/gin"
)

func SetupAgentRoutes(router *gin.Engine) {
	agentController := controllers.NewAgentController()

	agentGroup := router.Group("/api/agents")
	{
		agentGroup.POST("", agentController.CreateAgent)
		agentGroup.POST("/:name/chat", agentController.SendMessage)
		// agentGroup.POST("/project-ideas", agentController.GetProjectIdeas)
		agentGroup.POST("/project-ideas", agentController.GetMultipleProjectIdeas)
		agentGroup.POST("/project-roadmap", agentController.GetProjectRoadmap)
		agentGroup.POST("/enhanced-roadmap", agentController.GetEnhancedRoadmap)
		agentGroup.POST("/basic-roadmap", agentController.GetBasicRoadmap)
		agentGroup.POST("/roadmap-resources", agentController.GetRoadmapResources)
		agentGroup.POST("/roadmap-steps", agentController.GetRoadmapSteps)
		agentGroup.POST("/curriculum-alignment", agentController.GetCurriculumAlignment)
		agentGroup.POST("/project-checklist", agentController.GetProjectChecklist)
	}
}
