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
	// The existing project this draft writes a brief for (set when the draft is created)
	TargetProjectSID *string `json:"target_project_sid"`
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
	if r.TargetProjectSID != nil && *r.TargetProjectSID != "" {
		draft.TargetProjectSID = r.TargetProjectSID
	}
}

// errDraftPublished answers edits to a draft that has become a project: from
// then on the brief is changed in the project, and the draft is its record.
func errDraftPublished(c *gin.Context) {
	c.JSON(http.StatusConflict, gin.H{"error": "This idea is already a project; update it in the project"})
}

// attachDraftProjects fills in the project each published draft became.
func attachDraftProjects(drafts []*models.IdeaDraft) {
	ids := make([]uint, 0, len(drafts))
	for _, d := range drafts {
		if d.ProjectID != nil {
			ids = append(ids, *d.ProjectID)
		}
	}
	if len(ids) == 0 {
		return
	}
	var rows []struct {
		ProjectID uint
		SID       string `gorm:"column:sid"`
		Title     string
		Status    int
		PostSID   string `gorm:"column:post_sid"`
	}
	database.DB.Table("projects p").
		Select("p.project_id, p.sid, p.title, p.status, COALESCE((SELECT pp.sid FROM project_posts pp WHERE pp.project_id = p.project_id ORDER BY pp.post_id LIMIT 1), '') AS post_sid").
		Where("p.project_id IN ? AND p.deleted_at IS NULL", ids).Scan(&rows)
	byID := make(map[uint]*models.IdeaDraftProject, len(rows))
	for _, r := range rows {
		byID[r.ProjectID] = &models.IdeaDraftProject{SID: r.SID, Title: r.Title, PostSID: r.PostSID, Status: r.Status}
	}
	for _, d := range drafts {
		if d.ProjectID != nil {
			d.Project = byID[*d.ProjectID]
		}
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
		refs := make([]*models.IdeaDraft, len(drafts))
		for i := range drafts {
			refs[i] = &drafts[i]
		}
		attachDraftProjects(refs)
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
		if draft.ProjectID != nil {
			errDraftPublished(c)
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

// DeleteIdeaDraft removes a draft. A draft that became a project stays as
// that project's thinking record.
func DeleteIdeaDraft() gin.HandlerFunc {
	return func(c *gin.Context) {
		draft, ok := findOwnDraft(c)
		if !ok {
			return
		}
		if draft.ProjectID != nil {
			errDraftPublished(c)
			return
		}
		if err := database.DB.Delete(draft).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete draft"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Draft deleted"})
	}
}
