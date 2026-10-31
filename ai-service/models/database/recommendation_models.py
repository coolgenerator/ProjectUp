from sqlalchemy import Column, Text, DateTime, func, ARRAY, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from database.connection import Base


class LearningPathRecommendation(Base):
    __tablename__ = 'learning_path_recommendations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True))
    query = Column(Text, nullable=False)
    
    # Recommendation details
    recommended_nodes = Column(ARRAY(UUID(as_uuid=True)))  # Ordered list of node IDs
    recommended_resources = Column(ARRAY(UUID(as_uuid=True)))  # Specific resources
    
    # Scoring
    relevance_scores = Column(JSONB)  # {"node_id": score}
    personalization_score = Column(DECIMAL(3, 2))
    
    # Reasoning
    explanation = Column(Text)  # Why this path was recommended
    alternative_paths = Column(JSONB)  # Other options considered
    
    created_at = Column(DateTime, server_default=func.current_timestamp())
    expires_at = Column(DateTime)  # Cache expiry