package models

import "time"

// Display Name Preference Constants
const (
	DisplayNamePreferred = 0 // Use preferred_name (with last_name)
	DisplayNameFirst     = 1 // Use first_name (with last_name)
	DisplayNameUsername  = 2 // Use username only
)

// Profile Visibility Constants (for user preferences)
const (
	ProfileVisibilityPublic      = 0 // Profile visible to everyone
	ProfileVisibilityPrivate     = 1 // Profile visible only to user
	ProfileVisibilityFriendsOnly = 2 // Profile visible to friends only
)

// Theme Constants
const (
	ThemeLight = "light"
	ThemeDark  = "dark"
	ThemeAuto  = "auto"
)

// UserPreferences contains user settings and preferences
type UserPreferences struct {
	UserID uint `gorm:"primaryKey;foreignKey:UserID;references:ID" json:"user_id" example:"1"` // Foreign key to User

	// Display & Language Preferences
	DisplayNamePreference int    `gorm:"type:int;default:0" json:"display_name_preference" example:"0"`     // Display name preference: 0=preferredName, 1=firstName, 2=username
	Language              string `gorm:"type:varchar(10);default:'en'" json:"language" example:"en"`        // Language code (ISO 639-1): en, zh, es, etc.

	// Notification Preferences
	InAppNotifications   bool `gorm:"default:true" json:"in_app_notifications" example:"true"`     // Enable in-app notifications
	EmailNotifications   bool `gorm:"default:true" json:"email_notifications" example:"true"`      // Enable email notifications
	PushNotifications    bool `gorm:"default:true" json:"push_notifications" example:"true"`       // Enable push notifications
	ProjectUpdates       bool `gorm:"default:true" json:"project_updates" example:"true"`          // Notify on project updates
	CommentNotifications bool `gorm:"default:true" json:"comment_notifications" example:"true"`    // Notify on comments
	MessageNotifications bool `gorm:"default:true" json:"message_notifications" example:"true"`    // Notify on messages

	// Privacy Preferences
	ProfileVisibility    int  `gorm:"type:int;default:0" json:"profile_visibility" example:"0"`         // Profile visibility: 0=public, 1=private, 2=friendsOnly
	ShowEmail            bool `gorm:"default:false" json:"show_email" example:"false"`                  // Show email on profile
	ShowPhone            bool `gorm:"default:false" json:"show_phone" example:"false"`                  // Show phone on profile
	AllowContactRequests bool `gorm:"default:true" json:"allow_contact_requests" example:"true"`        // Allow contact requests

	// UI/Appearance Preferences
	Theme string `gorm:"type:varchar(20);default:'light'" json:"theme" example:"light"` // UI theme: light, dark, auto

	// TEMPORARILY DISABLED - Modal Preferences
	// AutoCloseModals  bool `gorm:"default:true" json:"auto_close_modals" example:"true"`   // Auto-close modal windows
	// ModalAnimations  bool `gorm:"default:true" json:"modal_animations" example:"true"`    // Enable modal animations

	// TEMPORARILY DISABLED - Application Behavior Preferences
	// AutoRefresh         bool `gorm:"default:true" json:"auto_refresh" example:"true"`          // Auto-refresh content
	// ConfirmBeforeAction bool `gorm:"default:true" json:"confirm_before_action" example:"true"` // Confirm before important actions

	// TEMPORARILY DISABLED - Performance Preferences
	// LoadAnimations bool `gorm:"default:true" json:"load_animations" example:"true"` // Enable UI animations
	// PrefetchData   bool `gorm:"default:true" json:"prefetch_data" example:"true"`   // Prefetch data for better performance

	// TEMPORARILY DISABLED - AI Settings - API Keys (encrypted storage recommended in production)
	// OpenAIAPIKey    *string `gorm:"type:text" json:"openai_api_key,omitempty"`    // OpenAI API Key
	// AnthropicAPIKey *string `gorm:"type:text" json:"anthropic_api_key,omitempty"` // Anthropic API Key
	// GoogleAIAPIKey  *string `gorm:"type:text" json:"google_ai_api_key,omitempty"` // Google AI API Key

	// Timestamps
	CreatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"created_at" example:"2024-02-16T12:34:56Z"` // Creation timestamp
	UpdatedAt time.Time `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"` // Update timestamp
}

func (UserPreferences) TableName() string {
	return "user_preferences"
}
