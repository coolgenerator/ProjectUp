package controllers

import (
	"net/http"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type KnowledgeTreeController struct {
	service *services.KnowledgeTreeService
}

func NewKnowledgeTreeController(service *services.KnowledgeTreeService) *KnowledgeTreeController {
	return &KnowledgeTreeController{service: service}
}

// GetDomains godoc
// @Summary Get all domains
// @Description Get all knowledge domains
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Success 200 {array} models.Domain
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/domains [get]
func (ktc *KnowledgeTreeController) GetDomains(c *gin.Context) {
	domains, err := ktc.service.GetAllDomains()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, domains)
}

// GetTopicsByDomain godoc
// @Summary Get topics by domain
// @Description Get all topics for a specific domain
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Param domainId path int true "Domain ID"
// @Success 200 {array} models.Topic
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/domains/{domainId}/topics [get]
func (ktc *KnowledgeTreeController) GetTopicsByDomain(c *gin.Context) {
	domainID, err := strconv.ParseUint(c.Param("domainId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	topics, err := ktc.service.GetTopicsByDomain(int(domainID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, topics)
}

// GetChildTopicsByParent godoc
// @Summary Get child topics by parent topic
// @Description Get all child topics for a specific parent topic
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Param topicId path int true "Parent Topic ID"
// @Success 200 {array} models.Topic
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/topics/{topicId}/children [get]
func (ktc *KnowledgeTreeController) GetChildTopicsByParent(c *gin.Context) {
	topicID, err := strconv.ParseUint(c.Param("topicId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid topic ID"})
		return
	}

	childTopics, err := ktc.service.GetChildTopicsByParent(int(topicID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, childTopics)
}

// GetConceptsByTopic godoc
// @Summary Get concepts by topic
// @Description Get all concepts for a specific topic
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Param topicId path int true "Topic ID"
// @Success 200 {array} models.KnowledgeConcept
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/topics/{topicId}/concepts [get]
func (ktc *KnowledgeTreeController) GetConceptsByTopic(c *gin.Context) {
	topicID, err := strconv.ParseUint(c.Param("topicId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid topic ID"})
		return
	}

	concepts, err := ktc.service.GetConceptsByTopic(int(topicID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, concepts)
}

// GetResourcesByConcept godoc
// @Summary Get resources by concept
// @Description Get all resources for a specific concept
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Param conceptId path int true "Concept ID"
// @Success 200 {array} models.KnowledgeConceptResource
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/concepts/{conceptId}/resources [get]
func (ktc *KnowledgeTreeController) GetResourcesByConcept(c *gin.Context) {
	conceptID, err := strconv.ParseUint(c.Param("conceptId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid concept ID"})
		return
	}

	resources, err := ktc.service.GetResourcesByConcept(int(conceptID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

// GetFullTree godoc
// @Summary Get full knowledge tree for a domain
// @Description Get the complete knowledge tree structure for a specific domain
// @Tags KnowledgeTree
// @Accept json
// @Produce json
// @Param domainId path int true "Domain ID"
// @Success 200 {object} models.Domain
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/knowledge-tree/domains/{domainId}/full [get]
func (ktc *KnowledgeTreeController) GetFullTree(c *gin.Context) {
	domainID, err := strconv.ParseUint(c.Param("domainId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	tree, err := ktc.service.GetFullTreeByDomain(int(domainID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}