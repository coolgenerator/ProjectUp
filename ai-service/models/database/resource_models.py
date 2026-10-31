"""
Placeholder for resource interaction models
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from database.connection import Base


class ResourceInteraction(Base):
    """Model for tracking user interactions with resources"""
    __tablename__ = 'resource_interactions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True))
    user_id = Column(UUID(as_uuid=True))
    interaction_type = Column(String(50))  # 'view', 'complete', 'bookmark', etc.
    rating = Column(Float)
    completion_time = Column(Integer)  # in minutes
    created_at = Column(DateTime, server_default=func.current_timestamp())