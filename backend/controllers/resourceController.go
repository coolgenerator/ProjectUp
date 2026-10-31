package controllers

import (
	"net/http"
	"projectup/helper"
	_ "projectup/models" // Required for Swagger documentation
	"projectup/services"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ResourceController struct {
	service *services.ResourceService
}

func NewResourceController(service *services.ResourceService) *ResourceController {
	return &ResourceController{service: service}
}

// CreateWebLink godoc
// @Summary Create a web link resource
// @Description Create a new web link resource for the authenticated user
// @Tags Resources
// @Accept json
// @Produce json
// @Param resource body object{title=string,url=string,description=string,tags=[]string,project_id=int} true "Resource data"
// @Success 201 {object} models.Resource
// @Failure 400 {object} helper.ErrorResponse
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/link [post]
func (rc *ResourceController) CreateWebLink(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		URL         string   `json:"url" binding:"required,url"`
		Description string   `json:"description"`
		Tags        []string `json:"tags"`
		ProjectID   *uint    `json:"project_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resource, err := rc.service.CreateWebLink(
		userID.(uint),
		req.Title,
		req.URL,
		req.Description,
		req.Tags,
		req.ProjectID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Resource created successfully", "data": resource})
}

// UploadFile godoc
// @Summary Upload a file resource
// @Description Upload a new file resource for the authenticated user
// @Tags Resources
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "File to upload"
// @Param title formData string true "Resource title"
// @Param description formData string false "Resource description"
// @Param tags formData string false "Comma-separated tags"
// @Param project_id formData int false "Project ID"
// @Success 201 {object} models.Resource
// @Failure 400 {object} helper.ErrorResponse
// @Failure 401 {object} helper.ErrorResponse
// @Failure 413 {object} helper.ErrorResponse
// @Router /api/resources/upload [post]
func (rc *ResourceController) UploadFile(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	// Parse form data
	title := c.PostForm("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	description := c.PostForm("description")
	tagsStr := c.PostForm("tags")
	var tags []string
	if tagsStr != "" {
		tags = strings.Split(tagsStr, ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
	}

	var projectID *uint
	if pidStr := c.PostForm("project_id"); pidStr != "" {
		pid, err := strconv.ParseUint(pidStr, 10, 32)
		if err == nil {
			pidUint := uint(pid)
			projectID = &pidUint
		}
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	// Validate file type
	if err := services.ValidateFileType(fileHeader.Filename); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	resource, err := rc.service.UploadFile(
		userID,
		file,
		fileHeader,
		title,
		description,
		tags,
		projectID,
	)

	if err != nil {
		if strings.Contains(err.Error(), "exceeds limit") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "File uploaded successfully", "data": resource})
}

// GetUserResources godoc
// @Summary Get user resources
// @Description Get all resources for the authenticated user with pagination
// @Tags Resources
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param type query string false "Resource type (link or file)"
// @Success 200 {object} object{data=[]models.Resource,total=int,page=int,limit=int}
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources [get]
func (rc *ResourceController) GetUserResources(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	resourceType := c.Query("type")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	resources, total, err := rc.service.GetUserResources(userID, page, limit, resourceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  resources,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetResource godoc
// @Summary Get a specific resource
// @Description Get a specific resource by ID
// @Tags Resources
// @Accept json
// @Produce json
// @Param id path string true "Resource ID (UUID)"
// @Success 200 {object} models.Resource
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id} [get]
func (rc *ResourceController) GetResource(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	resourceID := c.Param("id")
	if resourceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	resource, err := rc.service.GetResource(userID, resourceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource retrieved successfully", "data": resource})
}

// UpdateResource godoc
// @Summary Update a resource
// @Description Update an existing resource
// @Tags Resources
// @Accept json
// @Produce json
// @Param id path int true "Resource ID"
// @Param resource body object{title=string,description=string,tags=[]string,project_id=int} true "Resource update data"
// @Success 200 {object} models.Resource
// @Failure 400 {object} helper.ErrorResponse
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id} [put]
func (rc *ResourceController) UpdateResource(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	resourceID := c.Param("id")
	if resourceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	var req struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		Tags        []string `json:"tags"`
		ProjectID   *uint    `json:"project_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resource, err := rc.service.UpdateResource(
		userID,
		resourceID,
		req.Title,
		req.Description,
		req.Tags,
		req.ProjectID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource updated successfully", "data": resource})
}

// DeleteResource godoc
// @Summary Delete a resource
// @Description Delete an existing resource
// @Tags Resources
// @Accept json
// @Produce json
// @Param id path int true "Resource ID"
// @Success 200 {object} helper.SuccessResponse
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id} [delete]
func (rc *ResourceController) DeleteResource(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	resourceID := c.Param("id")
	if resourceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	if err := rc.service.DeleteResource(userID, resourceID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource deleted successfully"})
}

// SearchResources godoc
// @Summary Search resources
// @Description Search user resources by query
// @Tags Resources
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Success 200 {object} object{data=[]models.Resource}
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/search [get]
func (rc *ResourceController) SearchResources(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	resources, err := rc.service.SearchResources(userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resources,
	})
}

// GetResourceQuota godoc
// @Summary Get resource quota
// @Description Get the user's resource usage and limits
// @Tags Resources
// @Accept json
// @Produce json
// @Success 200 {object} models.ResourceQuota
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/quota [get]
func (rc *ResourceController) GetResourceQuota(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	quota, err := rc.service.GetResourceQuota(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quota retrieved successfully", "data": quota})
}

// RecalculateQuota godoc
// @Summary Recalculate resource quota
// @Description Force recalculation of the user's resource quota from existing resources
// @Tags Resources
// @Accept json
// @Produce json
// @Success 200 {object} models.ResourceQuota
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/quota/recalculate [post]
func (rc *ResourceController) RecalculateQuota(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	// Force recalculation
	quota, err := rc.service.RecalculateQuota(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quota recalculated successfully", "data": quota})
}

// GetProjectResources godoc
// @Summary Get project resources
// @Description Get all resources for a specific project
// @Tags Resources
// @Accept json
// @Produce json
// @Param projectId path int true "Project ID"
// @Success 200 {object} object{data=[]models.Resource}
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/projects/{projectId}/resources [get]
func (rc *ResourceController) GetProjectResources(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	// Parse project ID parameter
	projectIdStr := c.Param("projectId")

	// Parse as uint since the service expects uint
	// TODO: Update service to handle UUID when migrating to UUID-based projects
	projectID, err := strconv.ParseUint(projectIdStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	resources, err := rc.service.GetProjectResources(userID, uint(projectID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resources,
	})
}

// MoveToTrash godoc
// @Summary Move resource to trash
// @Description Move a resource to trash (soft delete)
// @Tags Resources
// @Accept json
// @Produce json
// @Param id path int true "Resource ID"
// @Success 200 {object} object{message=string}
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id}/trash [put]
func (rc *ResourceController) MoveToTrash(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}
	resourceID := c.Param("id")
	if resourceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	err := rc.service.MoveToTrash(userID, resourceID)
	if err != nil {
		if err.Error() == "resource not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource moved to trash successfully"})
}

// RestoreFromTrash godoc
// @Summary Restore resource from trash
// @Description Restore a resource from trash
// @Tags Resources
// @Accept json
// @Produce json
// @Param id path int true "Resource ID"
// @Success 200 {object} object{message=string}
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id}/restore [put]
func (rc *ResourceController) RestoreFromTrash(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}
	resourceID := c.Param("id")
	if resourceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	err := rc.service.RestoreFromTrash(userID, resourceID)
	if err != nil {
		if err.Error() == "resource not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource restored successfully"})
}

// GetTrashedResources godoc
// @Summary Get trashed resources
// @Description Get all resources in trash for the current user
// @Tags Resources
// @Accept json
// @Produce json
// @Success 200 {object} object{data=[]models.Resource}
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/trash [get]
func (rc *ResourceController) GetTrashedResources(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	resources, err := rc.service.GetTrashedResources(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resources})
}

// EmptyTrash godoc
// @Summary Empty trash
// @Description Permanently delete all resources in trash
// @Tags Resources
// @Accept json
// @Produce json
// @Success 200 {object} object{message=string}
// @Failure 401 {object} helper.ErrorResponse
// @Router /api/resources/trash/empty [delete]
func (rc *ResourceController) EmptyTrash(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  false,
			"error":   "Unauthorized",
			"message": "Please login first",
		})
		return
	}

	err := rc.service.EmptyTrash(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Trash emptied successfully"})
}

// ProxyFile godoc
// @Summary Proxy file from S3
// @Description Proxy a file from S3 to avoid CORS issues. Supports both header and query param authentication.
// @Tags Resources
// @Produce application/pdf
// @Param id path int true "Resource ID"
// @Param token query string false "Authentication token (alternative to Authorization header)"
// @Success 200 {file} binary
// @Failure 401 {object} helper.ErrorResponse
// @Failure 404 {object} helper.ErrorResponse
// @Router /api/resources/{id}/proxy [get]
func (rc *ResourceController) ProxyFile(c *gin.Context) {
	// Try to get userID from context (set by middleware)
	userID, exists := c.Get("userID")

	// If not authenticated via header, try query parameter token
	if !exists {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Validate token and extract user ID
		claims, err := helper.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		userID = claims.ID
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	// Get resource to verify ownership and get URL
	resource, err := rc.service.GetResource(userID.(uint), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	if resource.Type != "file" || resource.URL == nil || *resource.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a file resource"})
		return
	}

	// Fetch the file from S3
	resp, err := http.Get(*resource.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file from storage"})
		return
	}

	// Get content type and filename
	contentType := "application/octet-stream"
	if resource.FileType != nil && *resource.FileType != "" {
		contentType = *resource.FileType
	}

	fileName := "download"
	if resource.FileName != nil && *resource.FileName != "" {
		fileName = *resource.FileName
	}

	// Set appropriate headers
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", "inline; filename=\""+fileName+"\"")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type")

	// Stream the file
	c.DataFromReader(http.StatusOK, resp.ContentLength, contentType, resp.Body, nil)
}
