package services

import (
	"errors"
	"projectup/models"
	"projectup/repositories"
)

// SectionService handles business logic for sections
type SectionService struct {
	repo *repositories.SectionRepository
}

// NewSectionService creates a new SectionService
func NewSectionService(repo *repositories.SectionRepository) *SectionService {
	return &SectionService{repo: repo}
}

// CreateSection creates a new section
func (s *SectionService) CreateSection(section *models.Section) error {
	// Get the next order value for this project
	maxOrder, err := s.repo.GetMaxOrderForProject(section.ProjectID)
	if err != nil {
		return err
	}
	section.Order = maxOrder + 1

	return s.repo.CreateSection(section)
}

// GetSection retrieves a section by ID
func (s *SectionService) GetSection(id int) (*models.Section, error) {
	return s.repo.GetSectionByID(id)
}

// GetProjectSections retrieves all sections for a project
func (s *SectionService) GetProjectSections(projectID string) ([]models.Section, error) {
	return s.repo.GetSectionsByProjectID(projectID)
}

// UpdateSection updates a section
func (s *SectionService) UpdateSection(id int, updates map[string]interface{}) error {
	// Check if section exists
	_, err := s.repo.GetSectionByID(id)
	if err != nil {
		return errors.New("section not found")
	}

	return s.repo.UpdateSection(id, updates)
}

// DeleteSection deletes a section
func (s *SectionService) DeleteSection(id int) error {
	return s.repo.DeleteSection(id)
}

// ReorderSections updates the order of sections
func (s *SectionService) ReorderSections(sectionOrders map[int]int) error {
	return s.repo.ReorderSections(sectionOrders)
}
