package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const PermissionInvite = 1 << 6 // 64 in decimal

type Uploadable interface {
	SetCover(cover string)
	SetMedia(media []string)
}

type ProjectWrapper struct {
	Project *models.Project
}

func (pw *ProjectWrapper) SetCover(cover string) {
	pw.Project.Cover = &cover
}

func (pw *ProjectWrapper) SetMedia(media []string) {
	mediaJSON, _ := json.Marshal(media)
	pw.Project.ProjectMediaURL = datatypes.JSON(mediaJSON)
}

type ProjectPostWrapper struct {
	ProjectPost *models.ProjectPost
}

func (ppw *ProjectPostWrapper) SetCover(cover string) {
	ppw.ProjectPost.Cover = &cover
}

func (ppw *ProjectPostWrapper) SetMedia(media []string) {
	mediaJSON, _ := json.Marshal(media)
	ppw.ProjectPost.Medias = datatypes.JSON(mediaJSON)
}

func HandleCoverUpload(c *gin.Context, bucketName string, uploadable interface{ SetCover(string) }) error {
	coverFile, err := c.FormFile("cover")
	if err == nil {
		coverPath := "./" + coverFile.Filename
		if saveErr := c.SaveUploadedFile(coverFile, coverPath); saveErr == nil {
			fileHash, _ := helper.GenerateFileHash(coverPath)
			uniqueCoverFilename := "media/" + fileHash + "_" + coverFile.Filename
			uploadErr := helper.UploadFileIfUnique(bucketName, uniqueCoverFilename, coverPath, true)
			if uploadErr == nil {
				uploadable.SetCover(uniqueCoverFilename)
				os.Remove(coverPath)
			} else {
				return errors.New("failed to upload cover to s3")
			}
		}
	}
	return nil
}

func HandleMediaUploads(c *gin.Context, bucketName string, uploadable interface{ SetMedia([]string) }) error {
	mediaFiles := c.Request.MultipartForm.File["media"]
	var mediaPaths []string
	for _, mediaFile := range mediaFiles {
		mediaPath := "./" + mediaFile.Filename
		if saveErr := c.SaveUploadedFile(mediaFile, mediaPath); saveErr == nil {
			fileHash, _ := helper.GenerateFileHash(mediaPath)
			uniqueMediaFilename := "media/" + fileHash + "_" + mediaFile.Filename
			uploadErr := helper.UploadFile(bucketName, uniqueMediaFilename, mediaPath, true)
			if uploadErr == nil {
				mediaPaths = append(mediaPaths, uniqueMediaFilename)
				os.Remove(mediaPath)
			} else {
				return errors.New("failed to upload media to s3")
			}
		}
	}
	uploadable.SetMedia(mediaPaths)
	return nil
}

func SaveProject(project *models.Project) error {
	if err := repositories.CreateProject(project); err != nil {
		return err
	}

	// Create Main workspace for the project (hierarchical workspace architecture)
	mainColor := "#3B82F6"
	mainIcon := "🎯"
	mainDesc := "Project leadership and overview workspace"

	mainWorkspace := models.ProjectGroup{
		ProjectID:     project.ProjectID,
		ParentID:      nil, // No parent - this is the main workspace
		Name:          "Main",
		Description:   &mainDesc,
		IsMain:        true,
		Level:         0,
		WorkspaceType: "main",
		Color:         &mainColor,
		Icon:          &mainIcon,
		SortOrder:     0,
	}

	err := database.DB.Create(&mainWorkspace).Error
	if err != nil {
		fmt.Printf("Warning: Could not create Main workspace: %v\n", err)
		return nil
	}

	// Add project owner to Main workspace as admin
	mainMember := models.ProjectGroupMember{
		ProjectID: project.ProjectID,
		UserID:    project.GetUserID(),
		GroupID:   mainWorkspace.GroupID,
		Role:      "admin",
		JoinedAt:  time.Now(),
	}

	err = database.DB.Create(&mainMember).Error
	if err != nil {
		fmt.Printf("Warning: Could not add owner to Main workspace: %v\n", err)
	}

	// Create suggested child workspaces
	suggestedWorkspaces := []struct {
		Name  string
		Icon  string
		Color string
	}{
		{"Development", "💻", "#10B981"},
		{"Marketing", "📢", "#F59E0B"},
		{"Operations", "⚙️", "#8B5CF6"},
	}

	for i, ws := range suggestedWorkspaces {
		childWorkspace := models.ProjectGroup{
			ProjectID:     project.ProjectID,
			ParentID:      &mainWorkspace.GroupID,
			Name:          ws.Name,
			IsMain:        false,
			Level:         1,
			WorkspaceType: "team",
			Icon:          &ws.Icon,
			Color:         &ws.Color,
			SortOrder:     i + 1,
		}

		err = database.DB.Create(&childWorkspace).Error
		if err != nil {
			fmt.Printf("Warning: Could not create %s workspace: %v\n", ws.Name, err)
		}
	}

	// Also add the owner to the project_members table for backward compatibility
	projectMember := models.ProjectMember{
		ProjectID:   project.ProjectID,
		UserID:      project.GetUserID(),
		Role:        "admin",
		Permissions: helper.RoleToPermissions("admin"), // Set permissions based on role
	}
	err = database.DB.Create(&projectMember).Error
	if err != nil {
		fmt.Printf("Warning: Could not add owner to project members: %v\n", err)
	}

	return nil
}

func generateShortID(project *models.Project) error {
	return repositories.GenerateProjectShortID(project)
}

func generateSlug(project *models.Project, title string) error {
	return repositories.GenerateSlug(project, title)
}

func ParseTimeFields(startTimeStr, deadlineStr string, startTime, deadline **time.Time) error {
	if startTimeStr != "" {
		parsedStartTime, err := time.Parse("2006-01-02", startTimeStr)
		if err != nil {
			return errors.New("invalid start time format")
		}
		*startTime = &parsedStartTime
	}

	if deadlineStr != "" {
		parsedDeadline, err := time.Parse("2006-01-02", deadlineStr)
		if err != nil {
			return errors.New("invalid deadline format")
		}
		*deadline = &parsedDeadline
	}

	return nil
}

func HandleProjectFormData(c *gin.Context, userID uint, project *models.Project) error {
	title := c.PostForm("name")
	topic := c.PostForm("topic")
	typeField := c.PostForm("type")
	communicationApp := c.PostForm("communicationApp")
	description := c.PostForm("description")
	location := c.PostForm("location")
	school := c.PostForm("school")
	class := c.PostForm("class")

	project.ProjectType = &typeField
	project.CommunicationApp = &communicationApp
	project.Title = &title
	project.Topic = datatypes.JSON([]byte(topic))
	project.Description = &description
	project.Location = &location
	project.Status = 1
	project.SetUserID(userID)
	project.School = &school
	project.Class = &class

	if err := generateShortID(project); err != nil {
		return err
	}

	if err := generateSlug(project, title); err != nil {
		return err
	}

	if err := ParseTimeFields(c.PostForm("startTime"), c.PostForm("deadline"), &project.StartTime, &project.EndTime); err != nil {
		return err
	}

	bucketName := os.Getenv("AWS_BUCKET_NAME")
	projectWrapper := &ProjectWrapper{Project: project}
	if err := HandleCoverUpload(c, bucketName, projectWrapper); err != nil {
		return err
	}

	if err := HandleMediaUploads(c, bucketName, projectWrapper); err != nil {
		return err
	}

	return nil
}

func HandleProjectPostCreation(c *gin.Context) error {
	var projectPost models.ProjectPost

	// Parse form data
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		return errors.New("failed to parse form data: " + err.Error())
	}

	// Log received data for debugging
	fmt.Println("Received form fields:")
	for key, values := range c.Request.PostForm {
		fmt.Printf("  %s: %v\n", key, values)
	}

	// Extract form fields
	userIDStr := c.PostForm("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		return errors.New("invalid user ID: " + err.Error())
	}

	projectIDStr := c.PostForm("projectId")
	projectID, err := strconv.ParseUint(projectIDStr, 10, 64)
	if err != nil {
		return errors.New("invalid project ID: " + err.Error())
	}

	visibilityStr := c.PostForm("visibility")
	visibility, _ := strconv.Atoi(visibilityStr)
	description := c.PostForm("description")
	location := c.PostForm("location")

	// Populate projectPost fields
	projectPost.UserID = uint(userID)
	projectPost.ProjectID = uint(projectID)
	projectPost.Title = c.PostForm("title")
	projectPost.Description = &description
	projectPost.Visibility = int(visibility)
	projectPost.Location = &location
	projectPost.Status = 1

	if err := repositories.GenerateProjectPostShortID(&projectPost); err != nil {
		return errors.New("failed to generate short ID: " + err.Error())
	}

	// Parse time fields
	if err := ParseTimeFields(c.PostForm("startDate"), c.PostForm("deadline"), &projectPost.StartTime, &projectPost.Deadline); err != nil {
		return errors.New("error parsing time fields: " + err.Error())
	}

	// Parse media fields
	positionsStr := c.PostForm("positions")
	if positionsStr != "" {
		var positions []map[string]interface{}
		if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
			return errors.New("invalid positions format: " + err.Error())
		}

		// Convert the positions to the expected JSON format
		spotsData := make([]map[string]interface{}, 0, len(positions))
		for _, position := range positions {
			name, _ := position["name"].(string)
			responsibility, _ := position["responsibility"].(string)
			spots, _ := position["spots"].(float64)
			if spots == 0 {
				spots = 1 // Default to 1 if not specified or invalid
			}

			spotItem := map[string]interface{}{
				"title":       name,
				"description": responsibility,
				"spots":       spots,
			}
			spotsData = append(spotsData, spotItem)
		}

		spotsJSON, err := json.Marshal(spotsData)
		if err != nil {
			return errors.New("failed to marshal spots data: " + err.Error())
		}
		projectPost.Spots = datatypes.JSON(spotsJSON)
	}

	// Extract topics
	topicsStr := c.PostForm("topic")
	if topicsStr != "" {
		var topics []string
		if err := json.Unmarshal([]byte(topicsStr), &topics); err != nil {
			return errors.New("invalid topics format: " + err.Error())
		}
	}

	// Handle cover and media uploads
	bucketName := os.Getenv("AWS_BUCKET_NAME")
	projectPostWrapper := &ProjectPostWrapper{ProjectPost: &projectPost}
	if err := HandleCoverUpload(c, bucketName, projectPostWrapper); err != nil {
		return errors.New("cover upload error: " + err.Error())
	}

	if err := HandleMediaUploads(c, bucketName, projectPostWrapper); err != nil {
		return errors.New("media upload error: " + err.Error())
	}

	// Save project post
	if err := repositories.SaveProjectPost(&projectPost); err != nil {
		return errors.New("failed to save project post: " + err.Error())
	}

	// Check if we need to update the project's IsPublished flag
	publishProjectStr := c.PostForm("publishProject")
	if publishProjectStr != "" {
		publishProject := strings.ToLower(publishProjectStr) == "true"
		// Update the project's IsPublished field
		if err := database.DB.Model(&models.Project{}).Where("project_id = ?", projectID).Update("is_published", publishProject).Error; err != nil {
			fmt.Printf("Warning: failed to update project publish status: %v\n", err)
			// Continue even if update fails - post is already saved
		}
	}

	// Parse and save questions after the post is created
	if questions := c.PostForm("questions"); questions != "" {
		var applicationQuestions []models.ApplicationQuestion
		if err := json.Unmarshal([]byte(questions), &applicationQuestions); err != nil {
			fmt.Printf("Warning: invalid questions format: %v, data: %s\n", err, questions)
			return nil // Continue even if questions parsing fails
		}

		for i := range applicationQuestions {
			applicationQuestions[i].PostID = projectPost.PostID

			// Convert choices to datatypes.JSON
			if len(applicationQuestions[i].Choices) > 0 {
				choicesJSON, err := json.Marshal(applicationQuestions[i].Choices)
				if err != nil {
					fmt.Printf("Warning: failed to convert choices to JSON: %v\n", err)
					continue // Skip this question but continue with others
				}
				applicationQuestions[i].Choices = datatypes.JSON(choicesJSON)
			}
		}

		if err := repositories.SaveApplicationQuestions(applicationQuestions); err != nil {
			fmt.Printf("Warning: failed to save application questions: %v\n", err)
			// Continue even if questions saving fails - post is already saved
		}
	}

	return nil
}

func GetPaginatedFilteredProjectPosts(userID uint, page, limit int, searchQuery, typeFilter, locationFilter, dateStart, dateEnd, spots, topicFilter, classFilter string, language, languageFilter []string) ([]models.ProjectPostResponse, int64, bool, error) {
	offset := (page - 1) * limit
	var projectPosts []models.ProjectPostResponse
	db := database.DB.Table("project_posts").
		Select("project_posts.sid AS short_id, project_posts.*, projects.project_type AS style, projects.school, projects.class, projects.topic AS topics, projects.language AS language").
		Joins("JOIN projects ON project_posts.project_id = projects.project_id").
		Where("projects.status != ?", 4).     // Exclude deleted projects
		Where("project_posts.status != ?", 4) // Exclude deleted project posts

	// Apply filters
	if searchQuery != "" {
		db = db.Where("LOWER(projects.class) LIKE LOWER(?) OR LOWER(projects.topic) LIKE LOWER(?) OR LOWER(projects.description) LIKE LOWER(?)", "%"+searchQuery+"%", "%"+searchQuery+"%", "%"+searchQuery+"%")
	}
	if typeFilter != "" {
		db = db.Where("projects.project_type = ?", typeFilter)
	}
	if locationFilter != "" {
		db = db.Where("project_posts.location = ?", locationFilter)
	}
	if dateStart != "" && dateEnd != "" {
		db = db.Where("project_posts.start_time BETWEEN ? AND ?", dateStart, dateEnd)
	}
	if spots != "" {
		db = db.Where("project_posts.spots @> ?", spots) // Assuming spots is stored as JSON
	}
	if topicFilter != "" {
		db = db.Where("projects.topic @> ?", topicFilter)
	}
	if classFilter != "" {
		db = db.Where("projects.class = ?", classFilter)
	}
	if len(languageFilter) > 0 {
		db = db.Where("projects.language IN (?)", languageFilter)
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
			return nil, 0, false, err
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
	db = db.Where(visibilityFilter)

	// Fetch results
	err := db.Offset(offset).Limit(limit).Scan(&projectPosts).Error
	if err != nil {
		return nil, 0, false, err
	}

	// Get total count
	var totalPosts int64
	database.DB.Model(&models.ProjectPost{}).Count(&totalPosts)

	// Determine if more posts exist
	hasMore := int64(offset+limit) < totalPosts

	return projectPosts, totalPosts, hasMore, nil
}

// BlockResourceRequest replaces ResourceRequest
type BlockResourceRequest struct {
	Title       string  `json:"title" binding:"required"`
	Type        string  `json:"type" binding:"required"` // 'link' or 'file'
	URL         *string `json:"url,omitempty"`
	FilePath    *string `json:"file_path,omitempty"`
	Description *string `json:"description,omitempty"`
	Category    *string `json:"category,omitempty"`
}

// CreateProjectResource creates a resource as a block
func CreateProjectResource(projectID uint, userID uint, request BlockResourceRequest) (*models.Block, error) {
	// Validate resource type
	if request.Type != "link" && request.Type != "file" {
		return nil, errors.New("invalid resource type: must be 'link' or 'file'")
	}

	// Validate required fields based on type
	if request.Type == "link" && (request.URL == nil || *request.URL == "") {
		return nil, errors.New("URL is required for link resources")
	}

	if request.Type == "file" && (request.FilePath == nil || *request.FilePath == "") {
		return nil, errors.New("file path is required for file resources")
	}

	// Convert content to Block structure
	contentMap := map[string]interface{}{
		"resource_type": request.Type,
		"category":      request.Category,
	}

	if request.URL != nil {
		contentMap["url"] = *request.URL
	}

	if request.FilePath != nil {
		contentMap["file_path"] = *request.FilePath
	}

	if request.Description != nil {
		contentMap["description"] = *request.Description
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(contentMap)
	if err != nil {
		return nil, err
	}

	// Create block
	blockType := models.LinkBlock
	if request.Type == "file" {
		blockType = models.FileBlock
	}

	block := models.Block{
		ProjectID:    projectID,
		UserID:       userID,
		Type:         string(blockType),
		Title:        request.Title,
		Content:      datatypes.JSON(contentJSON),
		LastEditedBy: userID,
	}

	// Save the block
	if err := database.DB.Create(&block).Error; err != nil {
		return nil, err
	}

	return &block, nil
}

// UpdateProjectResource updates a resource block
func UpdateProjectResource(blockID uint, userID uint, request BlockResourceRequest) (*models.Block, error) {
	// Validate resource type
	if request.Type != "link" && request.Type != "file" {
		return nil, errors.New("invalid resource type: must be 'link' or 'file'")
	}

	// Validate required fields based on type
	if request.Type == "link" && (request.URL == nil || *request.URL == "") {
		return nil, errors.New("URL is required for link resources")
	}

	if request.Type == "file" && (request.FilePath == nil || *request.FilePath == "") {
		return nil, errors.New("file path is required for file resources")
	}

	// Find the block
	var block models.Block
	if err := database.DB.Where("block_id = ? AND (type = ? OR type = ?)",
		blockID, models.LinkBlock, models.FileBlock).First(&block).Error; err != nil {
		return nil, errors.New("resource block not found")
	}

	// Convert content to Block structure
	contentMap := map[string]interface{}{
		"resource_type": request.Type,
		"category":      request.Category,
	}

	if request.URL != nil {
		contentMap["url"] = *request.URL
	}

	if request.FilePath != nil {
		contentMap["file_path"] = *request.FilePath
	}

	if request.Description != nil {
		contentMap["description"] = *request.Description
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(contentMap)
	if err != nil {
		return nil, err
	}

	// Update block type if needed
	blockType := models.LinkBlock
	if request.Type == "file" {
		blockType = models.FileBlock
	}

	// Update the block
	block.Type = string(blockType)
	block.Title = request.Title
	block.Content = datatypes.JSON(contentJSON)
	block.LastEditedBy = userID

	if err := database.DB.Save(&block).Error; err != nil {
		return nil, err
	}

	return &block, nil
}

// DeleteProjectResource archives a resource block
func DeleteProjectResource(blockID uint, userID uint) error {
	// Find the block
	var block models.Block
	if err := database.DB.Where("block_id = ? AND (type = ? OR type = ?)",
		blockID, models.LinkBlock, models.FileBlock).First(&block).Error; err != nil {
		return errors.New("resource block not found")
	}

	// Archive the block (soft delete)
	block.Archived = true
	block.LastEditedBy = userID

	return database.DB.Save(&block).Error
}

// GetProjectResources gets all resource blocks for a project
func GetProjectResources(projectID uint) ([]models.Block, error) {
	var blocks []models.Block
	if err := database.DB.Where("project_id = ? AND (type = ? OR type = ?) AND archived = ?",
		projectID, models.LinkBlock, models.FileBlock, false).Order("sort_order ASC").Find(&blocks).Error; err != nil {
		return nil, err
	}
	return blocks, nil
}

// BlockContentRequest replaces WorkspaceRequest
type BlockContentRequest struct {
	Title     string  `json:"title" binding:"required"`
	Content   *string `json:"content,omitempty"`
	Category  *string `json:"category,omitempty"`
	BlockType string  `json:"block_type" binding:"required"`
}

// CreateProjectContent creates a content block (page, text, etc.)
func CreateProjectContent(projectID uint, userID uint, request BlockContentRequest) (*models.Block, error) {
	// Validate block type
	blockType := models.BlockType(request.BlockType)
	validTypes := map[models.BlockType]bool{
		models.PageBlock:       true,
		models.TextBlock:       true,
		models.HeadingBlock:    true,
		models.CodeBlock:       true,
		models.BulletListBlock: true,
		models.NumberListBlock: true,
	}

	if !validTypes[blockType] {
		return nil, errors.New("invalid block type")
	}

	// Create content map
	contentMap := map[string]interface{}{}

	if request.Content != nil {
		contentMap["text"] = *request.Content
	}

	if request.Category != nil {
		contentMap["category"] = *request.Category
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(contentMap)
	if err != nil {
		return nil, err
	}

	// Create block
	block := models.Block{
		ProjectID:    projectID,
		UserID:       userID,
		Type:         string(blockType),
		Title:        request.Title,
		Content:      datatypes.JSON(contentJSON),
		LastEditedBy: userID,
	}

	// Save the block
	if err := database.DB.Create(&block).Error; err != nil {
		return nil, err
	}

	return &block, nil
}

// UpdateProjectContent updates a content block
func UpdateProjectContent(blockID uint, userID uint, request BlockContentRequest) (*models.Block, error) {
	// Validate block type
	blockType := models.BlockType(request.BlockType)
	validTypes := map[models.BlockType]bool{
		models.PageBlock:       true,
		models.TextBlock:       true,
		models.HeadingBlock:    true,
		models.CodeBlock:       true,
		models.BulletListBlock: true,
		models.NumberListBlock: true,
	}

	if !validTypes[blockType] {
		return nil, errors.New("invalid block type")
	}

	// Find the block
	var block models.Block
	if err := database.DB.Where("block_id = ?", blockID).First(&block).Error; err != nil {
		return nil, errors.New("block not found")
	}

	// Create content map
	contentMap := map[string]interface{}{}

	if request.Content != nil {
		contentMap["text"] = *request.Content
	}

	if request.Category != nil {
		contentMap["category"] = *request.Category
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(contentMap)
	if err != nil {
		return nil, err
	}

	// Update the block
	block.Type = string(blockType)
	block.Title = request.Title
	block.Content = datatypes.JSON(contentJSON)
	block.LastEditedBy = userID

	if err := database.DB.Save(&block).Error; err != nil {
		return nil, err
	}

	return &block, nil
}

// DeleteProjectContent archives a content block
func DeleteProjectContent(blockID uint, userID uint) error {
	// Find the block
	var block models.Block
	if err := database.DB.Where("block_id = ?", blockID).First(&block).Error; err != nil {
		return errors.New("block not found")
	}

	// Archive the block (soft delete)
	block.Archived = true
	block.LastEditedBy = userID

	return database.DB.Save(&block).Error
}

// GetProjectContents gets all content blocks for a project
func GetProjectContents(projectID uint, blockType *string) ([]models.Block, error) {
	query := database.DB.Where("project_id = ? AND archived = ?", projectID, false)

	if blockType != nil {
		query = query.Where("type = ?", *blockType)
	}

	var blocks []models.Block
	if err := query.Order("sort_order ASC").Find(&blocks).Error; err != nil {
		return nil, err
	}

	return blocks, nil
}

// CreatePostShare creates a shareable link for a project post
func CreatePostShare(postID uint, sharedBy uint, accessLevel models.ShareAccessLevel, expiryDays int) (*models.ProjectPostShare, error) {
	// Generate a unique share token
	shareToken := helper.GenerateShortID(8)

	// Calculate expiry date
	expiresAt := time.Now().AddDate(0, 0, expiryDays)

	share := &models.ProjectPostShare{
		PostID:         postID,
		SharedByUserID: sharedBy,
		ShareToken:     shareToken,
		ExpiresAt:      expiresAt,
		AccessLevel:    accessLevel,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := repositories.CreatePostShare(share); err != nil {
		return nil, err
	}

	return share, nil
}

// GetPostShareByToken retrieves a share by its token
func GetPostShareByToken(token string) (*models.ProjectPostShare, error) {
	share, err := repositories.GetPostShareByToken(token)
	if err != nil {
		return nil, err
	}

	// Check if share has expired
	if time.Now().After(share.ExpiresAt) {
		return nil, errors.New("share link has expired")
	}

	return share, nil
}

// ValidatePostShare checks if a share token is valid and has the required access level
func ValidatePostShare(token string, requiredAccess models.ShareAccessLevel) (*models.ProjectPostShare, error) {
	share, err := GetPostShareByToken(token)
	if err != nil {
		return nil, err
	}

	if share.AccessLevel != requiredAccess && share.AccessLevel != models.ShareAccessEdit {
		return nil, errors.New("insufficient access level")
	}

	return share, nil
}

// TransferProjectOwnership transfers project ownership to another member
func TransferProjectOwnership(projectID uint, currentOwnerID uint, newOwnerID uint) error {
	// Start transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Verify current owner
	var project models.Project
	if err := tx.Where("project_id = ? AND user_id = ?", projectID, currentOwnerID).First(&project).Error; err != nil {
		tx.Rollback()
		return errors.New("unauthorized to transfer project ownership")
	}

	// Verify new owner is a project member
	var newOwnerMember models.ProjectGroupMember
	if err := tx.Where("project_id = ? AND user_id = ?", projectID, newOwnerID).First(&newOwnerMember).Error; err != nil {
		tx.Rollback()
		return errors.New("new owner must be a project member")
	}

	// Update project owner
	if err := tx.Model(&project).Update("user_id", newOwnerID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update member group to admin group
	if err := tx.Model(&models.ProjectGroupMember{}).
		Where("project_id = ? AND user_id = ?", projectID, newOwnerID).
		Updates(map[string]interface{}{
			"group_id": 1, // Admin group ID
		}).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetApplicationQuestionsWithAnswersService retrieves all questions and their answers for a project post
func GetApplicationQuestionsWithAnswersService(postID uint) ([]models.ApplicationQuestion, []struct {
	models.ProjectApplication
	UserID        uint                       `json:"user_id"`
	PreferredName *string                    `json:"preferred_name"`
	FirstName     *string                    `json:"first_name"`
	LastName      *string                    `json:"last_name"`
	Username      *string                    `json:"username"`
	Avatar        *string                    `json:"avatar"`
	Answers       []models.ApplicationAnswer `json:"answers"`
}, error) {
	return repositories.GetApplicationQuestionsWithAnswersAndApplications(postID)
}

// CheckExistingApplication checks if a user already has an application for a project
func CheckExistingApplication(userID uint, postID uint) (bool, error) {
	var count int64
	err := database.DB.Model(&models.ProjectApplication{}).
		Where("user_id = ? AND post_id = ? AND status = 1", userID, postID).
		Count(&count).Error
	return count > 0, err
}

// UpdateApplicationStatusAndAddMember updates the application status and adds the user as a team member if accepted
func UpdateApplicationStatusAndAddMember(applicationID uint, status int, groupID uint, permissions uint) error {
	// Start transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get application details
	var application models.ProjectApplication
	if err := tx.First(&application, applicationID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// If accepting the application, check if user already has an accepted application
	if status == 1 {
		hasExisting, err := CheckExistingApplication(application.UserID, application.PostID)
		if err != nil {
			tx.Rollback()
			return err
		}
		if hasExisting {
			tx.Rollback()
			return errors.New("user already has an accepted application for this project")
		}
	}

	// Update application status
	application.Status = status
	// ReviewAt records the founder's first response, which feeds their response-time stat
	if (status == 1 || status == 2) && application.ReviewAt == nil {
		now := time.Now()
		application.ReviewAt = &now
	}
	if err := tx.Save(&application).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Get project post details for email and notification
	var post models.ProjectPost
	if err := tx.First(&post, application.PostID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Get project details for notification URL
	var project models.Project
	if err := tx.First(&project, post.ProjectID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Get user email for notification
	var userEmail string
	if err := tx.Model(&models.User{}).Where("id = ?", application.UserID).Select("email").Scan(&userEmail).Error; err != nil {
		tx.Rollback()
		return err
	}

	// joined is set when this acceptance adds a new member, which the team chat announces
	joined := false

	// If application is accepted, add user as team member
	if status == 1 {
		// Check if user is already a member
		var count int64
		tx.Model(&models.ProjectMember{}).
			Where("project_id = ? AND user_id = ?", project.ProjectID, application.UserID).
			Count(&count)

		if count == 0 {
			// Add user as member with default role of viewer
			// TODO: Role should be configurable based on application settings
			member := models.ProjectMember{
				ProjectID:   project.ProjectID,
				UserID:      application.UserID,
				Role:        "viewer", // Default role for accepted applications
				Permissions: helper.RoleToPermissions("viewer"), // Set permissions based on role
				JoinedAt:    time.Now(),
			}

			if err := tx.Create(&member).Error; err != nil {
				tx.Rollback()
				return err
			}
			joined = true

			// If a group ID was provided, assign the user to that group
			if groupID > 0 {
				// Verify the group exists and belongs to this project
				var groupExists int64
				if err := tx.Model(&models.ProjectGroup{}).
					Where("group_id = ? AND project_id = ?", groupID, project.ProjectID).
					Count(&groupExists).Error; err != nil {
					tx.Rollback()
					return err
				}

				if groupExists > 0 {
					// Add member to the specified group
					groupMember := models.ProjectGroupMember{
						GroupID:   groupID,
						UserID:    application.UserID,
						ProjectID: project.ProjectID,
					}

					if err := tx.Create(&groupMember).Error; err != nil {
						tx.Rollback()
						return err
					}
				}
			}
		}

		// Send email notification for acceptance
		go SendApplicationStatusUpdateEmail(userEmail, *project.Title, "accepted")

		// Create notification
		notification := models.Notification{
			UserID:      application.UserID,
			Type:        models.NotificationTypeApplication,
			Title:       "Application Accepted",
			Description: fmt.Sprintf("Your application to join %s has been accepted!", *project.Title),
			URL:         fmt.Sprintf("/project/%s", project.Slug),
			IsRead:      false,
			CreatedAt:   time.Now(),
		}

		if err := tx.Create(&notification).Error; err != nil {
			// Just log the error, don't rollback the whole transaction
			log.Printf("Failed to create notification: %v", err)
		}
	} else if status == 2 {
		// Send email notification for rejection
		go SendApplicationStatusUpdateEmail(userEmail, *project.Title, "declined")

		// Create notification
		notification := models.Notification{
			UserID:      application.UserID,
			Type:        models.NotificationTypeApplication,
			Title:       "Application Declined",
			Description: fmt.Sprintf("Your application to join %s has been declined.", *project.Title),
			URL:         fmt.Sprintf("/projects/%s", project.ShortID),
			IsRead:      false,
			CreatedAt:   time.Now(),
		}

		if err := tx.Create(&notification).Error; err != nil {
			// Just log the error, don't rollback the whole transaction
			log.Printf("Failed to create notification: %v", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}
	if joined {
		PostTeamJoined(project.ProjectID, *project.Title, application.UserID, application.Role)
	}
	return nil
}

// CanUserReapply checks if a user can submit a new application after a previous decision
func CanUserReapply(userID uint, postID uint) (bool, error) {
	var application models.ProjectApplication
	err := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).
		Order("created_at DESC").
		First(&application).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil // No previous application, can apply
		}
		return false, err
	}

	// If the last application was declined, allow reapplication
	if application.Status == 2 {
		return true, nil
	}

	// If the last application was accepted, don't allow reapplication
	if application.Status == 1 {
		return false, errors.New("you already have an accepted application for this project")
	}

	// If the last application is pending, don't allow reapplication
	return false, errors.New("you already have a pending application for this project")
}

// SubmitApplication handles the submission of a new application
func SubmitApplication(userID uint, postID uint, description string, role string, hoursPerWeek int, firstStep string, answers []models.ApplicationAnswer) error {
	// Check if user can reapply
	canReapply, err := CanUserReapply(userID, postID)
	if err != nil {
		return err
	}
	if !canReapply {
		return errors.New("you cannot submit another application at this time")
	}

	// Start transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create new application
	application := models.ProjectApplication{
		UserID:      userID,
		PostID:      postID,
		Status:      0, // Pending
		AppliedAt:    time.Now(),
		Description:  description,
		Role:         role,
		HoursPerWeek: hoursPerWeek,
		FirstStep:    firstStep,
		Stage:        "new",
	}

	if err := tx.Create(&application).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Save answers
	for _, answer := range answers {
		answer.ApplicationID = application.ApplicationID
		if err := tx.Create(&answer).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return err
	}

	// Get project post and owner information for notification
	var post models.ProjectPost
	if err := database.DB.First(&post, postID).Error; err != nil {
		// Don't fail the application submission if we can't find the post for notification
		fmt.Printf("Failed to find project post for notification: %v\n", err)
		return nil
	}

	// Get project details for URL
	var project models.Project
	if err := database.DB.First(&project, post.ProjectID).Error; err != nil {
		fmt.Printf("Failed to find project for notification URL: %v\n", err)
		return nil
	}

	// Get owner ID and email
	ownerID, err := repositories.GetProjectOwner(postID)
	if err != nil {
		fmt.Printf("Failed to find project owner: %v\n", err)
		return nil
	}

	// Get owner email for notification
	ownerEmail, err := repositories.GetUserEmail(ownerID)
	if err != nil {
		fmt.Printf("Failed to find project owner email: %v\n", err)
		return nil
	}

	// Get applicant details for notification
	var applicant models.User
	if err := database.DB.Select("id, username").Where("id = ?", userID).First(&applicant).Error; err != nil {
		fmt.Printf("Failed to find applicant details: %v\n", err)
		return nil
	}

	// Get applicant profile for more user details
	var applicantProfile models.Profile
	if err := database.DB.Where("user_id = ?", userID).First(&applicantProfile).Error; err != nil {
		fmt.Printf("Failed to find applicant profile: %v\n", err)
		// Continue with just the username if profile not found
	}

	// Determine applicant name for the notification
	applicantName := "A user"
	if applicant.Username != nil {
		applicantName = *applicant.Username
	}

	// Use profile data if available
	if applicantProfile.PreferredName != nil && *applicantProfile.PreferredName != "" {
		applicantName = *applicantProfile.PreferredName
	} else if applicantProfile.FirstName != nil && *applicantProfile.FirstName != "" {
		applicantName = *applicantProfile.FirstName
		if applicantProfile.LastName != nil && *applicantProfile.LastName != "" {
			applicantName += " " + *applicantProfile.LastName
		}
	}

	// Send email notification to project owner
	go func() {
		if err := SendApplicationSubmissionEmail(ownerEmail, post.Title, applicantName); err != nil {
			fmt.Printf("Failed to send application submission email: %v\n", err)
		} else {
			fmt.Printf("Successfully sent application submission email to %s\n", ownerEmail)
		}
	}()

	// Create notification for project owner
	notificationTitle := "New Project Application"
	notificationDesc := fmt.Sprintf("%s has applied to your project '%s'", applicantName, post.Title)
	notificationURL := fmt.Sprintf("/project/%s?section=settings", project.ShortID)

	// Save notification in database
	notificationErr := repositories.SaveTypedNotification(ownerID, models.NotificationTypeApplication, notificationTitle, notificationDesc, notificationURL)
	if notificationErr != nil {
		fmt.Printf("Failed to save notification in database: %v\n", notificationErr)
	} else {
		fmt.Printf("Successfully saved notification for user %d\n", ownerID)
	}

	// Try to send via WebSocket if user is online
	if utils.IsUserOnline(ownerID) {
		utils.NotifyUser(ownerID, notificationTitle, notificationDesc, notificationURL)
	}

	return nil
}

// UpdateProjectStatus updates the status of a project and returns appropriate status text
// This is used by various project status update endpoints (complete, archive, delete)
func UpdateProjectStatus(projectSid string, userID uint, newStatus int) (string, int, error) {
	// Find the project by SID
	var project models.Project
	if err := database.DB.Where("sid = ?", projectSid).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", 0, errors.New("project not found")
		}
		return "", 0, errors.New("failed to fetch project")
	}

	// Check if the current user is authorized to update the project
	if project.OwnerID != userID {
		return "", 0, errors.New("unauthorized to update project status")
	}

	// Update the project status
	if err := database.DB.Model(&project).Update("status", newStatus).Error; err != nil {
		return "", 0, errors.New("failed to update project status")
	}

	// Return appropriate status text based on the status code
	statusText := "unknown"
	switch newStatus {
	case 1:
		statusText = "active"
	case 2:
		statusText = "archived"
	case 3:
		statusText = "completed"
	case 4:
		statusText = "deleted"
	}

	return statusText, newStatus, nil
}

// TODO: To verify the project is deleted properly
// DeleteProject permanently removes a project and all its related data from the database
func DeleteProject(projectSid string, userID uint) error {
	// Find the project by SID
	var project models.Project
	if err := database.DB.Where("sid = ?", projectSid).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("project not found")
		}
		return errors.New("failed to fetch project")
	}

	// Check if the current user is authorized to delete the project
	if project.OwnerID != userID {
		return errors.New("unauthorized to delete project")
	}

	// Begin transaction to ensure all related data is deleted consistently
	tx := database.DB.Begin()

	// 1. Delete project members
	if err := tx.Exec("DELETE FROM project_members WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project members: %w", err)
	}

	// 2. Delete project groups and group members
	if err := tx.Exec("DELETE FROM project_group_members WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project group members: %w", err)
	}

	if err := tx.Exec("DELETE FROM project_groups WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project groups: %w", err)
	}

	// 3. Delete blocks (resources, tasks, workspaces, etc.)
	if err := tx.Exec("DELETE FROM blocks WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project blocks: %w", err)
	}

	// 4. Delete project invitations
	if err := tx.Exec("DELETE FROM project_invitations WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project invitations: %w", err)
	}

	// 5. Delete project shares
	if err := tx.Exec("DELETE FROM project_shares WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project shares: %w", err)
	}

	// 6. Delete project posts with applications and questions
	var projectPosts []models.ProjectPost
	if err := tx.Where("project_id = ?", project.ProjectID).Find(&projectPosts).Error; err != nil && err != gorm.ErrRecordNotFound {
		tx.Rollback()
		return fmt.Errorf("failed to fetch project posts: %w", err)
	}

	for _, post := range projectPosts {
		// 6.1 Delete application answers
		if err := tx.Exec(`DELETE FROM application_answers WHERE application_id IN 
			(SELECT application_id FROM project_application WHERE post_id = ?)`, post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete application answers: %w", err)
		}

		// 6.2 Delete applications
		if err := tx.Exec("DELETE FROM project_application WHERE post_id = ?", post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete project applications: %w", err)
		}

		// 6.3 Delete application questions
		if err := tx.Exec("DELETE FROM application_questions WHERE post_id = ?", post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete application questions: %w", err)
		}

		// 6.4 Delete post shares
		if err := tx.Exec("DELETE FROM project_post_shares WHERE post_id = ?", post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete post shares: %w", err)
		}

		// 6.5 Delete post likes
		if err := tx.Exec("DELETE FROM user_post_likes WHERE post_id = ?", post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete post likes: %w", err)
		}

		// 6.6 Delete comments
		if err := tx.Exec("DELETE FROM comments WHERE entity_id = ? AND entity_type = 'post'", post.PostID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete post comments: %w", err)
		}
	}

	// 7. Delete project posts
	if err := tx.Exec("DELETE FROM project_posts WHERE project_id = ?", project.ProjectID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project posts: %w", err)
	}

	// 8. Finally, delete the project itself
	if err := tx.Delete(&project).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete project: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// SaveProjectRequest represents the data needed to create a project with all its components
type SaveAllRequest struct {
	// Project fields
	Title            string
	Name             string
	Description      string
	ProjectType      string
	Type             string
	Topic            []string
	TopicStr         string
	StartTime        string
	Deadline         string
	Cover            string
	Media            []interface{}
	Location         string
	CommunicationApp string
	School           string
	Class            string
	OtherType        string
	OtherApp         string
	IsPublished      bool

	// Post fields
	CreatePost bool
	Post       []map[string]interface{}

	// Additional components
	Roadmap    []map[string]interface{}
	Checklist  []models.ChecklistItem
	Curriculum interface{}
}

// ProjectCreationResult contains the results of creating a project with its components
type ProjectCreationResult struct {
	Project     *models.Project
	PostID      uint
	PostShortID string
}

// SaveProjectWithComponents creates a project with all its components (post, roadmap, checklist, curriculum)
func SaveProjectWithComponents(userID uint, request SaveAllRequest) (*ProjectCreationResult, error) {
	// Allow name to override title if provided
	title := request.Title
	if request.Name != "" {
		title = request.Name
	}

	// Get project type from either projectType or type field
	projectType := request.ProjectType
	if projectType == "" {
		projectType = request.Type
	}
	if projectType == "" && request.OtherType != "" {
		projectType = request.OtherType
	}

	// Create new project
	description := request.Description
	location := request.Location
	communicationApp := request.CommunicationApp
	if communicationApp == "" && request.OtherApp != "" {
		communicationApp = request.OtherApp
	}
	cover := request.Cover
	status := 1 // Active status code

	// Use specified topic array or parse from topicStr
	var topicJSON []byte
	var err error
	if len(request.Topic) > 0 {
		topicJSON, err = json.Marshal(request.Topic)
	} else if request.TopicStr != "" {
		topicJSON, err = json.Marshal(strings.Split(request.TopicStr, ", "))
	} else {
		topicJSON = []byte("[]")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to process topic: %w", err)
	}

	// Parse date strings
	var startTime, endTime *time.Time
	if request.StartTime != "" {
		parsedStartTime, err := time.Parse("2006-01-02", request.StartTime)
		if err == nil {
			startTime = &parsedStartTime
		} else {
			fmt.Printf("Error parsing start time: %v\n", err)
		}
	}

	if request.Deadline != "" {
		parsedEndTime, err := time.Parse("2006-01-02", request.Deadline)
		if err == nil {
			endTime = &parsedEndTime
		} else {
			fmt.Printf("Error parsing end time: %v\n", err)
		}
	}

	// Create school and class fields if provided
	var school, class *string
	if request.School != "" {
		school = &request.School
	}
	if request.Class != "" {
		class = &request.Class
	}

	// Create the project object
	project := &models.Project{
		Title:            &title,
		Description:      &description,
		OwnerID:          userID,
		ProjectType:      &projectType,
		Topic:            datatypes.JSON(topicJSON),
		Location:         &location,
		Status:           status,
		StartTime:        startTime,
		EndTime:          endTime,
		CommunicationApp: &communicationApp,
		School:           school,
		Class:            class,
		IsPublished:      request.IsPublished,
	}

	// Set cover if provided
	if cover != "" {
		project.Cover = &cover
	}

	// Handle media if provided
	if len(request.Media) > 0 {
		// Create a wrapper to handle media properly
		projectWrapper := &ProjectWrapper{Project: project}

		// Convert media items to strings
		mediaStrings := make([]string, 0, len(request.Media))
		for _, m := range request.Media {
			if mediaStr, ok := m.(string); ok {
				mediaStrings = append(mediaStrings, mediaStr)
			}
		}

		// Use the wrapper to set media
		projectWrapper.SetMedia(mediaStrings)
	}

	// Generate short ID and slug
	if err := repositories.GenerateProjectShortID(project); err != nil {
		return nil, fmt.Errorf("failed to generate project ID: %w", err)
	}

	if err := repositories.GenerateSlug(project, title); err != nil {
		return nil, fmt.Errorf("failed to generate project slug: %w", err)
	}

	// Save project to database using SaveProject which also creates admin group
	if err := SaveProject(project); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	// Process roadmap if provided - disabled (no longer using block-based design)
	// if len(request.Roadmap) > 0 {
	// 	err := createRoadmapBlocks(project.ProjectID, userID, request.Roadmap)
	// 	if err != nil {
	// 		fmt.Printf("Warning: Error creating roadmap blocks: %v\n", err)
	// 		// Continue anyway - we consider roadmap blocks optional
	// 	}
	// }

	// Process checklist if provided
	if len(request.Checklist) > 0 {
		checklistItems := make([]interface{}, len(request.Checklist))
		for i, item := range request.Checklist {
			checklistItems[i] = item
		}
		// Checklist blocks creation disabled - no longer using block-based design
		// err := createChecklistBlocks(project.ProjectID, userID, checklistItems)
		// if err != nil {
		// 	fmt.Printf("Warning: Error creating checklist blocks: %v\n", err)
		// 	// Continue anyway - we consider checklist blocks optional
		// }
	}

	// Process curriculum if provided - disabled (no longer using block-based design)
	// if request.Curriculum != nil {
	// 	err := createCurriculumBlock(project.ProjectID, userID, request.Curriculum)
	// 	if err != nil {
	// 		fmt.Printf("Warning: Error creating curriculum block: %v\n", err)
	// 		// Continue anyway - we consider curriculum block optional
	// 	}
	// }

	// Process AI-generated data into Plans, Tasks, and Resources
	if len(request.Roadmap) > 0 || request.Curriculum != nil || len(request.Checklist) > 0 {
		// Convert AI data to project plans
		if len(request.Roadmap) > 0 || request.Curriculum != nil {
			err := ConvertAIDataToPlans(project.ProjectID, request.Roadmap, request.Curriculum)
			if err != nil {
				fmt.Printf("Warning: Error creating AI plans: %v\n", err)
				// Continue anyway - we consider plans optional
			}
		}

		// Convert checklist items to tasks
		if len(request.Checklist) > 0 {
			err := ConvertChecklistToTasks(project.ProjectID, request.Checklist)
			if err != nil {
				fmt.Printf("Warning: Error creating tasks from checklist: %v\n", err)
			}
		}

		// Extract resources from roadmap
		if len(request.Roadmap) > 0 {
			err := ExtractResourcesFromRoadmap(project.ProjectID, request.Roadmap)
			if err != nil {
				fmt.Printf("Warning: Error extracting resources from roadmap: %v\n", err)
			}
		}
	}

	// Create post if requested
	var postID uint
	var postShortID string
	if request.CreatePost && len(request.Post) > 0 {
		postData := request.Post[0]
		projectPost, err := createProjectPost(project.ProjectID, userID, postData, title, description, cover, startTime, endTime, location)
		if err != nil {
			fmt.Printf("Warning: Error creating project post: %v\n", err)
		} else {
			postID = projectPost.PostID
			postShortID = projectPost.ShortID
		}
	}

	return &ProjectCreationResult{
		Project:     project,
		PostID:      postID,
		PostShortID: postShortID,
	}, nil
}

// Helper functions for creating project components

// Block-related functions disabled - no longer using block-based design
/*
// createRoadmapBlocks creates a block for roadmap steps
func createRoadmapBlocks(projectID, userID uint, roadmap []map[string]interface{}) error {
	// blockService := NewBlockService() // Disabled

	// Create EditorJS format for the roadmap content
	timeNow := time.Now().UnixMilli()

	// Start with a header
	blocks := []map[string]interface{}{
		{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Project Roadmap",
				"level": 2,
			},
		},
		{
			"id":   generateBlockID(),
			"type": "paragraph",
			"data": map[string]interface{}{
				"text": "Plan your project journey with these steps:",
			},
		},
	}

	// Process roadmap steps and add them to the blocks array
	for i, step := range roadmap {
		// Extract step details
		var heading, description string
		if headingVal, ok := step["heading"]; ok {
			if headingStr, ok := headingVal.(string); ok {
				heading = headingStr
			}
		}

		if descVal, ok := step["description"]; ok {
			if descStr, ok := descVal.(string); ok {
				description = descStr
			}
		}

		if heading == "" {
			heading = fmt.Sprintf("Step %d", i+1)
		}

		// Add step header
		blocks = append(blocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  heading,
				"level": 3,
			},
		})

		// Add step description
		if description != "" {
			blocks = append(blocks, map[string]interface{}{
				"id":   generateBlockID(),
				"type": "paragraph",
				"data": map[string]interface{}{
					"text": description,
				},
			})
		}
	}

	// Create EditorJS content object
	editorJSContent := map[string]interface{}{
		"time":    timeNow,
		"blocks":  blocks,
		"version": "2.28.0",
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(editorJSContent)
	if err != nil {
		return fmt.Errorf("error serializing roadmap content: %w", err)
	}

	// Create root block for roadmap with content
	roadmapRootBlock := models.Block{
		ProjectID:    projectID,
		UserID:       userID,
		Type:         models.PageBlock,
		Title:        "Project Roadmap",
		Content:      datatypes.JSON(contentJSON), // Initialize with EditorJS content
		SortOrder:    float64(100),
		HasChildren:  false,
		LastEditedBy: userID,
		Color:        stringToPointer("roadmap"),
		Icon:         stringToPointer("timeline"),
	}

	_, err = blockService.CreateBlockDirect(&roadmapRootBlock)
	if err != nil {
		return fmt.Errorf("error creating root block for roadmap: %w", err)
	}

	return nil
}
*/

// createChecklistBlocks creates blocks for project checklists
func createChecklistBlocks(projectID, userID uint, checklistItems []interface{}) error {
	return nil // Disabled - no longer using block-based design
	/*
	if len(checklistItems) == 0 {
		return nil
	}

	// blockService := NewBlockService() // Disabled

	// Group checklist items by category
	checklistByCategory := make(map[string][]interface{})
	for _, item := range checklistItems {
		if itemMap, ok := item.(map[string]interface{}); ok {
			category, _ := itemMap["category"].(string)
			if category == "" {
				category = "General"
			}
			checklistByCategory[category] = append(checklistByCategory[category], itemMap)
		}
	}

	// Create EditorJS blocks for the main checklist block
	timeNow := time.Now().UnixMilli()
	mainBlocks := []map[string]interface{}{
		{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Project Checklist",
				"level": 2,
			},
		},
		{
			"id":   generateBlockID(),
			"type": "paragraph",
			"data": map[string]interface{}{
				"text": "Complete the following items to ensure your project meets all requirements:",
			},
		},
	}

	// Sort the categories for consistent ordering
	categories := make([]string, 0, len(checklistByCategory))
	for category := range checklistByCategory {
		categories = append(categories, category)
	}
	sort.Strings(categories)

	// Add each category and its checklist items to the main content
	for _, category := range categories {
		items := checklistByCategory[category]

		// Add category header
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  category,
				"level": 3,
			},
		})

		// Create checklist items for this category
		for _, item := range items {
			if itemMap, ok := item.(map[string]interface{}); ok {
				description, _ := itemMap["description"].(string)
				priority, _ := itemMap["priority"].(string)
				if priority == "" {
					priority = "medium"
				}

				// Add each checklist item
				mainBlocks = append(mainBlocks, map[string]interface{}{
					"id":   generateBlockID(),
					"type": "checklist",
					"data": map[string]interface{}{
						"items": []map[string]interface{}{
							{
								"text":     description,
								"checked":  false,
								"priority": priority,
							},
						},
					},
				})
			}
		}
	}

	// Create EditorJS content for all checklist data
	editorJSContent := map[string]interface{}{
		"time":    timeNow,
		"blocks":  mainBlocks,
		"version": "2.28.0",
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(editorJSContent)
	if err != nil {
		return fmt.Errorf("error serializing checklist content: %w", err)
	}

	// Create root block for checklist with content
	checklistRootBlock := models.Block{
		ProjectID:    projectID,
		UserID:       userID,
		Type:         models.TodoBlock,
		Title:        "Project Checklist",
		Content:      datatypes.JSON(contentJSON), // Initialize with EditorJS content
		SortOrder:    float64(200),
		HasChildren:  false,
		LastEditedBy: userID,
		Color:        stringToPointer("checklist"),
		Icon:         stringToPointer("check-square"),
	}

	_, err = blockService.CreateBlockDirect(&checklistRootBlock)
	if err != nil {
		return fmt.Errorf("error creating root block for checklist: %w", err)
	}

	return nil
	*/
}

// createCurriculumBlock creates a block for curriculum alignment  
func createCurriculumBlock(projectID, userID uint, curriculum interface{}) error {
	return nil // Disabled - no longer using block-based design
	/*
	// blockService := NewBlockService() // Disabled

	// Create EditorJS content for the main curriculum block
	timeNow := time.Now().UnixMilli()
	mainBlocks := []map[string]interface{}{
		{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Curriculum Alignment",
				"level": 2,
			},
		},
		{
			"id":   generateBlockID(),
			"type": "paragraph",
			"data": map[string]interface{}{
				"text": "This project aligns with the following curriculum standards:",
			},
		},
	}

	// Add sections based on available curriculum data

	// Add topics section if available
	if topics, ok := getJSONArray(curriculum, "topics"); ok && len(topics) > 0 {
		// Add topics header
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Academic Topics",
				"level": 3,
			},
		})

		// Add topics as a list
		topicItems := []string{}
		for _, topic := range topics {
			if topicStr, ok := topic.(string); ok {
				topicItems = append(topicItems, topicStr)
			}
		}

		if len(topicItems) > 0 {
			mainBlocks = append(mainBlocks, map[string]interface{}{
				"id":   generateBlockID(),
				"type": "list",
				"data": map[string]interface{}{
					"style": "unordered",
					"items": topicItems,
				},
			})
		}
	}

	// Add learning goals section if available
	if goals, ok := getJSONArray(curriculum, "learningGoals"); ok && len(goals) > 0 {
		// Add goals header
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Learning Goals",
				"level": 3,
			},
		})

		// Add each goal as a paragraph
		for _, goal := range goals {
			if goalMap, ok := goal.(map[string]interface{}); ok {
				goalTitle, _ := goalMap["goal"].(string)
				goalDesc, _ := goalMap["description"].(string)

				mainBlocks = append(mainBlocks, map[string]interface{}{
					"id":   generateBlockID(),
					"type": "header",
					"data": map[string]interface{}{
						"text":  goalTitle,
						"level": 4,
					},
				})

				mainBlocks = append(mainBlocks, map[string]interface{}{
					"id":   generateBlockID(),
					"type": "paragraph",
					"data": map[string]interface{}{
						"text": goalDesc,
					},
				})
			}
		}
	}

	// Add skills section if available
	if skills, ok := getJSONArray(curriculum, "skills"); ok && len(skills) > 0 {
		// Add skills header
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Skills Development",
				"level": 3,
			},
		})

		// Format the data for a table
		tableData := [][]string{
			{"Skill", "Level", "Description"}, // Table header
		}

		// Add each skill as a row in the table
		for _, skill := range skills {
			if skillMap, ok := skill.(map[string]interface{}); ok {
				name, _ := skillMap["name"].(string)
				level, _ := skillMap["level"].(string)
				description, _ := skillMap["description"].(string)

				tableData = append(tableData, []string{
					name,
					level,
					description,
				})
			}
		}

		// Add the table to the blocks
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "table",
			"data": map[string]interface{}{
				"withHeadings": true,
				"content":      tableData,
			},
		})
	}

	// Add categories section if available
	if categories, ok := getJSONArray(curriculum, "categories"); ok && len(categories) > 0 {
		// Add categories header
		mainBlocks = append(mainBlocks, map[string]interface{}{
			"id":   generateBlockID(),
			"type": "header",
			"data": map[string]interface{}{
				"text":  "Curriculum Categories",
				"level": 3,
			},
		})

		// Create a section for each category
		for _, category := range categories {
			if catMap, ok := category.(map[string]interface{}); ok {
				catName, _ := catMap["name"].(string)

				// Add category name as header
				mainBlocks = append(mainBlocks, map[string]interface{}{
					"id":   generateBlockID(),
					"type": "header",
					"data": map[string]interface{}{
						"text":  catName,
						"level": 4,
					},
				})

				// Get subcategories if available
				if subcats, ok := catMap["subcategories"].([]interface{}); ok && len(subcats) > 0 {
					subcatItems := []string{}
					for _, subcat := range subcats {
						if subcatStr, ok := subcat.(string); ok {
							subcatItems = append(subcatItems, subcatStr)
						}
					}

					if len(subcatItems) > 0 {
						mainBlocks = append(mainBlocks, map[string]interface{}{
							"id":   generateBlockID(),
							"type": "list",
							"data": map[string]interface{}{
								"style": "unordered",
								"items": subcatItems,
							},
						})
					}
				}
			}
		}
	}

	// Create EditorJS content object for all curriculum data
	editorJSContent := map[string]interface{}{
		"time":    timeNow,
		"blocks":  mainBlocks,
		"version": "2.28.0",
	}

	// Convert to JSON
	contentJSON, err := json.Marshal(editorJSContent)
	if err != nil {
		return fmt.Errorf("error serializing curriculum content: %w", err)
	}

	// Create root block for curriculum with content
	curriculumRootBlock := models.Block{
		ProjectID:    projectID,
		UserID:       userID,
		Type:         models.DatabaseBlock,
		Title:        "Curriculum Alignment",
		Content:      datatypes.JSON(contentJSON), // Initialize with EditorJS content
		SortOrder:    float64(300),
		HasChildren:  false,
		LastEditedBy: userID,
		Color:        stringToPointer("curriculum"),
		Icon:         stringToPointer("book"),
	}

	_, err = blockService.CreateBlockDirect(&curriculumRootBlock)
	if err != nil {
		return fmt.Errorf("error creating root block for curriculum: %w", err)
	}

	return nil
	*/
}

// Helper function to extract JSON arrays from interface{} data
func getJSONArray(data interface{}, key string) ([]interface{}, bool) {
	if dataMap, ok := data.(map[string]interface{}); ok {
		if array, ok := dataMap[key].([]interface{}); ok {
			return array, true
		}
	}
	return nil, false
}

// createProjectPost creates a project post with the given data
func createProjectPost(projectID, userID uint, postData map[string]interface{},
	defaultTitle, defaultDescription, defaultCover string,
	defaultStartTime, defaultEndTime *time.Time, defaultLocation string) (*models.ProjectPost, error) {

	// Extract post details
	postTitle := getStringValue(postData, "title", defaultTitle)                   // Default to project title if not specified
	postDescription := getStringValue(postData, "description", defaultDescription) // Default to project description

	// Create project post
	projectPost := &models.ProjectPost{
		ProjectID: projectID,
		UserID:    userID,
		Title:     postTitle,
		Status:    1, // Open status
	}

	// Set description if provided
	if postDescription != "" {
		projectPost.Description = &postDescription
	}

	// Handle post cover
	postCover := getStringValue(postData, "cover", defaultCover) // Default to project cover
	if postCover != "" {
		projectPost.Cover = &postCover
	}

	// Handle dates
	postStartDate := postData["startDate"]
	if postStartDate != nil {
		if startDateStr, ok := postStartDate.(string); ok && startDateStr != "" {
			parsedStartDate, err := time.Parse("2006-01-02", startDateStr)
			if err == nil {
				projectPost.StartTime = &parsedStartDate
			}
		} else if defaultStartTime != nil {
			// Default to project start time if post start date not valid
			projectPost.StartTime = defaultStartTime
		}
	}

	postDeadline := postData["deadline"]
	if postDeadline != nil {
		if deadlineStr, ok := postDeadline.(string); ok && deadlineStr != "" {
			parsedDeadline, err := time.Parse("2006-01-02", deadlineStr)
			if err == nil {
				projectPost.Deadline = &parsedDeadline
			}
		} else if defaultEndTime != nil {
			// Default to project deadline if post deadline not valid
			projectPost.Deadline = defaultEndTime
		}
	}

	// Handle post location
	postLocation := getStringValue(postData, "location", defaultLocation) // Default to project location
	if postLocation != "" {
		projectPost.Location = &postLocation
	}

	// Handle media
	if postMedia, ok := postData["media"].([]interface{}); ok && len(postMedia) > 0 {
		mediaJSON, err := json.Marshal(postMedia)
		if err == nil {
			projectPost.Medias = datatypes.JSON(mediaJSON)
		}
	}

	// Handle positions/spots
	if positions, ok := postData["positions"].([]interface{}); ok && len(positions) > 0 {
		spotsData := make([]map[string]interface{}, 0, len(positions))
		for _, pos := range positions {
			if posMap, ok := pos.(map[string]interface{}); ok {
				spotItem := map[string]interface{}{
					"title":       posMap["name"],
					"description": posMap["responsibility"],
					"spots":       posMap["spots"],
				}
				spotsData = append(spotsData, spotItem)
			}
		}

		if len(spotsData) > 0 {
			spotsJSON, err := json.Marshal(spotsData)
			if err == nil {
				projectPost.Spots = datatypes.JSON(spotsJSON)
			}
		}
	}

	// Set visibility
	visibility := 2 // Default to public
	if visibilityVal, ok := postData["visibility"].(float64); ok {
		visibility = int(visibilityVal)
	}
	projectPost.Visibility = visibility

	// Generate short ID for post
	if err := repositories.GenerateProjectPostShortID(projectPost); err != nil {
		return nil, fmt.Errorf("error generating post short ID: %w", err)
	}

	// Save post to database
	if err := repositories.SaveProjectPost(projectPost); err != nil {
		return nil, fmt.Errorf("error saving project post: %w", err)
	}

	// Process application questions if provided
	if questions, ok := postData["questions"].([]interface{}); ok && len(questions) > 0 {
		var applicationQuestions []models.ApplicationQuestion

		for _, q := range questions {
			if qMap, ok := q.(map[string]interface{}); ok {
				questionType := uint(0) // Default type
				if qType, ok := qMap["type"].(float64); ok {
					questionType = uint(qType)
				}

				questionText, _ := qMap["text"].(string)

				var choicesJSON datatypes.JSON
				if choices, ok := qMap["choices"].([]interface{}); ok && len(choices) > 0 {
					if choicesData, err := json.Marshal(choices); err == nil {
						choicesJSON = datatypes.JSON(choicesData)
					}
				}

				applicationQuestions = append(applicationQuestions, models.ApplicationQuestion{
					PostID:  projectPost.PostID,
					Text:    questionText,
					Type:    questionType,
					Choices: choicesJSON,
				})
			}
		}

		if len(applicationQuestions) > 0 {
			if err := repositories.SaveApplicationQuestions(applicationQuestions); err != nil {
				fmt.Printf("Warning: failed to save application questions: %v\n", err)
				// Continue even if questions saving fails - post is already saved
			}
		}
	}

	return projectPost, nil
}

// Helper to convert a string to a string pointer
func stringToPointer(s string) *string {
	return &s
}

// Helper to generate a block ID for EditorJS content
func generateBlockID() string {
	// Generate a random string using time and random characters
	timestamp := time.Now().UnixNano()
	randomChars := "abcdefghijklmnopqrstuvwxyz0123456789"
	result := ""
	for i := 0; i < 8; i++ {
		index := int(timestamp % int64(len(randomChars)))
		timestamp = timestamp / int64(len(randomChars))
		result += string(randomChars[index])
	}
	return result
}

// Helper function to extract string value from map
func getStringValue(data map[string]interface{}, key string, defaultValue string) string {
	if val, ok := data[key].(string); ok && val != "" {
		return val
	}
	return defaultValue
}
