package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"projectup/database"
	"projectup/helper"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/clause"
)

// personCard is the public view of a user shown next to projects.
type personCard struct {
	UserID    uint   `json:"user_id"`
	SID       string `json:"sid"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Field     string `json:"field"`
	School    string `json:"school"`
	Role      string `json:"role"` // Role card title they joined as, when known
}

func loadPersonCards(userIDs []uint) map[uint]personCard {
	cards := map[uint]personCard{}
	if len(userIDs) == 0 {
		return cards
	}
	var profiles []models.Profile
	database.DB.Where("user_id IN ?", userIDs).Find(&profiles)
	for _, p := range profiles {
		cards[p.UserID] = personCard{
			UserID: p.UserID, SID: p.ShortID, Name: displayName(p), AvatarURL: strOrEmpty(p.AvatarURL),
			Field: strOrEmpty(p.Field), School: strOrEmpty(p.School),
		}
	}
	return cards
}

// joinedRoles maps user ID to the role card title of their accepted application on a post.
func joinedRoles(postIDs []uint) map[uint]map[uint]string {
	var rows []struct {
		PostID uint
		UserID uint
		Role   string
	}
	roles := map[uint]map[uint]string{}
	if len(postIDs) == 0 {
		return roles
	}
	database.DB.Model(&models.ProjectApplication{}).Select("post_id, user_id, role").
		Where("post_id IN ? AND status = ?", postIDs, 1).Scan(&rows)
	for _, r := range rows {
		if roles[r.PostID] == nil {
			roles[r.PostID] = map[uint]string{}
		}
		roles[r.PostID][r.UserID] = r.Role
	}
	return roles
}

// founderStats is how a founder has handled applications so far.
type founderStats struct {
	ProjectsPublished  int      `json:"projects_published"`
	ApplicationsGot    int      `json:"applications_received"`
	ApplicationsAnswer int      `json:"applications_answered"`
	AvgResponseHours   *float64 `json:"avg_response_hours"` // nil until they have answered one
}

func loadFounderStats(userID uint) founderStats {
	var stats founderStats
	var published int64
	database.DB.Model(&models.ProjectPost{}).Where("user_id = ? AND status <> ? AND visibility = ?", userID, 4, 2).Count(&published)
	stats.ProjectsPublished = int(published)

	var row struct {
		Received int
		Answered int
		AvgHours *float64
	}
	database.DB.Model(&models.ProjectApplication{}).
		Select(`COUNT(*) AS received, COUNT(project_application.review_at) AS answered,
			AVG(EXTRACT(EPOCH FROM (project_application.review_at - project_application.applied_at)) / 3600) AS avg_hours`).
		Joins("JOIN project_posts ON project_posts.post_id = project_application.post_id").
		Where("project_posts.user_id = ?", userID).
		Scan(&row)
	stats.ApplicationsGot = row.Received
	stats.ApplicationsAnswer = row.Answered
	stats.AvgResponseHours = row.AvgHours
	return stats
}

// GetPostTeam returns the founder (with how they handle applications) and the
// members who already joined, for the project detail page.
func GetPostTeam() gin.HandlerFunc {
	return func(c *gin.Context) {
		var post models.ProjectPost
		if err := database.DB.Where("sid = ?", c.Param("sid")).Take(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
			return
		}
		// Same visibility rules as the post itself
		if _, err := repositories.GetPostByID(post.PostID, c.GetUint("userID")); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project post not found"})
			return
		}

		var memberIDs []uint
		database.DB.Model(&models.ProjectMember{}).
			Where("project_id = ? AND user_id <> ? AND removed_at IS NULL AND NOT COALESCE(is_placeholder, false)", post.ProjectID, post.UserID).
			Order("joined_at").Pluck("user_id", &memberIDs)
		cards := loadPersonCards(append([]uint{post.UserID}, memberIDs...))
		roles := joinedRoles([]uint{post.PostID})[post.PostID]

		members := make([]personCard, 0, len(memberIDs))
		for _, id := range memberIDs {
			if card, ok := cards[id]; ok {
				card.Role = roles[id]
				members = append(members, card)
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"founder":       cards[post.UserID],
			"founder_stats": loadFounderStats(post.UserID),
			"members":       members,
		})
	}
}

// weekStart is the Monday (00:00, server time) of the week containing t.
func weekStart(t time.Time) time.Time {
	t = t.Local()
	offset := (int(t.Weekday()) + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day()-offset, 0, 0, 0, 0, time.Local)
}

// projectForMember resolves :sid to a project the caller belongs to.
func projectForMember(c *gin.Context) (*models.Project, int, bool) {
	var project models.Project
	if err := database.DB.Where("sid = ?", c.Param("sid")).Take(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return nil, 0, false
	}
	permissions := services.GetUserProjectPermissions(project.ProjectID, c.GetUint("userID"))
	if permissions == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only project members can see this"})
		return nil, 0, false
	}
	return &project, permissions, true
}

// GetProjectPulse returns the team's open roles and this week's check-ins.
func GetProjectPulse() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, permissions, ok := projectForMember(c)
		if !ok {
			return
		}
		week := weekStart(time.Now())

		var recruiting gin.H
		var post models.ProjectPost
		if err := database.DB.Where("project_id = ? AND status <> ?", project.ProjectID, 4).Order("created_at DESC").Take(&post).Error; err == nil {
			fill := roleFills([]uint{post.PostID})[post.PostID]
			if fill == nil {
				fill = map[string]int{}
			}
			recruiting = gin.H{"post_sid": post.ShortID, "status": post.Status, "roles": parseRoles(post.Spots), "role_fills": fill, "updated_at": post.UpdatedAt}
		}

		var memberIDs []uint
		database.DB.Model(&models.ProjectMember{}).Where("project_id = ? AND user_id <> ? AND removed_at IS NULL AND NOT COALESCE(is_placeholder, false)", project.ProjectID, project.OwnerID).
			Order("joined_at").Pluck("user_id", &memberIDs)
		teamIDs := append([]uint{project.OwnerID}, memberIDs...)
		cards := loadPersonCards(teamIDs)
		var roles map[uint]string
		if recruiting != nil {
			roles = joinedRoles([]uint{post.PostID})[post.PostID]
		}

		var checkins []models.ProjectCheckin
		database.DB.Where("project_id = ? AND week_start = ?", project.ProjectID, week).Find(&checkins)
		byUser := map[uint]models.ProjectCheckin{}
		for _, ch := range checkins {
			byUser[ch.UserID] = ch
		}

		team := make([]gin.H, 0, len(teamIDs))
		for _, id := range teamIDs {
			card, ok := cards[id]
			if !ok {
				continue
			}
			card.Role = roles[id]
			entry := gin.H{"person": card, "is_owner": id == project.OwnerID, "checkin": nil}
			if ch, ok := byUser[id]; ok {
				entry["checkin"] = ch
			}
			team = append(team, entry)
		}

		var decisions []struct {
			ID        uint      `json:"id" gorm:"column:id"`
			UserID    uint      `json:"user_id" gorm:"column:user_id"`
			Text      string    `json:"text" gorm:"column:text"`
			CreatedAt time.Time `json:"created_at" gorm:"column:created_at"`
		}
		database.DB.Model(&models.ProjectDecision{}).Where("project_id = ?", project.ProjectID).
			Order("created_at DESC").Limit(maxDecisionsShown).Scan(&decisions)
		decisionList := make([]gin.H, 0, len(decisions))
		for _, d := range decisions {
			decisionList = append(decisionList, gin.H{"id": d.ID, "text": d.Text, "created_at": d.CreatedAt, "user_id": d.UserID, "author": cards[d.UserID].Name})
		}

		c.JSON(http.StatusOK, gin.H{
			"is_admin":   permissions&helper.PermissionManageTeam != 0,
			"me":         c.GetUint("userID"),
			"week_start": week.Format("2006-01-02"),
			"recruiting": recruiting,
			"team":       team,
			"kickoff":    kickoffItems(project, len(memberIDs)),
			"decisions":  decisionList,
		})
	}
}

// SaveCheckin creates or updates the caller's check-in for this week.
func SaveCheckin() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, _, ok := projectForMember(c)
		if !ok {
			return
		}
		var req struct {
			Done     string `json:"done"`
			Next     string `json:"next"`
			Blockers string `json:"blockers"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Done+req.Next+req.Blockers) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Write at least one line"})
			return
		}
		checkin := models.ProjectCheckin{
			ProjectID: project.ProjectID,
			UserID:    c.GetUint("userID"),
			WeekStart: weekStart(time.Now()),
			Done:      strings.TrimSpace(req.Done),
			Next:      strings.TrimSpace(req.Next),
			Blockers:  strings.TrimSpace(req.Blockers),
		}
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "project_id"}, {Name: "user_id"}, {Name: "week_start"}},
			DoUpdates: clause.AssignmentColumns([]string{"done", "next", "blockers", "updated_at"}),
		}).Create(&checkin).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save check-in"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"checkin": checkin})
	}
}

// ReopenRecruiting puts the project's recruiting post back on top of the
// open projects list, e.g. after someone leaves.
func ReopenRecruiting() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, permissions, ok := projectForMember(c)
		if !ok {
			return
		}
		if permissions&helper.PermissionManageTeam == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner and admins can reopen recruiting"})
			return
		}
		result := database.DB.Model(&models.ProjectPost{}).
			Where("post_id = (?)", database.DB.Model(&models.ProjectPost{}).Select("post_id").
				Where("project_id = ? AND status <> ?", project.ProjectID, 4).Order("created_at DESC").Limit(1)).
			Updates(map[string]interface{}{"status": 1, "updated_at": time.Now()})
		if result.Error != nil || result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "This project has no recruiting post"})
			return
		}
		invalidateMatchCache("posts:")
		c.JSON(http.StatusOK, gin.H{"message": "Recruiting reopened"})
	}
}

// GetUserRecord lists the public projects someone founded or joined, as a track record on their profile.
func GetUserRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		var profile models.Profile
		if err := database.DB.Where("sid = ?", c.Param("sid")).Take(&profile).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		type recordItem struct {
			PostSID string    `json:"post_sid" gorm:"column:post_sid"`
			Title   string    `json:"title" gorm:"column:title"`
			Role    string    `json:"role" gorm:"column:role"`
			Status  int       `json:"status" gorm:"column:status"` // Project status: 1 active, 2 archived, 3 completed
			Since   time.Time `json:"since" gorm:"column:since"`
		}
		// Only public posts, so private projects never show up on someone's profile
		var founded []recordItem
		database.DB.Model(&models.ProjectPost{}).
			Select("project_posts.sid AS post_sid, project_posts.title, projects.status, project_posts.created_at AS since").
			Joins("JOIN projects ON projects.project_id = project_posts.project_id").
			Where("project_posts.user_id = ? AND project_posts.visibility = ? AND project_posts.status <> ? AND projects.deleted_at IS NULL", profile.UserID, 2, 4).
			Order("project_posts.created_at DESC").Scan(&founded)

		var joined []recordItem
		database.DB.Model(&models.ProjectMember{}).
			Select("project_posts.sid AS post_sid, project_posts.title, projects.status, project_members.joined_at AS since, COALESCE(project_application.role, '') AS role").
			Joins("JOIN projects ON projects.project_id = project_members.project_id").
			Joins("JOIN project_posts ON project_posts.project_id = projects.project_id").
			Joins("LEFT JOIN project_application ON project_application.post_id = project_posts.post_id AND project_application.user_id = project_members.user_id AND project_application.status = 1").
			Where("project_members.removed_at IS NULL AND project_members.user_id = ? AND projects.owner_id <> ? AND project_posts.visibility = ? AND project_posts.status <> ? AND projects.deleted_at IS NULL", profile.UserID, profile.UserID, 2, 4).
			Order("project_members.joined_at DESC").Scan(&joined)

		if founded == nil {
			founded = []recordItem{}
		}
		if joined == nil {
			joined = []recordItem{}
		}
		c.JSON(http.StatusOK, gin.H{
			"founded":       founded,
			"joined":        joined,
			"founder_stats": loadFounderStats(profile.UserID),
			"reliability":   loadReliability([]uint{profile.UserID})[profile.UserID],
		})
	}
}

const maxDecisionsShown = 20

// Kickoff checklist: the steps that turn a freshly formed team into one that
// is actually working. "team" is derived; the rest are ticked by the founder.
var kickoffKeys = []string{"team", "roles", "channel", "meeting", "milestone"}

func kickoffItems(project *models.Project, memberCount int) []gin.H {
	done := map[string]bool{}
	if len(project.Kickoff) > 0 {
		_ = json.Unmarshal(project.Kickoff, &done)
	}
	items := make([]gin.H, 0, len(kickoffKeys))
	for _, key := range kickoffKeys {
		if key == "team" {
			items = append(items, gin.H{"key": key, "done": memberCount > 0, "auto": true})
			continue
		}
		items = append(items, gin.H{"key": key, "done": done[key], "auto": false})
	}
	return items
}

// UpdateKickoff ticks or unticks one manual kickoff item.
func UpdateKickoff() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, permissions, ok := projectForMember(c)
		if !ok {
			return
		}
		if permissions&helper.PermissionManageTeam == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner and admins can update the kickoff checklist"})
			return
		}
		var req struct {
			Key  string `json:"key"`
			Done bool   `json:"done"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Key == "team" || !contains(kickoffKeys, req.Key) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown checklist item"})
			return
		}
		done := map[string]bool{}
		if len(project.Kickoff) > 0 {
			_ = json.Unmarshal(project.Kickoff, &done)
		}
		done[req.Key] = req.Done
		raw, _ := json.Marshal(done)
		if err := database.DB.Model(&models.Project{}).Where("project_id = ?", project.ProjectID).Update("kickoff", string(raw)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save checklist"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"key": req.Key, "done": req.Done})
	}
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

// AddDecision records a team decision.
func AddDecision() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, _, ok := projectForMember(c)
		if !ok {
			return
		}
		var req struct {
			Text string `json:"text"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Text) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Write the decision"})
			return
		}
		decision := models.ProjectDecision{ProjectID: project.ProjectID, UserID: c.GetUint("userID"), Text: strings.TrimSpace(req.Text)}
		if err := database.DB.Create(&decision).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save decision"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"decision": decision})
	}
}

// DeleteDecision removes a decision; its author or an admin may do this.
func DeleteDecision() gin.HandlerFunc {
	return func(c *gin.Context) {
		project, permissions, ok := projectForMember(c)
		if !ok {
			return
		}
		query := database.DB.Where("id = ? AND project_id = ?", c.Param("id"), project.ProjectID)
		if permissions&helper.PermissionManageTeam == 0 {
			query = query.Where("user_id = ?", c.GetUint("userID"))
		}
		result := query.Delete(&models.ProjectDecision{})
		if result.Error != nil || result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Decision not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Decision deleted"})
	}
}

// reliability is how someone has followed through on ProjectUp so far.
type reliability struct {
	ProjectsJoined    int `json:"projects_joined"`
	ProjectsCompleted int `json:"projects_completed"`
	CheckinWeeks      int `json:"checkin_weeks"` // Weeks with a check-in, out of the last four
}

func loadReliability(userIDs []uint) map[uint]reliability {
	result := map[uint]reliability{}
	if len(userIDs) == 0 {
		return result
	}
	var joined []struct {
		UserID    uint
		Joined    int
		Completed int
	}
	database.DB.Model(&models.ProjectMember{}).
		Select("project_members.user_id, COUNT(*) AS joined, COUNT(*) FILTER (WHERE projects.status = 3) AS completed").
		Joins("JOIN projects ON projects.project_id = project_members.project_id").
		Where("project_members.user_id IN ? AND project_members.removed_at IS NULL AND projects.owner_id <> project_members.user_id AND projects.deleted_at IS NULL", userIDs).
		Group("project_members.user_id").Scan(&joined)
	for _, j := range joined {
		result[j.UserID] = reliability{ProjectsJoined: j.Joined, ProjectsCompleted: j.Completed}
	}

	var weeks []struct {
		UserID uint
		Weeks  int
	}
	database.DB.Model(&models.ProjectCheckin{}).
		Select("user_id, COUNT(DISTINCT week_start) AS weeks").
		Where("user_id IN ? AND week_start > ?", userIDs, weekStart(time.Now()).AddDate(0, 0, -28)).
		Group("user_id").Scan(&weeks)
	for _, w := range weeks {
		r := result[w.UserID]
		r.CheckinWeeks = w.Weeks
		result[w.UserID] = r
	}
	return result
}
