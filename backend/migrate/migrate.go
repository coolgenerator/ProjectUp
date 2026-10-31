package main

import (
	"fmt"
	"log"
	"projectup/database"
	"projectup/models"
	"strings"
)

// MigrationResult tracks the results of each model migration
type MigrationResult struct {
	ModelName string
	Success   bool
	Error     string
}

func main() {
	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Enable debugging to log SQL queries
	database.DB = database.DB.Debug()

	// Run migrations
	results, err := runMigrations()
	if err != nil {
		log.Printf("Migration completed with errors: %v", err)
	} else {
		log.Println("Database migrated successfully")
	}

	// Print migration summary
	printMigrationSummary(results)
}

// printMigrationSummary displays a summary of successful and failed migrations
func printMigrationSummary(results []MigrationResult) {
	successful := 0
	failed := 0
	failedModels := []string{}

	for _, result := range results {
		if result.Success {
			successful++
		} else {
			failed++
			failedModels = append(failedModels, fmt.Sprintf("%s: %s", result.ModelName, result.Error))
		}
	}

	log.Printf("Migration Summary: %d successful, %d failed", successful, failed)
	log.Printf("Total tables attempted: %d", len(results))

	if failed > 0 {
		log.Println("Failed migrations:")
		for _, failedModel := range failedModels {
			log.Printf("- %s", failedModel)
		}
	}
}

// runMigrations handles all database migrations
func runMigrations() ([]MigrationResult, error) {
	var results []MigrationResult
	// Temporarily disable constraint checks for PostgreSQL
	log.Println("Temporarily disabling constraint checks...")

	// Use a separate transaction for the replication role setting
	// This way if something fails, the replication role will still be reset properly
	tx := database.DB.Begin()
	tx.Exec("SET session_replication_role = 'replica';")
	tx.Commit()

	// Make sure we reset the replication role at the end, even if there's an error
	defer func() {
		resetTx := database.DB.Begin()
		resetTx.Exec("SET session_replication_role = 'origin';")
		resetTx.Commit()
		log.Println("Constraint checks re-enabled")
	}()

	// Phase 1: Create all tables in an order that avoids dependency issues
	// Start with the most fundamental tables that have no dependencies
	log.Println("Creating fundamental tables...")
	fundamentalModels := []interface{}{
		&models.User{},
		&models.Profile{},
		&models.Category{},
		&models.UserConcept{},
		&models.FileMetadata{},
		&models.VerifiedUser{},
		&models.Post{},
	}

	for _, model := range fundamentalModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating fundamental model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate fundamental model %s: %s", modelType, result.Error)
		}
	}

	// Phase 2: Create direct user-related models
	log.Println("Migrating user-related models...")
	userRelatedModels := []interface{}{
		&models.UserPreferences{},         // User preferences table
		&models.UserAIAPIKey{},            // User AI API keys table
		&models.UserAIServicePreference{}, // User AI service preferences table
		&models.AIWorkflowSession{},       // AI Project Assistant workflow sessions
		&models.UserSkill{},
		&models.UserInterest{},
		&models.IdeaDraft{},
		&models.ProjectCheckin{},
		&models.ProjectDecision{},
		&models.Notification{},
		&models.Contact{},
		&models.ContactRequest{},
	}

	for _, model := range userRelatedModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating user-related model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate user-related model %s: %s", modelType, result.Error)
		}
	}

	// Phase 3: Create chat-related base models
	log.Println("Migrating chat base models...")
	chatBaseModels := []interface{}{
		&models.PrivateChat{},
		&models.GroupChat{},
		&models.PrivateMessage{},
		&models.GroupMessage{},
	}

	for _, model := range chatBaseModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating chat base model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate chat base model %s: %s", modelType, result.Error)
		}
	}

	// Phase 4: Create project table first, before dependencies
	log.Println("Creating Project table...")
	projectResult := migrateOrRecreateTable(&models.Project{})
	results = append(results, projectResult)
	if !projectResult.Success {
		log.Printf("Warning: Failed to create Project table: %s", projectResult.Error)
	}

	// Phase 5: Create tables that depend only on existing tables but have other tables depending on them
	log.Println("Creating mid-level tables...")
	midLevelModels := []interface{}{
		&models.ProjectGroup{},
		&models.ProjectMember{},
		&models.PartnerEvent{}, // Create partners table before its dependencies
		&models.GenericComment{},
		&models.ProjectPost{},
		// Project dashboard tables
		&models.ProjectResource{},    // Add ProjectResource table for project-specific resources
		&models.Workspace{},          // Add Workspace table
		&models.Milestone{},          // Add Milestone table
		&models.MilestoneAssignment{}, // Add MilestoneAssignment table
		&models.ProjectPlan{},        // Add ProjectPlan table
		&models.ProjectPhase{},       // Add ProjectPhase table for research project phases
		&models.Meeting{},            // Add Meeting table
		&models.MeetingAttendee{},    // Add MeetingAttendee table
		&models.MeetingAvailability{}, // Add MeetingAvailability table
		&models.Section{},            // Add Section table for task organization
		// General user resources (different from project resources)
		&models.Resource{},           // Add Resource table for user-level resources
		&models.ResourceQuota{},      // Add ResourceQuota table
		&models.TrendingItem{},       // Add TrendingItem table
		&models.Bookmark{},           // Add Bookmark table
		&models.BookmarkCategory{},   // Add BookmarkCategory table
		&models.Paper{},              // Add Paper table
		&models.PaperCollection{},    // Add PaperCollection table
	}

	for _, model := range midLevelModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating mid-level model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate mid-level model %s: %s", modelType, result.Error)
		}
	}

	// Phase 6: Create tables that depend on mid-level tables
	log.Println("Creating dependent tables...")
	dependentModels := []interface{}{
		&models.EventParticipant{}, // Depends on partners table
		&models.EventMemo{},        // Depends on partners table
		&models.GroupMember{},
		// Block-related models removed - no longer using block-based design
		// &models.BlockPermission{},
		// &models.BlockComment{},
		// &models.DatabaseSchema{},
		// &models.BlockView{},
		// &models.BlockRelation{},
		// &models.BlockTemplate{},
		// &models.BlockVisibleGroup{}, // Removed - block-based design
		&models.ProjectGroupMember{},
		&models.Interaction{},
		&models.LearningPath{},
		&models.LearningModule{},
		&models.LearningTask{},
		// Task management models
		&models.Task{},
		&models.Subtask{},
		&models.LearningResource{},
		&models.TaskDependency{},
		&models.PaperAnnotation{},
		&models.PaperAnalysis{},
		&models.PaperChatMessage{},
		&models.PaperCollectionMapping{},
		&models.ChatHistory{},
		&models.PaperNote{},
		&models.PaperOutlineCache{},
		&models.PaperReferencesCache{},
		&models.Subscription{},      // Add Subscription table
		&models.PaymentMethod{},     // Add PaymentMethod table
		&models.PaymentHistory{},    // Add PaymentHistory table
		// Idea Tree models removed - now handled by AI service
		// Knowledge Tree models
		&models.Domain{},
		&models.Topic{},
		&models.KnowledgeConcept{},
		&models.ConceptResource{},
		&models.ConceptRelationship{},
	}

	for _, model := range dependentModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating dependent model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate dependent model %s: %s", modelType, result.Error)
		}
	}

	// Phase 7: Create final tables that depend on almost everything
	log.Println("Creating final tables...")
	finalModels := []interface{}{
		&models.ProjectApplication{},
		&models.ApplicationQuestion{},
		&models.ApplicationAnswer{},
		&models.ProjectInvitation{},
		&models.ProjectShare{},
		&models.ProjectPostShare{},
	}

	for _, model := range finalModels {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Migrating final model: %s", modelType)
		result := migrateOrRecreateTable(model)
		results = append(results, result)
		if !result.Success {
			log.Printf("Warning: Failed to migrate final model %s: %s", modelType, result.Error)
		}
	}

	// Phase 8: Add foreign key constraints
	log.Println("Adding foreign key constraints...")
	constraintResults := addForeignKeyConstraints()
	results = append(results, constraintResults...)

	// Note: Performance indexes can be added separately using:
	// go run migrate/add_indexes_only.go
	// or by running the SQL script: migrate/add_performance_indexes.sql

	// Check if any tables were created successfully
	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}

	if successCount == 0 {
		return results, fmt.Errorf("no tables were created successfully")
	}

	return results, nil
}

// addForeignKeyConstraints adds all the foreign key constraints after tables are created
func addForeignKeyConstraints() []MigrationResult {
	log.Println("Adding foreign key constraints...")
	var results []MigrationResult

	// Migrate all models again to add foreign key constraints
	models := []interface{}{
		&models.User{},
		&models.Project{},
		&models.ProjectGroup{},
		&models.ProjectGroupMember{},
		&models.ProjectMember{},
		&models.GroupMember{},
		&models.ProjectPost{},
		&models.GenericComment{},
		&models.Interaction{},
		// Block-related models for constraints
		// &models.Block{}, // Removed - no longer using block-based design
		// Block-related models removed - no longer using block-based design
		// &models.BlockPermission{},
		// &models.BlockComment{},
		// &models.DatabaseSchema{},
		// &models.BlockView{},
		// &models.BlockRelation{},
		// &models.BlockTemplate{},
		&models.LearningPath{},
		&models.LearningModule{},
		&models.LearningTask{},
		// Task management models
		&models.Section{},
		&models.Task{},
		&models.Subtask{},
		&models.LearningResource{},
		&models.TaskDependency{},
	}

	for _, model := range models {
		modelType := fmt.Sprintf("%T", model)
		log.Printf("Adding foreign key constraints for: %s", modelType)
		if err := database.DB.AutoMigrate(model); err != nil {
			log.Printf("Warning: Failed to add some foreign key constraints for %s: %v", modelType, err)
			results = append(results, MigrationResult{
				ModelName: modelType + " (constraints)",
				Success:   false,
				Error:     err.Error(),
			})
		} else {
			results = append(results, MigrationResult{
				ModelName: modelType + " (constraints)",
				Success:   true,
			})
		}
	}

	// Create explicit foreign key for specific relationships if needed
	fkResults := createForeignKeysExplicitly()
	results = append(results, fkResults...)

	return results
}

// createForeignKeysExplicitly creates specific foreign keys that may not be handled by AutoMigrate
func createForeignKeysExplicitly() []MigrationResult {
	var results []MigrationResult

	fkDefinitions := []struct {
		tableName       string
		columnName      string
		referenceTable  string
		referenceColumn string
		description     string
	}{
		{"projects", "owner_id", "users", "id", "Project to User (owner)"},
		{"group_members", "user_id", "users", "id", "GroupMember to User"},
		{"group_members", "project_id", "projects", "project_id", "GroupMember to Project"},
		{"project_group_members", "user_id", "users", "id", "ProjectGroupMember to User"},
		{"project_group_members", "project_id", "projects", "project_id", "ProjectGroupMember to Project"},
		{"project_group_members", "group_id", "project_groups", "group_id", "ProjectGroupMember to ProjectGroup"},
		{"blocks", "project_id", "projects", "project_id", "Block to Project"},
		{"blocks", "user_id", "users", "id", "Block to User (creator)"},
		{"block_permissions", "block_id", "blocks", "block_id", "BlockPermission to Block"},
		{"block_comments", "block_id", "blocks", "block_id", "BlockComment to Block"},
		{"project_posts", "project_id", "projects", "project_id", "ProjectPost to Project"},
		{"project_posts", "user_id", "users", "id", "ProjectPost to User"},
		{"project_groups", "project_id", "projects", "project_id", "ProjectGroup to Project"},
		{"project_members", "project_id", "projects", "project_id", "ProjectMember to Project"},
		{"project_members", "user_id", "users", "id", "ProjectMember to User"},
	}

	for _, fk := range fkDefinitions {
		// Check if the table exists before trying to add foreign keys
		tableExists := checkIfTableExists(fk.tableName)
		refTableExists := checkIfTableExists(fk.referenceTable)

		if !tableExists || !refTableExists {
			var reason string
			if !tableExists {
				reason = fmt.Sprintf("Table %s does not exist", fk.tableName)
			} else {
				reason = fmt.Sprintf("Reference table %s does not exist", fk.referenceTable)
			}

			results = append(results, MigrationResult{
				ModelName: fmt.Sprintf("FK: %s", fk.description),
				Success:   false,
				Error:     reason,
			})
			continue
		}

		if err := createForeignKey(fk.tableName, fk.columnName, fk.referenceTable, fk.referenceColumn); err != nil {
			log.Printf("Warning: Failed to create foreign key from %s.%s to %s.%s: %v",
				fk.tableName, fk.columnName, fk.referenceTable, fk.referenceColumn, err)
			results = append(results, MigrationResult{
				ModelName: fmt.Sprintf("FK: %s", fk.description),
				Success:   false,
				Error:     err.Error(),
			})
		} else {
			results = append(results, MigrationResult{
				ModelName: fmt.Sprintf("FK: %s", fk.description),
				Success:   true,
			})
		}
	}

	return results
}

// checkIfTableExists checks if a table exists in the database
func checkIfTableExists(tableName string) bool {
	var count int64
	result := database.DB.Raw(`
		SELECT COUNT(*) 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_name = ?`, tableName).Scan(&count)

	if result.Error != nil {
		log.Printf("Error checking if table %s exists: %v", tableName, result.Error)
		return false
	}

	return count > 0
}

// createForeignKey creates a foreign key constraint between two tables
func createForeignKey(tableName, columnName, referenceTable, referenceColumn string) error {
	constraintName := fmt.Sprintf("fk_%s_%s_%s", tableName, columnName, referenceTable)
	sql := fmt.Sprintf(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = '%s'
				AND table_name = '%s'
			) THEN
				ALTER TABLE %s
				ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s);
			END IF;
		END
		$$;`,
		constraintName, tableName,
		tableName, constraintName, columnName, referenceTable, referenceColumn)

	return database.DB.Exec(sql).Error
}

// migrateOrRecreateTable tries to migrate a table, and if that fails, drops and recreates it
func migrateOrRecreateTable(model interface{}) MigrationResult {
	modelType := fmt.Sprintf("%T", model)
	result := MigrationResult{
		ModelName: modelType,
		Success:   false,
	}

	// Check if table exists
	if database.DB.Migrator().HasTable(model) {
		log.Printf("Table for %s already exists, updating schema", modelType)
	}

	// Try to migrate the table - add table schema to DB
	if err := database.DB.AutoMigrate(model); err != nil {
		log.Printf("Error migrating %s: %v", modelType, err)
		log.Printf("Migration failed but will preserve data. Skipping recreation of %s table.", modelType)

		// Set error in result
		result.Error = err.Error()

		// Try to determine if the model is properly defined
		if strings.Contains(err.Error(), "insufficient arguments") {
			// Create the table instead of using AutoMigrate
			log.Printf("Attempting to create table for %s directly", modelType)
			if err := database.DB.Migrator().CreateTable(model); err != nil {
				result.Error = fmt.Sprintf("Failed to create table: %v", err)
				return result
			}
			result.Success = true
			result.Error = ""
			return result
		}

		if strings.Contains(err.Error(), "no such table") {
			result.Error = "Table does not exist and could not be created. Check model definition."
		} else if strings.Contains(err.Error(), "column") && strings.Contains(err.Error(), "does not exist") {
			result.Error = "Column referenced in model does not exist in table. Check model definition."
		} else if strings.Contains(err.Error(), "already exists") {
			result.Error = "Duplicate column or constraint. Check model definition for duplicates."
		}

		return result
	}

	// Migration successful
	result.Success = true
	return result
}
