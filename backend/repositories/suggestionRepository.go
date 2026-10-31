package repositories

// COMMENTED OUT: Using UserSkill and UserInterest models directly instead of concept-based suggestions
/*
import (
	"log"
	"projectup/database"
	"strconv"
	"strings"
)
*/

/*
// ConceptSuggestion represents a suggestion returned from the API
type ConceptSuggestion struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	CategoryID uint   `json:"category_id"`
	Popularity int    `json:"popularity"`
}

// CategoryWithConcepts represents a category with its associated concepts
type CategoryWithConcepts struct {
	Category string              `json:"category"`
	Concepts []ConceptSuggestion `json:"concepts"`
}
*/

/*
// GetConceptSuggestions returns concept suggestions based on the query string
func GetConceptSuggestions(query string, conceptType string, limitStr string) ([]ConceptSuggestion, error) {
	var suggestions []ConceptSuggestion

	// Parse limit
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10 // Default limit
	}

	// Sanitize the search query to prevent SQL injection
	query = strings.ToLower(strings.TrimSpace(query))
	query = "%" + query + "%"

	db := database.DB

	// Get concepts that match the query from user_concepts table
	err = db.Table("user_concepts").
		Select("id, name, category_id, popularity").
		Where("LOWER(name) LIKE ?", query).
		Group("name").
		Order("count DESC").
		Limit(limit).
		Scan(&suggestions).Error

	if err != nil {
		log.Printf("Error fetching suggestions: %v", err)
		return nil, err
	}

	return suggestions, nil
}
*/

/*
// GetPopularConcepts returns the most popular concepts
func GetPopularConcepts(conceptType string, limitStr string) ([]ConceptSuggestion, error) {
	var popular []ConceptSuggestion

	// Parse limit
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 20 // Default limit
	}

	db := database.DB

	// Get popular concepts from user_concepts table
	query := db.Table("user_concepts").
		Select("user_concepts.id, user_concepts.name, user_concepts.category_id, user_concepts.popularity")

	if conceptType == "skill" {
		// Get concepts used as skills
		query = query.Joins("JOIN user_skills ON user_skills.concept_id = user_concepts.id")
	} else if conceptType == "interest" {
		// Get concepts used as interests
		query = query.Joins("JOIN user_interests ON user_interests.concept_id = user_concepts.id")
	}

	err = query.Group("user_concepts.id").
		Order("user_concepts.popularity DESC, COUNT(*) DESC").
		Limit(limit).
		Scan(&popular).Error

	if err != nil {
		log.Printf("Error fetching popular items: %v", err)
		return nil, err
	}

	return popular, nil
}

// CategoryWithItems represents a category with its associated items
type CategoryWithItems struct {
	Category string       `json:"category"`
	Items    []Suggestion `json:"items"`
}

// GetCategorizedConcepts returns items organized by first letter
func GetCategorizedConcepts(conceptType string) ([]CategoryWithItems, error) {
	var result []CategoryWithItems

	db := database.DB

	tableName := "user_skills"
	if conceptType == "interest" {
		tableName = "user_interests"
	}

	// Get all unique items with their counts
	var allItems []Suggestion
	if err := db.Table(tableName).
		Select("name, COUNT(*) as count").
		Group("name").
		Order("name ASC").
		Scan(&allItems).Error; err != nil {
		log.Printf("Error fetching items: %v", err)
		return nil, err
	}

	// For each category, get associated concepts
	for _, category := range categories {
		var concepts []ConceptSuggestion

		query := db.Table("user_concepts").
			Select("user_concepts.id, user_concepts.name, user_concepts.category_id, user_concepts.popularity").
			Where("category_id = ?", category.ID)

		if conceptType == "skill" {
			// Filter by concepts used as skills
			query = query.Joins("JOIN user_skills ON user_skills.concept_id = user_concepts.id")
		} else if conceptType == "interest" {
			// Filter by concepts used as interests
			query = query.Joins("JOIN user_interests ON user_interests.concept_id = user_concepts.id")
		}

		if err := query.Group("user_concepts.id").
			Order("user_concepts.popularity DESC").
			Find(&concepts).Error; err != nil {
			log.Printf("Error fetching concepts for category %d: %v", category.ID, err)
			continue // Skip this category and continue with others
		}

		// Only add categories that have concepts
		if len(concepts) > 0 {
			result = append(result, CategoryWithConcepts{
				Category: category.Name,
				Concepts: concepts,
			})
		}
	}

	return result, nil
}

// GetSimilarConcepts returns concepts similar to the given concept
func GetSimilarConcepts(conceptID uint, limit int) ([]ConceptSuggestion, error) {
	var similar []ConceptSuggestion
	var concept models.UserConcept

	db := database.DB

	// First get the concept
	if err := db.First(&concept, conceptID).Error; err != nil {
		return nil, fmt.Errorf("concept not found: %w", err)
	}

	// Get similar concepts in the same category
	if err := db.Table("user_concepts").
		Select("id, name, category_id, popularity").
		Where("category_id = ? AND id != ?", concept.CategoryID, conceptID).
		Order("popularity DESC").
		Limit(limit).
		Find(&similar).Error; err != nil {
		return nil, err
	}

	return similar, nil
}
*/
