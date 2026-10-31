"""
SQLAlchemy models for Projects.
These models map to the PostgreSQL tables created by the backend.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

from database.connection import Base


class Project(Base):
    """Project model - represents a project in the system"""
    __tablename__ = 'projects'

    project_id = Column(Integer, primary_key=True, autoincrement=True)
    sid = Column(String(10), nullable=False, unique=True, index=True)
    owner_id = Column(Integer, nullable=False, index=True)
    slug = Column(String(255), nullable=False)
    cover = Column(String(255))
    project_media_url = Column(JSONB)
    refer_link = Column(String(255))
    communication_app = Column(String(100))
    project_type = Column(String(100))
    title = Column(String(100))
    description = Column(Text)
    topic = Column(JSONB)
    school = Column(String(100))
    class_name = Column('class', String(100))  # 'class' in DB, 'class_name' in Python
    location = Column(String(100))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    hidden = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    status = Column(Integer, nullable=False, default=1)  # 1: Active, 2: Archived, 3: Completed, 4: Deleted
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, index=True)

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.project_id,
            'sid': self.sid,
            'owner_id': self.owner_id,
            'slug': self.slug,
            'cover': self.cover,
            'project_media_url': self.project_media_url,
            'refer_link': self.refer_link,
            'communication_app': self.communication_app,
            'project_type': self.project_type,
            'title': self.title,
            'description': self.description,
            'topic': self.topic,
            'school': self.school,
            'class_name': self.class_name,
            'location': self.location,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'hidden': self.hidden,
            'is_published': self.is_published,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
