package repositories

import (
	"projectup/models"

	"gorm.io/gorm"
)

// SectionRepository handles database operations for sections
type SectionRepository struct {
	db *gorm.DB
}

// NewSectionRepository creates a new SectionRepository
func NewSectionRepository(db *gorm.DB) *SectionRepository {
	return &SectionRepository{db: db}
}

// CreateSection creates a new section
func (r *SectionRepository) CreateSection(section *models.Section) error {
	return r.db.Create(section).Error
}

// GetSectionByID retrieves a section by ID
func (r *SectionRepository) GetSectionByID(id int) (*models.Section, error) {
	var section models.Section
	err := r.db.Where("id = ?", id).First(&section).Error
	if err != nil {
		return nil, err
	}
	return &section, nil
}

// GetSectionsByProjectID retrieves all sections for a project
func (r *SectionRepository) GetSectionsByProjectID(projectID string) ([]models.Section, error) {
	var sections []models.Section
	err := r.db.Where("project_id = ?", projectID).Order("\"order\" ASC").Find(&sections).Error
	return sections, err
}

// UpdateSection updates a section
func (r *SectionRepository) UpdateSection(id int, updates map[string]interface{}) error {
	return r.db.Model(&models.Section{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteSection soft deletes a section
func (r *SectionRepository) DeleteSection(id int) error {
	return r.db.Where("id = ?", id).Delete(&models.Section{}).Error
}

// ReorderSections updates the order of sections
func (r *SectionRepository) ReorderSections(sectionOrders map[int]int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for sectionID, order := range sectionOrders {
			if err := tx.Model(&models.Section{}).Where("id = ?", sectionID).Update("\"order\"", order).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetMaxOrderForProject returns the highest order value for sections in a project
func (r *SectionRepository) GetMaxOrderForProject(projectID string) (int, error) {
	var maxOrder int
	err := r.db.Model(&models.Section{}).
		Where("project_id = ?", projectID).
		Select("COALESCE(MAX(\"order\"), -1)").
		Scan(&maxOrder).Error
	return maxOrder, err
}
