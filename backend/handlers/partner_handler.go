package handlers

import (
	"net/http"
	"projectup/helper"
	"projectup/models"
	"projectup/services"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// PartnerHandler handles partner post related API endpoints
type PartnerHandler struct {
	partnerService *services.PartnerService
}

// NewPartnerHandler creates a new partner handler
func NewPartnerHandler(partnerService *services.PartnerService) *PartnerHandler {
	return &PartnerHandler{
		partnerService: partnerService,
	}
}

// CreatePartnerPost godoc
// @Summary Create a new partner post
// @Description Create a new partner/buddy post
// @Tags partners
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param post body models.PartnerPostRequest true "Partner post details"
// @Success 201 {object} models.PartnerPost
// @Failure 400 {object} helper.ErrorResponse
// @Failure 401 {object} helper.ErrorResponse
// @Router /partner-posts [post]
func (h *PartnerHandler) CreatePartnerPost(c *gin.Context) {
	// Get user ID from context (set by authentication middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, helper.ErrorResponse{
			Error: "User not authenticated",
		})
		return
	}

	// Bind request body
	var req models.PartnerPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Create partner post
	post, err := h.partnerService.CreatePartnerPost(userID.(uint), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorResponse{
			Error: "Failed to create partner post: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// GetPartnerPosts godoc
// @Summary Get partner posts
// @Description Get partner posts with pagination and filtering
// @Tags partners
// @Accept json
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Param search query string false "Search query"
// @Param location query string false "Location filter"
// @Param interests query string false "Interests filter (comma-separated)"
// @Success 200 {object} models.PartnerPostResponse
// @Failure 400 {object} helper.ErrorResponse
// @Router /partner-posts [get]
func (h *PartnerHandler) GetPartnerPosts(c *gin.Context) {
	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	// Get filter parameters
	searchQuery := c.Query("search")
	location := c.Query("location")

	// Parse interests (comma-separated)
	var interests []string
	if interestsParam := c.Query("interests"); interestsParam != "" {
		interests = strings.Split(interestsParam, ",")
	}

	// Get partner posts
	response, err := h.partnerService.GetPartnerPosts(page, limit, searchQuery, location, interests)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorResponse{
			Error: "Failed to get partner posts: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetPartnerPostByID godoc
// @Summary Get a partner post by ID
// @Description Get detailed information about a specific partner post
// @Tags partners
// @Accept json
// @Produce json
// @Param id path int true "Partner Post ID"
// @Success 200 {object} models.PartnerPost
// @Failure 404 {object} helper.ErrorResponse
// @Router /partner-posts/{id} [get]
func (h *PartnerHandler) GetPartnerPostByID(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorResponse{
			Error: "Invalid post ID",
		})
		return
	}

	post, err := h.partnerService.GetPartnerPostByID(uint(postID))
	if err != nil {
		c.JSON(http.StatusNotFound, helper.ErrorResponse{
			Error: "Partner post not found",
		})
		return
	}

	c.JSON(http.StatusOK, post)
}

// DeletePartnerPost godoc
// @Summary Delete a partner post
// @Description Delete a partner post (only by the owner)
// @Tags partners
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path int true "Partner Post ID"
// @Success 200 {object} helper.SuccessResponse
// @Failure 401 {object} helper.ErrorResponse
// @Failure 403 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /partner-posts/{id} [delete]
func (h *PartnerHandler) DeletePartnerPost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, helper.ErrorResponse{
			Error: "User not authenticated",
		})
		return
	}

	// Get post ID from path
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorResponse{
			Error: "Invalid post ID",
		})
		return
	}

	// Delete the post
	if err := h.partnerService.DeletePartnerPost(uint(postID), userID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorResponse{
			Error: "Failed to delete partner post: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, helper.SuccessResponse{
		Message: "Partner post deleted successfully",
	})
}

// UpdatePartnerPost godoc
// @Summary Update a partner post
// @Description Update a partner post (only by the owner)
// @Tags partners
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path int true "Partner Post ID"
// @Param update body models.PartnerPostRequest true "Update details"
// @Success 200 {object} models.PartnerPost
// @Failure 400 {object} helper.ErrorResponse
// @Failure 401 {object} helper.ErrorResponse
// @Failure 403 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /partner-posts/{id} [put]
func (h *PartnerHandler) UpdatePartnerPost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, helper.ErrorResponse{
			Error: "User not authenticated",
		})
		return
	}

	// Get post ID from path
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorResponse{
			Error: "Invalid post ID",
		})
		return
	}

	// Bind request body
	var req models.PartnerPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Convert request to map for updates
	updates := map[string]interface{}{
		"Title":       req.Title,
		"Topic":       req.Topic,
		"Description": req.Description,
		"Location":    req.Location,
	}

	if req.UseSpecificDate {
		updates["SpecificDate"] = req.SpecificDate
		updates["PreferredTime"] = ""
	} else {
		updates["SpecificDate"] = ""
		updates["PreferredTime"] = req.PreferredTime
	}
	updates["UseSpecificDate"] = req.UseSpecificDate
	updates["SpotAvailability"] = req.SpotAvailability
	updates["ExpirationPeriod"] = req.ExpirationPeriod

	// Update the post
	post, err := h.partnerService.UpdatePartnerPost(uint(postID), userID.(uint), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorResponse{
			Error: "Failed to update partner post: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, post)
}
