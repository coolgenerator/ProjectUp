package services

import (
	"encoding/json"
	"errors"
	"log"
	"time"

	"projectup/database"
	"projectup/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Each project has one team chat: a group chat tied to the project. Who can
// read and post is decided by project membership, so the chat follows the
// team as people join and leave.

// TeamChatEventJoined is the system event posted when someone joins the team.
const TeamChatEventJoined = "joined"

// EnsureTeamChat returns the project's team chat, creating it on first use.
func EnsureTeamChat(projectID uint, name string) (*models.GroupChat, error) {
	var chat models.GroupChat
	err := database.DB.Where("project_id = ?", projectID).Take(&chat).Error
	if err == nil {
		return &chat, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	chat = models.GroupChat{Name: name, ProjectID: &projectID}
	// Two first uses can race; the unique project_id keeps one and we read it back
	if err := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&chat).Error; err != nil {
		return nil, err
	}
	if chat.ID == 0 {
		if err := database.DB.Where("project_id = ?", projectID).Take(&chat).Error; err != nil {
			return nil, err
		}
	}
	return &chat, nil
}

// PostTeamJoined records in the team chat that userID joined the project,
// as role when known. Failures are logged: the join itself already happened.
func PostTeamJoined(projectID uint, projectName string, userID uint, role string) {
	chat, err := EnsureTeamChat(projectID, projectName)
	if err != nil {
		log.Printf("team chat for project %d: %v", projectID, err)
		return
	}
	content, _ := json.Marshal(map[string]string{"event": TeamChatEventJoined, "role": role})
	message := models.GroupMessage{ChatID: chat.ID, SenderID: userID, Content: string(content), System: true}
	if err := database.DB.Create(&message).Error; err != nil {
		log.Printf("team chat join message for project %d: %v", projectID, err)
		return
	}
	database.DB.Model(chat).Update("updated_at", time.Now())
}
