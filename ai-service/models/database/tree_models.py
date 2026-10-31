"""
SQLAlchemy models for Tree Sessions and Idea Nodes.
These models map to the PostgreSQL tables created by the backend.
"""

from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, deferred
from datetime import datetime
import uuid

from pgvector.sqlalchemy import Vector
from database.connection import Base


class IdeaForest(Base):
    """Idea Forest model - represents a project's collection of idea trees (one forest per project)"""
    __tablename__ = 'idea_forests'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_sid = Column(String(10), nullable=False, unique=True, index=True)  # One forest per project (references projects.sid)

    # Forest properties
    name = Column(String(255), nullable=False, default="Idea Forest")
    description = Column(Text)

    # Metrics (cached)
    trees_count = Column(Integer, default=0)
    total_nodes_count = Column(Integer, default=0)

    # Audit fields
    created_by = Column(Integer, nullable=False)
    updated_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, index=True)

    # Relationships
    trees = relationship("IdeaTree", back_populates="forest", foreign_keys="IdeaTree.forest_id", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'project_sid': self.project_sid,
            'name': self.name,
            'description': self.description,
            'trees_count': self.trees_count,
            'total_nodes_count': self.total_nodes_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IdeaTree(Base):
    """Idea Tree model - represents a workspace/collection for organizing related idea nodes"""
    __tablename__ = 'idea_trees'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    forest_id = Column(UUID(as_uuid=True), ForeignKey('idea_forests.id', ondelete='CASCADE'), nullable=False, index=True)
    project_sid = Column(String(255), nullable=False, index=True)  # Maps to DB column 'project_sid'

    # Session properties
    name = Column(String(255), nullable=False)
    description = Column(Text)
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)

    # Session metadata
    purpose = Column(Text)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    tags = Column(ARRAY(Text))

    # Metrics (cached)
    nodes_count = Column(Integer, default=0)
    connections_count = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)

    # AI Integration
    ai_context = Column(JSONB)

    # Audit fields
    created_by = Column(Integer, nullable=False)
    updated_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, index=True)

    # Relationships
    forest = relationship("IdeaForest", back_populates="trees", foreign_keys=[forest_id])
    # nodes = relationship("IdeaNode", back_populates="session", foreign_keys="IdeaNode.session_id")  # Disabled - session_id not in production DB yet

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'forest_id': str(self.forest_id),
            'project_sid': self.project_sid,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'icon': self.icon,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'purpose': self.purpose,
            'nodes_count': self.nodes_count,
            'connections_count': self.connections_count,
            'completion_rate': self.completion_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IdeaNode(Base):
    """Idea Node model - represents a node in the idea tree"""
    __tablename__ = 'idea_nodes'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_sid = Column(String(255), nullable=False, index=True)  # Maps to DB column 'project_sid'
    session_id = Column(UUID(as_uuid=True), index=True)  # Groups nodes by "tree session"
    parent_id = Column(UUID(as_uuid=True), ForeignKey('idea_nodes.id'), index=True)

    # Node properties
    title = Column(String(255), nullable=False)
    summary = Column(Text)  # Short 1-2 sentence summary (for cards/previews)
    description = Column(Text)  # Full detailed content
    position = Column(JSONB)  # {x: number, y: number}
    is_root = Column(Boolean, default=False)

    # Visual properties
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    expanded = Column(Boolean, default=True)

    # Metrics
    sub_ideas_count = Column(Integer, default=0)
    actions_count = Column(Integer, default=0)
    threads_count = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)

    # AI Integration
    ai_generated = Column(Boolean, default=False)
    ai_suggestions = Column(JSONB)

    # Semantic Search - embedding for title + description
    # NOTE: Column doesn't exist in production DB yet - commented out until migration is run
    # embedding = deferred(Column(Vector(768), nullable=True, default=None))  # Deferred - pgvector extension may not be installed

    # Metadata
    tags = Column(ARRAY(Text))
    node_metadata = Column('metadata', JSONB)  # Use 'metadata' in DB, 'node_metadata' in Python
    created_by = Column(Integer, nullable=False)
    updated_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, index=True)

    # Relationships
    parent = relationship("IdeaNode", remote_side=[id], backref="children", foreign_keys=[parent_id])

    def to_dict(self):
        """Convert model to dictionary"""
        from sqlalchemy import inspect

        # Get the state of the instance to check which attributes are loaded
        state = inspect(self)

        result = {
            'id': str(self.id),
            'project_sid': self.project_sid,
            'session_id': str(self.session_id) if self.session_id else None,
            'parent_id': str(self.parent_id) if self.parent_id else None,
            'title': self.title,
            'summary': self.summary,  # Short summary for cards/previews
            'description': self.description,  # Full detailed content
            'position': self.position,
            'is_root': self.is_root,
            'color': self.color,
            'icon': self.icon,
            'expanded': self.expanded,
            'sub_ideas_count': self.sub_ideas_count,
            'actions_count': self.actions_count,
            'threads_count': self.threads_count,
            'completion_rate': self.completion_rate,
            'ai_generated': self.ai_generated,
            'tags': self.tags,
            'metadata': self.node_metadata,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        return result


class NodeConnection(Base):
    """Node Connection model - represents connections between nodes"""
    __tablename__ = 'node_connections'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_sid = Column(String(10), nullable=False, index=True)  # References projects.sid
    from_node_id = Column(UUID(as_uuid=True), ForeignKey('idea_nodes.id'), nullable=False, index=True)
    to_node_id = Column(UUID(as_uuid=True), ForeignKey('idea_nodes.id'), nullable=False, index=True)

    # Connection properties
    connection_type = Column(String(50))  # dependency, related, blocks
    label = Column(String(255))
    is_active = Column(Boolean, default=True)
    style = Column(JSONB)  # Line style properties

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    from_node = relationship("IdeaNode", foreign_keys=[from_node_id])
    to_node = relationship("IdeaNode", foreign_keys=[to_node_id])

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'project_sid': self.project_sid,
            'from_node_id': str(self.from_node_id),
            'to_node_id': str(self.to_node_id),
            'connection_type': self.connection_type,
            'label': self.label,
            'is_active': self.is_active,
            'style': self.style,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# Indexes for better query performance
Index('idx_idea_nodes_project_session', 'project_sid', 'session_id')  # Composite index for faster queries
Index('idx_idea_nodes_parent', 'parent_id')
Index('idx_idea_trees_project_sid', 'project_sid')
