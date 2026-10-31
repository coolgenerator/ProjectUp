"""
Placeholder for CrawlJob model
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from database.connection import Base


class CrawlJob(Base):
    """Model for tracking crawl jobs"""
    __tablename__ = 'crawl_jobs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey('sources.id'))
    status = Column(String(50), default='pending')
    job_type = Column(String(50), default='crawl')
    config = Column(JSONB)
    result = Column(JSONB)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    source = relationship("Source", back_populates="crawl_jobs")