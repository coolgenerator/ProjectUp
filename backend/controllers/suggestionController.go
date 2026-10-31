package controllers

// COMMENTED OUT: Temporarily disabled while using UserSkill and UserInterest models directly
/*
import (
	"net/http"
	"projectup/repositories"

	"github.com/gin-gonic/gin"
)

// GetSuggestions handles requests for real-time suggestions for skills and interests
// @Summary Get real-time suggestions for skills or interests
// @Description Returns filtered suggestions based on query and type (skill or interest)
// @Tags Suggestions
// @Accept json
// @Produce json
// @Param query query string true "Search query"
// @Param type query string true "Type (skill or interest)"
// @Param limit query int false "Limit number of results"
// @Success 200 {object} map[string]interface{} "Success response with suggestions"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /suggestions [get]
func GetSuggestions() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("query")
		suggestionType := c.Query("type")
		limitStr := c.DefaultQuery("limit", "10")

		// Validate query params
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter is required"})
			return
		}

		if suggestionType != "skill" && suggestionType != "interest" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "type parameter must be 'skill' or 'interest'"})
			return
		}

		// Get suggestions from repository
		suggestions, err := repositories.GetConceptSuggestions(query, suggestionType, limitStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve suggestions"})
			return
		}

		// Return suggestions
		c.JSON(http.StatusOK, gin.H{
			"status":      "success",
			"suggestions": suggestions,
		})
	}
}

// GetPopularSuggestions returns popular skills or interests
// @Summary Get popular skills or interests
// @Description Returns most popular skills or interests
// @Tags Suggestions
// @Accept json
// @Produce json
// @Param type query string true "Type (skill or interest)"
// @Param limit query int false "Limit number of results"
// @Success 200 {object} map[string]interface{} "Success response with popular items"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /popular [get]
func GetPopularSuggestions() gin.HandlerFunc {
	return func(c *gin.Context) {
		suggestionType := c.Query("type")
		limitStr := c.DefaultQuery("limit", "20")

		if suggestionType != "skill" && suggestionType != "interest" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "type parameter must be 'skill' or 'interest'"})
			return
		}

		// Get popular concepts from repository
		popular, err := repositories.GetPopularConcepts(suggestionType, limitStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve popular items"})
			return
		}

		// Return popular items
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"items":  popular,
		})
	}
}

// GetCategorizedSuggestions returns categorized skills or interests
// @Summary Get categorized skills or interests
// @Description Returns categorized list of skills or interests
// @Tags Suggestions
// @Accept json
// @Produce json
// @Param type query string true "Type (skill or interest)"
// @Success 200 {object} map[string]interface{} "Success response with categorized items"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /categorized [get]
func GetCategorizedSuggestions() gin.HandlerFunc {
	return func(c *gin.Context) {
		suggestionType := c.Query("type")

		if suggestionType != "skill" && suggestionType != "interest" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "type parameter must be 'skill' or 'interest'"})
			return
		}

		// Get categorized concepts from repository
		categorized, err := repositories.GetCategorizedConcepts(suggestionType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categorized items"})
			return
		}

		// Return categorized items
		c.JSON(http.StatusOK, gin.H{
			"status":      "success",
			"categorized": categorized,
		})
	}
}
*/
