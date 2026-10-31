package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// A project's brief is edited in the project once the idea is published.
// These endpoints save it, rewrite one field from the team's recent progress,
// and add a suggested role to the recruiting post.

const (
	maxBriefText  = 1000 // runes per text field
	maxBriefItems = 6    // entries per list field
)

// briefFieldNames are the fields a project's brief can change, in display order.
var briefFieldNames = []string{"one_liner", "vision", "problem", "target_users", "next_steps", "blockers", "topics"}

// projectForBriefAdmin resolves :sid to a project the caller may edit the brief of.
func projectForBriefAdmin(c *gin.Context) (*models.Project, bool) {
	project, permissions, ok := projectForMember(c)
	if !ok {
		return nil, false
	}
	if permissions&helper.PermissionManageTeam == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner and admins can change the brief"})
		return nil, false
	}
	return project, true
}

func cleanText(s string) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > maxBriefText {
		s = string(r[:maxBriefText])
	}
	return s
}

func cleanList(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		if item = cleanText(item); item != "" && len(out) < maxBriefItems {
			out = append(out, item)
		}
	}
	return out
}

func sameList(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// saveProjectBrief stores a brief and refreshes what is derived from it: the
// project and post descriptions used by list cards, the topics, and cached
// matches. keepDescriptions leaves descriptions and topics alone, for a
// project whose founder wrote them before it had a brief. It returns the
// fields that changed.
func saveProjectBrief(db *gorm.DB, project *models.Project, brief ProjectBrief, userID uint, keepDescriptions bool) ([]string, error) {
	previous := workbenchBrief(project.ProjectID)
	if previous == nil {
		previous = &ProjectBrief{}
	}
	changed := []string{}
	if brief.OneLiner != previous.OneLiner {
		changed = append(changed, "one_liner")
	}
	if brief.Vision != previous.Vision {
		changed = append(changed, "vision")
	}
	if brief.Problem != previous.Problem {
		changed = append(changed, "problem")
	}
	if brief.TargetUsers != previous.TargetUsers {
		changed = append(changed, "target_users")
	}
	if !sameList(brief.NextSteps, previous.NextSteps) {
		changed = append(changed, "next_steps")
	}
	if !sameList(brief.Blockers, previous.Blockers) {
		changed = append(changed, "blockers")
	}
	if !sameList(brief.Topics, previous.Topics) {
		changed = append(changed, "topics")
	}

	briefJSON, _ := json.Marshal(brief)
	now := time.Now()
	updates := map[string]interface{}{"brief": datatypes.JSON(briefJSON), "brief_updated_at": now, "brief_updated_by": userID}
	if !keepDescriptions && (brief.Vision != "" || brief.Problem != "") {
		updates["description"] = strings.TrimSpace(brief.Vision + "\n\n" + brief.Problem)
	}
	if !keepDescriptions && len(brief.Topics) > 0 {
		topics, _ := json.Marshal(brief.Topics)
		updates["topic"] = datatypes.JSON(topics)
	}
	if err := db.Model(&models.Project{}).Where("project_id = ?", project.ProjectID).Updates(updates).Error; err != nil {
		return nil, err
	}
	project.BriefUpdatedAt = &now

	var post models.ProjectPost
	if err := db.Where("project_id = ? AND status <> ?", project.ProjectID, 4).Order("created_at DESC").Take(&post).Error; err == nil {
		if !keepDescriptions && (brief.OneLiner != "" || brief.Vision != "") {
			db.Model(&post).Update("description", strings.TrimSpace(brief.OneLiner+"\n\n"+brief.Vision))
		}
		// Matching reads the post's text, so its cached candidates are stale now
		invalidateMatchCache("candidates:" + post.ShortID + ":")
	}
	invalidateMatchCache("posts:")
	return changed, nil
}

// UpdateProjectBrief saves the brief of a project. Fields left out of the
// request keep their value. Changes to next steps or blockers are announced
// in the team chat, since they change what the team works on.
func UpdateProjectBrief() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, ok := projectForBriefAdmin(c)
		if !ok {
			return
		}
		var raw map[string]json.RawMessage
		if err := c.ShouldBindJSON(&raw); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid brief"})
			return
		}
		brief := ProjectBrief{}
		if current := workbenchBrief(project.ProjectID); current != nil {
			brief = *current
		}
		// Overlay the fields that were sent
		current, _ := json.Marshal(brief)
		var merged map[string]json.RawMessage
		_ = json.Unmarshal(current, &merged)
		for _, name := range briefFieldNames {
			if value, sent := raw[name]; sent {
				merged[name] = value
			}
		}
		mergedJSON, _ := json.Marshal(merged)
		if err := json.Unmarshal(mergedJSON, &brief); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid brief"})
			return
		}
		brief.OneLiner, brief.Vision, brief.Problem, brief.TargetUsers = cleanText(brief.OneLiner), cleanText(brief.Vision), cleanText(brief.Problem), cleanText(brief.TargetUsers)
		brief.NextSteps, brief.Blockers, brief.Topics = cleanList(brief.NextSteps), cleanList(brief.Blockers), cleanList(brief.Topics)
		if brief.Vision == "" && brief.Problem == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "The brief needs a vision or a problem"})
			return
		}

		// Only workbench projects have descriptions generated from the brief;
		// older projects keep the ones their founder wrote
		var source string
		database.DB.Model(&models.Project{}).Where("project_id = ?", project.ProjectID).Select("COALESCE(onboarding_metadata->>'source', '')").Scan(&source)
		changed, err := saveProjectBrief(database.DB, project, brief, c.GetUint("userID"), source != "idea_workbench")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save the brief"})
			return
		}
		var announce []string
		for _, field := range changed {
			if field == "next_steps" || field == "blockers" {
				announce = append(announce, field)
			}
		}
		if len(announce) > 0 {
			services.PostTeamBriefUpdated(project.ProjectID, strOrEmpty(project.Title), c.GetUint("userID"), announce)
		}
		c.JSON(http.StatusOK, gin.H{"brief": brief, "brief_updated_at": project.BriefUpdatedAt, "changed": changed})
	}
}

// projectProgress summarizes the team's last few weeks of check-ins and
// decisions, so a rewrite reflects where the project is now.
func projectProgress(projectID uint) string {
	var checkins []models.ProjectCheckin
	database.DB.Where("project_id = ? AND week_start >= ?", projectID, time.Now().AddDate(0, 0, -28)).Order("week_start DESC").Limit(12).Find(&checkins)
	var decisions []models.ProjectDecision
	database.DB.Where("project_id = ?", projectID).Order("created_at DESC").Limit(8).Find(&decisions)

	var b strings.Builder
	if len(checkins) > 0 {
		b.WriteString("Recent weekly check-ins (newest first):\n")
		for _, ch := range checkins {
			fmt.Fprintf(&b, "- week of %s: done: %s | next: %s | blockers: %s\n", ch.WeekStart.Format("2006-01-02"), ch.Done, ch.Next, ch.Blockers)
		}
	}
	if len(decisions) > 0 {
		b.WriteString("Team decisions (newest first):\n")
		for _, d := range decisions {
			fmt.Fprintf(&b, "- %s: %s\n", d.CreatedAt.Format("2006-01-02"), d.Text)
		}
	}
	if b.Len() == 0 {
		return "No check-ins or decisions yet.\n"
	}
	return b.String()
}

// RegenerateProjectBriefField rewrites one field of a project's brief from
// the current brief plus the team's recent check-ins and decisions.
func RegenerateProjectBriefField() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, ok := projectForBriefAdmin(c)
		if !ok {
			return
		}
		var req struct {
			Field string        `json:"field"`
			Brief *ProjectBrief `json:"brief"` // The form's current values, which may be unsaved
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "field is required"})
			return
		}
		rule, ok := regenerableFields[req.Field]
		if !ok || req.Field == "roles" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "this field can't be regenerated"})
			return
		}
		brief := req.Brief
		if brief == nil {
			brief = workbenchBrief(project.ProjectID)
		}
		if brief == nil {
			brief = &ProjectBrief{}
		}

		current, _ := json.Marshal(brief)
		prompt := fmt.Sprintf(`You update one field of the brief of a project that is already under way. Rewrite only "%s" so it reflects where the project is now, using the team's recent check-ins and decisions; stay consistent with the rest of the brief.
- next_steps: what the team should do in the next two weeks, building on what is done; never repeat finished work.
- blockers: what is blocking the team now; drop blockers the check-ins show as solved.
- Other fields: keep the meaning, sharpen it with what the team has learned.
If there is no progress to go on, improve the current value instead of guessing.
Return JSON with only the new value of this one field: {"value": <the new %s>}. Do not return the other fields.
Rule: %s
%s
Reply in the same language as the current brief.`, req.Field, req.Field, rule, noInventedFacts)
		input := fmt.Sprintf("Project: %s\nStarted: %s\nCurrent brief:\n%s\n\n%s", strOrEmpty(project.Title), timeOrEmpty(project.StartTime), current, projectProgress(project.ProjectID))
		input = ideaLanguageInstruction(string(current), "") + input

		var result map[string]json.RawMessage
		if err := services.OpenRouterJSON(prompt, input, 0.7, &result); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		value := fieldValue(result, req.Field)
		if value == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "The AI reply had no value for this field"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"field": req.Field, "value": value})
	}
}

// fieldValue finds the rewritten field in a model reply. Models sometimes
// answer {"value": ...}, sometimes {"<field>": ...} or the whole brief, and
// sometimes nest the brief under "value".
func fieldValue(reply map[string]json.RawMessage, field string) json.RawMessage {
	value := reply["value"]
	var nested map[string]json.RawMessage
	if len(value) > 0 && value[0] == '{' && json.Unmarshal(value, &nested) == nil {
		value = nested[field]
	}
	if len(value) == 0 {
		value = reply[field]
	}
	if len(value) == 0 || string(value) == "null" {
		return nil
	}
	return value
}

func timeOrEmpty(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

// AddSuggestedRole adds a role to the project's recruiting post, e.g. one the
// workbench suggested when the brief was written. A role with the same title
// is left as it is.
func AddSuggestedRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, ok := projectForBriefAdmin(c)
		if !ok {
			return
		}
		var role RoleCard
		if err := c.ShouldBindJSON(&role); err != nil || strings.TrimSpace(role.Title) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "role with a title is required"})
			return
		}
		role.Title = cleanText(role.Title)
		if role.Spots < 1 {
			role.Spots = 1
		}
		var post models.ProjectPost
		if err := database.DB.Where("project_id = ? AND status <> ?", project.ProjectID, 4).Order("created_at DESC").Take(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "This project has no recruiting post"})
			return
		}
		roles := parseRoles(post.Spots)
		for _, r := range roles {
			if strings.EqualFold(r.Title, role.Title) {
				c.JSON(http.StatusOK, gin.H{"roles": roles, "added": false})
				return
			}
		}
		roles = append(roles, role)
		spots, _ := json.Marshal(roles)
		if err := database.DB.Model(&post).Update("spots", datatypes.JSON(spots)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add the role"})
			return
		}
		invalidateMatchCache("candidates:" + post.ShortID + ":")
		invalidateMatchCache("posts:")
		c.JSON(http.StatusOK, gin.H{"roles": roles, "added": true})
	}
}

// AttachIdeaToProject saves a workbench brief to an existing project that
// had none (one created before the workbench), linking the draft to it. The
// project's own descriptions and recruiting roles stay as the founder wrote
// them; the draft keeps the suggested roles for the founder to pick from.
func AttachIdeaToProject() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		var req struct {
			DraftID    uint      `json:"draft_id"`
			ProjectSID string    `json:"project_sid"`
			Brief      IdeaBrief `json:"brief"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.DraftID == 0 || req.ProjectSID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "draft_id, project_sid and brief are required"})
			return
		}
		var project models.Project
		if err := database.DB.Where("sid = ? AND deleted_at IS NULL", req.ProjectSID).Take(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		if services.GetUserProjectPermissions(project.ProjectID, userID)&helper.PermissionManageTeam == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner and admins can change the brief"})
			return
		}

		tx := database.DB.Begin()
		var draft models.IdeaDraft
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", req.DraftID, userID).First(&draft).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Draft not found"})
			return
		}
		if draft.ProjectID != nil {
			tx.Rollback()
			if *draft.ProjectID == project.ProjectID {
				attachDraftProjects([]*models.IdeaDraft{&draft})
				c.JSON(http.StatusOK, gin.H{"project_sid": project.ShortID, "draft": draft})
				return
			}
			c.JSON(http.StatusConflict, gin.H{"error": "This idea is already a project"})
			return
		}
		var linked int64
		tx.Model(&models.IdeaDraft{}).Where("project_id = ?", project.ProjectID).Count(&linked)
		if linked > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "This project already has a brief from an idea; update it in the project"})
			return
		}

		if _, err := saveProjectBrief(tx, &project, req.Brief.projectBrief(), userID, true); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save the brief"})
			return
		}
		fullBrief, _ := json.Marshal(req.Brief)
		draft.ProjectID = &project.ProjectID
		draft.Brief = datatypes.JSON(fullBrief)
		draft.Current = nil
		var postSID string
		tx.Model(&models.ProjectPost{}).Where("project_id = ? AND status <> ?", project.ProjectID, 4).Order("created_at DESC").Limit(1).Pluck("sid", &postSID)
		if postSID != "" {
			draft.PostSID = &postSID
		}
		if err := tx.Save(&draft).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link the draft"})
			return
		}
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}
		attachDraftProjects([]*models.IdeaDraft{&draft})
		c.JSON(http.StatusOK, gin.H{"project_sid": project.ShortID, "draft": draft})
	}
}
