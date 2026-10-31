package models

// Project visibility types
const (
	VisibilityPublic       = "public"       // Visible to everyone
	VisibilityPrivate      = "private"      // Visible only to project members
	VisibilityLocal        = "local"        // Visible to local community (school, organization)
	VisibilityOrganization = "organization" // Visible to organization members
)

// Project status types
const (
	StatusActive   = "active"   // Project is currently active
	StatusArchived = "archived" // Project is archived/completed
)

// Project status (numeric) - existing status if already defined
const (
	ProjectStatusDraft     = 0
	ProjectStatusActive    = 1
	ProjectStatusCompleted = 2
	ProjectStatusArchived  = 3
)

// ... existing code if any ...
