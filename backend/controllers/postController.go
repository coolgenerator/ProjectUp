package controllers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// CreatePost handles the creation of a new post
func CreatePost() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		// Parse multipart form
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
			println("ERROR: Failed to parse form data:", err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data: " + err.Error()})
			return
		}

		// Get form values
		title := c.PostForm("title")
		content := c.PostForm("content")
		tagsStr := c.PostForm("tags")
		visibilityStr := c.PostForm("visibility")

		println("DEBUG: Creating post - title:", title, "content length:", len(content), "tags:", tagsStr)

		// Parse tags
		var tags []string
		if tagsStr != "" {
			if err := json.Unmarshal([]byte(tagsStr), &tags); err != nil {
				println("ERROR: Invalid tags format:", err.Error())
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format: " + err.Error()})
				return
			}
		}
		println("DEBUG: Parsed tags:", tags)

		// Parse visibility
		visibility := 2 // Default to public
		if visibilityStr != "" {
			if v, err := strconv.Atoi(visibilityStr); err == nil {
				visibility = v
			}
		}

		// Handle media files
		var mediaItems []models.MediaItem
		files := c.Request.MultipartForm.File["media"]
		println("DEBUG: Media files count:", len(files))
		if len(files) > 0 {
			bucketName := os.Getenv("AWS_BUCKET_NAME")
			println("DEBUG: AWS Bucket Name:", bucketName)
			for i, file := range files {
				println("DEBUG: Processing file", i+1, ":", file.Filename)

				// Save file temporarily
				tempPath := "./" + file.Filename
				if err := c.SaveUploadedFile(file, tempPath); err != nil {
					println("ERROR: Failed to save file temporarily:", err.Error())
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
					return
				}
				println("DEBUG: File saved temporarily to:", tempPath)

				// Generate unique filename
				fileHash, err := helper.GenerateFileHash(tempPath)
				if err != nil {
					println("ERROR: Failed to generate file hash:", err.Error())
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file hash: " + err.Error()})
					return
				}
				println("DEBUG: File hash generated:", fileHash)

				// Upload to S3
				uniqueFilename := "media/" + fileHash + "_" + file.Filename
				println("DEBUG: Uploading to S3 with filename:", uniqueFilename)
				err = helper.UploadFileIfUnique(bucketName, uniqueFilename, tempPath, true)
				if err != nil {
					println("ERROR: Failed to upload to S3:", err.Error())
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to S3: " + err.Error()})
					return
				}
				println("DEBUG: File uploaded to S3 successfully")

				// Clean up temp file
				os.Remove(tempPath)
				println("DEBUG: Temp file cleaned up")

				// Add media item
				mediaType := "image"
				if strings.HasSuffix(file.Filename, ".mp4") {
					mediaType = "video"
				}
				mediaItems = append(mediaItems, models.MediaItem{
					URL:  uniqueFilename,
					Type: mediaType,
				})
			}
		}

		// Create post
		mediaJSON, err := json.Marshal(mediaItems)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal media items"})
			return
		}

		// Convert tags to PostgreSQL array format
		tagsArray := "{" + strings.Join(tags, ",") + "}"

		post := models.Post{
			UserID:     userID,
			Title:      title,
			Content:    content,
			Tags:       tags,
			Media:      datatypes.JSON(mediaJSON),
			Visibility: visibility,
			PostType:   "general",
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		// Generate short ID
		if err := repositories.GeneratePostShortID(&post); err != nil {
			println("ERROR: Failed to generate short ID:", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate post ID: " + err.Error()})
			return
		}

		println("DEBUG: Short ID generated:", post.ShortID)
		println("DEBUG: Tags array:", tagsArray)
		println("DEBUG: Media JSON:", string(mediaJSON))

		// Save post
		if err := database.DB.Exec("INSERT INTO posts (short_id, user_id, title, content, post_type, visibility, created_at, updated_at, deleted_at, is_deleted, tags, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			post.ShortID, post.UserID, post.Title, post.Content, post.PostType, post.Visibility, post.CreatedAt, post.UpdatedAt, nil, false, tagsArray, mediaJSON).Error; err != nil {
			println("ERROR: Failed to insert post into database:", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post: " + err.Error()})
			return
		}

		println("DEBUG: Post created successfully with ID:", post.ID)
		c.JSON(http.StatusCreated, post)
	}
}

// GetPostByShortID retrieves a single post by its short ID
func GetPostByShortID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		shortID := c.Param("shortId")

		if shortID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing post ID"})
			return
		}

		// Fetch post and join user information
		var postData struct {
			ID         uint           `json:"id"`
			ShortID    string         `json:"sid"`
			UserID     uint           `json:"user_id"`
			Title      string         `json:"title"`
			Content    string         `json:"content"`
			PostType   string         `json:"post_type"`
			Visibility int            `json:"visibility"`
			CreatedAt  time.Time      `json:"created_at"`
			UpdatedAt  time.Time      `json:"updated_at"`
			DeletedAt  gorm.DeletedAt `json:"deleted_at,omitempty"`
			IsDeleted  bool           `json:"is_deleted"`
			Tags       string         `json:"tags"`
			Media      datatypes.JSON `json:"media"`
			// User fields
			Username      string    `json:"-"`
			UserCreatedAt time.Time `json:"-"`
			UserUpdatedAt time.Time `json:"-"`
			EmailVerified bool      `json:"-"`
			Verified      bool      `json:"-"`
			// Profile fields
			PreferredName         string `json:"-"`
			FirstName             string `json:"-"`
			LastName              string `json:"-"`
			AvatarURL             string `json:"-"`
			DisplayNamePreference *int   `json:"-"`
		}

		query := `
			SELECT
				p.id, p.short_id, p.user_id, p.title, p.content, p.post_type, p.visibility,
				p.created_at, p.updated_at, p.deleted_at, p.is_deleted, p.tags, p.media,
				u.username, u.created_at as user_created_at, u.updated_at as user_updated_at,
				u.email_verified, u.verified,
				pr.preferred_name, pr.first_name, pr.last_name, pr.avatar_url,
				up.display_name_preference
			FROM posts p
			LEFT JOIN users u ON p.user_id = u.id
			LEFT JOIN profiles pr ON u.id = pr.user_id
			LEFT JOIN user_preferences up ON u.id = up.user_id
			WHERE p.short_id = ? AND p.is_deleted = false AND p.deleted_at IS NULL
		`

		if err := database.DB.Raw(query, shortID).Scan(&postData).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}

		// Parse tags array
		tags := []string{}
		if postData.Tags != "" {
			// Remove the curly braces and split by comma
			tagsStr := strings.Trim(postData.Tags, "{}")
			if tagsStr != "" {
				tags = strings.Split(tagsStr, ",")
			}
		}

		// Check user interactions with this post using the new generic interaction service
		isSaved, _ := services.CheckUserInteraction(userID, models.EntityTypeGeneralPost, postData.ID, models.InteractionTypeSave)
		isLiked, _ := services.CheckUserInteraction(userID, models.EntityTypeGeneralPost, postData.ID, models.InteractionTypeLike)

		// Get like count using the new generic interaction service
		likesCount, _ := services.GetInteractionCount(models.EntityTypeGeneralPost, postData.ID, models.InteractionTypeLike)

		// Format the post with user information
		formattedPost := models.Post{
			ID:         postData.ID,
			ShortID:    postData.ShortID,
			UserID:     postData.UserID,
			Title:      postData.Title,
			Content:    postData.Content,
			PostType:   postData.PostType,
			Visibility: postData.Visibility,
			CreatedAt:  postData.CreatedAt,
			UpdatedAt:  postData.UpdatedAt,
			DeletedAt:  postData.DeletedAt,
			IsDeleted:  postData.IsDeleted,
			Tags:       tags,
			Media:      postData.Media,
			User: &models.User{
				ID:            postData.UserID,
				Username:      &postData.Username,
				EmailVerified: postData.EmailVerified,
				Verified:      postData.Verified,
				CreatedAt:     postData.UserCreatedAt,
				UpdatedAt:     postData.UserUpdatedAt,
			},
			Profile: &models.Profile{
				UserID:                postData.UserID,
				PreferredName:         &postData.PreferredName,
				FirstName:             &postData.FirstName,
				LastName:              &postData.LastName,
				AvatarURL:             &postData.AvatarURL,
				DisplayNamePreference: postData.DisplayNamePreference,
			},
		}

		// Add custom JSON fields
		response := make(map[string]interface{})
		postBytes, _ := json.Marshal(formattedPost)
		json.Unmarshal(postBytes, &response)

		response["sid"] = postData.ShortID
		response["is_saved"] = isSaved
		response["is_loved"] = isLiked
		response["likes_count"] = likesCount

		c.JSON(http.StatusOK, response)
	}
}

// GetPosts handles fetching posts with pagination
func GetPosts() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")

		// Get pagination parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		// Get search query if any
		searchQuery := c.Query("q")

		// Build base query with user join
		baseQuery := `
			SELECT
				p.id,
				p.short_id,
				p.user_id,
				p.title,
				p.content,
				p.post_type,
				p.visibility,
				p.created_at,
				p.updated_at,
				p.deleted_at,
				p.is_deleted,
				p.tags,
				p.media,
				u.id as user_id,
				u.username,
				u.email_verified,
				u.verified,
				u.created_at as user_created_at,
				u.updated_at as user_updated_at,
				prof.user_id as profile_user_id,
				prof.preferred_name,
				prof.first_name,
				prof.last_name,
				prof.avatar_url,
				up.display_name_preference
			FROM posts p
			LEFT JOIN users u ON p.user_id = u.id
			LEFT JOIN profiles prof ON u.id = prof.user_id
			LEFT JOIN user_preferences up ON u.id = up.user_id
			WHERE p.is_deleted = false AND p.deleted_at IS NULL
		`
		countQuery := "SELECT COUNT(*) FROM posts p WHERE p.is_deleted = false AND p.deleted_at IS NULL"

		// Add search condition if query exists
		if searchQuery != "" {
			searchCondition := " AND (p.title ILIKE ? OR p.content ILIKE ?)"
			baseQuery += searchCondition
			countQuery += searchCondition
		}

		// Add ordering and pagination
		baseQuery += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?"

		// Get total count
		var total int64
		if searchQuery != "" {
			searchPattern := "%" + searchQuery + "%"
			if err := database.DB.Raw(countQuery, searchPattern, searchPattern).Scan(&total).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count posts"})
				return
			}
		} else {
			if err := database.DB.Raw(countQuery).Scan(&total).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count posts"})
				return
			}
		}

		// Fetch posts with proper type casting for tags and user information
		var posts []struct {
			ID         uint           `json:"id"`
			ShortID    string         `json:"short_id"`
			PostUserID uint           `json:"user_id"`
			Title      string         `json:"title"`
			Content    string         `json:"content"`
			PostType   string         `json:"post_type"`
			Visibility int            `json:"visibility"`
			CreatedAt  time.Time      `json:"created_at"`
			UpdatedAt  time.Time      `json:"updated_at"`
			DeletedAt  gorm.DeletedAt `json:"deleted_at,omitempty"`
			IsDeleted  bool           `json:"is_deleted"`
			Tags       string         `json:"tags"`
			Media      datatypes.JSON `json:"media"`
			// User fields
			UserID        uint      `json:"-"`
			Username      string    `json:"-"`
			EmailVerified bool      `json:"-"`
			Verified      bool      `json:"-"`
			UserCreatedAt time.Time `json:"-"`
			UserUpdatedAt time.Time `json:"-"`
			// Profile fields
			ProfileUserID         uint   `json:"-"`
			ProfileShortID        string `json:"-"`
			PreferredName         string `json:"-"`
			FirstName             string `json:"-"`
			LastName              string `json:"-"`
			AvatarURL             string `json:"-"`
			DisplayNamePreference *int   `json:"-"`
		}

		if searchQuery != "" {
			searchPattern := "%" + searchQuery + "%"
			if err := database.DB.Raw(baseQuery, searchPattern, searchPattern, limit, offset).Scan(&posts).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
				return
			}
		} else {
			if err := database.DB.Raw(baseQuery, limit, offset).Scan(&posts).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
				return
			}
		}

		// Convert posts to the expected format with proper tags array
		var formattedPosts []map[string]interface{}
		for _, p := range posts {
			// Parse tags from PostgreSQL array format
			tags := []string{}
			if p.Tags != "" {
				// Remove the curly braces and split by comma
				tagsStr := strings.Trim(p.Tags, "{}")
				if tagsStr != "" {
					tags = strings.Split(tagsStr, ",")
				}
			}

			// Create post with nested user and profile
			post := models.Post{
				ID:         p.ID,
				ShortID:    p.ShortID,
				UserID:     p.PostUserID,
				Title:      p.Title,
				Content:    p.Content,
				PostType:   p.PostType,
				Visibility: p.Visibility,
				CreatedAt:  p.CreatedAt,
				UpdatedAt:  p.UpdatedAt,
				DeletedAt:  p.DeletedAt,
				IsDeleted:  p.IsDeleted,
				Tags:       tags,
				Media:      p.Media,
				User: &models.User{
					ID:            p.UserID,
					Username:      &p.Username,
					EmailVerified: p.EmailVerified,
					Verified:      p.Verified,
					CreatedAt:     p.UserCreatedAt,
					UpdatedAt:     p.UserUpdatedAt,
				},
				Profile: &models.Profile{
					UserID:                p.ProfileUserID,
					ShortID:               p.ProfileShortID,
					PreferredName:         &p.PreferredName,
					FirstName:             &p.FirstName,
					LastName:              &p.LastName,
					AvatarURL:             &p.AvatarURL,
					DisplayNamePreference: p.DisplayNamePreference,
				},
			}

			// Convert to map to allow adding interaction fields
			postMap := make(map[string]interface{})
			postBytes, _ := json.Marshal(post)
			json.Unmarshal(postBytes, &postMap)

			// Set short ID field with the right key (sid)
			postMap["sid"] = p.ShortID

			// Get interaction data using the new generic interaction service
			interactions, _ := services.GetEntityInteractions(userID, models.EntityTypeGeneralPost, p.ID)

			// Add all interaction data to the post map
			for k, v := range interactions {
				postMap[k] = v
			}

			formattedPosts = append(formattedPosts, postMap)
		}

		// Calculate if there are more posts
		hasMore := int64(offset+limit) < total

		c.JSON(http.StatusOK, gin.H{
			"posts":   formattedPosts,
			"hasMore": hasMore,
			"total":   total,
			"page":    page,
		})
	}
}

// GetUserPosts handles fetching posts by a specific user
func GetUserPosts() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID := c.GetUint("userID")

		// Get user ID from query parameters
		userIDStr := c.Query("user_id")
		if userIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing user_id parameter"})
			return
		}

		userID, err := strconv.ParseUint(userIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id format"})
			return
		}

		// Get pagination parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		// Build base query with user join and filter by user_id
		baseQuery := `
			SELECT 
				p.id,
				p.short_id,
				p.user_id,
				p.title,
				p.content,
				p.post_type,
				p.visibility,
				p.created_at,
				p.updated_at,
				p.deleted_at,
				p.is_deleted,
				p.tags,
				p.media,
				u.id as user_id,
				u.username,
				u.email_verified,
				u.verified,
				u.created_at as user_created_at,
				u.updated_at as user_updated_at,
				prof.user_id as profile_user_id,
				prof.preferred_name,
				prof.first_name,
				prof.last_name,
				prof.avatar_url,
				up.display_name_preference
			FROM posts p
			LEFT JOIN users u ON p.user_id = u.id
			LEFT JOIN profiles prof ON u.id = prof.user_id
			LEFT JOIN user_preferences up ON u.id = up.user_id
			WHERE p.is_deleted = false AND p.deleted_at IS NULL AND p.user_id = ?
		`
		countQuery := "SELECT COUNT(*) FROM posts WHERE is_deleted = false AND deleted_at IS NULL AND user_id = ?"

		// Add ordering and pagination
		baseQuery += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?"

		// Get total count
		var total int64
		if err := database.DB.Raw(countQuery, userID).Scan(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count posts"})
			return
		}

		// Fetch posts with proper type casting for tags and user information
		var posts []struct {
			ID         uint           `json:"id"`
			ShortID    string         `json:"short_id"`
			PostUserID uint           `json:"user_id"`
			Title      string         `json:"title"`
			Content    string         `json:"content"`
			PostType   string         `json:"post_type"`
			Visibility int            `json:"visibility"`
			CreatedAt  time.Time      `json:"created_at"`
			UpdatedAt  time.Time      `json:"updated_at"`
			DeletedAt  gorm.DeletedAt `json:"deleted_at,omitempty"`
			IsDeleted  bool           `json:"is_deleted"`
			Tags       string         `json:"tags"`
			Media      datatypes.JSON `json:"media"`
			// User fields
			UserID        uint      `json:"-"`
			Username      string    `json:"-"`
			EmailVerified bool      `json:"-"`
			Verified      bool      `json:"-"`
			UserCreatedAt time.Time `json:"-"`
			UserUpdatedAt time.Time `json:"-"`
			// Profile fields
			ProfileUserID         uint   `json:"-"`
			ProfileShortID        string `json:"-"`
			PreferredName         string `json:"-"`
			FirstName             string `json:"-"`
			LastName              string `json:"-"`
			AvatarURL             string `json:"-"`
			DisplayNamePreference *int   `json:"-"`
		}

		if err := database.DB.Raw(baseQuery, userID, limit, offset).Scan(&posts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
			return
		}

		// Convert posts to the expected format with proper tags array
		var formattedPosts []map[string]interface{}
		for _, p := range posts {
			// Parse tags from PostgreSQL array format
			tags := []string{}
			if p.Tags != "" {
				// Remove the curly braces and split by comma
				tagsStr := strings.Trim(p.Tags, "{}")
				if tagsStr != "" {
					tags = strings.Split(tagsStr, ",")
				}
			}

			// Create post with nested user and profile
			post := models.Post{
				ID:         p.ID,
				ShortID:    p.ShortID,
				UserID:     p.PostUserID,
				Title:      p.Title,
				Content:    p.Content,
				PostType:   p.PostType,
				Visibility: p.Visibility,
				CreatedAt:  p.CreatedAt,
				UpdatedAt:  p.UpdatedAt,
				DeletedAt:  p.DeletedAt,
				IsDeleted:  p.IsDeleted,
				Tags:       tags,
				Media:      p.Media,
				User: &models.User{
					ID:            p.UserID,
					Username:      &p.Username,
					EmailVerified: p.EmailVerified,
					Verified:      p.Verified,
					CreatedAt:     p.UserCreatedAt,
					UpdatedAt:     p.UserUpdatedAt,
				},
				Profile: &models.Profile{
					UserID:                p.ProfileUserID,
					ShortID:               p.ProfileShortID,
					PreferredName:         &p.PreferredName,
					FirstName:             &p.FirstName,
					LastName:              &p.LastName,
					AvatarURL:             &p.AvatarURL,
					DisplayNamePreference: p.DisplayNamePreference,
				},
			}

			// Convert to map to allow adding interaction fields
			postMap := make(map[string]interface{})
			postBytes, _ := json.Marshal(post)
			json.Unmarshal(postBytes, &postMap)

			// Set short ID field with the right key (sid)
			postMap["sid"] = p.ShortID

			// Get interaction data using the new generic interaction service
			interactions, _ := services.GetEntityInteractions(currentUserID, models.EntityTypeGeneralPost, p.ID)

			// Add all interaction data to the post map
			for k, v := range interactions {
				postMap[k] = v
			}

			formattedPosts = append(formattedPosts, postMap)
		}

		// Calculate if there are more posts
		hasMore := int64(offset+limit) < total

		c.JSON(http.StatusOK, gin.H{
			"posts":   formattedPosts,
			"hasMore": hasMore,
			"total":   total,
			"page":    page,
		})
	}
}

// UpdatePost handles updating an existing post
func UpdatePost() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		postID, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
			return
		}

		// Check if the post exists and belongs to the user using a simpler query
		var exists bool
		if err := database.DB.Raw("SELECT EXISTS(SELECT 1 FROM posts WHERE id = ? AND user_id = ? AND is_deleted = false AND deleted_at IS NULL)", postID, userID).Scan(&exists).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check post existence: " + err.Error()})
			return
		}

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to update it"})
			return
		}

		// Parse multipart form
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
			return
		}

		// Get form values
		title := c.PostForm("title")
		content := c.PostForm("content")
		tagsStr := c.PostForm("tags")
		visibilityStr := c.PostForm("visibility")

		// Parse tags
		var tags []string
		if tagsStr != "" {
			if err := json.Unmarshal([]byte(tagsStr), &tags); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format"})
				return
			}
		}

		// Parse visibility
		visibility := 2 // Default to public if not provided
		if visibilityStr != "" {
			if v, err := strconv.Atoi(visibilityStr); err == nil {
				visibility = v
			}
		}

		// Handle media files
		var mediaItems []models.MediaItem
		files := c.Request.MultipartForm.File["media"]

		// Check if we need to load existing media
		if len(files) == 0 {
			// Get existing media from database
			var mediaJSON string
			if err := database.DB.Raw("SELECT media FROM posts WHERE id = ?", postID).Scan(&mediaJSON).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get existing media: " + err.Error()})
				return
			}

			if mediaJSON != "" {
				if err := json.Unmarshal([]byte(mediaJSON), &mediaItems); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse existing media: " + err.Error()})
					return
				}
			}
		} else {
			// Process new media files
			bucketName := os.Getenv("AWS_BUCKET_NAME")
			for _, file := range files {
				// Save file temporarily
				tempPath := "./" + file.Filename
				if err := c.SaveUploadedFile(file, tempPath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
					return
				}

				// Generate unique filename
				fileHash, err := helper.GenerateFileHash(tempPath)
				if err != nil {
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file hash"})
					return
				}

				// Upload to S3
				uniqueFilename := "media/" + fileHash + "_" + file.Filename
				err = helper.UploadFileIfUnique(bucketName, uniqueFilename, tempPath, true)
				if err != nil {
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to S3"})
					return
				}

				// Clean up temp file
				os.Remove(tempPath)

				// Add media item
				mediaType := "image"
				if strings.HasSuffix(file.Filename, ".mp4") {
					mediaType = "video"
				}
				mediaItems = append(mediaItems, models.MediaItem{
					URL:  uniqueFilename,
					Type: mediaType,
				})
			}
		}

		// Marshal media items to JSON
		mediaJSON, err := json.Marshal(mediaItems)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal media items: " + err.Error()})
			return
		}

		// Convert tags to PostgreSQL array format
		tagsArray := "{" + strings.Join(tags, ",") + "}"

		// Update the post with raw SQL to avoid type scanning issues
		updateQuery := `
			UPDATE posts 
			SET title = ?, content = ?, tags = ?, media = ?, visibility = ?, updated_at = ? 
			WHERE id = ? AND user_id = ? AND is_deleted = false
		`

		result := database.DB.Exec(
			updateQuery,
			title,
			content,
			tagsArray,
			mediaJSON,
			visibility,
			time.Now(),
			postID,
			userID,
		)

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post: " + result.Error.Error()})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to update it"})
			return
		}

		// Return a simplified response
		updatedPost := map[string]interface{}{
			"id":         postID,
			"title":      title,
			"content":    content,
			"tags":       tags,
			"media":      mediaItems,
			"visibility": visibility,
			"updated_at": time.Now(),
		}

		c.JSON(http.StatusOK, updatedPost)
	}
}

// DeletePost handles the deletion of a post
func DeletePost() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		postID, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
			return
		}

		// Check if the post exists and belongs to the user using raw SQL to avoid type scanning issues
		var exists bool
		if err := database.DB.Raw("SELECT EXISTS(SELECT 1 FROM posts WHERE id = ? AND user_id = ? AND is_deleted = false AND deleted_at IS NULL)", postID, userID).Scan(&exists).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check post existence: " + err.Error()})
			return
		}

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to delete it"})
			return
		}

		// Soft delete the post using raw SQL
		updateQuery := `
			UPDATE posts 
			SET is_deleted = true, deleted_at = ? 
			WHERE id = ? AND user_id = ?
		`

		result := database.DB.Exec(updateQuery, time.Now(), postID, userID)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete post: " + result.Error.Error()})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete post: no rows affected"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
	}
}

// UpdatePostByShortID handles updating a post by its short ID
func UpdatePostByShortID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		shortID := c.Param("shortId")

		if shortID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing post short ID"})
			return
		}

		// Get the post ID from the short ID
		var postID uint
		err := database.DB.Raw("SELECT id FROM posts WHERE short_id = ? AND is_deleted = false AND deleted_at IS NULL", shortID).Scan(&postID).Error
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}

		// Check if the post exists and belongs to the user
		var exists bool
		if err := database.DB.Raw("SELECT EXISTS(SELECT 1 FROM posts WHERE id = ? AND user_id = ? AND is_deleted = false AND deleted_at IS NULL)", postID, userID).Scan(&exists).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check post existence: " + err.Error()})
			return
		}

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to update it"})
			return
		}

		// Parse multipart form
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
			return
		}

		// Get form values
		title := c.PostForm("title")
		content := c.PostForm("content")
		tagsStr := c.PostForm("tags")
		visibilityStr := c.PostForm("visibility")

		// Parse tags
		var tags []string
		if tagsStr != "" {
			if err := json.Unmarshal([]byte(tagsStr), &tags); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format"})
				return
			}
		}

		// Parse visibility
		visibility := 2 // Default to public if not provided
		if visibilityStr != "" {
			if v, err := strconv.Atoi(visibilityStr); err == nil {
				visibility = v
			}
		}

		// Handle media files
		var mediaItems []models.MediaItem
		files := c.Request.MultipartForm.File["media"]

		// Check if we need to load existing media
		if len(files) == 0 {
			// Get existing media from database
			var mediaJSON string
			if err := database.DB.Raw("SELECT media FROM posts WHERE id = ?", postID).Scan(&mediaJSON).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get existing media: " + err.Error()})
				return
			}

			if mediaJSON != "" {
				if err := json.Unmarshal([]byte(mediaJSON), &mediaItems); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse existing media: " + err.Error()})
					return
				}
			}
		} else {
			// Process new media files
			bucketName := os.Getenv("AWS_BUCKET_NAME")
			for _, file := range files {
				// Save file temporarily
				tempPath := "./" + file.Filename
				if err := c.SaveUploadedFile(file, tempPath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
					return
				}

				// Generate unique filename
				fileHash, err := helper.GenerateFileHash(tempPath)
				if err != nil {
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file hash"})
					return
				}

				// Upload to S3
				uniqueFilename := "media/" + fileHash + "_" + file.Filename
				err = helper.UploadFileIfUnique(bucketName, uniqueFilename, tempPath, true)
				if err != nil {
					os.Remove(tempPath)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to S3"})
					return
				}

				// Clean up temp file
				os.Remove(tempPath)

				// Add media item
				mediaType := "image"
				if strings.HasSuffix(file.Filename, ".mp4") {
					mediaType = "video"
				}
				mediaItems = append(mediaItems, models.MediaItem{
					URL:  uniqueFilename,
					Type: mediaType,
				})
			}
		}

		// Marshal media items to JSON
		mediaJSON, err := json.Marshal(mediaItems)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal media items: " + err.Error()})
			return
		}

		// Convert tags to PostgreSQL array format
		tagsArray := "{" + strings.Join(tags, ",") + "}"

		// Update the post with raw SQL to avoid type scanning issues
		updateQuery := `
			UPDATE posts 
			SET title = ?, content = ?, tags = ?, media = ?, visibility = ?, updated_at = ? 
			WHERE id = ? AND user_id = ? AND is_deleted = false
		`

		result := database.DB.Exec(
			updateQuery,
			title,
			content,
			tagsArray,
			mediaJSON,
			visibility,
			time.Now(),
			postID,
			userID,
		)

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post: " + result.Error.Error()})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to update it"})
			return
		}

		// Return a simplified response
		updatedPost := map[string]interface{}{
			"id":         postID,
			"short_id":   shortID,
			"title":      title,
			"content":    content,
			"tags":       tags,
			"media":      mediaItems,
			"visibility": visibility,
			"updated_at": time.Now(),
		}

		c.JSON(http.StatusOK, updatedPost)
	}
}
