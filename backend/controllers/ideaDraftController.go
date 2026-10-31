package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"projectup/database"
	"projectup/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

const maxIdeaDrafts = 50

type ideaDraftRequest struct {
	Idea    string          `json:"idea"`
	Rounds  json.RawMessage `json:"rounds"`
	Current json.RawMessage `json:"current"`
	Brief   json.RawMessage `json:"brief"`
	PostSID *string         `json:"post_sid"`
}

// apply copies the request onto a draft. Empty JSON fields become SQL NULL
// rather than the literal "null".
func (r ideaDraftRequest) apply(draft *models.IdeaDraft) {
	jsonOrNil := func(raw json.RawMessage) datatypes.JSON {
		if len(raw) == 0 || string(raw) == "null" {
			return nil
		}
		return datatypes.JSON(raw)
	}
	draft.Idea = strings.TrimSpace(r.Idea)
	draft.Rounds = jsonOrNil(r.Rounds)
	if draft.Rounds == nil {
		draft.Rounds = datatypes.JSON("[]")
	}
	draft.Current = jsonOrNil(r.Current)
	draft.Brief = jsonOrNil(r.Brief)
	if r.PostSID != nil {
		draft.PostSID = r.PostSID
	}
}

// findOwnDraft loads a draft by its :id param, answering 404 unless it belongs to the caller.
func findOwnDraft(c *gin.Context) (*models.IdeaDraft, bool) {
	var draft models.IdeaDraft
	if err := database.DB.Where("id = ? AND user_id = ?", c.Param("id"), c.GetUint("userID")).First(&draft).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Draft not found"})
		return nil, false
	}
	return &draft, true
}

// ListIdeaDrafts returns the caller's drafts, most recently edited first.
func ListIdeaDrafts() gin.HandlerFunc {
	return func(c *gin.Context) {
		var drafts []models.IdeaDraft
		if err := database.DB.Where("user_id = ?", c.GetUint("userID")).
			Order("updated_at DESC").Limit(maxIdeaDrafts).Find(&drafts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load drafts"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"drafts": drafts})
	}
}

// CreateIdeaDraft starts a new draft.
func CreateIdeaDraft() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ideaDraftRequest
		if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Idea) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idea is required"})
			return
		}
		draft := models.IdeaDraft{UserID: c.GetUint("userID")}
		req.apply(&draft)
		if err := database.DB.Create(&draft).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save draft"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"draft": draft})
	}
}

// UpdateIdeaDraft overwrites a draft with the workbench's current state.
func UpdateIdeaDraft() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ideaDraftRequest
		if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Idea) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idea is required"})
			return
		}
		draft, ok := findOwnDraft(c)
		if !ok {
			return
		}
		req.apply(draft)
		// Save writes every column, so cleared fields (e.g. the current round once answered) become NULL
		if err := database.DB.Save(draft).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save draft"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"draft": draft})
	}
}

// DeleteIdeaDraft removes a draft.
func DeleteIdeaDraft() gin.HandlerFunc {
	return func(c *gin.Context) {
		draft, ok := findOwnDraft(c)
		if !ok {
			return
		}
		if err := database.DB.Delete(draft).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete draft"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Draft deleted"})
	}
}
