package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"projectup/database"
	"projectup/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// matchSkill is one skill with a 1-5 self-rated level.
type matchSkill struct {
	Name  string `json:"name"`
	Level int    `json:"level"`
}

// matchProfile is what matching needs from a user. Each field is required for
// good recommendations, so the UI nudges users to complete it.
type matchProfile struct {
	Skills       []matchSkill `json:"skills"`
	HoursPerWeek int          `json:"hours_per_week"`
	Timezone     string       `json:"timezone"`
	DesiredRoles []string     `json:"desired_roles"`
	Completed    int          `json:"completed"` // How many of the four fields are filled in
	Total        int          `json:"total"`
}

func loadMatchProfile(userID uint) matchProfile {
	profile := matchProfile{Skills: []matchSkill{}, DesiredRoles: []string{}, Total: 4}
	var p models.Profile
	if database.DB.Where("user_id = ?", userID).Take(&p).Error == nil {
		if p.HoursPerWeek != nil {
			profile.HoursPerWeek = *p.HoursPerWeek
		}
		profile.Timezone = strOrEmpty(p.Timezone)
		if len(p.DesiredRoles) > 0 {
			_ = json.Unmarshal(p.DesiredRoles, &profile.DesiredRoles)
		}
	}
	database.DB.Model(&models.UserSkill{}).Select("name, level").Where("user_id = ?", userID).Order("level DESC, id").Scan(&profile.Skills)

	for _, filled := range []bool{len(profile.Skills) > 0, profile.HoursPerWeek > 0, profile.Timezone != "", len(profile.DesiredRoles) > 0} {
		if filled {
			profile.Completed++
		}
	}
	return profile
}

// GetMatchProfile returns the caller's matching fields and how complete they are.
func GetMatchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, loadMatchProfile(c.GetUint("userID")))
	}
}

// UpdateMatchProfile replaces the caller's skills, weekly hours, timezone and desired roles.
func UpdateMatchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		var req struct {
			Skills       []matchSkill `json:"skills"`
			HoursPerWeek int          `json:"hours_per_week"`
			Timezone     string       `json:"timezone"`
			DesiredRoles []string     `json:"desired_roles"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.HoursPerWeek < 0 || req.HoursPerWeek > 80 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile"})
			return
		}
		if _, err := time.LoadLocation(req.Timezone); req.Timezone != "" && err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown timezone"})
			return
		}

		roles := []string{}
		for _, r := range req.DesiredRoles {
			if r = strings.TrimSpace(r); r != "" && len(roles) < 5 {
				roles = append(roles, r)
			}
		}
		rolesJSON, _ := json.Marshal(roles)

		tx := database.DB.Begin()
		updates := map[string]interface{}{
			"hours_per_week": req.HoursPerWeek,
			"timezone":       req.Timezone,
			"desired_roles":  datatypes.JSON(rolesJSON),
		}
		if req.HoursPerWeek == 0 {
			updates["hours_per_week"] = nil
		}
		if err := tx.Model(&models.Profile{}).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save profile"})
			return
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserSkill{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save skills"})
			return
		}
		seen := map[string]bool{}
		for _, s := range req.Skills {
			name := strings.TrimSpace(s.Name)
			if name == "" || seen[strings.ToLower(name)] {
				continue
			}
			seen[strings.ToLower(name)] = true
			level := s.Level
			if level < 1 || level > 5 {
				level = 3
			}
			if err := tx.Create(&models.UserSkill{UserID: userID, Name: name, Level: level}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save skills"})
				return
			}
		}
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save profile"})
			return
		}
		// Recommendations depend on the profile
		invalidateMatchCache("")
		c.JSON(http.StatusOK, loadMatchProfile(userID))
	}
}

// GetMatchTodo counts what is waiting on the caller, for the My Projects to-do bar.
func GetMatchTodo() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		var newApplications, trialsRunning, myTrials, invitations, missingCheckins int64
		ownedApps := database.DB.Model(&models.ProjectApplication{}).
			Joins("JOIN project_posts ON project_posts.post_id = project_application.post_id").
			Joins("JOIN projects ON projects.project_id = project_posts.project_id").
			Where("projects.owner_id = ? AND project_application.status = 0", userID).
			Session(&gorm.Session{})
		ownedApps.Where("COALESCE(project_application.stage, 'new') IN ('new', '')").Count(&newApplications)
		ownedApps.Where("project_application.stage = 'trial'").Count(&trialsRunning)

		database.DB.Model(&models.ProjectApplication{}).Where("user_id = ? AND status = 0 AND stage = 'trial'", userID).Count(&myTrials)

		var email string
		database.DB.Model(&models.User{}).Where("id = ?", userID).Pluck("email", &email)
		if email != "" {
			database.DB.Model(&models.ProjectInvitation{}).Where("email = ? AND status = 0 AND expires_at > ?", email, time.Now()).Count(&invitations)
		}

		// Active projects the caller is on (or owns) with teammates, but no check-in from them this week
		database.DB.Model(&models.Project{}).
			Where("projects.status = 1 AND projects.deleted_at IS NULL").
			Where("projects.owner_id = ? OR projects.project_id IN (SELECT project_id FROM project_members WHERE user_id = ? AND removed_at IS NULL)", userID, userID).
			Where("EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = projects.project_id AND m.user_id <> projects.owner_id AND m.removed_at IS NULL AND NOT COALESCE(m.is_placeholder, false))").
			Where("NOT EXISTS (SELECT 1 FROM project_checkins ch WHERE ch.project_id = projects.project_id AND ch.user_id = ? AND ch.week_start = ?)", userID, weekStart(time.Now())).
			Count(&missingCheckins)

		c.JSON(http.StatusOK, gin.H{
			"new_applications": newApplications,
			"trials_running":   trialsRunning,
			"my_trials":        myTrials,
			"invitations":      invitations,
			"missing_checkins": missingCheckins,
		})
	}
}

// GetMyApplications lists the caller's own applications with where each one stands.
func GetMyApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		var rows []struct {
			ApplicationID uint       `json:"application_id" gorm:"column:application_id"`
			PostSID       string     `json:"post_sid" gorm:"column:post_sid"`
			Title         string     `json:"title" gorm:"column:title"`
			Role          string     `json:"role" gorm:"column:role"`
			Status        int        `json:"status" gorm:"column:status"`
			Stage         string     `json:"stage" gorm:"column:stage"`
			TrialTask     string     `json:"trial_task" gorm:"column:trial_task"`
			TrialDue      *time.Time `json:"trial_due" gorm:"column:trial_due"`
			AppliedAt     time.Time  `json:"applied_at" gorm:"column:applied_at"`
		}
		if err := database.DB.Model(&models.ProjectApplication{}).
			Select(`project_application.application_id, project_posts.sid AS post_sid, project_posts.title, project_application.role,
				project_application.status, COALESCE(project_application.stage, 'new') AS stage, COALESCE(project_application.trial_task, '') AS trial_task,
				project_application.trial_due, project_application.applied_at`).
			Joins("JOIN project_posts ON project_posts.post_id = project_application.post_id").
			Where("project_application.user_id = ?", c.GetUint("userID")).
			Order("project_application.applied_at DESC").
			Scan(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load your applications"})
			return
		}
		for i := range rows {
			rows[i].Stage = normalizeStage(rows[i].Stage)
		}
		if rows == nil {
			c.JSON(http.StatusOK, gin.H{"applications": []interface{}{}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"applications": rows})
	}
}
