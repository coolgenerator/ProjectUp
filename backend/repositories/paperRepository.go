package repositories

import (
	"encoding/json"
	"errors"
	"projectup/database"
	"projectup/models"
	"time"

	"gorm.io/gorm"
)

// CreatePaper creates a new paper in the database
func CreatePaper(paper *models.Paper) error {
	return database.DB.Create(paper).Error
}

// GetPaperByID retrieves a paper by its ID
func GetPaperByID(paperID string) (*models.Paper, error) {
	var paper models.Paper
	err := database.DB.Where("id = ?", paperID).First(&paper).Error
	if err != nil {
		return nil, err
	}
	return &paper, nil
}

// GetUserPapers retrieves all papers for a user
func GetUserPapers(userID uint) ([]models.Paper, error) {
	var papers []models.Paper
	err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&papers).Error
	return papers, err
}

// UpdatePaper updates a paper's information
func UpdatePaper(paper *models.Paper) error {
	return database.DB.Save(paper).Error
}

// DeletePaper soft deletes a paper
func DeletePaper(paperID string) error {
	return database.DB.Where("id = ?", paperID).Delete(&models.Paper{}).Error
}

// Chat History Repository Functions

// CreateChatHistory creates a new chat history entry
func CreateChatHistory(chatHistory *models.ChatHistory) error {
	return database.DB.Create(chatHistory).Error
}

// GetPaperChatHistory retrieves chat history for a paper
func GetPaperChatHistory(paperID string, userID uint, limit int) ([]models.ChatHistory, error) {
	var chatHistory []models.ChatHistory
	query := database.DB.Where("paper_id = ? AND user_id = ?", paperID, userID).Order("created_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&chatHistory).Error
	return chatHistory, err
}

// Paper Analysis Repository Functions

// CreatePaperAnalysis creates or updates a paper analysis
func CreatePaperAnalysis(analysis *models.PaperAnalysis) error {
	return database.DB.Create(analysis).Error
}

// GetPaperAnalysis retrieves the analysis for a paper
func GetPaperAnalysis(paperID string) (*models.PaperAnalysis, error) {
	var analysis models.PaperAnalysis
	err := database.DB.Where("paper_id = ?", paperID).First(&analysis).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &analysis, nil
}

// UpdatePaperAnalysis updates an existing paper analysis
func UpdatePaperAnalysis(analysis *models.PaperAnalysis) error {
	analysis.UpdatedAt = time.Now()
	return database.DB.Save(analysis).Error
}

// Paper Notes Repository Functions

// CreatePaperNote creates a new note for a paper
func CreatePaperNote(note *models.PaperNote) error {
	return database.DB.Create(note).Error
}

// GetPaperNotes retrieves all notes for a paper
func GetPaperNotes(paperID string, userID uint) ([]models.PaperNote, error) {
	var notes []models.PaperNote
	err := database.DB.Where("paper_id = ? AND user_id = ? AND deleted_at IS NULL", paperID, userID).
		Order("page ASC, created_at DESC").Find(&notes).Error
	return notes, err
}

// GetPaperNotesByPage retrieves notes for a specific page of a paper
func GetPaperNotesByPage(paperID string, userID uint, page int) ([]models.PaperNote, error) {
	var notes []models.PaperNote
	err := database.DB.Where("paper_id = ? AND user_id = ? AND page = ? AND deleted_at IS NULL", 
		paperID, userID, page).Order("created_at DESC").Find(&notes).Error
	return notes, err
}

// UpdatePaperNote updates an existing note
func UpdatePaperNote(note *models.PaperNote) error {
	note.UpdatedAt = time.Now()
	return database.DB.Save(note).Error
}

// DeletePaperNote soft deletes a note
func DeletePaperNote(noteID string) error {
	return database.DB.Where("id = ?", noteID).Delete(&models.PaperNote{}).Error
}

// Paper Outline Cache Repository Functions

// GetPaperOutlineCache retrieves cached outline for a paper
func GetPaperOutlineCache(paperID string) (*models.PaperOutlineCache, error) {
	var cache models.PaperOutlineCache
	err := database.DB.Where("paper_id = ? AND expires_at > ?", paperID, time.Now()).First(&cache).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cache, nil
}

// CreatePaperOutlineCache creates or updates outline cache for a paper
func CreatePaperOutlineCache(cache *models.PaperOutlineCache) error {
	cache.ExpiresAt = time.Now().AddDate(0, 0, 7) // 7 days from now
	
	// Check if cache exists
	var existing models.PaperOutlineCache
	err := database.DB.Where("paper_id = ?", cache.PaperID).First(&existing).Error
	
	if err == nil {
		// Update existing cache
		existing.OutlineData = cache.OutlineData
		existing.ExpiresAt = cache.ExpiresAt
		return database.DB.Save(&existing).Error
	}
	
	// Create new cache
	return database.DB.Create(cache).Error
}

// DeleteExpiredOutlineCache removes expired outline cache entries
func DeleteExpiredOutlineCache() error {
	return database.DB.Where("expires_at < ?", time.Now()).Delete(&models.PaperOutlineCache{}).Error
}

// Paper References Cache Repository Functions

// GetPaperReferencesCache retrieves cached references for a paper
func GetPaperReferencesCache(paperID string) (*models.PaperReferencesCache, error) {
	var cache models.PaperReferencesCache
	err := database.DB.Where("paper_id = ? AND expires_at > ?", paperID, time.Now()).First(&cache).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cache, nil
}

// CreatePaperReferencesCache creates or updates references cache for a paper
func CreatePaperReferencesCache(cache *models.PaperReferencesCache) error {
	cache.ExpiresAt = time.Now().AddDate(0, 0, 7) // 7 days from now
	
	// Check if cache exists
	var existing models.PaperReferencesCache
	err := database.DB.Where("paper_id = ?", cache.PaperID).First(&existing).Error
	
	if err == nil {
		// Update existing cache
		existing.ReferencesData = cache.ReferencesData
		existing.ExpiresAt = cache.ExpiresAt
		return database.DB.Save(&existing).Error
	}
	
	// Create new cache
	return database.DB.Create(cache).Error
}

// DeleteExpiredReferencesCache removes expired references cache entries
func DeleteExpiredReferencesCache() error {
	return database.DB.Where("expires_at < ?", time.Now()).Delete(&models.PaperReferencesCache{}).Error
}

// Paper Annotation Repository Functions

// CreatePaperAnnotation creates a new annotation
func CreatePaperAnnotation(annotation *models.PaperAnnotation) error {
	return database.DB.Create(annotation).Error
}

// GetPaperAnnotations retrieves all annotations for a paper
func GetPaperAnnotations(paperID string, userID uint) ([]models.PaperAnnotation, error) {
	var annotations []models.PaperAnnotation
	err := database.DB.Where("paper_id = ? AND user_id = ? AND deleted_at IS NULL", paperID, userID).
		Order("page ASC, created_at DESC").Find(&annotations).Error
	return annotations, err
}

// UpdatePaperAnnotation updates an existing annotation
func UpdatePaperAnnotation(annotation *models.PaperAnnotation) error {
	return database.DB.Save(annotation).Error
}

// DeletePaperAnnotation soft deletes an annotation
func DeletePaperAnnotation(annotationID uint) error {
	return database.DB.Delete(&models.PaperAnnotation{}, annotationID).Error
}

// Paper Collection Repository Functions

// CreatePaperCollection creates a new paper collection
func CreatePaperCollection(collection *models.PaperCollection) error {
	return database.DB.Create(collection).Error
}

// GetUserPaperCollections retrieves all collections for a user
func GetUserPaperCollections(userID uint) ([]models.PaperCollection, error) {
	var collections []models.PaperCollection
	err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&collections).Error
	return collections, err
}

// AddPaperToCollection adds a paper to a collection
func AddPaperToCollection(collectionID uint, paperID string) error {
	mapping := &models.PaperCollectionMapping{
		CollectionID: collectionID,
		PaperID:      paperID,
		AddedAt:      time.Now(),
	}
	
	// Check if mapping already exists
	var existing models.PaperCollectionMapping
	err := database.DB.Where("collection_id = ? AND paper_id = ?", collectionID, paperID).First(&existing).Error
	if err == nil {
		// Already exists
		return nil
	}
	
	// Create new mapping
	if err := database.DB.Create(mapping).Error; err != nil {
		return err
	}
	
	// Update paper count
	return database.DB.Model(&models.PaperCollection{}).
		Where("id = ?", collectionID).
		Update("paper_count", gorm.Expr("paper_count + ?", 1)).Error
}

// RemovePaperFromCollection removes a paper from a collection
func RemovePaperFromCollection(collectionID uint, paperID string) error {
	result := database.DB.Where("collection_id = ? AND paper_id = ?", collectionID, paperID).
		Delete(&models.PaperCollectionMapping{})
	
	if result.Error != nil {
		return result.Error
	}
	
	if result.RowsAffected > 0 {
		// Update paper count
		return database.DB.Model(&models.PaperCollection{}).
			Where("id = ?", collectionID).
			Update("paper_count", gorm.Expr("paper_count - ?", 1)).Error
	}
	
	return nil
}

// GetCollectionPapers retrieves all papers in a collection
func GetCollectionPapers(collectionID uint) ([]models.Paper, error) {
	var papers []models.Paper
	err := database.DB.
		Joins("JOIN paper_collection_mappings ON papers.id = paper_collection_mappings.paper_id").
		Where("paper_collection_mappings.collection_id = ?", collectionID).
		Find(&papers).Error
	return papers, err
}

// Paper AI Chat Repository Functions

// SaveChatHistory saves a chat interaction for a paper
func SaveChatHistory(userID uint, paperID string, message, response, context string) error {
	chatHistory := &models.ChatHistory{
		UserID:    userID,
		PaperID:   paperID,
		Message:   message,
		Response:  response,
		Context:   context,
		CreatedAt: time.Now(),
	}
	return CreateChatHistory(chatHistory)
}

// GetRecentChatHistory retrieves recent chat history for context
func GetRecentChatHistory(paperID string, userID uint, limit int) ([]models.ChatHistory, error) {
	return GetPaperChatHistory(paperID, userID, limit)
}

// Paper AI Analysis Repository Functions

// SavePaperAnalysis saves or updates AI analysis for a paper
func SavePaperAnalysis(paperID string, userID uint, analysisData interface{}) error {
	jsonData, err := json.Marshal(analysisData)
	if err != nil {
		return err
	}
	
	// Check if analysis exists
	existing, err := GetPaperAnalysis(paperID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	
	if existing != nil {
		// Update existing analysis
		existing.AnalysisData = string(jsonData)
		return UpdatePaperAnalysis(existing)
	}
	
	// Create new analysis
	analysis := &models.PaperAnalysis{
		PaperID:      paperID,
		UserID:       userID,
		AnalysisData: string(jsonData),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	return CreatePaperAnalysis(analysis)
}

// GetPaperAnalysisData retrieves and unmarshals paper analysis
func GetPaperAnalysisData(paperID string) (map[string]interface{}, error) {
	analysis, err := GetPaperAnalysis(paperID)
	if err != nil {
		return nil, err
	}
	
	if analysis == nil {
		return nil, nil
	}
	
	var data map[string]interface{}
	err = json.Unmarshal([]byte(analysis.AnalysisData), &data)
	if err != nil {
		return nil, err
	}
	
	return data, nil
}

// Paper AI Notes Functions

// CreateAINoteFromChat creates a note from a chat response
func CreateAINoteFromChat(paperID string, userID uint, content string, page int, noteType string) error {
	note := &models.PaperNote{
		PaperID:   paperID,
		UserID:    userID,
		Content:   content,
		Page:      page,
		Type:      noteType,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	return CreatePaperNote(note)
}

// SearchPaperNotes searches notes by content
func SearchPaperNotes(paperID string, userID uint, searchTerm string) ([]models.PaperNote, error) {
	var notes []models.PaperNote
	err := database.DB.Where("paper_id = ? AND user_id = ? AND deleted_at IS NULL AND content ILIKE ?", 
		paperID, userID, "%"+searchTerm+"%").
		Order("created_at DESC").Find(&notes).Error
	return notes, err
}

// Paper Outline Cache Functions

// SavePaperOutline saves generated outline to cache
func SavePaperOutline(paperID string, outlineData interface{}) error {
	jsonData, err := json.Marshal(outlineData)
	if err != nil {
		return err
	}
	
	cache := &models.PaperOutlineCache{
		PaperID:     paperID,
		OutlineData: string(jsonData),
		CreatedAt:   time.Now(),
	}
	return CreatePaperOutlineCache(cache)
}

// GetPaperOutline retrieves and unmarshals paper outline from cache
func GetPaperOutline(paperID string) (map[string]interface{}, error) {
	cache, err := GetPaperOutlineCache(paperID)
	if err != nil {
		return nil, err
	}
	
	if cache == nil {
		return nil, nil
	}
	
	var data map[string]interface{}
	err = json.Unmarshal([]byte(cache.OutlineData), &data)
	if err != nil {
		return nil, err
	}
	
	return data, nil
}

// Paper References Cache Functions

// SavePaperReferences saves extracted references to cache
func SavePaperReferences(paperID string, referencesData interface{}) error {
	jsonData, err := json.Marshal(referencesData)
	if err != nil {
		return err
	}
	
	cache := &models.PaperReferencesCache{
		PaperID:        paperID,
		ReferencesData: string(jsonData),
		CreatedAt:      time.Now(),
	}
	return CreatePaperReferencesCache(cache)
}

// GetPaperReferences retrieves and unmarshals paper references from cache
func GetPaperReferences(paperID string) ([]map[string]interface{}, error) {
	cache, err := GetPaperReferencesCache(paperID)
	if err != nil {
		return nil, err
	}
	
	if cache == nil {
		return nil, nil
	}
	
	var data []map[string]interface{}
	err = json.Unmarshal([]byte(cache.ReferencesData), &data)
	if err != nil {
		return nil, err
	}
	
	return data, nil
}

// Batch Operations

// GetUserPapersWithAnalysis retrieves user papers with their analysis status
func GetUserPapersWithAnalysis(userID uint) ([]map[string]interface{}, error) {
	var papers []models.Paper
	err := database.DB.Where("user_id = ?", userID).Find(&papers).Error
	if err != nil {
		return nil, err
	}
	
	result := make([]map[string]interface{}, 0, len(papers))
	for _, paper := range papers {
		paperData := map[string]interface{}{
			"paper": paper,
		}
		
		// Check if analysis exists
		analysis, _ := GetPaperAnalysis(paper.ID)
		paperData["has_analysis"] = analysis != nil
		
		// Check if outline cache exists
		outline, _ := GetPaperOutlineCache(paper.ID)
		paperData["has_outline"] = outline != nil
		
		result = append(result, paperData)
	}
	
	return result, nil
}

// CleanupExpiredCaches removes all expired cache entries
func CleanupExpiredCaches() error {
	if err := DeleteExpiredOutlineCache(); err != nil {
		return err
	}
	return DeleteExpiredReferencesCache()
}

// GetPaperStats retrieves statistics for a paper
func GetPaperStats(paperID string, userID uint) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Count notes
	var noteCount int64
	err := database.DB.Model(&models.PaperNote{}).
		Where("paper_id = ? AND user_id = ? AND deleted_at IS NULL", paperID, userID).
		Count(&noteCount).Error
	if err != nil {
		return nil, err
	}
	stats["note_count"] = noteCount
	
	// Count annotations
	var annotationCount int64
	err = database.DB.Model(&models.PaperAnnotation{}).
		Where("paper_id = ? AND user_id = ? AND deleted_at IS NULL", paperID, userID).
		Count(&annotationCount).Error
	if err != nil {
		return nil, err
	}
	stats["annotation_count"] = annotationCount
	
	// Count chat messages
	var chatCount int64
	err = database.DB.Model(&models.ChatHistory{}).
		Where("paper_id = ? AND user_id = ?", paperID, userID).
		Count(&chatCount).Error
	if err != nil {
		return nil, err
	}
	stats["chat_count"] = chatCount
	
	// Check if analysis exists
	analysis, _ := GetPaperAnalysis(paperID)
	stats["has_analysis"] = analysis != nil
	
	return stats, nil
}