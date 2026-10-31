package models

import (
	"time"

	"gorm.io/datatypes"
)

// User contains authentication and identity information
type User struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`                                            // Primary key
	Username      *string   `gorm:"type:varchar(50);unique" json:"username" example:"johndoe123"`                              // Username
	Password      *string   `gorm:"type:varchar(255)" json:"password"`                                                         // Hashed password (not shown)
	Email         *string   `gorm:"type:varchar(100);unique" json:"email" example:"johndoe@example.com"`                       // Email, unique
	EmailVerified bool      `gorm:"default:false" json:"email_verified" example:"true"`                                        // Email verification status
	Token         *string   `gorm:"type:text" json:"token" example:"some-jwt-token"`                                           // Access token
	RefreshToken  *string   `gorm:"type:text" json:"refresh_token" example:"some-refresh-token"`                               // Refresh token
	UserType      *string   `gorm:"type:varchar(50);default:'USER'" json:"user_type" example:"USER"`                           // Role (e.g., ADMIN or USER)
	Verified      bool      `gorm:"default:false" json:"verified" example:"true"`                                              // Verification status
	CreatedAt     time.Time `gorm:"type:timestamp;default:current_timestamp" json:"created_at" example:"2024-02-16T12:34:56Z"` // Creation timestamp
	UpdatedAt     time.Time `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"` // Update timestamp

	// Tutorial completion tracking
	ProjectTutorialCompleted   bool `gorm:"default:false" json:"project_tutorial_completed" example:"false"`   // Project tutorial completion status
	DashboardTutorialCompleted bool `gorm:"default:false" json:"dashboard_tutorial_completed" example:"false"` // Dashboard tutorial completion status

	// Projects and community-related relationships
	// Use pointers for relationships and omitempty to prevent circular references
	OwnedProjects       []*Project            `gorm:"foreignKey:OwnerID;references:ID;-:migration" json:"owned_projects,omitempty" swaggertype:"array,object"`
	MemberProjects      []*Project            `gorm:"many2many:project_members;foreignKey:ID;joinForeignKey:UserID;References:ProjectID;joinReferences:ProjectID;-:migration" json:"member_projects,omitempty" swaggertype:"array,object"`
	LikedPosts          []*ProjectPost        `gorm:"many2many:user_post_likes;foreignKey:ID;joinForeignKey:UserID;References:PostID;joinReferences:PostID;-:migration" json:"liked_posts,omitempty" swaggertype:"array,object"`
	ProjectPosts        []*ProjectPost        `gorm:"foreignKey:UserID;references:ID;-:migration" json:"project_posts,omitempty" swaggertype:"array,object"`
	Comments            []*GenericComment     `gorm:"foreignKey:UserID;references:ID;-:migration" json:"comments,omitempty" swaggertype:"array,object"`
	ProjectApplications []*ProjectApplication `gorm:"foreignKey:UserID;references:ID;-:migration" json:"applications,omitempty" swaggertype:"array,object"`
	Interactions        []*Interaction        `gorm:"foreignKey:UserID;references:ID;-:migration" json:"interactions,omitempty" swaggertype:"array,object"`
	Posts               []*Post               `gorm:"foreignKey:UserID;references:ID;-:migration" json:"posts,omitempty" swaggertype:"array,object"` // User's posts
}

func (User) TableName() string {
	return "users"
}

// Profile contains personal information and preferences
type Profile struct {
	UserID              uint           `gorm:"primaryKey;foreignKey:UserID;references:ID" json:"user_id" example:"1"`                     // Primary key and foreign key to User
	ShortID             string         `gorm:"type:varchar(20);unique;not null;column:sid" json:"sid" example:"USR1234"`                  // Short ID for public access
	FirstName           *string        `gorm:"type:varchar(100)" json:"first_name" example:"John"`                                        // First name
	LastName            *string        `gorm:"type:varchar(100)" json:"last_name" example:"Doe"`                                          // Last name
	PreferredName       *string        `gorm:"type:varchar(100)" json:"preferred_name" example:"Johnny"`                                  // Preferred name
	AvatarURL           *string        `gorm:"type:varchar(255)" json:"avatar_url" example:"https://example.com/avatar.jpg"`              // Avatar URL
	Website             *string        `gorm:"type:varchar(255)" json:"website" example:"https://johndoe.com"`                            // Personal website
	SchoolEmail         *string        `gorm:"type:varchar(100);unique" json:"school_email" example:"johndoe@school.edu"`                 // School email
	SchoolEmailVerified bool           `gorm:"default:false" json:"school_email_verified" example:"false"`                                // School email verification status
	Field               *string        `gorm:"type:varchar(255)" json:"field" example:"Computer Science"`                                 // Field of study
	Phone               *string        `gorm:"type:varchar(15)" json:"phone" example:"+1-555-555-5555"`                                   // Phone number
	School              *string        `gorm:"type:varchar(100)" json:"school" example:"UC San Diego"`                                    // School name
	Biography           *string        `gorm:"type:text" json:"biography" example:"Passionate developer and entrepreneur."`               // Biography
	State               *string        `gorm:"type:varchar(50)" json:"state" example:"California"`                                        // State or province
	City                *string        `gorm:"type:varchar(50)" json:"city" example:"San Diego"`                                          // City
	Country             *string        `gorm:"type:varchar(50)" json:"country" example:"USA"`                                             // Country
	ZipCode             *string        `gorm:"type:varchar(10)" json:"zip_code" example:"92093"`                                          // ZIP code
	Language              string         `gorm:"type:varchar(255);default:'English'" json:"language" example:"English,中文"`                            // Languages (comma-separated)
	ResumeURL             *string        `gorm:"type:varchar(255)" json:"resume_url" example:"https://example.com/resume.pdf"`                         // Resume URL
	HoursPerWeek          *int           `gorm:"type:int" json:"hours_per_week,omitempty" example:"10"`                                                // Weekly hours available for projects
	Timezone              *string        `gorm:"type:varchar(64)" json:"timezone,omitempty" example:"Asia/Shanghai"`                                   // IANA timezone, for scheduling with teammates
	DesiredRoles          datatypes.JSON `gorm:"type:jsonb" json:"desired_roles,omitempty" swaggertype:"array,string"`                                 // Roles the user wants to take on, e.g. ["前端开发"]
	DisplayNamePreference *int           `gorm:"-" json:"display_name_preference,omitempty" example:"0"`                                               // Display name preference (not stored in profiles table, joined from user_preferences)
	CreatedAt             time.Time      `gorm:"type:timestamp;default:current_timestamp" json:"created_at" example:"2024-02-16T12:34:56Z"`            // Creation timestamp
	UpdatedAt             time.Time      `gorm:"type:timestamp;default:current_timestamp" json:"updated_at" example:"2024-02-16T12:34:56Z"`            // Update timestamp

	// Reference to User - using pointer to avoid circular reference
	User *User `gorm:"-" json:"-"` // Excluding from db ops and json serialization
}

func (Profile) TableName() string {
	return "profiles"
}

// Category represents a category for concepts
type Category struct {
	ID   uint   `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`
	Name string `gorm:"type:varchar(50);not null;unique" json:"name" example:"Programming"`
}

func (Category) TableName() string {
	return "categories"
}

// UserConcept represents a central concept that can be used for both skills and interests
type UserConcept struct {
	ID         uint   `gorm:"primaryKey;autoIncrement" json:"id" example:"1"`
	Name       string `gorm:"type:varchar(100);not null;unique" json:"canonical_name" example:"Python Programming"`
	CategoryID uint   `gorm:"not null;index" json:"category_id" example:"1"`
	Popularity int    `gorm:"default:0" json:"popularity" example:"100"`
}

func (UserConcept) TableName() string {
	return "user_concepts"
}

// UserSkill represents a user's skill - simplified without concept table
type UserSkill struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint      `gorm:"index;not null" json:"user_id" example:"1"`
	Name       string    `gorm:"type:varchar(100);not null" json:"name" example:"Python"`
	Level      int       `gorm:"type:int;default:3" json:"level" example:"4"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Reference to User - using pointer to avoid circular reference
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (UserSkill) TableName() string {
	return "user_skills"
}

// UserInterest represents a user's interest - simplified without concept table
type UserInterest struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id" example:"1"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name" example:"Artificial Intelligence"`
	Level     int       `gorm:"type:int;default:3" json:"level" example:"5"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Reference to User - using pointer to avoid circular reference
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (UserInterest) TableName() string {
	return "user_interests"
}

// SkillData represents skill data with proficiency level for updates
type SkillData struct {
	Name  string `json:"name" example:"Python"`
	Level int    `json:"level" example:"4"`
}

// InterestData represents interest data with interest level for updates
type InterestData struct {
	Name  string `json:"name" example:"Machine Learning"`
	Level int    `json:"level" example:"5"`
}

// @Description Required user credentials to authenticate.
type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required" example:"johndoe@example.com"`
	Password   string `json:"password" binding:"required" example:"mypassword"`
}

type VerifiedUser struct {
	Email             string    `json:"email" db:"email"`                           // User's email address
	VerificationToken string    `json:"verification_token" db:"verification_token"` // Unique token for email verification
	CreatedAt         time.Time `json:"created_at" db:"created_at"`                 // Record creation timestamp
}

func (VerifiedUser) TableName() string {
	return "verified_users"
}
