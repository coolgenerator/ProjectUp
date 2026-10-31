package services

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"projectup/database"
	"projectup/models"
	"projectup/repositories"

	"github.com/gorilla/websocket"
)

// HandleChatCreation initializes a new chat and notifies members
func HandleChatCreation(name string, userIDs []uint, chatType int) (interface{}, error) {
	var chat interface{}
	var err error

	if chatType == 0 {
		chat, err = repositories.CreatePrivateChat(userIDs[0], userIDs[1])
	} else {
		chat, err = repositories.CreateGroupChat(name, userIDs)
	}

	if err != nil {
		fmt.Printf("Error creating chat: %v\n", err)
		return nil, err
	}

	// Notify all members
	for _, userID := range userIDs {
		NotifyUser(userID, map[string]interface{}{
			"chat":    chat,
			"message": fmt.Sprintf("Chat '%s' created!", name),
		})
	}

	return chat, nil
}

// ErrNotChatMember is returned when a user acts on a chat they are not part of.
var ErrNotChatMember = errors.New("not a member of this chat")

// maxPrivateMessageRunes caps one private message.
const maxPrivateMessageRunes = 5000

// PrivateChatForMember returns the private chat if userID is one of its two users.
func PrivateChatForMember(chatID, userID uint) (*models.PrivateChat, error) {
	chat, err := repositories.GetPrivateChatByID(chatID)
	if err != nil {
		return nil, err
	}
	if userID == 0 || (chat.User1ID != userID && chat.User2ID != userID) {
		return nil, ErrNotChatMember
	}
	return chat, nil
}

// IsGroupChatMember reports whether userID belongs to the group chat: listed
// in its members, or, for a project's team chat, a current project member.
func IsGroupChatMember(chatID, userID uint) bool {
	if userID == 0 {
		return false
	}
	var count int64
	database.DB.Model(&models.GroupMember{}).Where("group_id = ? AND user_id = ?", chatID, userID).Count(&count)
	if count > 0 {
		return true
	}
	var chat models.GroupChat
	if err := database.DB.Take(&chat, chatID).Error; err != nil || chat.ProjectID == nil {
		return false
	}
	return GetUserProjectPermissions(*chat.ProjectID, userID) != 0
}

// SendPrivateMessage saves and delivers a message from senderID, who must be
// in the chat. The sender always comes from the authenticated connection,
// never from the client's payload.
func SendPrivateMessage(chatID, senderID uint, content string) error {
	content = strings.TrimSpace(content)
	if content == "" || utf8.RuneCountInString(content) > maxPrivateMessageRunes {
		return errors.New("message must be 1-5000 characters")
	}
	if _, err := PrivateChatForMember(chatID, senderID); err != nil {
		return ErrNotChatMember
	}
	BroadcastPrivateMessage(models.PrivateMessage{ChatID: chatID, SenderID: senderID, Content: content})
	return nil
}

// sendMessageToUser sends a message to a user via SSE (preferred) or WebSocket (fallback)
func sendMessageToUser(userID uint, msg interface{}) {
	// Try SSE first (more efficient)
	if IsUserOnlineSSE(userID) {
		event := SSEEvent{
			Event: "chat_message",
			Data:  msg,
		}
		SendSSEEvent(userID, event)
		return
	}

	// Fallback to WebSocket
	conn, exists := wsPool.pool.Load(userID)
	if exists {
		if wsConn, ok := conn.(*websocket.Conn); ok {
			err := wsConn.WriteJSON(msg)
			if err != nil {
				fmt.Printf("Error sending message to user %d: %v\n", userID, err)
			}
		}
	} else {
		fmt.Printf("User %d is offline, message stored for later.\n", userID)
	}
}

// BroadcastPrivateMessage sends a private message to both users
func BroadcastPrivateMessage(message models.PrivateMessage) {
	repositories.SaveMessage(message)

	// Fetch the private chat members
	chat, err := repositories.GetPrivateChatByID(message.ChatID)
	if err != nil {
		fmt.Printf("Error retrieving private chat members for chat %d: %v\n", message.ChatID, err)
		return
	}

	enhancedMessage := map[string]interface{}{
		"chatID":    message.ChatID,
		"senderID":  message.SenderID,
		"content":   message.Content,
		"type":      "chat_message", // Add this field dynamically
		"timestamp": message.Timestamp,
		"isRead":    message.IsRead,
	}

	// Send to both users except sender
	if chat.User1ID == message.SenderID {
		sendMessageToUser(chat.User2ID, enhancedMessage)
	} else {
		sendMessageToUser(chat.User1ID, enhancedMessage)
	}
}

// GetUnreadPrivateMessageCount retrieves the count of unread private messages for a chat
func GetUnreadPrivateMessageCount(chatID, userID uint) int64 {
	return repositories.CountUnreadPrivateMessages(chatID, userID)
}

// MarkPrivateMessagesAsRead updates the read status of private chat messages
func MarkPrivateMessagesAsRead(chatID, userID uint) error {
	err := repositories.MarkPrivateMessagesAsRead(chatID, userID)
	if err != nil {
		fmt.Printf("Error marking messages as read for user %d in chat %d: %v\n", userID, chatID, err)
		return err
	}
	return nil
}
