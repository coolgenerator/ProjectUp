package controllers

import (
	"fmt"
	"net/http"
	"net/url"
	"projectup/database"
	"projectup/models"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/html"
)

// GetUserBookmarks fetches bookmarks for a user
func GetUserBookmarks(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	category := c.Query("category")
	platform := c.Query("platform")
	search := c.Query("search")

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Build query
	query := database.DB.Model(&models.Bookmark{}).Where("user_id = ?", userID)

	// Apply filters
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if platform != "" {
		query = query.Where("platform = ?", platform)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ? OR tags LIKE ?", 
			searchPattern, searchPattern, searchPattern)
	}

	// Get total count
	var totalCount int64
	query.Count(&totalCount)

	// Apply pagination and order
	offset := (page - 1) * pageSize
	query = query.Order("created_at DESC").Offset(offset).Limit(pageSize)

	// Fetch bookmarks
	var bookmarks []models.Bookmark
	if err := query.Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	c.JSON(http.StatusOK, models.BookmarkResponse{
		Bookmarks:  bookmarks,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	})
}

// CreateBookmark creates a new bookmark with auto-categorization
func CreateBookmark(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.BookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch metadata from URL if title is not provided
	if req.Title == "" || req.Description == "" {
		metadata := fetchURLMetadata(req.URL)
		if req.Title == "" {
			req.Title = metadata.Title
		}
		if req.Description == "" {
			req.Description = metadata.Description
		}
	}

	// Auto-categorize the bookmark
	category := categorizeBookmark(req.URL, req.Title, req.Description)
	platform := detectPlatform(req.URL)

	// Create bookmark
	bookmark := models.Bookmark{
		UserID:      userID.(uint),
		URL:         req.URL,
		Title:       req.Title,
		Description: req.Description,
		Category:    category,
		Platform:    platform,
		Tags:        strings.Join(req.Tags, ","),
		Collections: strings.Join(req.Collections, ","),
		ImportedAt:  time.Now(),
	}

	// Extract thumbnail if possible
	bookmark.Thumbnail = extractThumbnail(req.URL)

	if err := database.DB.Create(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create bookmark"})
		return
	}

	c.JSON(http.StatusCreated, bookmark)
}

// UpdateBookmark updates an existing bookmark
func UpdateBookmark(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	if err := database.DB.Where("id = ? AND user_id = ?", bookmarkID, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	var req models.BookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	bookmark.Title = req.Title
	bookmark.Description = req.Description
	bookmark.Tags = strings.Join(req.Tags, ",")
	bookmark.Collections = strings.Join(req.Collections, ",")

	if err := database.DB.Save(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bookmark"})
		return
	}

	c.JSON(http.StatusOK, bookmark)
}

// DeleteBookmark deletes a bookmark
func DeleteBookmark(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	if err := database.DB.Where("id = ? AND user_id = ?", bookmarkID, userID).Delete(&models.Bookmark{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark deleted successfully"})
}

// GetBookmarkCategories returns all available categories
func GetBookmarkCategories(c *gin.Context) {
	var categories []models.BookmarkCategory
	
	if err := database.DB.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// Helper function to fetch URL metadata
func fetchURLMetadata(urlStr string) struct {
	Title       string
	Description string
} {
	metadata := struct {
		Title       string
		Description string
	}{}

	resp, err := http.Get(urlStr)
	if err != nil {
		return metadata
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return metadata
	}

	// Parse HTML
	doc, err := html.Parse(resp.Body)
	if err != nil {
		return metadata
	}

	var extractMeta func(*html.Node)
	extractMeta = func(n *html.Node) {
		if n.Type == html.ElementNode {
			if n.Data == "title" && n.FirstChild != nil {
				metadata.Title = n.FirstChild.Data
			} else if n.Data == "meta" {
				var property, content string
				for _, attr := range n.Attr {
					if attr.Key == "property" || attr.Key == "name" {
						property = attr.Val
					} else if attr.Key == "content" {
						content = attr.Val
					}
				}
				if property == "og:title" && metadata.Title == "" {
					metadata.Title = content
				} else if property == "og:description" || property == "description" {
					metadata.Description = content
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractMeta(c)
		}
	}
	extractMeta(doc)

	// Clean up title
	if metadata.Title != "" {
		metadata.Title = strings.TrimSpace(metadata.Title)
	} else {
		// Use URL as fallback title
		parsedURL, _ := url.Parse(urlStr)
		metadata.Title = parsedURL.Host
	}

	return metadata
}

// Helper function to categorize bookmark based on URL and content
func categorizeBookmark(urlStr, title, description string) string {
	content := strings.ToLower(title + " " + description + " " + urlStr)
	
	// Define category keywords
	categories := map[string][]string{
		"Technology": {"tech", "programming", "code", "software", "developer", "api", "javascript", "python", "react", "node", "database", "ai", "machine learning", "blockchain", "crypto"},
		"Education": {"learn", "tutorial", "course", "education", "study", "lecture", "university", "school", "training", "lesson"},
		"Business": {"business", "startup", "entrepreneur", "marketing", "sales", "finance", "investment", "economy", "management", "strategy"},
		"Design": {"design", "ui", "ux", "figma", "sketch", "photoshop", "graphic", "art", "creative", "animation", "color"},
		"Entertainment": {"movie", "music", "game", "video", "youtube", "netflix", "spotify", "entertainment", "fun", "comedy"},
		"News": {"news", "breaking", "update", "report", "politics", "world", "latest", "headline", "journalism"},
		"Health": {"health", "fitness", "medical", "doctor", "exercise", "nutrition", "wellness", "mental", "therapy", "disease"},
		"Food": {"food", "recipe", "cooking", "restaurant", "chef", "cuisine", "meal", "diet", "ingredient", "baking"},
		"Travel": {"travel", "trip", "vacation", "hotel", "flight", "destination", "tourism", "adventure", "explore"},
		"Shopping": {"shop", "buy", "product", "store", "amazon", "price", "deal", "discount", "sale", "retail"},
		"Social": {"facebook", "twitter", "instagram", "linkedin", "social", "network", "community", "forum", "reddit"},
	}

	// Count keyword matches for each category
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

// Helper function to detect platform from URL
func detectPlatform(urlStr string) string {
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return "web"
	}

	host := strings.ToLower(parsedURL.Host)
	
	// Remove www. prefix
	host = strings.TrimPrefix(host, "www.")
	
	// Platform detection
	platforms := map[string][]string{
		"youtube": {"youtube.com", "youtu.be"},
		"bilibili": {"bilibili.com"},
		"xiaohongshu": {"xiaohongshu.com", "xhslink.com"},
		"twitter": {"twitter.com", "x.com"},
		"github": {"github.com"},
		"medium": {"medium.com"},
		"zhihu": {"zhihu.com"},
		"weibo": {"weibo.com"},
		"douyin": {"douyin.com"},
		"tiktok": {"tiktok.com"},
		"instagram": {"instagram.com"},
		"facebook": {"facebook.com", "fb.com"},
		"linkedin": {"linkedin.com"},
		"reddit": {"reddit.com"},
	}

	for platform, domains := range platforms {
		for _, domain := range domains {
			if strings.Contains(host, domain) {
				return platform
			}
		}
	}

	// Check if it's an article/blog
	content := strings.ToLower(urlStr)
	if strings.Contains(content, "blog") || 
	   strings.Contains(content, "article") ||
	   strings.Contains(content, "post") {
		return "article"
	}

	return "web"
}

// Helper function to extract thumbnail from URL
func extractThumbnail(urlStr string) string {
	// For YouTube
	if strings.Contains(urlStr, "youtube.com/watch") || strings.Contains(urlStr, "youtu.be") {
		// Extract video ID
		var videoID string
		if strings.Contains(urlStr, "youtube.com/watch") {
			re := regexp.MustCompile(`[?&]v=([^&]+)`)
			matches := re.FindStringSubmatch(urlStr)
			if len(matches) > 1 {
				videoID = matches[1]
			}
		} else if strings.Contains(urlStr, "youtu.be") {
			re := regexp.MustCompile(`youtu\.be/([^?]+)`)
			matches := re.FindStringSubmatch(urlStr)
			if len(matches) > 1 {
				videoID = matches[1]
			}
		}
		if videoID != "" {
			return fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID)
		}
	}

	// For other platforms, we could add more thumbnail extraction logic
	// For now, return empty string and let frontend handle it
	return ""
}

// ImportBookmarksFromPlatform imports bookmarks from external platforms
func ImportBookmarksFromPlatform(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	platform := c.Param("platform")
	
	var authData map[string]interface{}
	if err := c.ShouldBindJSON(&authData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// TODO: Use userID when implementing platform-specific import logic
	_ = userID

	// This would normally integrate with platform APIs
	// For now, return a success message
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Import from %s initiated", platform),
		"status": "processing",
	})
}