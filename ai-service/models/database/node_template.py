"""
Node Template Database Models

SQLAlchemy models for node templates with embedding support.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from database.connection import Base


class NodeTemplate(Base):
    """
    Node template model with embeddings for semantic search.

    Stores reusable node templates categorized by business domain.
    """
    __tablename__ = "node_templates"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True, index=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    prompt = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    priority = Column(Integer, default=2)
    tags = Column(ARRAY(Text), nullable=True)
    template_metadata = Column(JSONB, default={})
    embedding = Column(Vector(768), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "subcategory": self.subcategory,
            "icon": self.icon,
            "color": self.color,
            "prompt": self.prompt,
            "rationale": self.rationale,
            "priority": self.priority,
            "tags": self.tags,
            "metadata": self.template_metadata,
            "usage_count": self.usage_count,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TemplateCategory(Base):
    """
    Template category model for hierarchical organization.

    Supports parent-child relationships for nested categories.
    """
    __tablename__ = "template_categories"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(String(255), ForeignKey("template_categories.id", ondelete="CASCADE"), nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "parent_id": self.parent_id,
            "icon": self.icon,
            "color": self.color,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TemplateUsageLog(Base):
    """
    Template usage log for analytics.

    Tracks when and how templates are used.
    """
    __tablename__ = "template_usage_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(String(255), ForeignKey("node_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    user_id = Column(String(255), nullable=True)
    node_id = Column(String(255), nullable=True)
    context = Column(JSONB, default={})
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "template_id": self.template_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "node_id": self.node_id,
            "context": self.context,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
