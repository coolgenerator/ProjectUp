package controllers

import (
	"projectup/models"
	"projectup/repositories"
	"projectup/services"
	"net/http"
	"strconv"
	"fmt"

	"github.com/gin-gonic/gin"
)

func GenerateLearningPath() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req models.LearningPathRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "details": "Failed to parse request body"})
			return
		}

		req.UserID = userID
		
		fmt.Printf("Generating learning path for user %d, topic: %s\n", userID, req.TopicName)

		// Create a project card immediately with "generating" status
		learningPath := &models.LearningPath{
			UserID:         userID,
			TopicID:        req.TopicID,
			TopicName:      req.TopicName,
			Title:          req.TopicName + " Learning Path",
			Description:    req.Description,
			Category:       req.Category,
			IsPublic:       req.IsPublic,
			Status:         "generating",
			LearningGoals:  req.LearningGoals,
			EstimatedWeeks: req.EstimatedWeeks,
			Progress:       0,
		}

		// Save initial learning path to database
		repo := repositories.NewLearningRepository()
		if err := repo.CreateLearningPath(learningPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create learning path"})
			return
		}

		// Start async generation in a goroutine
		go func(pathID uint, req models.LearningPathRequest) {
			fmt.Printf("Starting async generation for path ID %d\n", pathID)
			
			// Create new repository instance for goroutine
			asyncRepo := repositories.NewLearningRepository()
			
			// Call AI service to generate complete learning path
			generatedPath, err := services.GenerateLearningPathWithAI(req)
			if err != nil {
				fmt.Printf("Failed to generate learning path: %v\n", err)
				// Update status to failed
				asyncRepo.UpdateLearningPathStatus(pathID, "failed")
				return
			}

			// Update the learning path with generated content
			generatedPath.ID = pathID
			generatedPath.Status = "ready"
			
			// Update in database
			if err := asyncRepo.UpdateLearningPath(generatedPath); err != nil {
				asyncRepo.UpdateLearningPathStatus(pathID, "failed")
				return
			}
		}(learningPath.ID, req)

		// Return immediate response
		c.JSON(http.StatusOK, gin.H{
			"learning_path": learningPath,
			"message":      "Learning path is being generated",
			"status":       "generating",
		})
	}
}

func GetUserLearningPaths() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

		repo := repositories.NewLearningRepository()
		paths, total, err := repo.GetUserLearningPaths(userID, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning paths"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"learning_paths": paths,
			"total":          total,
			"page":           page,
			"limit":          limit,
		})
	}
}

func GetLearningPath() gin.HandlerFunc {
	return func(c *gin.Context) {
		topicID := c.Param("topicId")
		if topicID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path ID"})
			return
		}

		repo := repositories.NewLearningRepository()
		path, err := repo.GetLearningPathByTopicID(topicID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"learning_path": path,
		})
	}
}

func ToggleTaskCompletion() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		taskIDStr := c.Param("taskId")
		taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
			return
		}

		repo := repositories.NewLearningRepository()
		
		// Verify task belongs to user
		if !repo.IsTaskOwnedByUser(uint(taskID), userID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		if err := repo.ToggleTaskCompletion(uint(taskID)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
			return
		}

		// Check if module is complete
		repo.UpdateModuleCompletion(uint(taskID))

		c.JSON(http.StatusOK, gin.H{
			"message": "Task updated successfully",
		})
	}
}

func UpdateLearningProgress() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		pathID := c.Param("pathId")
		
		var req struct {
			Progress float32 `json:"progress"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		repo := repositories.NewLearningRepository()
		if err := repo.UpdateProgress(pathID, userID, req.Progress); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Progress updated successfully",
		})
	}
}

func GenerateLearningGoals() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req struct {
			Topic            string `json:"topic" binding:"required"`
			CurrentKnowledge string `json:"currentKnowledge"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Call AI agent to generate learning goals
		service := services.NewAgentService()
		goals, err := service.GenerateLearningGoals(req.Topic, req.CurrentKnowledge)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate learning goals"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"goals":   goals,
		})
	}
}

func DeleteLearningPath() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		topicID := c.Param("topicId")

		repo := repositories.NewLearningRepository()
		if err := repo.DeleteLearningPathByTopicID(topicID, userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete learning path"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Learning path deleted successfully",
		})
	}
}

// UpdateLearningPathVisibility updates the public/private status of a learning path
func UpdateLearningPathVisibility() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		topicID := c.Param("topicId")

		var req struct {
			IsPublic bool `json:"isPublic"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		repo := repositories.NewLearningRepository()
		if err := repo.UpdateLearningPathVisibilityByTopicID(topicID, userID, req.IsPublic); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visibility"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Course visibility updated successfully",
			"isPublic": req.IsPublic,
		})
	}
}

// SaveCourseRequest saves a course request initiated via AI agent
func SaveCourseRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req struct {
			RequestID      string `json:"requestId" binding:"required"`
			Title          string `json:"title" binding:"required"`
			Description    string `json:"description"`
			Difficulty     string `json:"difficulty"`
			EstimatedWeeks int    `json:"estimatedWeeks"`
			Status         string `json:"status"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Create a learning path record with AI agent request ID
		learningPath := &models.LearningPath{
			UserID:         userID,
			TopicID:        req.RequestID, // Store AI agent request_id as topic_id
			TopicName:      req.Title,
			Title:          req.Title,
			Description:    req.Description,
			Difficulty:     req.Difficulty,
			EstimatedWeeks: req.EstimatedWeeks,
			Status:         req.Status,
			Progress:       0,
		}

		repo := repositories.NewLearningRepository()
		if err := repo.CreateLearningPath(learningPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save course request"})
			return
		}

		// Start background task to poll AI agent for status updates
		go func(pathID uint, requestID string) {
			services.PollCourseStatus(pathID, requestID)
		}(learningPath.ID, req.RequestID)

		c.JSON(http.StatusOK, gin.H{
			"message":       "Course request saved successfully",
			"learning_path": learningPath,
		})
	}
}

// GetPublicCourses fetches all public courses with optional category filtering
func GetPublicCourses() gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
		category := c.Query("category") // Optional category filter
		search := c.Query("search")     // Optional search term

		repo := repositories.NewLearningRepository()
		paths, total, err := repo.GetPublicLearningPaths(page, limit, category, search)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch public courses"})
			return
		}

		// Get unique categories for filter
		categories, err := repo.GetCourseCategories()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
			return
		}

		// Check if user is authenticated and add like status
		userID := c.GetUint("userID")
		if userID > 0 {
			// Add isLiked field for each course
			for i := range paths {
				paths[i].IsLiked = repo.IsCourseLikedByUser(paths[i].ID, userID)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"learning_paths": paths,
			"total":          total,
			"page":           page,
			"limit":          limit,
			"categories":     categories,
		})
	}
}

// CopyCourseToMyCourses copies a public course to the user's course list
func CopyCourseToMyCourses() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		courseIDStr := c.Param("id")
		courseID, err := strconv.ParseUint(courseIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
			return
		}

		repo := repositories.NewLearningRepository()

		// Copy the course
		copiedCourse, err := repo.CopyCourseToUser(uint(courseID), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy course"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":       "Course copied successfully",
			"learning_path": copiedCourse,
		})
	}
}

// IncrementCourseView increments the view count for a course
func IncrementCourseView() gin.HandlerFunc {
	return func(c *gin.Context) {
		courseIDStr := c.Param("id")
		courseID, err := strconv.ParseUint(courseIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
			return
		}

		repo := repositories.NewLearningRepository()
		if err := repo.IncrementViewCount(uint(courseID)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increment view count"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "View count incremented"})
	}
}

// ToggleCourseLike toggles a like for a course
func ToggleCourseLike() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		courseIDStr := c.Param("id")
		courseID, err := strconv.ParseUint(courseIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
			return
		}

		repo := repositories.NewLearningRepository()
		liked, err := repo.ToggleLike(uint(courseID), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle like"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"liked":   liked,
			"message": map[bool]string{true: "Course liked", false: "Course unliked"}[liked],
		})
	}
}