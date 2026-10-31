package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"
	"projectup/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateProject creates a new project
// @Summary Create a new project
// @Description Handles project creation for authenticated users
// @Tags Projects
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param title formData string true "Project Title"
// @Param description formData string false "Project Description"
// @Param project_type formData string true "Project Type"
// @Success 200 {object} map[string]interface{} "Project created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 500 {object} map[string]interface{} "Failed to create project"
// @Router /projects/create [post]
func CreateProject() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User ID not found in context"})
			return
		}

		var project models.Project
		if err := services.HandleProjectFormData(c, userID.(uint), &project); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := services.SaveProject(&project); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Project created successfully", "project": project})
	}
}

func CreateProjectPost() gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := services.HandleProjectPostCreation(c); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Project post created successfully"})
	}
}

type PaginatedProjectsResponse struct {
	Posts   []models.ProjectPostResponse `json:"projects"` // Slice of Project (or ProjectPost, if that's your model)
	HasMore bool                         `json:"hasMore"`  // Indicates if there are more pages beyond the current one
	Total   int64                        `json:"total"`    // Total number of records (useful for front-end pagination)
	Page    int                          `json:"page"`     // Current page number
}

// GetProjectPosts retrieves all project posts
// @Summary Get project posts
// @Description Retrieves a paginated list of project posts
// @Tags Projects
// @Accept json
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Number of results per page (default: 10)"
// @Success 200 {object} PaginatedProjectsResponse "List of project posts"
// @Failure 500 {object} map[string]interface{} "Failed to fetch project posts"
// @Router /projects/project-posts [get]
func GetProjectPosts() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		// Get filter parameters
		searchQuery := c.Query("search")
		typeFilter := c.Query("type")
		locationFilter := c.Query("location")
		dateFilter := c.Query("date")
		spotsFilter := c.Query("spots")
		topicsStr := c.Query("topics")
		languagesStr := c.Query("languages")
		roleFilter := strings.TrimSpace(c.Query("role"))         // Matches a role's title or skills
		maxHours, _ := strconv.Atoi(c.Query("max_hours"))        // Only roles needing at most this many hours a week
		openOnly := c.Query("open") == "1"                       // Only posts with at least one unfilled role

		// Parse comma-separated values
		var topics, languages []string
		if topicsStr != "" {
			topics = strings.Split(topicsStr, ",")
		}
		if languagesStr != "" {
			languages = strings.Split(languagesStr, ",")
		}

		// Start building the query
		query := database.DB.
			Table("project_posts").
			Select(`
				project_posts.*,
				project_posts.sid AS short_id,
				project_posts.updated_at AS updated_at,
				projects.project_type,
				projects.project_type AS project_type,
				projects.school,
				projects.class,
				projects.topic AS topics,
				projects.location,
				(SELECT COUNT(*) FROM interactions 
					WHERE interactions.entity_type = 1 
					AND interactions.entity_id = project_posts.post_id 
					AND interactions.type = 1) as love_count,
				EXISTS(SELECT 1 FROM interactions 
					WHERE interactions.entity_type = 1 
					AND interactions.entity_id = project_posts.post_id 
					AND interactions.user_id = ? 
					AND interactions.type = 1) as is_loved,
				EXISTS(SELECT 1 FROM interactions 
					WHERE interactions.entity_type = 1 
					AND interactions.entity_id = project_posts.post_id 
					AND interactions.user_id = ? 
					AND interactions.type = 2) as is_saved
			`, userID, userID).
			Joins("JOIN projects ON project_posts.project_id = projects.project_id")

		// Only show posts from published projects
		query = query.Where("projects.is_published = ?", true)

		// Apply filters
		if searchQuery != "" {
			query = query.Where("project_posts.title ILIKE ? OR project_posts.description ILIKE ?",
				"%"+searchQuery+"%", "%"+searchQuery+"%")
		}
		if typeFilter != "" {
			query = query.Where("projects.project_type = ?", typeFilter)
		}
		if locationFilter != "" {
			query = query.Where("projects.location = ?", locationFilter)
		}
		if len(topics) > 0 {
			// projects.topic is a jsonb array; match posts containing any of the topics
			topicConds := make([]string, 0, len(topics))
			topicArgs := make([]interface{}, 0, len(topics))
			for _, t := range topics {
				topicJSON, _ := json.Marshal([]string{strings.TrimSpace(t)})
				topicConds = append(topicConds, "projects.topic @> ?::jsonb")
				topicArgs = append(topicArgs, string(topicJSON))
			}
			query = query.Where(strings.Join(topicConds, " OR "), topicArgs...)
		}
		if len(languages) > 0 {
			// Since languages column doesn't exist, we'll skip this filter for now
			// TODO: Add proper language filtering once the schema is updated
			// query = query.Where("projects.languages && ?", languages)
		}
		// Open roles live in the spots jsonb array
		hasSpots := "jsonb_typeof(project_posts.spots) = 'array' AND jsonb_array_length(project_posts.spots) > 0"
		if spotsFilter == "yes" {
			query = query.Where(hasSpots)
		} else if spotsFilter == "no" {
			query = query.Where("NOT (" + hasSpots + ")")
		}

		// Role filters look inside the spots array; a post matches when one role satisfies all of them
		if roleFilter != "" || maxHours > 0 {
			roleCond := "jsonb_typeof(project_posts.spots) = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements(project_posts.spots) AS r WHERE TRUE"
			var roleArgs []interface{}
			if roleFilter != "" {
				roleCond += " AND (r->>'title' ILIKE ? OR (r->'skills')::text ILIKE ?)"
				roleArgs = append(roleArgs, "%"+roleFilter+"%", "%"+roleFilter+"%")
			}
			if maxHours > 0 {
				roleCond += " AND COALESCE(NULLIF(r->>'hours_per_week', '')::numeric, 0) <= ?"
				roleArgs = append(roleArgs, maxHours)
			}
			query = query.Where(roleCond+")", roleArgs...)
		}
		if openOnly {
			// Some role still has fewer accepted applicants than spots
			query = query.Where(`jsonb_typeof(project_posts.spots) = 'array' AND EXISTS (
				SELECT 1 FROM jsonb_array_elements(project_posts.spots) AS r
				WHERE GREATEST(COALESCE(NULLIF(r->>'spots', '')::numeric, 1), 1) > (
					SELECT COUNT(*) FROM project_application pa
					WHERE pa.post_id = project_posts.post_id AND pa.status = 1 AND pa.role = r->>'title'))`)
		}

		// Handle date filter
		switch dateFilter {
		case "7days":
			query = query.Where("project_posts.created_at >= ?", time.Now().AddDate(0, 0, -7))
		case "30days":
			query = query.Where("project_posts.created_at >= ?", time.Now().AddDate(0, 0, -30))
		case "year":
			query = query.Where("project_posts.created_at >= ?", time.Now().AddDate(-1, 0, 0))
		}

		// Get user's profile info for organization and location filtering
		var userProfile models.Profile
		database.DB.Where("user_id = ?", userID).First(&userProfile)

		// Add visibility filtering
		visibilityFilter := database.DB.Where("project_posts.visibility = 2") // Public posts

		// Only include organization posts if user has a school/organization
		if userProfile.SchoolEmail != nil && *userProfile.SchoolEmail != "" {
			// Check if user's school email is verified
			var schoolEmailVerified bool
			if err := database.DB.Table("profiles").
				Select("school_email_verified").
				Where("user_id = ?", userID).
				Scan(&schoolEmailVerified).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check email verification status"})
				return
			}

			// Only include organization posts if user's school email is verified
			if schoolEmailVerified {
				// Extract domain from the user's school email
				emailParts := strings.Split(*userProfile.SchoolEmail, "@")
				if len(emailParts) == 2 && emailParts[1] != "" {
					domain := emailParts[1]

					// Extract root domain (e.g., extract "ucla.edu" from "g.ucla.edu")
					extractRootDomain := func(domain string) string {
						parts := strings.Split(domain, ".")
						if len(parts) <= 2 {
							return domain // Already a root domain like "ucla.edu"
						}
						// Return last two parts (e.g., "ucla.edu" from "g.ucla.edu")
						return parts[len(parts)-2] + "." + parts[len(parts)-1]
					}

					rootDomain := extractRootDomain(domain)

					// For organization posts, match posts from users with the same root domain
					visibilityFilter = visibilityFilter.Or(
						`(project_posts.visibility = 4 AND project_posts.user_id IN 
						(SELECT profiles.user_id FROM profiles 
						 WHERE profiles.school_email_verified = true
						 AND (
							 profiles.school_email LIKE ? OR
							 profiles.school_email LIKE ?
						 )))`,
						"%@"+domain,       // Exact domain match
						"%@%."+rootDomain, // Subdomain match
					)
				}
			}
		}

		// Only include local posts if user has location info
		if userProfile.City != nil && *userProfile.City != "" {
			userLocation := *userProfile.City
			if userProfile.State != nil && *userProfile.State != "" {
				userLocation += ", " + *userProfile.State
			}
			if userProfile.Country != nil && *userProfile.Country != "" {
				userLocation += ", " + *userProfile.Country
			}

			visibilityFilter = visibilityFilter.Or(
				"(project_posts.visibility = 3 AND projects.location LIKE ?)",
				"%"+userLocation+"%",
			)
		}

		// Include posts created by the user
		visibilityFilter = visibilityFilter.Or("project_posts.user_id = ?", userID)

		// Add the visibility filter to the main query
		query = query.Where(visibilityFilter)

		// Get total count for pagination
		var totalPosts int64
		if err := query.Count(&totalPosts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count posts"})
			return
		}

		// Get paginated results
		var projectPosts []models.ProjectPostResponse
		if err := query.
			Order("project_posts.created_at DESC").
			Offset(offset).
			Limit(limit).
			Find(&projectPosts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
			return
		}

		annotateRecruiting(projectPosts)

		// Calculate if there are more posts
		hasMore := int64(offset+len(projectPosts)) < totalPosts

		c.JSON(http.StatusOK, PaginatedProjectsResponse{
			Posts:   projectPosts,
			HasMore: hasMore,
			Total:   totalPosts,
			Page:    page,
		})
	}
}

// GetProjectPost retrieves a single project post by short ID
// @Summary Get a project post
// @Description Fetch a project post using its unique short ID
// @Tags Projects
// @Accept json
// @Produce json
// @Param shortId path string true "Project Post Short ID"
// @Success 200 {object} map[string]interface{} "Project post data"
// @Failure 404 {object} map[string]interface{} "Project post not found"
// @Router /projects/project-post/{shortId} [get]
func GetProjectPost() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		// Get short ID from the URL parameter
		shortID := c.Param("shortId")
		if shortID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "shortId is required"})
			return
		}

		// First get the project post ID from shortID
		var projectPost models.ProjectPost
		if err := database.DB.Where("sid = ?", shortID).First(&projectPost).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve project post"})
			return
		}

		// Call repository to fetch the project post with visibility check
		projectPostResponse, err := repositories.GetPostByID(projectPost.PostID, userID)
		if err != nil {
			if strings.HasPrefix(err.Error(), "unauthorized") {
				c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view this project"})
				return
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
			return
		}

		roleFill := roleFills([]uint{projectPost.PostID})[projectPost.PostID]
		if roleFill == nil {
			roleFill = map[string]int{}
		}
		c.JSON(http.StatusOK, gin.H{"project_post": projectPostResponse, "role_fills": roleFill, "brief": workbenchBrief(projectPost.ProjectID)})
	}
}

func GetProjectsByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Query("id")

		var projects []models.Project
		// Filter out soft-deleted projects and projects with status = 4 (Deleted)
		if err := database.DB.Where("owner_id = ? AND deleted_at IS NULL AND status != ?", id, 4).Find(&projects).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"projects": projects})
	}
}

// Legacy endpoint that redirects to the generic comments API
// Implementation replaces the previous version
func GetProjectPostComments(c *gin.Context) {
	// Extract postID
	postID := c.Param("postId")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	// Rewrite the URL to use the generic comments endpoint
	c.Request.URL.Path = "/comments"
	c.Request.URL.RawQuery = fmt.Sprintf("entity_type=%d&entity_id=%s&page=%s&limit=%s",
		models.EntityTypeProjectPost,
		postID,
		page,
		limit)

	// Call the generic comments handler
	GetCommentsGeneric(c)
}

// Legacy endpoint that redirects to the generic comments API
// Implementation replaces the previous version
func AddProjectPostComment(c *gin.Context) {
	// Extract postID
	postID := c.Param("postId")
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse the original request body
	var originalComment struct {
		Content       string `json:"content" binding:"required"`
		ParentComment *uint  `json:"parent_comment"`
	}

	if err := c.ShouldBindJSON(&originalComment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment data: " + err.Error()})
		return
	}

	// Convert postID to uint
	postIDUint, err := strconv.ParseUint(postID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	// Create a new generic comment structure
	newComment := map[string]interface{}{
		"entity_type": models.EntityTypeProjectPost,
		"entity_id":   uint(postIDUint),
		"content":     originalComment.Content,
		"parent_id":   originalComment.ParentComment,
	}

	// Store original request body
	originalBody := c.Request.Body

	// Create new request body with our payload
	jsonPayload, _ := json.Marshal(newComment)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(jsonPayload))
	c.Request.ContentLength = int64(len(jsonPayload))
	c.Request.URL.Path = "/comments"
	c.Request.Method = "POST"
	c.Request.Header.Set("Content-Type", "application/json")

	// Call the generic comment handler
	AddCommentGeneric(c)

	// Restore original request body
	c.Request.Body = originalBody
}

type ProjectApplicationRequest struct {
	PostID       uint   `json:"postId" binding:"required"`
	Motivation   string `json:"motivation"`
	Role         string `json:"role"`
	HoursPerWeek int    `json:"hoursPerWeek"`
	FirstStep    string `json:"firstStep"`
	Responses  []struct {
		QuestionID uint   `json:"questionId" binding:"required"`
		AnswerText string `json:"response" binding:"required"`
	} `json:"responses" binding:"required"`
}

// SubmitApplicationHandler submits an application to a project
// @Summary Submit project application
// @Description Submits an application for a project post
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param application body ProjectApplicationRequest true "Application request data"
// @Success 200 {object} map[string]interface{} "Application submitted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to submit application"
// @Router /projects/project-applications [post]
// maxPendingApplications limits how many applications a user can have open
// at once, so applying signals real intent rather than casual interest.
const maxPendingApplications = 3

// minFirstStepLength matches the apply form; anything shorter can't be concrete.
const minFirstStepLength = 10

func SubmitApplicationHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	var request ProjectApplicationRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format. Please check your submission and try again."})
		return
	}

	// Check if user can reapply
	canReapply, err := services.CanUserReapply(userID, request.PostID)
	if err != nil {
		// Return a user-friendly error message with the status code so frontend can display appropriately
		message := err.Error()
		var statusCode int

		if strings.Contains(message, "pending") {
			statusCode = 0 // Pending
			message = "You already have a pending application for this project. Please wait for a response."
		} else if strings.Contains(message, "accepted") {
			statusCode = 1 // Accepted
			message = "You already have an accepted application for this project. You're already a member!"
		} else {
			statusCode = -1
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"error":      message,
			"status":     "existing",
			"statusCode": statusCode,
		})
		return
	}

	if !canReapply {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot submit another application at this time."})
		return
	}

	// Applying is a commitment: require weekly hours and cap open applications
	if request.HoursPerWeek <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please state how many hours per week you can commit."})
		return
	}
	// A concrete first-week proposal tells the founder far more than motivation alone
	request.FirstStep = strings.TrimSpace(request.FirstStep)
	if utf8.RuneCountInString(request.FirstStep) < minFirstStepLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please describe what you would do in your first week."})
		return
	}
	var pendingCount int64
	database.DB.Model(&models.ProjectApplication{}).Where("user_id = ? AND status = ?", userID, 0).Count(&pendingCount)
	if pendingCount >= maxPendingApplications {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("You can have at most %d pending applications. Withdraw one or wait for a response.", maxPendingApplications)})
		return
	}

	// Convert request to application answers
	var answers []models.ApplicationAnswer
	for _, response := range request.Responses {
		// Validate response
		if response.AnswerText == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "All required questions must be answered."})
			return
		}

		answers = append(answers, models.ApplicationAnswer{
			QuestionID: response.QuestionID,
			AnswerText: response.AnswerText,
		})
	}

	// Submit the application
	err = services.SubmitApplication(userID, request.PostID, request.Motivation, request.Role, request.HoursPerWeek, request.FirstStep, answers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application. Please try again later."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application submitted successfully! You'll be notified when the project owner responds."})
}

// Resource controller functions

// GetProjectResources retrieves all resource blocks for a project
// @Summary Get project resources
// @Description Retrieves all resource blocks for a specific project
// @Tags Projects,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string][]models.Block "Resources retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve resources"
// @Router /projects/{sid}/resources [get]
func GetProjectResources(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get user ID for permission checking
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to view project resources
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionView)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	// Get resource blocks (link or file blocks)
	blocks, err := services.GetProjectResources(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve resources"})
		return
	}

	// Filter blocks by user's permissions
	filteredBlocks, err := services.FilterBlocksByGroup(userID, projectID, blocks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to filter resources by permission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"resources": filteredBlocks})
}

// CreateResource creates a new resource block for a project
// @Summary Create project resource
// @Description Creates a new resource block for a specific project
// @Tags Projects,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resource body services.BlockResourceRequest true "Resource data"
// @Success 201 {object} map[string]interface{} "Resource created successfully"
// @Success 201 {object} models.Block "Created resource"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to create resource"
// @Router /projects/{sid}/resources [post]
func CreateResource(c *gin.Context) {
	var request services.BlockResourceRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get user ID for block creation
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to edit project resources
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionEdit)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	block, err := services.CreateProjectResource(projectID, userID, request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Resource created successfully", "resource": block})
}

// UpdateResource updates an existing resource block
// @Summary Update project resource
// @Description Updates an existing resource block
// @Tags Projects,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resourceId path int true "Block ID"
// @Param resource body services.BlockResourceRequest true "Updated resource data"
// @Success 200 {object} map[string]interface{} "Resource updated successfully"
// @Success 200 {object} models.Block "Updated resource"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 404 {object} map[string]interface{} "Resource not found"
// @Failure 500 {object} map[string]interface{} "Failed to update resource"
// @Router /projects/{sid}/resources/{resourceId} [put]
func UpdateResource(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	blockIDStr := c.Param("resourceId")
	blockID, err := strconv.ParseUint(blockIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	var request services.BlockResourceRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID for block update
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to edit project resources
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionEdit)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	block, err := services.UpdateProjectResource(uint(blockID), userID, request)
	if err != nil {
		if err.Error() == "resource block not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource updated successfully", "resource": block})
}

// DeleteResource deletes (archives) a resource block
// @Summary Delete project resource
// @Description Archives an existing resource block
// @Tags Projects,Resources
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param resourceId path int true "Block ID"
// @Success 200 {object} map[string]interface{} "Resource deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid resource ID"
// @Failure 404 {object} map[string]interface{} "Resource not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete resource"
// @Router /projects/{sid}/resources/{resourceId} [delete]
func DeleteResource(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	blockIDStr := c.Param("resourceId")
	blockID, err := strconv.ParseUint(blockIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	// Get user ID for block deletion
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to delete project resources
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionDelete)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	err = services.DeleteProjectResource(uint(blockID), userID)
	if err != nil {
		if err.Error() == "resource block not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource deleted successfully"})
}

// Workspace controller functions

// GetProjectWorkspaces retrieves all workspace blocks for a project
// @Summary Get project workspaces
// @Description Retrieves all workspace (page) blocks for a specific project
// @Tags Projects,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string][]models.Block "Workspaces retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve workspaces"
// @Router /projects/{sid}/workspaces [get]
func GetProjectWorkspaces(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get user ID for permission checking
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to view project workspaces
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionView)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	// Using page block type for workspaces
	pageBlockType := string(models.PageBlock)
	blocks, err := services.GetProjectContents(projectID, &pageBlockType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workspaces"})
		return
	}

	// Filter blocks by user's permissions
	filteredBlocks, err := services.FilterBlocksByGroup(userID, projectID, blocks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to filter workspaces by permission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workspaces": filteredBlocks})
}

// CreateWorkspace creates a new workspace (page) block for a project
// @Summary Create project workspace
// @Description Creates a new workspace (page block) for a specific project
// @Tags Projects,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspace body services.BlockContentRequest true "Workspace data"
// @Success 201 {object} map[string]interface{} "Workspace created successfully"
// @Success 201 {object} models.Block "Created workspace"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 500 {object} map[string]interface{} "Failed to create workspace"
// @Router /projects/{sid}/workspaces [post]
func CreateWorkspace(c *gin.Context) {
	var request services.BlockContentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Force block type to be page
	request.BlockType = string(models.PageBlock)

	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get user ID for block creation
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to edit project workspaces
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionEdit)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	block, err := services.CreateProjectContent(projectID, userID, request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Workspace created successfully", "workspace": block})
}

// UpdateWorkspace updates an existing workspace (page) block
// @Summary Update project workspace
// @Description Updates an existing workspace (page block)
// @Tags Projects,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Block ID"
// @Param workspace body services.BlockContentRequest true "Updated workspace data"
// @Success 200 {object} map[string]interface{} "Workspace updated successfully"
// @Success 200 {object} models.Block "Updated workspace"
// @Failure 400 {object} map[string]interface{} "Invalid request payload"
// @Failure 404 {object} map[string]interface{} "Workspace not found"
// @Failure 500 {object} map[string]interface{} "Failed to update workspace"
// @Router /projects/{sid}/workspaces/{workspaceId} [put]
func UpdateWorkspace(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	blockIDStr := c.Param("workspaceId")
	blockID, err := strconv.ParseUint(blockIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var request services.BlockContentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Force block type to be page
	request.BlockType = string(models.PageBlock)

	// Get user ID for block update
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to edit project workspaces
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionEdit)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	block, err := services.UpdateProjectContent(uint(blockID), userID, request)
	if err != nil {
		if err.Error() == "block not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace updated successfully", "workspace": block})
}

// DeleteWorkspace deletes (archives) a workspace (page) block
// @Summary Delete project workspace
// @Description Archives an existing workspace (page block)
// @Tags Projects,Workspaces
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Param workspaceId path int true "Block ID"
// @Success 200 {object} map[string]interface{} "Workspace deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid workspace ID"
// @Failure 404 {object} map[string]interface{} "Workspace not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete workspace"
// @Router /projects/{sid}/workspaces/{workspaceId} [delete]
func DeleteWorkspace(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	blockIDStr := c.Param("workspaceId")
	blockID, err := strconv.ParseUint(blockIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	// Get user ID for block deletion
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user has permission to delete project workspaces
	_, _, authErr := services.CheckProjectAccessOrOwnership(projectID, uint(userID), helper.PermissionDelete)
	if authErr != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": authErr.Error()})
		return
	}

	err = services.DeleteProjectContent(uint(blockID), userID)
	if err != nil {
		if err.Error() == "block not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
}

// InviteMemberHandler handles project member invitations
// @Summary Invite project member
// @Description Sends an invitation to join the project
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Param request body models.InviteMemberRequest true "Invitation request"
// @Success 200 {object} map[string]interface{} "Invitation sent successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 500 {object} map[string]interface{} "Failed to send invitation"
// @Router /projects/{sid}/invite [post]
func InviteMemberHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var req models.InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user has admin role to invite members
	userID := c.GetUint("userID")
	if err := services.CheckAdminRole(projectID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Create invitation
	invitation := models.ProjectInvitation{
		ProjectID:       projectID,
		Email:           req.Email,
		InvitedByUserID: userID,
		Role:            req.Role,
		Token:           helper.GenerateRandomToken(32),
		ExpiresAt:       time.Now().Add(time.Duration(7*24) * time.Hour), // 7 days expiry
	}

	if err := database.DB.Create(&invitation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invitation"})
		return
	}

	// Get project details for the email
	var project models.Project
	if err := database.DB.Where("project_id = ?", projectID).First(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project details"})
		return
	}

	// Get inviter details
	var inviter models.User
	if err := database.DB.Where("id = ?", userID).First(&inviter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inviter details"})
		return
	}

	// Get inviter's profile separately
	var inviterProfile models.Profile
	database.DB.Where("user_id = ?", userID).First(&inviterProfile)

	// Generate invitation link
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // Default fallback
	}
	invitationLink := fmt.Sprintf("%s/project/invite/%s", frontendURL, invitation.Token)

	// Get inviter name (prefer PreferredName from profile, then Username)
	inviterName := "Someone"
	if inviter.Username != nil {
		inviterName = *inviter.Username
	}
	if inviterProfile.PreferredName != nil && *inviterProfile.PreferredName != "" {
		inviterName = *inviterProfile.PreferredName
	}

	// Get project title
	projectTitle := "a project"
	if project.Title != nil {
		projectTitle = *project.Title
	}

	emailSubject := fmt.Sprintf("You've been invited to join %s on ProjectUp", projectTitle)
	emailBody := fmt.Sprintf(`
		<h2>Project Invitation</h2>
		<p>Hi there!</p>
		<p><strong>%s</strong> has invited you to join the project <strong>%s</strong> on ProjectUp as a %s.</p>
		<p>Click the link below to accept the invitation:</p>
		<p><a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
		<p>Or copy and paste this URL into your browser:</p>
		<p>%s</p>
		<p>This invitation will expire in 7 days.</p>
		<p>Best regards,<br>The ProjectUp Team</p>
	`, inviterName, projectTitle, req.Role, invitationLink, invitationLink)

	// Try Mailjet first, then PrivateEmail as fallback
	emailErr := helper.SendViaMailjet(req.Email, emailSubject, emailBody)
	emailSent := false
	if emailErr == nil {
		emailSent = true
	} else {
		// If Mailjet fails, try PrivateEmail as fallback
		emailErr = helper.SendViaPrivateEmail(req.Email, emailSubject, emailBody)
		if emailErr == nil {
			emailSent = true
		}
	}

	// Final status log
	if emailSent {
		log.Printf("✓ Invitation email sent to %s", req.Email)
	} else {
		log.Printf("✗ Failed to send invitation email to %s: %v", req.Email, emailErr)
	}

	// Check if the invited email belongs to an existing user
	var invitedUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&invitedUser).Error; err == nil {
		// User exists, create in-app notification
		// Store just the path for frontend navigation (not the full URL)
		notificationPath := fmt.Sprintf("/project/invite/%s", invitation.Token)
		notification := models.Notification{
			UserID:      invitedUser.ID,
			Type:        models.NotificationTypeInvitation,
			Title:       fmt.Sprintf("Project Invitation: %s", projectTitle),
			Description: fmt.Sprintf("%s invited you to join %s as a %s", inviterName, projectTitle, req.Role),
			URL:         notificationPath,
			IsRead:      false,
		}

		if err := database.DB.Create(&notification).Error; err != nil {
			log.Printf("Failed to create in-app notification for user %d: %v", invitedUser.ID, err)
			// Don't fail the request, just log the error
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invitation sent successfully",
		"token":   invitation.Token,
	})
}

// GetInvitationDetailsHandler gets invitation details by token
// @Summary Get invitation details
// @Description Gets invitation details for display before accepting
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param token path string true "Invitation Token"
// @Success 200 {object} map[string]interface{} "Invitation details"
// @Failure 404 {object} map[string]interface{} "Invitation not found"
// @Router /projects/invitations/{token} [get]
func GetInvitationDetailsHandler(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
		return
	}

	var invitation models.ProjectInvitation
	if err := database.DB.Where("token = ? AND status = 0", token).First(&invitation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found or already used"})
		return
	}

	// Check if expired
	if time.Now().After(invitation.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "Invitation has expired"})
		return
	}

	// Get project details
	var project models.Project
	database.DB.Where("project_id = ?", invitation.ProjectID).First(&project)

	// Get inviter details
	var inviter models.User
	var inviterProfile models.Profile
	database.DB.Where("id = ?", invitation.InvitedByUserID).First(&inviter)
	database.DB.Where("user_id = ?", invitation.InvitedByUserID).First(&inviterProfile)

	inviterName := "Someone"
	if inviter.Username != nil {
		inviterName = *inviter.Username
	}
	if inviterProfile.PreferredName != nil && *inviterProfile.PreferredName != "" {
		inviterName = *inviterProfile.PreferredName
	}

	projectTitle := "a project"
	if project.Title != nil {
		projectTitle = *project.Title
	}

	c.JSON(http.StatusOK, gin.H{
		"invitation": map[string]interface{}{
			"token":         invitation.Token,
			"project_title": projectTitle,
			"project_sid":   project.ShortID,
			"role":          invitation.Role,
			"inviter_name":  inviterName,
			"created_at":    invitation.CreatedAt,
			"expires_at":    invitation.ExpiresAt,
		},
	})
}

// CreateShareHandler creates a shareable link for the project
// @Summary Create project share link
// @Description Creates a shareable link with specified access level
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Param request body models.CreateShareRequest true "Share request"
// @Success 200 {object} map[string]interface{} "Share link created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 500 {object} map[string]interface{} "Failed to create share link"
// @Router /projects/{sid}/share [post]
func CreateShareHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var req models.CreateShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user has admin role to share project
	userID := c.GetUint("userID")
	if err := services.CheckAdminRole(projectID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Create share link
	share := models.ProjectShare{
		ProjectID:      projectID,
		SharedByUserID: userID,
		ShareToken:     helper.GenerateRandomToken(32),
		ExpiresAt:      time.Now().Add(time.Duration(req.ExpiryDays) * 24 * time.Hour),
		AccessLevel:    models.ShareAccessLevel(req.AccessLevel),
	}

	if err := database.DB.Create(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create share link"})
		return
	}

	shareLink := fmt.Sprintf("%s/project/%s?share=%s", os.Getenv("FRONTEND_URL"), sid, share.ShareToken)
	c.JSON(http.StatusOK, gin.H{
		"message":      "Share link created successfully",
		"link":         shareLink,
		"share_id":     share.ShareID,
		"share_token":  share.ShareToken,
		"access_level": share.AccessLevel,
		"expires_at":   share.ExpiresAt,
		"shared_by":    userID,
	})
}

// ListProjectSharesHandler lists all active shares for a project
// @Summary List project shares
// @Description Lists all active share links for a project with details
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project short ID"
// @Success 200 {object} map[string]interface{} "List of shares"
// @Failure 400 {object} map[string]interface{} "Invalid project SID"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 500 {object} map[string]interface{} "Failed to fetch shares"
// @Router /projects/{sid}/shares [get]
func ListProjectSharesHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Check if user has permission to view shares
	userID := c.GetUint("userID")
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	// Fetch all shares for the project
	var shares []models.ProjectShare
	if err := database.DB.
		Preload("SharedBy").
		Where("project_id = ? AND expires_at > ?", projectID, time.Now()).
		Order("created_at DESC").
		Find(&shares).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shares"})
		return
	}

	// Format shares for response
	type SharedByInfo struct {
		UserID    uint   `json:"user_id"`
		Username  string `json:"username"`
	}

	type ShareResponse struct {
		ShareID      uint                     `json:"share_id"`
		ShareToken   string                   `json:"share_token"`
		ShareLink    string                   `json:"share_link"`
		AccessLevel  models.ShareAccessLevel  `json:"access_level"`
		ExpiresAt    time.Time                `json:"expires_at"`
		CreatedAt    time.Time                `json:"created_at"`
		SharedBy     *SharedByInfo            `json:"shared_by,omitempty"`
	}

	var response []ShareResponse
	for _, share := range shares {
		shareResp := ShareResponse{
			ShareID:     share.ShareID,
			ShareToken:  share.ShareToken,
			ShareLink:   fmt.Sprintf("%s/project/%s?share=%s", os.Getenv("FRONTEND_URL"), sid, share.ShareToken),
			AccessLevel: share.AccessLevel,
			ExpiresAt:   share.ExpiresAt,
			CreatedAt:   share.CreatedAt,
		}

		if share.SharedBy != nil {
			username := ""
			if share.SharedBy.Username != nil {
				username = *share.SharedBy.Username
			}
			shareResp.SharedBy = &SharedByInfo{
				UserID:   share.SharedBy.ID,
				Username: username,
			}
		}

		response = append(response, shareResp)
	}

	c.JSON(http.StatusOK, gin.H{
		"shares": response,
		"count":  len(response),
	})
}

// DeleteShareHandler deletes/revokes a share link
// @Summary Delete project share
// @Description Revokes a share link for a project
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project short ID"
// @Param shareId path int true "Share ID"
// @Success 200 {object} map[string]interface{} "Share deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid parameters"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 404 {object} map[string]interface{} "Share not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete share"
// @Router /projects/{sid}/shares/{shareId} [delete]
func DeleteShareHandler(c *gin.Context) {
	sid := c.Param("sid")
	shareIDParam := c.Param("shareId")

	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	shareID, err := strconv.ParseUint(shareIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share ID"})
		return
	}

	// Check if user has admin role to delete shares
	userID := c.GetUint("userID")
	if err := services.CheckAdminRole(projectID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Verify share belongs to the project
	var share models.ProjectShare
	if err := database.DB.Where("share_id = ? AND project_id = ?", shareID, projectID).First(&share).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Share not found"})
		return
	}

	// Delete the share
	if err := database.DB.Delete(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete share"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Share deleted successfully",
	})
}

// GetSharedProjectHandler accesses a project via share token
// @Summary Access shared project
// @Description Access a project using a share token with specified permissions
// @Tags Projects
// @Accept json
// @Produce json
// @Param token query string true "Share token"
// @Success 200 {object} map[string]interface{} "Project details with access level"
// @Failure 400 {object} map[string]interface{} "Invalid token"
// @Failure 404 {object} map[string]interface{} "Share not found"
// @Failure 410 {object} map[string]interface{} "Share expired"
// @Failure 500 {object} map[string]interface{} "Failed to access project"
// @Router /projects/shared [get]
func GetSharedProjectHandler(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Share token is required"})
		return
	}

	// Find the share
	var share models.ProjectShare
	if err := database.DB.
		Preload("SharedBy").
		Where("share_token = ?", token).
		First(&share).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid share link"})
		return
	}

	// Check if expired
	if time.Now().After(share.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "This share link has expired"})
		return
	}

	// Fetch project details
	var project models.Project
	if err := database.DB.Where("id = ?", share.ProjectID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Return project with access level information
	username := ""
	if share.SharedBy.Username != nil {
		username = *share.SharedBy.Username
	}
	c.JSON(http.StatusOK, gin.H{
		"project":      project,
		"access_level": share.AccessLevel,
		"shared_by": map[string]interface{}{
			"user_id":  share.SharedBy.ID,
			"username": username,
		},
		"expires_at": share.ExpiresAt,
	})
}

// AcceptInvitationHandler handles invitation acceptance
// @Summary Accept project invitation
// @Description Accepts a project invitation and adds user as member
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body map[string]string true "Invitation token"
// @Success 200 {object} map[string]interface{} "Invitation accepted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid token"
// @Failure 404 {object} map[string]interface{} "Invitation not found"
// @Failure 410 {object} map[string]interface{} "Invitation expired"
// @Failure 500 {object} map[string]interface{} "Failed to accept invitation"
// @Router /projects/invitations/accept [post]
func AcceptInvitationHandler(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var invitation models.ProjectInvitation
	if err := database.DB.Where("token = ? AND status = 0", req.Token).First(&invitation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}

	if time.Now().After(invitation.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "Invitation has expired"})
		return
	}

	userID := c.GetUint("userID")

	// First, check if user is already an active member (removed_at IS NULL)
	var activeMember models.ProjectMember
	err := database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NULL", invitation.ProjectID, userID).First(&activeMember).Error

	if err == nil {
		// Already an active member
		log.Printf("AcceptInvitation: User %d is already an active member of project %d", userID, invitation.ProjectID)
		c.JSON(http.StatusConflict, gin.H{"error": "You are already a member of this project"})
		return
	} else if err != gorm.ErrRecordNotFound {
		// Database error when checking active members
		log.Printf("AcceptInvitation: Database error checking active member - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership status"})
		return
	}

	// Check if user was a removed member (removed_at IS NOT NULL)
	var removedMember models.ProjectMember
	err = database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NOT NULL", invitation.ProjectID, userID).First(&removedMember).Error

	if err == nil {
		// Member was removed, restore them by updating specific fields
		log.Printf("AcceptInvitation: Restoring removed member - User %d to project %d (was removed at: %v)", userID, invitation.ProjectID, removedMember.RemovedAt)
		now := time.Now()

		// Use raw SQL update to ensure removed_at is set to NULL
		result := database.DB.Exec(
			"UPDATE project_members SET removed_at = NULL, role = ?, permissions = ?, joined_at = ?, updated_at = ? WHERE project_id = ? AND user_id = ?",
			invitation.Role,
			helper.RoleToPermissions(invitation.Role),
			now,
			now,
			invitation.ProjectID,
			userID,
		)

		if result.Error != nil {
			log.Printf("AcceptInvitation: Failed to restore member - %v", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore member"})
			return
		}

		log.Printf("AcceptInvitation: Successfully restored member - User %d to project %d with role %s", userID, invitation.ProjectID, invitation.Role)
	} else if err == gorm.ErrRecordNotFound {
		// Create new project member (no existing active or removed member found)
		member := models.ProjectMember{
			ProjectID:   invitation.ProjectID,
			UserID:      userID,
			Role:        invitation.Role,
			Permissions: helper.RoleToPermissions(invitation.Role),
		}

		if err := database.DB.Create(&member).Error; err != nil {
			log.Printf("AcceptInvitation: Failed to create member - %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
			return
		}

		log.Printf("AcceptInvitation: Successfully created new member - User %d to project %d with role %s", userID, invitation.ProjectID, invitation.Role)
	} else {
		// Database error when checking removed members
		log.Printf("AcceptInvitation: Database error checking removed member - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership status"})
		return
	}

	// Update invitation status
	invitation.Status = 1 // Accepted
	if err := database.DB.Save(&invitation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invitation"})
		return
	}

	// Get project and user details for notification
	var project models.Project
	database.DB.Where("project_id = ?", invitation.ProjectID).First(&project)
	services.PostTeamJoined(project.ProjectID, strOrEmpty(project.Title), userID, "")

	var acceptedUser models.User
	var acceptedUserProfile models.Profile
	database.DB.Where("id = ?", userID).First(&acceptedUser)
	database.DB.Where("user_id = ?", userID).First(&acceptedUserProfile)

	acceptedUserName := "Someone"
	if acceptedUser.Username != nil {
		acceptedUserName = *acceptedUser.Username
	}
	if acceptedUserProfile.PreferredName != nil && *acceptedUserProfile.PreferredName != "" {
		acceptedUserName = *acceptedUserProfile.PreferredName
	}

	projectTitle := "a project"
	if project.Title != nil {
		projectTitle = *project.Title
	}

	// Get inviter email for notification
	var inviter models.User
	database.DB.Where("id = ?", invitation.InvitedByUserID).First(&inviter)

	// Send email to inviter/admin
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	projectLink := fmt.Sprintf("%s/project/%s/dashboard", frontendURL, project.ShortID)

	if inviter.Email != nil {
		emailSubject := fmt.Sprintf("%s accepted your invitation to %s", acceptedUserName, projectTitle)
		emailBody := fmt.Sprintf(`
			<h2>Invitation Accepted</h2>
			<p><strong>%s</strong> has accepted your invitation to join <strong>%s</strong> as a %s.</p>
			<p><a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Project</a></p>
			<p>Best regards,<br>The ProjectUp Team</p>
		`, acceptedUserName, projectTitle, invitation.Role, projectLink)

		// Try Mailjet first, then PrivateEmail as fallback
		emailErr := helper.SendViaMailjet(*inviter.Email, emailSubject, emailBody)
		emailSent := false
		if emailErr == nil {
			emailSent = true
		} else {
			// If Mailjet fails, try PrivateEmail as fallback
			emailErr = helper.SendViaPrivateEmail(*inviter.Email, emailSubject, emailBody)
			if emailErr == nil {
				emailSent = true
			}
		}

		// Final status log
		if emailSent {
			log.Printf("✓ Acceptance email sent to %s", *inviter.Email)
		} else {
			log.Printf("✗ Failed to send acceptance email to %s: %v", *inviter.Email, emailErr)
		}
	}

	// Create in-app notification for inviter/admin
	notificationPath := fmt.Sprintf("/project/%s/dashboard?section=members", project.ShortID)
	notification := models.Notification{
		UserID:      invitation.InvitedByUserID,
		Type:        models.NotificationTypeInvitation,
		Title:       fmt.Sprintf("Invitation Accepted: %s", projectTitle),
		Description: fmt.Sprintf("%s accepted your invitation to join %s as a %s", acceptedUserName, projectTitle, invitation.Role),
		URL:         notificationPath,
		IsRead:      false,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		log.Printf("Failed to create acceptance notification for admin %d: %v", invitation.InvitedByUserID, err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Invitation accepted successfully",
		"project_sid": project.ShortID,
	})
}

// DeclineInvitationHandler handles invitation decline
// @Summary Decline project invitation
// @Description Declines a project invitation and notifies the inviter
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body map[string]string true "Invitation token"
// @Success 200 {object} map[string]interface{} "Invitation declined successfully"
// @Failure 400 {object} map[string]interface{} "Invalid token"
// @Failure 404 {object} map[string]interface{} "Invitation not found"
// @Failure 500 {object} map[string]interface{} "Failed to decline invitation"
// @Router /projects/invitations/decline [post]
func DeclineInvitationHandler(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var invitation models.ProjectInvitation
	if err := database.DB.Where("token = ? AND status = 0", req.Token).First(&invitation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}

	userID := c.GetUint("userID")

	// Update invitation status to declined (2)
	invitation.Status = 2
	if err := database.DB.Save(&invitation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invitation"})
		return
	}

	// Get project and user details for notification
	var project models.Project
	database.DB.Where("project_id = ?", invitation.ProjectID).First(&project)

	var declinedUser models.User
	var declinedUserProfile models.Profile
	database.DB.Where("id = ?", userID).First(&declinedUser)
	database.DB.Where("user_id = ?", userID).First(&declinedUserProfile)

	declinedUserName := "Someone"
	if declinedUser.Username != nil {
		declinedUserName = *declinedUser.Username
	}
	if declinedUserProfile.PreferredName != nil && *declinedUserProfile.PreferredName != "" {
		declinedUserName = *declinedUserProfile.PreferredName
	}

	projectTitle := "a project"
	if project.Title != nil {
		projectTitle = *project.Title
	}

	// Get inviter email for notification
	var inviter models.User
	database.DB.Where("id = ?", invitation.InvitedByUserID).First(&inviter)

	// Send email to inviter/admin
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	projectLink := fmt.Sprintf("%s/project/%s/dashboard", frontendURL, project.ShortID)

	if inviter.Email != nil {
		emailSubject := fmt.Sprintf("%s declined your invitation to %s", declinedUserName, projectTitle)
		emailBody := fmt.Sprintf(`
			<h2>Invitation Declined</h2>
			<p><strong>%s</strong> has declined your invitation to join <strong>%s</strong>.</p>
			<p><a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Project</a></p>
			<p>Best regards,<br>The ProjectUp Team</p>
		`, declinedUserName, projectTitle, projectLink)

		// Try Mailjet first, then PrivateEmail as fallback
		emailErr := helper.SendViaMailjet(*inviter.Email, emailSubject, emailBody)
		emailSent := false
		if emailErr == nil {
			emailSent = true
		} else {
			// If Mailjet fails, try PrivateEmail as fallback
			emailErr = helper.SendViaPrivateEmail(*inviter.Email, emailSubject, emailBody)
			if emailErr == nil {
				emailSent = true
			}
		}

		// Final status log
		if emailSent {
			log.Printf("✓ Decline email sent to %s", *inviter.Email)
		} else {
			log.Printf("✗ Failed to send decline email to %s: %v", *inviter.Email, emailErr)
		}
	}

	// Create in-app notification for inviter/admin
	notificationPath := fmt.Sprintf("/project/%s/dashboard?section=settings", project.ShortID)
	notification := models.Notification{
		UserID:      invitation.InvitedByUserID,
		Title:       fmt.Sprintf("Invitation Declined: %s", projectTitle),
		Description: fmt.Sprintf("%s declined your invitation to join %s", declinedUserName, projectTitle),
		URL:         notificationPath,
		IsRead:      false,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		log.Printf("Failed to create decline notification for admin %d: %v", invitation.InvitedByUserID, err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invitation declined successfully",
	})
}

// TransferOwnershipHandler handles the transfer of project ownership
// @Summary Transfer project ownership
// @Description Transfers project ownership to another member
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Param request body map[string]uint true "New owner ID"
// @Success 200 {object} map[string]interface{} "Ownership transferred successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 403 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Failed to transfer ownership"
// @Router /projects/{sid}/transfer [post]
func TransferOwnershipHandler(c *gin.Context) {
	sid := c.Param("sid")
	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	var req struct {
		NewOwnerID uint `json:"new_owner_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currentUserID := c.GetUint("userID")
	if err := services.TransferProjectOwnership(projectID, currentUserID, req.NewOwnerID); err != nil {
		if err.Error() == "unauthorized to transfer project ownership" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project ownership transferred successfully"})
}

// UpdateApplicationStatusHandler handles accepting or declining a project application
// @Summary Update application status
// @Description Accept or decline a project application
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param application_id path uint true "Application ID"
// @Param action query string true "Action to perform (accept/decline)"
// @Success 200 {object} map[string]interface{} "Application status updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Application not found"
// @Router /projects/applications/{application_id} [put]
func UpdateApplicationStatusHandler(c *gin.Context) {
	// Get application ID from URL
	applicationID, err := strconv.ParseUint(c.Param("application_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid application ID"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var request struct {
		Status      int   `json:"status" binding:"required,oneof=0 1 2"` // 0: Pending (Reconsider), 1: Accept, 2: Decline
		GroupID     *uint `json:"group_id,omitempty"`                    // Optional group to assign to
		Permissions *uint `json:"permissions,omitempty"`                 // Optional permissions bitmask
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		// Log the error and request body for debugging
		var requestBody map[string]interface{}
		c.ShouldBindJSON(&requestBody)
		fmt.Printf("Invalid request format: %v, Request body: %+v\n", err, requestBody)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get application details without preloading
	var application models.ProjectApplication
	if err := database.DB.First(&application, applicationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
		return
	}

	// Get post details to verify project ownership
	var post models.ProjectPost
	if err := database.DB.First(&post, application.PostID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
		return
	}

	// Verify user is the project owner
	var project models.Project
	if err := database.DB.First(&project, post.ProjectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.GetUserID() != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only project owner can update application status"})
		return
	}

	// Update application status - handling reconsider (status 0) as a special case
	if request.Status == 0 {
		// Simply update the application status to pending without adding as member
		if err := database.DB.Model(&models.ProjectApplication{}).Where("application_id = ?", applicationID).Update("status", 0).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application status"})
			return
		}
	} else {
		// For accept (1) or decline (2), use the full service function with group and permissions if provided
		var groupID uint
		var permissions uint

		// If accepting and group assignment is requested
		if request.Status == 1 {
			// Set permissions if provided
			if request.Permissions != nil {
				permissions = *request.Permissions
			}

			// Set group ID if provided (otherwise leave as 0)
			if request.GroupID != nil {
				groupID = *request.GroupID
			}
		}

		if err := services.UpdateApplicationStatusAndAddMember(uint(applicationID), request.Status, groupID, permissions); err != nil {
			if err.Error() == "user already has an accepted application for this project" {
				c.JSON(http.StatusConflict, gin.H{"error": "This user already has an accepted application for this project"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application status"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application status updated successfully"})
}

// GetApplicationQuestionsWithAnswersHandler retrieves all questions and their answers for a project post
// @Summary Get application questions with answers
// @Description Retrieves all application questions and their answers for a project post
// @Tags Projects
// @Accept json
// @Produce json
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Questions and answers retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project SID"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve questions and answers"
// @Router /projects/{sid}/application-questions [get]
func GetApplicationQuestionsWithAnswersHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
			return
		}

		// The dashboard passes the project's short ID and the apply page the post's, so accept either
		var post struct {
			PostID    uint
			ProjectID uint
		}
		lookup := func(column string) error {
			return database.DB.Model(&models.ProjectPost{}).
				Select("project_posts.post_id, project_posts.project_id").
				Joins("JOIN projects ON project_posts.project_id = projects.project_id").
				Where(column+" = ?", sid).
				Take(&post).Error
		}
		if err := lookup("projects.sid"); err != nil {
			if err := lookup("project_posts.sid"); err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
				return
			}
		}

		// Get questions and applications with answers
		questions, applications, err := services.GetApplicationQuestionsWithAnswersService(post.PostID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions and answers"})
			return
		}

		// Applicants need the questions to apply, but only the owner and admins
		// may see who applied and what they answered
		permissions := services.GetUserProjectPermissions(post.ProjectID, c.GetUint("userID"))
		if permissions&helper.PermissionManageTeam == 0 {
			for i := range questions {
				questions[i].Answers = nil
			}
			c.JSON(http.StatusOK, gin.H{"questions": questions, "applications": []interface{}{}})
			return
		}

		// Group answers by application ID
		answersByApplication := make(map[uint][]models.ApplicationAnswer)
		for _, question := range questions {
			for _, answer := range question.Answers {
				answersByApplication[answer.ApplicationID] = append(answersByApplication[answer.ApplicationID], answer)
			}
		}

		// Combine applications with their answers
		response := struct {
			Applications []struct {
				models.ProjectApplication
				UserID        uint                       `json:"user_id"`
				PreferredName *string                    `json:"preferred_name"`
				FirstName     *string                    `json:"first_name"`
				LastName      *string                    `json:"last_name"`
				Username      *string                    `json:"username"`
				Avatar        *string                    `json:"avatar"`
				Answers       []models.ApplicationAnswer `json:"answers"`
			} `json:"applications"`
			Questions []models.ApplicationQuestion `json:"questions"`
		}{
			Questions: questions,
		}

		// Add answers to each application
		for _, app := range applications {
			appWithAnswers := struct {
				models.ProjectApplication
				UserID        uint                       `json:"user_id"`
				PreferredName *string                    `json:"preferred_name"`
				FirstName     *string                    `json:"first_name"`
				LastName      *string                    `json:"last_name"`
				Username      *string                    `json:"username"`
				Avatar        *string                    `json:"avatar"`
				Answers       []models.ApplicationAnswer `json:"answers"`
			}{
				ProjectApplication: app.ProjectApplication,
				UserID:             app.UserID,
				PreferredName:      app.PreferredName,
				FirstName:          app.FirstName,
				LastName:           app.LastName,
				Username:           app.Username,
				Avatar:             app.Avatar,
				Answers:            answersByApplication[app.ApplicationID],
			}
			response.Applications = append(response.Applications, appWithAnswers)
		}

		c.JSON(http.StatusOK, response)
	}
}

// Added back the function that was removed
func GetProjects() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

		projectType := c.Query("type") // "owned" or "joined"
		var projects []models.Project

		switch projectType {
		case "owned":
			// Filter out soft-deleted projects (deleted_at IS NULL) and projects with status = 4 (Deleted)
			if err := database.DB.Where("owner_id = ? AND deleted_at IS NULL AND status != ?", userID, 4).Find(&projects).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch owned projects"})
				return
			}
			fmt.Printf("GetProjects: Found %d owned projects for user %v\n", len(projects), userID)
			// Log each project's status and deleted_at for debugging
			for i, p := range projects {
				fmt.Printf("  Project %d: sid=%s, status=%d, deleted_at=%v\n", i+1, p.ShortID, p.Status, p.DeletedAt)
			}
		case "joined":
			query := database.DB.
				Joins("JOIN project_members ON project_members.project_id = projects.project_id").
				Where("project_members.user_id = ? AND projects.owner_id != ? AND project_members.removed_at IS NULL AND projects.deleted_at IS NULL AND projects.status != ?", userID, userID, 4)

			// Debug: Log the SQL query
			sql := query.ToSQL(func(tx *gorm.DB) *gorm.DB {
				return tx.Find(&projects)
			})
			fmt.Printf("GetProjects SQL for joined: %s\n", sql)

			if err := query.Find(&projects).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch joined projects"})
				return
			}

			fmt.Printf("GetProjects: Found %d joined projects for user %v\n", len(projects), userID)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project type"})
			return
		}

		// OPTIMIZATION: Batch load all project posts and members in one query to avoid N+1
		var projectPosts []models.ProjectPost
		projectPostMap := make(map[uint]models.ProjectPost)
		var projectMembers []models.ProjectMember
		projectMemberMap := make(map[uint]models.ProjectMember)

		if len(projects) > 0 {
			projectIDs := make([]uint, len(projects))
			for i, p := range projects {
				projectIDs[i] = p.ProjectID
			}

			// Load all project posts in one query
			database.DB.Where("project_id IN ?", projectIDs).Find(&projectPosts)
			for _, pp := range projectPosts {
				projectPostMap[pp.ProjectID] = pp
			}

			// Load all project members for this user in one query
			database.DB.Where("project_id IN ? AND user_id = ?", projectIDs, userID).Find(&projectMembers)
			for _, pm := range projectMembers {
				projectMemberMap[pm.ProjectID] = pm
			}
		}

		// Create a list to hold projects with interaction data
		projectsWithInteractions := make([]map[string]interface{}, 0, len(projects))

		// For each project, get its associated project post and check interactions
		for _, project := range projects {
			// Convert project to map to add interaction fields
			projectMap := make(map[string]interface{})
			projectBytes, _ := json.Marshal(project)
			json.Unmarshal(projectBytes, &projectMap)

			// Explicitly include is_published status in the response
			projectMap["is_published"] = project.IsPublished

			// Add user's role in the project
			if project.OwnerID == userID.(uint) {
				projectMap["user_role"] = "owner"
				projectMap["is_removed"] = false
			} else {
				// OPTIMIZATION: Look up member from preloaded map
				if member, exists := projectMemberMap[project.ProjectID]; exists {
					fmt.Printf("GetProjects: Member data for user %v in project %d - Role: %s, RemovedAt: %v\n", userID, project.ProjectID, member.Role, member.RemovedAt)
					projectMap["user_role"] = member.Role
					projectMap["is_removed"] = member.RemovedAt != nil
					if member.RemovedAt != nil {
						projectMap["removed_at"] = member.RemovedAt
					}
				} else {
					fmt.Printf("GetProjects: No member record found for user %v in project %d\n", userID, project.ProjectID)
					projectMap["user_role"] = "viewer" // Default fallback
					projectMap["is_removed"] = false
				}
			}

			// OPTIMIZATION: Look up project post from preloaded map
			if projectPost, exists := projectPostMap[project.ProjectID]; exists {
				// Add post information to project map
				projectMap["post_id"] = projectPost.PostID
				projectMap["post_sid"] = projectPost.ShortID
				// Covers are usually set on the recruiting post
				if (project.Cover == nil || *project.Cover == "") && projectPost.Cover != nil && *projectPost.Cover != "" {
					projectMap["cover"] = *projectPost.Cover
				}

				// Get interaction data using the new generic interaction service
				interactions, _ := services.GetEntityInteractions(userID.(uint), models.EntityTypeProjectPost, projectPost.PostID)

				// Add all interaction data to the project map
				for k, v := range interactions {
					projectMap[k] = v
				}
			}

			projectsWithInteractions = append(projectsWithInteractions, projectMap)
		}

		c.JSON(http.StatusOK, gin.H{"projects": projectsWithInteractions})
	}
}

// Added back the function that was removed
func GetProjectDetailsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		sid := c.Param("sid")
		if sid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sid is required"})
			return
		}

		projectID, err := resolveSIDToProjectID(sid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
			return
		}

		projectDetails, err := repositories.GetProjectDetails(projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project details"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"project": projectDetails})
	}
}

// Added back the function that was removed
func GetApplicationQuestionsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		shortId := c.Query("shortId")
		if shortId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "shortId is required"})
			return
		}

		// Get post ID from short ID
		var postID uint
		if err := database.DB.Model(&models.ProjectPost{}).Where("sid = ?", shortId).Select("post_id").First(&postID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
			return
		}

		questions, err := repositories.GetApplicationQuestions(postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch application questions"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"questions": questions})
	}
}

// ToggleProjectPublishHandler toggles the isPublished status of a project
func ToggleProjectPublishHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get project shortID from URL
		projectSid := c.Param("sid")
		if projectSid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project ID is required"})
			return
		}

		// Get user ID from context
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Find the project by shortID
		var project models.Project
		if err := database.DB.Where("sid = ?", projectSid).First(&project).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			}
			return
		}

		// Verify that the user is the owner of the project
		if project.OwnerID != userID.(uint) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this project"})
			return
		}

		// Toggle the isPublished field
		newStatus := !project.IsPublished

		// Update the project in the database
		if err := database.DB.Model(&project).Update("is_published", newStatus).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project publish status"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":      true,
			"message":      "Project publish status updated",
			"is_published": newStatus,
		})
	}
}

// CheckApplicationStatusHandler checks if a user has an existing application for a project post
// @Summary Check application status
// @Description Checks if the current user has an existing application for a specific project post
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param postId query integer true "Post ID"
// @Success 200 {object} map[string]interface{} "Application status information"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 500 {object} map[string]string "Server error"
// @Router /projects/applications/status [get]
func CheckApplicationStatusHandler(c *gin.Context) {
	userID := c.GetUint("userID")
	postIDStr := c.Query("postId")

	postID, err := strconv.ParseUint(postIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID format"})
		return
	}

	// Check if user can reapply
	canReapply, err := services.CanUserReapply(userID, uint(postID))

	var status string
	var message string
	var statusCode int

	if err != nil {
		// There is an application and we can't reapply
		status = "existing"
		message = err.Error()

		// Check the specific error to determine if it's pending or accepted
		if strings.Contains(message, "pending") {
			statusCode = 0 // Pending
		} else if strings.Contains(message, "accepted") {
			statusCode = 1 // Accepted
		} else {
			statusCode = -1 // Other status
		}
	} else if canReapply {
		// We can apply or reapply
		status = "can_apply"
		message = "You can submit an application for this project"
		statusCode = -1 // No current application or rejected application
	} else {
		// Unexpected situation
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to determine application status"})
		return
	}

	response := gin.H{
		"status":     status,
		"message":    message,
		"statusCode": statusCode,
	}
	// Show applicants where a pending application is in the founder's review
	if statusCode == 0 {
		var latest models.ProjectApplication
		if err := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Order("created_at DESC").First(&latest).Error; err == nil {
			response["stage"] = normalizeStage(latest.Stage)
			if latest.TrialTask != "" {
				response["trial_task"] = latest.TrialTask
				response["trial_due"] = latest.TrialDue
			}
		}
	}
	c.JSON(http.StatusOK, response)
}

// SaveAllHandler creates a new project and its post in a single request
// @Summary Create project and post together
// @Description Creates a new project and its associated post in a single operation, with optional roadmap data
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body object true "Project and post data"
// @Success 200 {object} map[string]interface{} "Project and post created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Failed to create project or post"
// @Router /projects/save-all [post]
func SaveAllHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// First check if this is a multipart form request
		isMultipart := strings.HasPrefix(c.Request.Header.Get("Content-Type"), "multipart/form-data")

		var request services.SaveAllRequest

		if isMultipart {
			// Parse multipart form for file uploads
			if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data: " + err.Error()})
				return
			}

			// Bind form data to request
			if err := c.ShouldBind(&request); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			// Create a temporary project to handle uploads
			tempProject := &models.Project{}
			tempWrapper := &services.ProjectWrapper{Project: tempProject}

			// Handle file uploads
			bucketName := os.Getenv("AWS_BUCKET_NAME")
			if err := services.HandleCoverUpload(c, bucketName, tempWrapper); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload cover: " + err.Error()})
				return
			}

			if err := services.HandleMediaUploads(c, bucketName, tempWrapper); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload media: " + err.Error()})
				return
			}

			// Copy uploaded file paths to request
			if tempProject.Cover != nil {
				request.Cover = *tempProject.Cover
			}

			// Extract media URLs
			var mediaURLs []interface{}
			if len(tempProject.ProjectMediaURL) > 0 {
				var mediaArray []string
				if err := json.Unmarshal(tempProject.ProjectMediaURL, &mediaArray); err == nil {
					for _, url := range mediaArray {
						mediaURLs = append(mediaURLs, url)
					}
					request.Media = mediaURLs
				}
			}
		} else {
			// Parse JSON request body
			if err := c.ShouldBindJSON(&request); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}

		// Use the service function to save the project with all components
		result, err := services.SaveProjectWithComponents(userID.(uint), request)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Return success response with created project and post details
		response := gin.H{
			"message":     "Project created successfully",
			"project":     result.Project,
			"projectId":   result.Project.ProjectID,
			"projectSid":  result.Project.ShortID,
			"projectSlug": result.Project.Slug,
		}

		// Add post details if a post was created
		if result.PostID > 0 {
			response["postId"] = result.PostID
			response["postSid"] = result.PostShortID
		}

		c.JSON(http.StatusOK, response)
	}
}
// DeleteProjectHandler soft deletes a project by setting status to 4
// @Summary Delete project
// @Description Soft deletes a project by setting status to 4 (Deleted)
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Project deleted successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete project"
// @Router /project/{sid}/delete [post]
func DeleteProjectHandler(c *gin.Context) {
	sid := c.Param("sid")
	if sid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
		return
	}

	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get authenticated user ID
	userID := c.GetUint("userID")

	// Get the project to check ownership
	var project models.Project
	if err := database.DB.Where("project_id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
		}
		return
	}

	// Only the project owner can delete the project
	if project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the project owner can delete the project"})
		return
	}

	// Soft delete: Set status to 4 (Deleted)
	now := time.Now()
	result := database.DB.Model(&models.Project{}).
		Where("project_id = ?", projectID).
		Updates(map[string]interface{}{
			"status":     4,
			"updated_at": now,
			"deleted_at": now, // Also set GORM's soft delete field
		})

	if result.Error != nil {
		log.Printf("DeleteProject: Error updating project %d: %v\n", projectID, result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found or already deleted"})
		return
	}
	services.UnlinkIdeaDraft(database.DB, projectID)

	log.Printf("DeleteProject: Successfully deleted project %d (sid: %s) by user %d\n", projectID, sid, userID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Project deleted successfully",
	})
}

// ArchiveProjectHandler archives a project by setting status to 2
// @Summary Archive project
// @Description Archives a project by setting status to 2 (Archived)
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Project archived successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to archive project"
// @Router /project/{sid}/archive [post]
func ArchiveProjectHandler(c *gin.Context) {
	sid := c.Param("sid")
	if sid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
		return
	}

	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get authenticated user ID
	userID := c.GetUint("userID")

	// Check if user has admin role
	if err := services.CheckAdminRole(projectID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Set status to 2 (Archived)
	now := time.Now()
	result := database.DB.Model(&models.Project{}).
		Where("project_id = ? AND status != ?", projectID, 4). // Don't archive already deleted projects
		Updates(map[string]interface{}{
			"status":     2,
			"updated_at": now,
		})

	if result.Error != nil {
		log.Printf("ArchiveProject: Error updating project %d: %v\n", projectID, result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive project"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found or cannot be archived"})
		return
	}

	log.Printf("ArchiveProject: Successfully archived project %d (sid: %s) by user %d\n", projectID, sid, userID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Project archived successfully",
	})
}

// CompleteProjectHandler marks a project as completed by setting status to 3
// @Summary Mark project as completed
// @Description Marks a project as completed by setting status to 3 (Completed)
// @Tags Projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param sid path string true "Project Short ID"
// @Success 200 {object} map[string]interface{} "Project marked as completed successfully"
// @Failure 400 {object} map[string]interface{} "Invalid project ID"
// @Failure 403 {object} map[string]interface{} "Insufficient permissions"
// @Failure 404 {object} map[string]interface{} "Project not found"
// @Failure 500 {object} map[string]interface{} "Failed to complete project"
// @Router /project/{sid}/complete [post]
func CompleteProjectHandler(c *gin.Context) {
	sid := c.Param("sid")
	if sid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project SID is required"})
		return
	}

	projectID, err := resolveSIDToProjectID(sid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project SID"})
		return
	}

	// Get authenticated user ID
	userID := c.GetUint("userID")

	// Check if user has admin role
	if err := services.CheckAdminRole(projectID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Set status to 3 (Completed)
	now := time.Now()
	result := database.DB.Model(&models.Project{}).
		Where("project_id = ? AND status != ?", projectID, 4). // Don't complete deleted projects
		Updates(map[string]interface{}{
			"status":     3,
			"updated_at": now,
		})

	if result.Error != nil {
		log.Printf("CompleteProject: Error updating project %d: %v\n", projectID, result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark project as completed"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found or cannot be completed"})
		return
	}

	log.Printf("CompleteProject: Successfully marked project %d (sid: %s) as completed by user %d\n", projectID, sid, userID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Project marked as completed successfully",
	})
}
