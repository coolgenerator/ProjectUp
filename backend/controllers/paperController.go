package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PaperChatRequest represents a chat request for a paper
type PaperChatRequest struct {
	Message string `json:"message" binding:"required"`
	Context string `json:"context"`
}

// PaperAnalysisResponse represents the analysis result
type PaperAnalysisResponse struct {
	InnovationScore   int      `json:"innovation_score"`
	Difficulty        string   `json:"difficulty"`
	Reproducibility   string   `json:"reproducibility"`
	Impact            string   `json:"impact"`
	Contributions     []string `json:"contributions"`
	TechnicalApproach string   `json:"technical_approach"`
	ResultsSummary    string   `json:"results_summary"`
	Limitations       []string `json:"limitations"`
}

// PaperOutline represents the paper structure
type PaperOutline struct {
	Sections []OutlineSection `json:"sections"`
}

type OutlineSection struct {
	Title       string           `json:"title"`
	PageNumber  int              `json:"page_number"`
	Level       int              `json:"level"`
	Subsections []OutlineSection `json:"subsections,omitempty"`
}

// PaperReference represents a reference in the paper
type PaperReference struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Authors []string `json:"authors"`
	Year    int      `json:"year"`
	Venue   string   `json:"venue"`
	DOI     string   `json:"doi,omitempty"`
	URL     string   `json:"url,omitempty"`
}

// GetUserPapers fetches all papers for a user
func GetUserPapers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	category := c.Query("category")
	readStatus := c.Query("read_status")
	search := c.Query("search")

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Build query
	query := database.DB.Model(&models.Paper{}).Where("user_id = ?", userID)

	// Apply filters
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if readStatus != "" {
		query = query.Where("read_status = ?", readStatus)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title LIKE ? OR abstract LIKE ? OR authors LIKE ? OR tags LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// Get total count
	var totalCount int64
	query.Count(&totalCount)

	// Apply pagination and order
	offset := (page - 1) * pageSize
	query = query.Order("created_at DESC").Offset(offset).Limit(pageSize)

	// Fetch papers
	var papers []models.Paper
	if err := query.Find(&papers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch papers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"papers":      papers,
		"total_count": totalCount,
		"page":        page,
		"page_size":   pageSize,
	})
}

// GetPaper fetches a single paper by ID
func GetPaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// First, clean up the FileURL if it contains query parameters (fix corrupted URLs)
	if strings.Contains(paper.FileURL, "?") && strings.Contains(paper.FileURL, "s3") {
		cleanURL := paper.FileURL
		if idx := strings.Index(cleanURL, "?"); idx != -1 {
			cleanURL = cleanURL[:idx]
		}
		// Remove any URL encoding artifacts
		cleanURL = strings.ReplaceAll(cleanURL, "%25253F", "")
		cleanURL = strings.ReplaceAll(cleanURL, "%253F", "")
		cleanURL = strings.ReplaceAll(cleanURL, "%3F", "")
		cleanURL = strings.ReplaceAll(cleanURL, "%2525", "%")
		cleanURL = strings.ReplaceAll(cleanURL, "%252F", "/")
		cleanURL = strings.ReplaceAll(cleanURL, "%25", "%")
		
		// Update the database with the clean URL
		database.DB.Model(&paper).Update("file_url", cleanURL)
		paper.FileURL = cleanURL
	}
	
	// Generate pre-signed URL for PDF access if file is in our storage
	if key, ok := helper.ObjectKeyFromURL(paper.FileURL); ok {
		// URL decode the key if needed (in case it contains encoded characters)
		key = strings.ReplaceAll(key, "%20", " ")
		
		// Initialize file helper to generate pre-signed URL
		fh, err := helper.NewFileHelper()
		if err == nil {
			// Generate pre-signed URL valid for 1 hour
			presignedURL, err := fh.GeneratePresignedURL(key, 3600)
			if err == nil {
				paper.FileURL = presignedURL
			}
		}
	}

	// Update last read time without modifying the file URL in database
	now := time.Now()
	database.DB.Model(&paper).Update("last_read_at", now)

	c.JSON(http.StatusOK, paper)
}

// CreatePaper creates a new paper
func CreatePaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.PaperRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert authors array to JSON string
	authorsJSON, _ := json.Marshal(req.Authors)

	// Create paper
	paper := models.Paper{
		ID:       uuid.New().String(),
		UserID:   userID.(uint),
		Title:    req.Title,
		Authors:  string(authorsJSON),
		Venue:    req.Venue,
		Year:     req.Year,
		Abstract: req.Abstract,
		FileURL:  req.FileURL,
		Tags:     strings.Join(req.Tags, ","),
		Category: req.Category,
		DOI:      req.DOI,
		ArxivID:  req.ArxivID,
	}

	// Auto-categorize if not provided
	if paper.Category == "" {
		paper.Category = categorizePaper(req.Title, req.Abstract, req.Tags)
	}

	if err := database.DB.Create(&paper).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create paper"})
		return
	}

	c.JSON(http.StatusCreated, paper)
}

// UpdatePaper updates an existing paper
func UpdatePaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	var req models.PaperRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	authorsJSON, _ := json.Marshal(req.Authors)
	paper.Title = req.Title
	paper.Authors = string(authorsJSON)
	paper.Venue = req.Venue
	paper.Year = req.Year
	paper.Abstract = req.Abstract
	paper.FileURL = req.FileURL
	paper.Tags = strings.Join(req.Tags, ",")
	paper.Category = req.Category
	paper.DOI = req.DOI
	paper.ArxivID = req.ArxivID

	if err := database.DB.Save(&paper).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update paper"})
		return
	}

	c.JSON(http.StatusOK, paper)
}

// DeletePaper deletes a paper
func DeletePaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).Delete(&models.Paper{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete paper"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paper deleted successfully"})
}

// GetPaperAnnotations fetches annotations for a paper
func GetPaperAnnotations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	// Verify paper ownership
	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// Fetch annotations (use Unscoped to bypass soft delete check if table doesn't have deleted_at)
	var annotations []models.PaperAnnotation
	if err := database.DB.Unscoped().Where("paper_id = ? AND user_id = ?", paperID, userID).
		Order("page ASC, created_at DESC").
		Find(&annotations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch annotations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"annotations": annotations})
}

// CreatePaperAnnotation creates a new annotation
func CreatePaperAnnotation(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	// Verify paper ownership
	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	var annotation models.PaperAnnotation
	if err := c.ShouldBindJSON(&annotation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	annotation.PaperID = paperID
	annotation.UserID = userID.(uint)

	if err := database.DB.Create(&annotation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create annotation"})
		return
	}

	c.JSON(http.StatusCreated, annotation)
}

// ChatWithPaper handles AI chat for a specific paper
func ChatWithPaper(c *gin.Context) {
	paperID := c.Param("id")
	userID, _ := c.Get("userID")

	var req PaperChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get paper details
	var paper models.Paper
	if err := database.DB.Where("id = ?", paperID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// Call AI agent for chat
	aiResponse, err := callAIAgent("chat", map[string]interface{}{
		"paper_id":    paperID,
		"paper_title": paper.Title,
		"abstract":    paper.Abstract,
		"message":     req.Message,
		"context":     req.Context,
		"user_id":     userID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get AI response"})
		return
	}

	// Store chat history
	chatHistory := models.ChatHistory{
		ID:        uuid.New().String(),
		UserID:    userID.(uint),
		PaperID:   paperID,
		Message:   req.Message,
		Response:  aiResponse["response"].(string),
		Context:   req.Context,
		CreatedAt: time.Now(),
	}
	database.DB.Create(&chatHistory)

	c.JSON(http.StatusOK, gin.H{
		"response": aiResponse["response"],
		"id":       chatHistory.ID,
	})
}

// AnalyzePaper performs comprehensive analysis of a paper
func AnalyzePaper(c *gin.Context) {
	paperID := c.Param("id")
	userID, _ := c.Get("userID")

	// Get paper details
	var paper models.Paper
	if err := database.DB.Where("id = ?", paperID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// Check if analysis already exists
	var existingAnalysis models.PaperAnalysis
	if err := database.DB.Where("paper_id = ?", paperID).First(&existingAnalysis).Error; err == nil {
		// Return existing analysis
		var response PaperAnalysisResponse
		json.Unmarshal([]byte(existingAnalysis.AnalysisData), &response)
		c.JSON(http.StatusOK, response)
		return
	}

	// Call AI agent for analysis
	aiResponse, err := callAIAgent("analyze_paper", map[string]interface{}{
		"paper_id":    paperID,
		"paper_title": paper.Title,
		"abstract":    paper.Abstract,
		"file_url":    paper.FileURL,
		"user_id":     userID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze paper"})
		return
	}

	// Parse and structure the response
	analysisResponse := PaperAnalysisResponse{
		InnovationScore:   getIntFromMap(aiResponse, "innovation_score", 7),
		Difficulty:        getStringFromMap(aiResponse, "difficulty", "Medium"),
		Reproducibility:   getStringFromMap(aiResponse, "reproducibility", "Good"),
		Impact:            getStringFromMap(aiResponse, "impact", "Significant"),
		Contributions:     getStringArrayFromMap(aiResponse, "contributions"),
		TechnicalApproach: getStringFromMap(aiResponse, "technical_approach", ""),
		ResultsSummary:    getStringFromMap(aiResponse, "results_summary", ""),
		Limitations:       getStringArrayFromMap(aiResponse, "limitations"),
	}

	// Store analysis
	analysisData, _ := json.Marshal(analysisResponse)
	analysis := models.PaperAnalysis{
		ID:           uuid.New().String(),
		PaperID:      paperID,
		UserID:       userID.(uint),
		AnalysisData: string(analysisData),
		CreatedAt:    time.Now(),
	}
	database.DB.Create(&analysis)

	c.JSON(http.StatusOK, analysisResponse)
}

// ImplementPaper generates implementation guide for a paper
func ImplementPaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	// Verify paper ownership
	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// Mock implementation plan for now
	steps := []map[string]interface{}{
		{
			"step":        1,
			"title":       "Environment Setup",
			"description": "Set up development environment",
			"status":      "pending",
		},
		{
			"step":        2,
			"title":       "Data Preparation",
			"description": "Prepare dataset",
			"status":      "pending",
		},
		{
			"step":        3,
			"title":       "Model Implementation",
			"description": "Implement the model",
			"status":      "pending",
		},
		{
			"step":        4,
			"title":       "Training",
			"description": "Train the model",
			"status":      "pending",
		},
		{
			"step":        5,
			"title":       "Evaluation",
			"description": "Evaluate results",
			"status":      "pending",
		},
	}

	c.JSON(http.StatusOK, gin.H{"steps": steps})
}

// ExtractOutline extracts the structure/outline of a paper
func ExtractOutline(c *gin.Context) {
	paperID := c.Param("id")

	// Check if outline exists in cache
	var cache models.PaperOutlineCache
	if err := database.DB.Where("paper_id = ?", paperID).First(&cache).Error; err == nil {
		// Return cached outline
		var outline PaperOutline
		if err := json.Unmarshal([]byte(cache.OutlineData), &outline); err == nil {
			c.JSON(http.StatusOK, outline)
			return
		}
	}

	// Return empty outline if not found
	c.JSON(http.StatusOK, PaperOutline{
		Sections: []OutlineSection{},
	})
}

// ExtractReferences extracts references from a paper
func ExtractReferences(c *gin.Context) {
	paperID := c.Param("id")

	// Check if references exist in cache
	var cache models.PaperReferencesCache
	if err := database.DB.Where("paper_id = ?", paperID).First(&cache).Error; err == nil {
		// Return cached references
		var references []PaperReference
		if err := json.Unmarshal([]byte(cache.ReferencesData), &references); err == nil {
			c.JSON(http.StatusOK, gin.H{
				"references": references,
				"count":      len(references),
			})
			return
		}
	}

	// Return empty array if not found
	c.JSON(http.StatusOK, gin.H{
		"references": []PaperReference{},
		"count":      0,
	})
}

// CreateNote creates a new note for a paper
func CreateNote(c *gin.Context) {
	paperID := c.Param("id")
	userID, _ := c.Get("userID")

	var note models.PaperNote
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note.ID = uuid.New().String()
	note.PaperID = paperID
	note.UserID = userID.(uint)
	note.CreatedAt = time.Now()
	note.UpdatedAt = time.Now()

	// Debug logging for position data
	fmt.Printf("[CreateNote] Note type: %s, Page: %d\n", note.Type, note.Page)
	fmt.Printf("[CreateNote] Position data: %s\n", note.Position)
	if note.Position != "" {
		var posData map[string]interface{}
		if err := json.Unmarshal([]byte(note.Position), &posData); err == nil {
			fmt.Printf("[CreateNote] Parsed position: %+v\n", posData)
			if imageUrl, ok := posData["imageUrl"]; ok {
				fmt.Printf("[CreateNote] ImageURL found: %v\n", imageUrl)
			} else {
				fmt.Printf("[CreateNote] No imageUrl in position data\n")
			}
		}
	}

	if err := database.DB.Table("paper_notes").Create(&note).Error; err != nil {
		fmt.Printf("[CreateNote] Error saving note: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	fmt.Printf("[CreateNote] Note saved successfully with ID: %s\n", note.ID)
	c.JSON(http.StatusCreated, note)
}

// GetNotes retrieves all notes for a paper
func GetNotes(c *gin.Context) {
	paperID := c.Param("id")
	userID, _ := c.Get("userID")

	var notes []models.PaperNote
	if err := database.DB.Table("paper_notes").
		Where("paper_id = ? AND user_id = ?", paperID, userID).
		Order("created_at DESC").
		Find(&notes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notes"})
		return
	}

	// Debug logging for retrieved notes
	fmt.Printf("[GetNotes] Retrieved %d notes for paper %s\n", len(notes), paperID)
	for _, note := range notes {
		if note.Type == "annotation" && note.Position != "" {
			fmt.Printf("[GetNotes] Note ID: %s, Type: %s\n", note.ID, note.Type)
			fmt.Printf("[GetNotes] Position data: %s\n", note.Position)
			var posData map[string]interface{}
			if err := json.Unmarshal([]byte(note.Position), &posData); err == nil {
				if imageUrl, ok := posData["imageUrl"]; ok {
					fmt.Printf("[GetNotes] ImageURL in DB: %v\n", imageUrl)
				} else {
					fmt.Printf("[GetNotes] No imageUrl in position data for note %s\n", note.ID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"notes": notes,
		"count": len(notes),
	})
}

// UpdateNote updates an existing note
func UpdateNote(c *gin.Context) {
	noteID := c.Param("noteId")
	userID, _ := c.Get("userID")

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData["updated_at"] = time.Now()

	result := database.DB.Table("paper_notes").
		Where("id = ? AND user_id = ?", noteID, userID).
		Updates(updateData)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note updated successfully"})
}

// DeleteNote deletes a note
func DeleteNote(c *gin.Context) {
	noteID := c.Param("noteId")
	userID, _ := c.Get("userID")

	result := database.DB.Table("paper_notes").
		Where("id = ? AND user_id = ?", noteID, userID).
		Delete(&models.PaperNote{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// Helper function to categorize paper
func categorizePaper(title, abstract string, tags []string) string {
	content := strings.ToLower(title + " " + abstract + " " + strings.Join(tags, " "))

	categories := map[string][]string{
		"Machine Learning": {"neural", "network", "deep learning", "ml", "ai", "transformer", "bert", "gpt"},
		"Computer Vision":  {"vision", "image", "visual", "cnn", "detection", "segmentation", "recognition"},
		"NLP":              {"language", "nlp", "text", "linguistics", "semantic", "syntax", "parsing"},
		"Systems":          {"system", "distributed", "database", "operating", "network", "cloud", "infrastructure"},
		"Theory":           {"algorithm", "complexity", "optimization", "mathematical", "proof", "theorem"},
		"Security":         {"security", "privacy", "cryptography", "attack", "defense", "vulnerability"},
		"HCI":              {"human", "interaction", "interface", "usability", "user experience", "ux"},
	}

	maxMatches := 0
	bestCategory := "General"

	for category, keywords := range categories {
		matches := 0
		for _, keyword := range keywords {
			if strings.Contains(content, keyword) {
				matches++
			}
		}
		if matches > maxMatches {
			maxMatches = matches
			bestCategory = category
		}
	}

	return bestCategory
}


// Helper function to format analysis response
func formatAnalysisResponse(analysis models.PaperAnalysis) models.PaperAnalysisResponse {
	var data map[string]interface{}
	json.Unmarshal([]byte(analysis.AnalysisData), &data)
	
	return models.PaperAnalysisResponse{
		InnovationScore:   float64(getIntFromMapLocal(data, "innovation_score", 7)),
		Difficulty:        getStringFromMapLocal(data, "difficulty", "medium"),
		Reproducibility:   getStringFromMapLocal(data, "reproducibility", "good"),
		Impact:            getStringFromMapLocal(data, "impact", "significant"),
		Contributions:     getStringArrayFromMapLocal(data, "contributions"),
		TechnicalApproach: getStringFromMapLocal(data, "technical_approach", ""),
		ResultsSummary:    getStringFromMapLocal(data, "results_summary", ""),
		Limitations:       getStringArrayFromMapLocal(data, "limitations"),
	}
}

// Helper functions for extracting data from map
func getStringFromMapLocal(m map[string]interface{}, key string, defaultVal string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultVal
}

func getIntFromMapLocal(m map[string]interface{}, key string, defaultVal int) int {
	if val, ok := m[key]; ok {
		if num, ok := val.(float64); ok {
			return int(num)
		}
		if num, ok := val.(int); ok {
			return num
		}
	}
	return defaultVal
}

func getStringArrayFromMapLocal(m map[string]interface{}, key string) []string {
	if val, ok := m[key]; ok {
		if arr, ok := val.([]interface{}); ok {
			result := make([]string, 0, len(arr))
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
			return result
		}
	}
	return []string{}
}

// UploadPaper handles PDF file upload to S3
func UploadPaper(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse multipart form with 10MB limit
	err := c.Request.ParseMultipartForm(10 << 20)
	if err != nil {
		fmt.Printf("Error parsing multipart form: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		fmt.Printf("Error getting file from form: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only PDF files are allowed"})
		return
	}

	fmt.Printf("Uploading file: %s, size: %d bytes\n", header.Filename, header.Size)

	// Check for duplicate files by filename for this user
	var existingPaper models.Paper
	if err := database.DB.Where("user_id = ? AND file_url LIKE ?", userID, "%"+header.Filename).First(&existingPaper).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "A paper with the same filename already exists",
			"existing_paper": gin.H{
				"id":    existingPaper.ID,
				"title": existingPaper.Title,
			},
		})
		return
	}

	// Create a temporary file to save the upload
	tempDir := "/tmp"
	tempFile, err := os.CreateTemp(tempDir, "paper-*.pdf")
	if err != nil {
		fmt.Printf("Error creating temp file: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process file"})
		return
	}
	defer os.Remove(tempFile.Name()) // Clean up temp file
	defer tempFile.Close()

	// Copy uploaded file to temp file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		fmt.Printf("Error copying file: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process file"})
		return
	}

	// Generate unique key for S3
	uniqueID := uuid.New().String()
	fileKey := fmt.Sprintf("papers/%v/%s_%s", userID, uniqueID, header.Filename)
	fmt.Printf("S3 key: %s\n", fileKey)

	// Get bucket name from environment
	bucketName := os.Getenv("AWS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = os.Getenv("AWS_S3_BUCKET")
	}
	
	// Upload to S3 using the UploadFile function
	err = helper.UploadFile(bucketName, fileKey, tempFile.Name(), false)
	if err != nil {
		fmt.Printf("Error uploading to S3: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload file: %v", err)})
		return
	}

	fileURL := helper.PublicFileURL(bucketName, fileKey)
	fmt.Printf("File uploaded to S3: %s\n", fileURL)

	// Extract basic metadata from filename
	title := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
	title = strings.ReplaceAll(title, "_", " ")
	title = strings.ReplaceAll(title, "-", " ")

	// Auto-generate tags based on title
	tags := generateTagsFromTitle(title)

	// Create paper record
	paper := models.Paper{
		ID:       uniqueID,
		UserID:   userID.(uint),
		Title:    title,
		FileURL:  fileURL,
		Tags:     strings.Join(tags, ","),
		Category: categorizePaper(title, "", tags),
	}

	if err := database.DB.Create(&paper).Error; err != nil {
		fmt.Printf("Error saving paper to database: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to save paper: %v", err)})
		return
	}

	fmt.Printf("Paper saved successfully with ID: %s\n", paper.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Paper uploaded successfully",
		"paper":   paper,
	})
}

// ExtractPaperMetadata extracts metadata from paper link
func ExtractPaperMetadata(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extract metadata based on URL pattern
	metadata := extractMetadataFromURL(req.URL)

	// Create paper record
	paper := models.Paper{
		ID:       uuid.New().String(),
		UserID:   userID.(uint),
		Title:    metadata.Title,
		Authors:  metadata.Authors,
		Abstract: metadata.Abstract,
		FileURL:  req.URL,
		Tags:     metadata.Tags,
		Category: metadata.Category,
		DOI:      metadata.DOI,
		ArxivID:  metadata.ArxivID,
		Year:     metadata.Year,
		Venue:    metadata.Venue,
	}

	if err := database.DB.Create(&paper).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save paper"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Paper added successfully",
		"paper":   paper,
	})
}

// Helper function to generate tags from title
func generateTagsFromTitle(title string) []string {
	lowerTitle := strings.ToLower(title)
	tags := []string{}

	// Common keywords to tags mapping
	keywordMap := map[string]string{
		"neural":       "neural-networks",
		"deep":         "deep-learning",
		"machine":      "machine-learning",
		"transformer":  "transformers",
		"attention":    "attention-mechanism",
		"gan":          "generative-models",
		"reinforcement": "reinforcement-learning",
		"nlp":          "natural-language-processing",
		"computer vision": "computer-vision",
		"detection":    "object-detection",
		"segmentation": "image-segmentation",
		"classification": "classification",
		"optimization": "optimization",
		"distributed":  "distributed-systems",
		"blockchain":   "blockchain",
		"quantum":      "quantum-computing",
	}

	for keyword, tag := range keywordMap {
		if strings.Contains(lowerTitle, keyword) {
			tags = append(tags, tag)
		}
	}

	// Add "research-paper" as default tag
	if len(tags) == 0 {
		tags = append(tags, "research-paper")
	}

	return tags
}

// Helper function to extract metadata from URL
func extractMetadataFromURL(url string) struct {
	Title    string
	Authors  string
	Abstract string
	Tags     string
	Category string
	DOI      string
	ArxivID  string
	Year     int
	Venue    string
} {
	// Mock implementation - in production, would call external APIs
	metadata := struct {
		Title    string
		Authors  string
		Abstract string
		Tags     string
		Category string
		DOI      string
		ArxivID  string
		Year     int
		Venue    string
	}{}

	// Check if it's an arXiv link
	if strings.Contains(url, "arxiv.org") {
		// Extract arXiv ID from URL
		parts := strings.Split(url, "/")
		for i, part := range parts {
			if part == "abs" || part == "pdf" {
				if i+1 < len(parts) {
					metadata.ArxivID = parts[i+1]
					metadata.ArxivID = strings.TrimSuffix(metadata.ArxivID, ".pdf")
				}
			}
		}

		// Mock metadata for arXiv papers
		metadata.Title = "Attention Is All You Need"
		metadata.Authors = `["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"]`
		metadata.Abstract = "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks..."
		metadata.Tags = "transformers,attention-mechanism,neural-networks,deep-learning"
		metadata.Category = "Machine Learning"
		metadata.Year = 2017
		metadata.Venue = "NeurIPS"
	} else if strings.Contains(url, "doi.org") {
		// Extract DOI from URL
		parts := strings.Split(url, "doi.org/")
		if len(parts) > 1 {
			metadata.DOI = parts[1]
		}

		// Mock metadata for DOI papers
		metadata.Title = "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
		metadata.Authors = `["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"]`
		metadata.Abstract = "We introduce a new language representation model called BERT..."
		metadata.Tags = "bert,transformers,nlp,pre-training"
		metadata.Category = "NLP"
		metadata.Year = 2019
		metadata.Venue = "NAACL"
	} else {
		// Default metadata for other URLs
		metadata.Title = "Research Paper from " + url
		metadata.Authors = `["Unknown Author"]`
		metadata.Abstract = "This paper discusses important research findings..."
		metadata.Tags = "research-paper"
		metadata.Category = "General"
		metadata.Year = time.Now().Year()
	}

	return metadata
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Helper function to call AI agent
func callAIAgent(workflowType string, params map[string]interface{}) (map[string]interface{}, error) {
	aiAgentURL := os.Getenv("AI_AGENT_URL")
	if aiAgentURL == "" {
		aiAgentURL = "http://localhost:8000"
	}
	
	requestBody := map[string]interface{}{
		"workflow_type": workflowType,
		"params":        params,
	}
	
	jsonBody, _ := json.Marshal(requestBody)
	
	resp, err := http.Post(
		fmt.Sprintf("%s/api/workflows/execute", aiAgentURL),
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	
	return result, nil
}

// Helper functions to parse AI responses
func getStringFromMap(m map[string]interface{}, key, defaultValue string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getIntFromMap(m map[string]interface{}, key string, defaultValue int) int {
	if val, ok := m[key]; ok {
		if num, ok := val.(float64); ok {
			return int(num)
		}
		if num, ok := val.(int); ok {
			return num
		}
	}
	return defaultValue
}

func getStringArrayFromMap(m map[string]interface{}, key string) []string {
	result := []string{}
	if val, ok := m[key]; ok {
		if arr, ok := val.([]interface{}); ok {
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
		}
	}
	return result
}

func parseSections(aiResponse map[string]interface{}) []OutlineSection {
	sections := []OutlineSection{}
	if sectionsData, ok := aiResponse["sections"].([]interface{}); ok {
		for _, sectionData := range sectionsData {
			if section, ok := sectionData.(map[string]interface{}); ok {
				outlineSection := OutlineSection{
					Title:      getStringFromMap(section, "title", ""),
					PageNumber: getIntFromMap(section, "page_number", 0),
					Level:      getIntFromMap(section, "level", 1),
				}
				sections = append(sections, outlineSection)
			}
		}
	}
	return sections
}

func parseReferences(aiResponse map[string]interface{}) []PaperReference {
	references := []PaperReference{}
	if refsData, ok := aiResponse["references"].([]interface{}); ok {
		for _, refData := range refsData {
			if ref, ok := refData.(map[string]interface{}); ok {
				reference := PaperReference{
					ID:      getStringFromMap(ref, "id", uuid.New().String()),
					Title:   getStringFromMap(ref, "title", ""),
					Authors: getStringArrayFromMap(ref, "authors"),
					Year:    getIntFromMap(ref, "year", 0),
					Venue:   getStringFromMap(ref, "venue", ""),
					DOI:     getStringFromMap(ref, "doi", ""),
					URL:     getStringFromMap(ref, "url", ""),
				}
				references = append(references, reference)
			}
		}
	}
	return references
}

// GetPaperPDF serves the PDF file with proper CORS headers
func GetPaperPDF(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	paperID := c.Param("id")

	// Verify paper ownership
	var paper models.Paper
	if err := database.DB.Where("id = ? AND user_id = ?", paperID, userID).First(&paper).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Paper not found"})
		return
	}

	// Generate pre-signed URL for PDF access
	if key, ok := helper.ObjectKeyFromURL(paper.FileURL); ok {
		key = strings.ReplaceAll(key, "%20", " ")
		
		// Initialize file helper to generate pre-signed URL
		fh, err := helper.NewFileHelper()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize file helper"})
			return
		}
		
		// Generate pre-signed URL valid for 1 hour
		presignedURL, err := fh.GeneratePresignedURL(key, 3600)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate URL"})
			return
		}
		
		// Fetch the PDF from S3
		resp, err := http.Get(presignedURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch PDF"})
			return
		}
		defer resp.Body.Close()
		
		// Set proper headers for PDF delivery
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s.pdf\"", paperID))
		c.Header("Cache-Control", "public, max-age=3600")
		
		// Stream the PDF to the client
		io.Copy(c.Writer, resp.Body)
		return
	}
	
	c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PDF URL"})
}