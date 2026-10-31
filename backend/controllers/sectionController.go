package controllers

import (
	"net/http"
	"projectup/models"
	"projectup/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// SectionController handles HTTP requests for sections
type SectionController struct {
	service *services.SectionService
}

// NewSectionController creates a new SectionController
func NewSectionController(service *services.SectionService) *SectionController {
	return &SectionController{service: service}
}

// CreateSection creates a new section
// @Summary Create a new section
// @Tags sections
// @Accept json
// @Produce json
// @Param section body models.Section true "Section data"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections [post]
func (c *SectionController) CreateSection(ctx *gin.Context) {
	var section models.Section
	if err := ctx.ShouldBindJSON(&section); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if err := c.service.CreateSection(&section); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"section": section,
	})
}

// GetSection retrieves a section by ID
// @Summary Get section by ID
// @Tags sections
// @Produce json
// @Param id path int true "Section ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections/{id} [get]
func (c *SectionController) GetSection(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid section ID",
		})
		return
	}

	section, err := c.service.GetSection(id)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Section not found",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"section": section,
	})
}

// GetProjectSections retrieves all sections for a project
// @Summary Get project sections
// @Tags sections
// @Produce json
// @Param project_id path string true "Project ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections/project/{project_id} [get]
func (c *SectionController) GetProjectSections(ctx *gin.Context) {
	projectID := ctx.Param("project_id")

	sections, err := c.service.GetProjectSections(projectID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":  true,
		"sections": sections,
		"count":    len(sections),
	})
}

// UpdateSection updates a section
// @Summary Update section
// @Tags sections
// @Accept json
// @Produce json
// @Param id path int true "Section ID"
// @Param updates body map[string]interface{} true "Section updates"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections/{id} [put]
func (c *SectionController) UpdateSection(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid section ID",
		})
		return
	}

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if err := c.service.UpdateSection(id, updates); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Fetch updated section
	section, _ := c.service.GetSection(id)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"section": section,
	})
}

// DeleteSection deletes a section
// @Summary Delete section
// @Tags sections
// @Produce json
// @Param id path int true "Section ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections/{id} [delete]
func (c *SectionController) DeleteSection(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid section ID",
		})
		return
	}

	if err := c.service.DeleteSection(id); err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Section deleted successfully",
	})
}

// ReorderSections updates the order of sections
// @Summary Reorder sections
// @Tags sections
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Section order map"
// @Success 200 {object} map[string]interface{}
// @Router /api/sections/reorder [post]
func (c *SectionController) ReorderSections(ctx *gin.Context) {
	var body struct {
		SectionOrders map[int]int `json:"section_orders" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	if err := c.service.ReorderSections(body.SectionOrders); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sections reordered successfully",
	})
}
