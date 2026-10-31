package routes

import (
	"projectup/controllers"
	"projectup/middleware"
	"projectup/services"

	"github.com/gin-gonic/gin"
)

func RegisterKnowledgeTreeRoutes(router *gin.Engine) {
	knowledgeTreeService := services.NewKnowledgeTreeService()
	knowledgeTreeController := controllers.NewKnowledgeTreeController(knowledgeTreeService)

	api := router.Group("/api/knowledge-tree")
	api.Use(middleware.Authenticate())

	// Domain endpoints
	api.GET("/domains", knowledgeTreeController.GetDomains)
	api.GET("/domains/:domainId/topics", knowledgeTreeController.GetTopicsByDomain)
	api.GET("/domains/:domainId/full", knowledgeTreeController.GetFullTree)

	// Topic endpoints
	api.GET("/topics/:topicId/children", knowledgeTreeController.GetChildTopicsByParent)
	api.GET("/topics/:topicId/concepts", knowledgeTreeController.GetConceptsByTopic)

	// Concept endpoints
	api.GET("/concepts/:conceptId/resources", knowledgeTreeController.GetResourcesByConcept)
}
