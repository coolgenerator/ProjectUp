package controllers

import (
	"fmt"
	"log"
	"time"

	"projectup/database"
	"projectup/models"
	"projectup/repositories"
	"projectup/services"
)

// Applicants drift away if nobody answers, so founders get one nudge per
// application that has waited this long without any response.
const applicationReminderAfter = 48 * time.Hour

// StartApplicationReminders checks for stale applications every hour.
func StartApplicationReminders() {
	go func() {
		for {
			remindStaleApplications()
			time.Sleep(time.Hour)
		}
	}()
}

func remindStaleApplications() {
	var stale []struct {
		ApplicationID uint
		OwnerID       uint
		Email         *string
		Title         string
	}
	if err := database.DB.Model(&models.ProjectApplication{}).
		Select("project_application.application_id, project_posts.user_id AS owner_id, users.email, project_posts.title").
		Joins("JOIN project_posts ON project_posts.post_id = project_application.post_id").
		Joins("JOIN users ON users.id = project_posts.user_id").
		Where("project_application.status = 0 AND project_application.review_at IS NULL AND project_application.reminded_at IS NULL AND project_application.applied_at < ?",
			time.Now().Add(-applicationReminderAfter)).
		Scan(&stale).Error; err != nil {
		log.Printf("application reminders: %v", err)
		return
	}
	if len(stale) == 0 {
		return
	}

	// One reminder per founder, however many applications are waiting
	type pending struct {
		email  string
		titles map[string]bool
		ids    []uint
	}
	byOwner := map[uint]*pending{}
	for _, s := range stale {
		p := byOwner[s.OwnerID]
		if p == nil {
			p = &pending{email: strOrEmpty(s.Email), titles: map[string]bool{}}
			byOwner[s.OwnerID] = p
		}
		p.titles[s.Title] = true
		p.ids = append(p.ids, s.ApplicationID)
	}

	for ownerID, p := range byOwner {
		title := fmt.Sprintf("%d application(s) waiting over 48 hours", len(p.ids))
		description := "Applicants are waiting to hear back. Move them to talking, give a trial task, or decline so they can look elsewhere."
		if err := repositories.SaveTypedNotification(ownerID, models.NotificationTypeApplication, title, description, "/applications"); err != nil {
			continue
		}
		if p.email != "" {
			go func(ownerID uint, email string, count int) {
				if err := services.SendApplicationReminderEmail(email, count); err != nil {
					log.Printf("application reminder email to owner %d: %v", ownerID, err)
				}
			}(ownerID, p.email, len(p.ids))
		}
		database.DB.Model(&models.ProjectApplication{}).Where("application_id IN ?", p.ids).Update("reminded_at", time.Now())
	}
}
