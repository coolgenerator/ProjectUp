"""
SQLAlchemy model for Milestones.
These models map to the PostgreSQL milestones table created by the backend.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

from database.connection import Base


class Milestone(Base):
    """Milestone model - represents a project milestone"""
    __tablename__ = 'milestones'

    milestone_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey('milestones.milestone_id'), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime)
    status = Column(String(50))
    priority = Column(Integer)
    category = Column(String(100))
    completed = Column(Boolean, default=False)
    sort_order = Column(Integer)
    custom_attributes = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, index=True)

    # For compatibility with old code that uses 'target_date'
    @property
    def target_date(self):
        """Alias for due_date"""
        return self.due_date

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.milestone_id,
            'project_id': self.project_id,
            'parent_id': self.parent_id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'target_date': self.due_date.isoformat() if self.due_date else None,  # Alias
            'status': self.status,
            'priority': self.priority,
            'category': self.category,
            'completed': self.completed,
            'sort_order': self.sort_order,
            'custom_attributes': self.custom_attributes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
