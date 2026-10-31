package services

import (
	"projectup/database"
	"projectup/models"
	"gorm.io/gorm"
)

type KnowledgeTreeService struct{
	db *gorm.DB
}

func NewKnowledgeTreeService() *KnowledgeTreeService {
	// Initialize crawler DB connection if not already done
	if database.CrawlerDB == nil {
		database.ConnectToCrawlerDB()
	}
	return &KnowledgeTreeService{
		db: database.GetCrawlerDB(),
	}
}

// getDB returns the appropriate database connection
func (kts *KnowledgeTreeService) getDB() *gorm.DB {
	if kts.db != nil {
		return kts.db
	}
	// Fallback to main DB if crawler DB not available
	return database.DB
}

// Domain operations
func (kts *KnowledgeTreeService) GetAllDomains() ([]models.Domain, error) {
	var domains []models.Domain
	// Use raw query to avoid soft delete issues
	err := kts.getDB().Raw("SELECT * FROM domains ORDER BY name").Scan(&domains).Error
	return domains, err
}

func (kts *KnowledgeTreeService) GetDomainByID(domainID int) (*models.Domain, error) {
	var domain models.Domain
	err := kts.getDB().Raw("SELECT * FROM domains WHERE id = ?", domainID).Scan(&domain).Error
	if err != nil {
		return nil, err
	}
	return &domain, nil
}

// Topic operations
func (kts *KnowledgeTreeService) GetTopicsByDomain(domainID int) ([]models.Topic, error) {
	var topics []models.Topic
	err := kts.getDB().Raw(`
		SELECT * FROM topics 
		WHERE domain_id = ? AND parent_topic_id IS NULL 
		ORDER BY order_index, name
	`, domainID).Scan(&topics).Error
	return topics, err
}

func (kts *KnowledgeTreeService) GetChildTopicsByParent(parentTopicID int) ([]models.Topic, error) {
	var topics []models.Topic
	err := kts.getDB().Raw(`
		SELECT * FROM topics 
		WHERE parent_topic_id = ? 
		ORDER BY order_index, name
	`, parentTopicID).Scan(&topics).Error
	return topics, err
}

func (kts *KnowledgeTreeService) GetTopicWithChildren(topicID int) (*models.Topic, error) {
	var topic models.Topic
	err := kts.getDB().Raw("SELECT * FROM topics WHERE id = ?", topicID).Scan(&topic).Error
	if err != nil {
		return nil, err
	}
	
	// Load children separately
	var children []models.Topic
	err = kts.getDB().Raw(`
		SELECT * FROM topics 
		WHERE parent_topic_id = ? 
		ORDER BY order_index, name
	`, topicID).Scan(&children).Error
	if err == nil {
		topic.Children = children
	}
	
	return &topic, nil
}

// Concept operations
func (kts *KnowledgeTreeService) GetConceptsByTopic(topicID int) ([]models.KnowledgeConcept, error) {
	var concepts []models.KnowledgeConcept
	err := kts.getDB().Raw(`
		SELECT * FROM concepts 
		WHERE topic_id = ? 
		ORDER BY name
	`, topicID).Scan(&concepts).Error
	return concepts, err
}

func (kts *KnowledgeTreeService) GetConceptByID(conceptID int) (*models.KnowledgeConcept, error) {
	var concept models.KnowledgeConcept
	err := kts.getDB().Raw("SELECT * FROM concepts WHERE id = ?", conceptID).Scan(&concept).Error
	if err != nil {
		return nil, err
	}
	return &concept, nil
}

// Resource operations
func (kts *KnowledgeTreeService) GetResourcesByConcept(conceptID int) ([]models.ConceptResource, error) {
	var resources []models.ConceptResource
	err := kts.getDB().Raw(`
		SELECT * FROM concept_resources 
		WHERE concept_id = ? 
		ORDER BY quality_score DESC NULLS LAST, relevance_score DESC NULLS LAST, title
	`, conceptID).Scan(&resources).Error
	return resources, err
}

// Full tree operations
func (kts *KnowledgeTreeService) GetFullTreeByDomain(domainID int) (*models.Domain, error) {
	var domain models.Domain
	
	// First get the domain
	err := kts.getDB().Raw("SELECT * FROM domains WHERE id = ?", domainID).Scan(&domain).Error
	if err != nil {
		return nil, err
	}
	
	// Get all topics for this domain with their hierarchy
	var topics []models.Topic
	err = kts.getDB().Raw(`
		SELECT * FROM topics 
		WHERE domain_id = ? 
		ORDER BY level, order_index, name
	`, domainID).Scan(&topics).Error
	if err != nil {
		return nil, err
	}
	
	// Build topic hierarchy
	topicMap := make(map[int]*models.Topic)
	var rootTopics []models.Topic
	
	for i := range topics {
		topicMap[topics[i].ID] = &topics[i]
		if topics[i].ParentTopicID == nil {
			rootTopics = append(rootTopics, topics[i])
		}
	}
	
	// Attach children to parents
	for i := range topics {
		if topics[i].ParentTopicID != nil {
			parent, exists := topicMap[*topics[i].ParentTopicID]
			if exists {
				parent.Children = append(parent.Children, topics[i])
			}
		}
	}
	
	// Load concepts for each topic
	for _, topic := range topicMap {
		var concepts []models.KnowledgeConcept
		err = kts.getDB().Raw(`
			SELECT * FROM concepts 
			WHERE topic_id = ? 
			ORDER BY name
		`, topic.ID).Scan(&concepts).Error
		if err == nil {
			topic.Concepts = concepts
		}
	}
	
	domain.Topics = rootTopics
	return &domain, nil
}

// Search operations
func (kts *KnowledgeTreeService) SearchConcepts(query string) ([]models.KnowledgeConcept, error) {
	var concepts []models.KnowledgeConcept
	err := kts.getDB().Raw(`
		SELECT * FROM concepts 
		WHERE name ILIKE ? OR description ILIKE ? OR summary ILIKE ?
		LIMIT 50
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%").Scan(&concepts).Error
	return concepts, err
}

func (kts *KnowledgeTreeService) SearchResources(query string) ([]models.ConceptResource, error) {
	var resources []models.ConceptResource
	err := kts.getDB().Raw(`
		SELECT * FROM concept_resources 
		WHERE (title ILIKE ? OR description ILIKE ? OR author ILIKE ?)
		AND is_valid = true
		ORDER BY quality_score DESC NULLS LAST, relevance_score DESC NULLS LAST
		LIMIT 100
	`, "%"+query+"%", "%"+query+"%", "%"+query+"%").Scan(&resources).Error
	return resources, err
}

// Get resources by difficulty
func (kts *KnowledgeTreeService) GetResourcesByDifficulty(difficulty string) ([]models.ConceptResource, error) {
	var resources []models.ConceptResource
	err := kts.getDB().Raw(`
		SELECT * FROM concept_resources 
		WHERE difficulty_level = ?
		AND is_valid = true
		ORDER BY quality_score DESC NULLS LAST, relevance_score DESC NULLS LAST
		LIMIT 100
	`, difficulty).Scan(&resources).Error
	return resources, err
}

// Get free resources
func (kts *KnowledgeTreeService) GetFreeResources() ([]models.ConceptResource, error) {
	var resources []models.ConceptResource
	err := kts.getDB().Raw(`
		SELECT * FROM concept_resources 
		WHERE is_free = true
		AND is_valid = true
		ORDER BY quality_score DESC NULLS LAST, relevance_score DESC NULLS LAST
		LIMIT 100
	`).Scan(&resources).Error
	return resources, err
}