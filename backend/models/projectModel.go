package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// @Description Project entity containing metadata and relationships.
type Project struct {
	ProjectID        uint           `gorm:"primaryKey;autoIncrement" json:"project_id" example:"1"`
	ShortID          string         `gorm:"type:varchar(10);unique;not null;column:sid" json:"sid" example:"PRJ12345"`
	OwnerID          uint           `gorm:"not null" json:"owner_id" example:"1"` // Owner's user ID
	Slug             string         `gorm:"type:varchar(255);unique;index" json:"slug" example:"my-awesome-project"`
	Cover            *string        `gorm:"type:varchar(255)" json:"cover,omitempty" example:"https://example.com/project-cover.jpg"`
	ProjectMediaURL  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"project_media_url,omitempty" swaggertype:"object"`
	ReferLink        *string        `gorm:"type:text" json:"refer_link,omitempty" example:"https://github.com/my-project"`
	CommunicationApp *string        `gorm:"type:varchar(100)" json:"communication_app,omitempty" example:"Slack"`
	ProjectType      *string        `gorm:"type:varchar(100);not null" json:"project_type" example:"Software Development"`
	Title            *string        `gorm:"type:varchar(100);not null" json:"title" example:"My Awesome Project"`
	Description      *string        `gorm:"type:text" json:"description,omitempty" example:"This project is about building a new innovative web platform."`
	Topic            datatypes.JSON `gorm:"type:jsonb" json:"topic" swaggertype:"object"`
	School           *string        `gorm:"type:varchar(100)" json:"school,omitempty" example:"UC San Diego"`
	Class            *string        `gorm:"type:varchar(100)" json:"class,omitempty" example:"CSE 110"`
	Location         *string        `gorm:"type:varchar(100);not null" json:"location" example:"San Diego, CA"`
	StartTime        *time.Time     `gorm:"type:timestamp;default:current_timestamp" json:"start_time,omitempty" example:"2024-03-01T10:00:00Z"`
	EndTime          *time.Time     `gorm:"type:timestamp;default:current_timestamp" json:"end_time,omitempty" example:"2024-06-01T18:00:00Z"`
	Hidden           bool           `gorm:"default:false" json:"hidden" example:"false"`
	IsPublished      bool           `gorm:"default:false" json:"is_published" example:"false"` // Indicates if the project is published as a post
	Status           int            `gorm:"type:int;not null" json:"status" example:"1"`       // Status{1: Active, 2: Archived, 3: Completed, 4: Deleted}

	// New onboarding fields
	ProjectScenario     *string        `gorm:"type:varchar(50)" json:"project_scenario,omitempty" example:"course"` // 'course', 'research', 'product', 'personal', 'blank'
	CourseInfo          datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"course_info,omitempty" swaggertype:"object"` // Syllabus data, course name, class info
	ResearchInfo        datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"research_info,omitempty" swaggertype:"object"` // Proposal status, advisor info, research domain
	OnboardingMetadata  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"onboarding_metadata,omitempty" swaggertype:"object"` // Track onboarding completeness and choices
	Kickoff             datatypes.JSON `gorm:"type:jsonb" json:"kickoff,omitempty" swaggertype:"object"`                               // Kickoff checklist: item key -> done
	SetupChecklist      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"setup_checklist,omitempty" swaggertype:"array,object"` // Post-creation setup tasks
	DurationWeeks       *int           `gorm:"type:int" json:"duration_weeks,omitempty" example:"8"` // Estimated project duration in weeks

	CreatedAt        time.Time      `gorm:"autoCreateTime" json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime" json:"updated_at" example:"2024-02-17T14:45:22Z"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships - using pointers and omitempty to prevent circular references
	Members         []*User             `gorm:"many2many:project_members;foreignKey:ProjectID;joinForeignKey:ProjectID;References:ID;joinReferences:UserID;-:migration" json:"members,omitempty" swaggertype:"array,object"`
	Owner           *User               `gorm:"foreignKey:OwnerID;references:ID;-:migration" json:"owner,omitempty" swaggertype:"object"`
	Milestones      []*Milestone        `gorm:"foreignKey:ProjectID;-:migration" json:"milestones,omitempty" swaggertype:"array,object"`
	ProjectResources []*ProjectResource `gorm:"foreignKey:ProjectID;-:migration" json:"project_resources,omitempty" swaggertype:"array,object"`
	Workspaces      []*Workspace        `gorm:"foreignKey:ProjectID;-:migration" json:"workspaces,omitempty" swaggertype:"array,object"`
	ProjectPosts    []*ProjectPost      `gorm:"foreignKey:ProjectID;-:migration" json:"project_posts,omitempty" swaggertype:"array,object"`
	Phases          []*ProjectPhase     `gorm:"foreignKey:ProjectID;-:migration" json:"phases,omitempty" swaggertype:"array,object"`

	// Project Groups - using pointers to avoid circular references
	Groups       []*ProjectGroup       `gorm:"foreignKey:ProjectID;-:migration" json:"groups,omitempty" swaggertype:"array,object"`
	GroupMembers []*ProjectGroupMember `gorm:"foreignKey:ProjectID;references:ProjectID;-:migration" json:"group_members,omitempty" swaggertype:"array,object"`
}

func (p *Project) TableName() string {
	return "projects"
}

// GetUserID gets the UserID (alias for OwnerID)
func (p *Project) GetUserID() uint {
	return p.OwnerID
}

// SetUserID sets the UserID (alias for OwnerID)
func (p *Project) SetUserID(userID uint) {
	p.OwnerID = userID
}

type Milestone struct {
	MilestoneID      uint           `gorm:"primaryKey;autoIncrement" json:"milestone_id" example:"101"`
	ProjectID        uint           `gorm:"not null;index" json:"project_id" example:"1"`
	WorkspaceID      *uint          `gorm:"default:null;index" json:"workspace_id,omitempty" example:"1"` // Optional - only for pro users with workspace feature
	ParentID         *uint          `gorm:"default:null;index" json:"parent_id,omitempty" example:"102"` // Parent milestone ID for hierarchy
	Title            string         `gorm:"type:varchar(255);not null" json:"title" example:"Project Kickoff"`
	Description      *string        `gorm:"type:text" json:"description,omitempty" example:"Initial meeting with stakeholders."`
	StartDate        *time.Time     `gorm:"type:timestamp" json:"start_date,omitempty" example:"2024-03-01T00:00:00Z"`
	DueDate          *time.Time     `gorm:"type:timestamp" json:"due_date,omitempty" example:"2024-03-15T23:59:59Z"`
	Status           string         `gorm:"type:varchar(50);default:'pending'" json:"status" example:"in_progress"` // pending, in_progress, completed, cancelled
	Priority         int            `gorm:"default:0" json:"priority" example:"2"`                                   // 0-4 priority level (0=lowest, 4=highest)
	Category         *string        `gorm:"type:varchar(100)" json:"category,omitempty" example:"Development"`      // Category for grouping milestones
	Completed        bool           `gorm:"default:false" json:"completed" example:"false"`                         // Explicit completed field
	SectionID        *uint          `gorm:"default:null" json:"section_id,omitempty" example:"5"`                   // Section ID for organization
	SectionOrder     *int           `gorm:"default:null" json:"section_order,omitempty" example:"0"`                // Order within section
	Color            *string        `gorm:"type:varchar(7)" json:"color,omitempty" example:"#8B5CF6"`               // Custom color for milestone
	SortOrder        int            `gorm:"default:0" json:"sort_order" example:"1"`                                // For ordering milestones
	CustomAttributes datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"custom_attributes"`                       // Custom attributes based on template
	CreatedAt        time.Time      `gorm:"autoCreateTime" json:"created_at" example:"2024-02-16T12:34:56Z"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime" json:"updated_at" example:"2024-02-17T14:45:22Z"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Workspace *ProjectGroup `gorm:"foreignKey:WorkspaceID;-:migration" json:"workspace,omitempty"`
}

func (Milestone) TableName() string {
	return "milestones"
}

// ProjectResource represents a resource specific to a project (different from general user Resource)
type ProjectResource struct {
	ResourceID   uint           `gorm:"primaryKey;autoIncrement" json:"resource_id"`
	ProjectID    uint           `gorm:"not null;index" json:"project_id"`              // Foreign key to Project table
	WorkspaceID  *uint          `gorm:"default:null;index" json:"workspace_id,omitempty"` // Optional - only for pro users with workspace feature
	Title        string         `gorm:"type:varchar(255);not null" json:"title"`
	ResourceType string         `gorm:"type:varchar(50);not null" json:"resource_type"` // 'link', 'file', 'document', 'video', etc.
	URL          *string        `gorm:"type:text" json:"url,omitempty"`                 // URL for links
	FilePath     *string        `gorm:"type:text" json:"file_path,omitempty"`           // File path for uploaded files
	Description  *string        `gorm:"type:text" json:"description,omitempty"`
	Category     *string        `gorm:"type:varchar(100)" json:"category,omitempty"`  // Category for grouping
	Tags         datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"tags"`          // Tags for searching
	SortOrder    int            `gorm:"default:0" json:"sort_order"`                  // For ordering
	CreatedAt    time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relationships
	Workspace *ProjectGroup `gorm:"foreignKey:WorkspaceID;-:migration" json:"workspace,omitempty"`
}

func (ProjectResource) TableName() string {
	return "project_resources"
}

// Workspace represents a document/page within a workspace (ProjectGroup)
// Note: This is a workspace document, not the workspace itself (that's ProjectGroup)
type Workspace struct {
	WorkspaceID uint           `gorm:"primaryKey;autoIncrement" json:"workspace_id"`
	ProjectID   uint           `gorm:"not null;index" json:"project_id"`   // Foreign key to projects
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	URL         *string        `gorm:"type:text" json:"url,omitempty"`                   // URL link for quick access
	Content     datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"content,omitempty"` // EditorJS content or other structured data
	Category    *string        `gorm:"type:varchar(100)" json:"category,omitempty"`      // Category for grouping
	Icon        *string        `gorm:"type:varchar(50)" json:"icon,omitempty"`           // Icon for the workspace doc
	Color       *string        `gorm:"type:varchar(50)" json:"color,omitempty"`          // Color theme
	SortOrder   int            `gorm:"default:0" json:"sort_order"`                      // For ordering
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (Workspace) TableName() string {
	return "workspaces"
}

// MilestoneAssignment represents the assignment of a milestone to project members
type MilestoneAssignment struct {
	MilestoneID uint      `gorm:"primaryKey" json:"milestone_id"`
	UserID      uint      `gorm:"primaryKey" json:"user_id"`
	AssignedAt  time.Time `gorm:"autoCreateTime" json:"assigned_at"`
}

func (MilestoneAssignment) TableName() string {
	return "milestone_assignments"
}

type ProjectPost struct {
	PostID      uint           `json:"post_id" gorm:"primaryKey;autoIncrement"` // Primary Key
	UserID      uint           `json:"user_id" gorm:"not null"`                 // Foreign Key to users
	ProjectID   uint           `json:"project_id" gorm:"not null"`              // Foreign Key to projects
	ShortID     string         `gorm:"type:varchar(10);unique;not null;column:sid" json:"sid"`
	Title       string         `json:"title" gorm:"size:255;not null"`        // Title of the post
	Cover       *string        `json:"cover" gorm:"type:varchar(255)"`        // Cover of the post (optional)
	Medias      datatypes.JSON `json:"medias" gorm:"type:jsonb;default:'{}'"` // JSONB for media files
	Spots       datatypes.JSON `json:"spots" gorm:"type:jsonb;default:'{}'"`  // JSONB for spots
	StartTime   *time.Time     `json:"start_time" gorm:"type:timestamp"`      // Start time of the project (optional)
	Deadline    *time.Time     `json:"deadline" gorm:"type:timestamp"`        // Deadline for the project (optional)
	Location    *string        `json:"location" gorm:"type:varchar(255)"`     // Location of the project (optional)
	LikeCount   int            `json:"like_count" gorm:"default:0"`           // Count of likes
	Description *string        `json:"description" gorm:"type:text"`          // Long text description (optional)
	Visibility  int            `json:"visibility" gorm:"type:int"`            // Visibilities(1: private; 2: public; 3: local; 4: organization)
	Status      int            `gorm:"type:int;not null" json:"status"`       // Sataus{1: Active, 2: Archived, 3: Pastdue, 4: Deleted}
	CreatedAt   time.Time      `json:"created_at" gorm:"autoCreateTime"`      // Timestamp for creation
	UpdatedAt   time.Time      `json:"updated_at" gorm:"autoUpdateTime"`      // Timestamp for last update

	// Relationships
	Comments             []*GenericComment      `gorm:"foreignKey:EntityID;references:PostID;-:migration" json:"comments,omitempty"`                                                                 // Comments on the post (using generic comments)
	Applications         []*ProjectApplication  `gorm:"foreignKey:PostID;references:PostID;-:migration" json:"project_applications,omitempty"`                                                       // Applications for the post
	ApplicationQuestions []*ApplicationQuestion `gorm:"foreignKey:PostID;references:PostID;-:migration" json:"application_questions,omitempty"`                                                      // Application questions for the post
	LikedBy              []*User                `gorm:"many2many:user_post_likes;foreignKey:PostID;joinForeignKey:PostID;References:ID;joinReferences:UserID;-:migration" json:"liked_by,omitempty"` // Users who liked the post
	// Interactions         []Interaction         `gorm:"-" json:"interactions,omitempty"`
}

func (ProjectPost) TableName() string {
	return "project_posts"
}

type ProjectApplication struct {
	ApplicationID uint       `gorm:"primaryKey;autoIncrement" json:"application_id" example:"201"`
	UserID        uint       `gorm:"not null" json:"user_id" example:"10"` // Primary reference to User
	PostID        uint       `gorm:"not null" json:"post_id" example:"1"`
	Status        int        `gorm:"not null" json:"status" example:"1"`
	AppliedAt     time.Time  `gorm:"not null" json:"applied_at" example:"2024-02-18T10:00:00Z"`
	ReviewAt      *time.Time `json:"review_at,omitempty" example:"2024-02-19T12:00:00Z"`
	Description   string     `gorm:"type:text" json:"description" example:"I have experience in full-stack web development and am excited to contribute!"`
	Role          string     `gorm:"type:varchar(100)" json:"role" example:"Frontend Developer"` // Role card the applicant is applying for
	HoursPerWeek  int        `gorm:"default:0" json:"hours_per_week" example:"8"`               // Weekly time the applicant commits to
	FirstStep     string     `gorm:"type:text" json:"first_step" example:"Build a clickable prototype of the upload flow"` // What the applicant proposes to do in their first week
	Stage         string     `gorm:"type:varchar(20);default:'new'" json:"stage" example:"talking"`                         // Review stage while pending: new, talking, trial
	TrialTask     string     `gorm:"type:text" json:"trial_task" example:"Build the upload page prototype"`                  // Trial task the founder assigned, if any
	TrialDue      *time.Time `json:"trial_due,omitempty" example:"2024-02-25T00:00:00Z"`                                     // When the trial task is due
	AISummary     datatypes.JSON `gorm:"type:jsonb" json:"ai_summary,omitempty" swaggertype:"object"`                     // Cached AI summary for the founder: summary, fit, risk
	RemindedAt    *time.Time `json:"-"`                                                                                       // When the founder was last reminded about this pending application
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at" example:"2024-02-18T10:00:00Z"`

	// Add User relationship
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ProjectApplication) TableName() string {
	return "project_application"
}

type ApplicationQuestion struct {
	QuestionID uint                `gorm:"primaryKey;autoIncrement" json:"question_id" example:"301"`
	PostID     uint                `gorm:"not null" json:"post_id" example:"1"`
	Text       string              `gorm:"type:text;not null" json:"text" example:"Why do you want to join this project?"`
	Type       uint                `gorm:"not null" json:"type" example:"0"`
	Choices    datatypes.JSON      `gorm:"type:jsonb" json:"choices" swaggertype:"object"`
	CreatedAt  time.Time           `gorm:"autoCreateTime" json:"created_at" example:"2024-02-18T10:00:00Z"`
	Answers    []ApplicationAnswer `json:"answers,omitempty" gorm:"foreignKey:QuestionID;-:migration"`
}

func (ApplicationQuestion) TableName() string {
	return "application_questions"
}

type ApplicationAnswer struct {
	AnswerID      uint      `gorm:"primaryKey;autoIncrement" json:"answer_id" example:"401"`
	ApplicationID uint      `gorm:"not null" json:"application_id" example:"201"`
	QuestionID    uint      `gorm:"not null" json:"question_id" example:"301"`
	AnswerText    string    `gorm:"type:text;not null" json:"answer_text" example:"I am passionate about this field and have relevant experience."`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at" example:"2024-02-18T10:00:00Z"`
}

func (ApplicationAnswer) TableName() string {
	return "application_answers"
}

// Unified visibility table for group-based access control

// ProjectInvitation struct
type ProjectInvitation struct {
	InvitationID    uint      `gorm:"primaryKey;autoIncrement" json:"invitation_id"`
	ProjectID       uint      `gorm:"not null" json:"project_id"`
	Email           string    `gorm:"type:varchar(255);not null" json:"email"`
	InvitedByUserID uint      `gorm:"not null" json:"invited_by_user_id"`        // Changed to UserID
	Status          int       `gorm:"type:int;not null;default:0" json:"status"` // 0: Pending, 1: Accepted, 2: Rejected
	Role            string    `gorm:"type:varchar(50);not null;default:'viewer'" json:"role"` // owner, admin, editor, viewer
	Token           string    `gorm:"type:varchar(255);unique;not null" json:"token"`
	ExpiresAt       time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Add User relationship
	InvitedBy *User `gorm:"foreignKey:InvitedByUserID;references:ID" json:"invited_by,omitempty"`
}

// SetInvitedBy sets InvitedByUserID field for backward compatibility
func (p *ProjectInvitation) SetInvitedBy(userID uint) {
	p.InvitedByUserID = userID
}

func (ProjectInvitation) TableName() string {
	return "project_invitations"
}

// ShareAccessLevel represents the level of access for a shared project
type ShareAccessLevel string

const (
	ShareAccessView ShareAccessLevel = "view"
	ShareAccessEdit ShareAccessLevel = "edit"
)

// ProjectShare represents a shareable link for a project
type ProjectShare struct {
	ShareID        uint             `gorm:"primaryKey" json:"share_id"`
	ProjectID      uint             `json:"project_id"`
	SharedByUserID uint             `gorm:"not null" json:"shared_by_user_id"` // Changed to UserID
	ShareToken     string           `json:"share_token"`
	ExpiresAt      time.Time        `json:"expires_at"`
	AccessLevel    ShareAccessLevel `json:"access_level"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`

	// Add User relationship
	SharedBy *User `gorm:"foreignKey:SharedByUserID;references:ID" json:"shared_by,omitempty"`
}

// SetSharedBy sets SharedByUserID field for backward compatibility
func (p *ProjectShare) SetSharedBy(userID uint) {
	p.SharedByUserID = userID
}

func (ProjectShare) TableName() string {
	return "project_shares"
}

// InviteMemberRequest represents the request body for inviting a member
type InviteMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required,oneof=admin editor viewer"` // owner, admin, editor, viewer
}

// CreateShareRequest represents the request body for creating a share link
type CreateShareRequest struct {
	AccessLevel string `json:"access_level" binding:"required,oneof=view edit"`
	ExpiryDays  int    `json:"expiry_days" binding:"required,min=1,max=30"`
}

// ProjectPostShare represents a shareable link for a project post
type ProjectPostShare struct {
	ShareID        uint             `gorm:"primaryKey" json:"share_id"`
	PostID         uint             `json:"post_id"`
	SharedByUserID uint             `gorm:"not null" json:"shared_by_user_id"` // Changed to UserID
	ShareToken     string           `gorm:"type:varchar(255);unique;not null" json:"share_token"`
	ExpiresAt      time.Time        `json:"expires_at"`
	AccessLevel    ShareAccessLevel `json:"access_level"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`

	// Add User relationship
	SharedBy *User `gorm:"foreignKey:SharedByUserID;references:ID" json:"shared_by,omitempty"`
}

// SetSharedBy sets SharedByUserID field for backward compatibility
func (p *ProjectPostShare) SetSharedBy(userID uint) {
	p.SharedByUserID = userID
}

func (ProjectPostShare) TableName() string {
	return "project_post_shares"
}

// ProjectPhase represents different phases in a project lifecycle (especially for research projects)
type ProjectPhase struct {
	PhaseID     uint           `gorm:"primaryKey;autoIncrement" json:"phase_id"`
	ProjectID   uint           `gorm:"not null;index" json:"project_id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	Status      string         `gorm:"type:varchar(50);default:'locked'" json:"status"` // 'locked', 'in_progress', 'completed'
	GateType    *string        `gorm:"type:varchar(50)" json:"gate_type,omitempty"`     // 'approval_required', 'dependency', null
	GateConfig  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"gate_config,omitempty" swaggertype:"object"` // Approver info, dependencies, etc.
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	StartDate   *time.Time     `gorm:"type:timestamp" json:"start_date,omitempty"`
	EndDate     *time.Time     `gorm:"type:timestamp" json:"end_date,omitempty"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (ProjectPhase) TableName() string {
	return "project_phases"
}
