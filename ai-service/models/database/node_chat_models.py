"""
Database models for Node Chat Sessions and Versioning
Stores chat sessions and version history for idea tree nodes
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database.connection import Base


class NodeChatSession(Base):
    """
    Represents a chat session for refining a specific node
    Supports conversation branching - multiple conversation paths from same point

    Branching structure:
    - Main session: parent_session_id = None, branch_name = 'main'
    - Branch sessions: parent_session_id = UUID, branch_name = 'branch-1', 'branch-2', etc.
    - branch_point_index: Message index in parent where this branch diverged
    """
    __tablename__ = "node_chat_sessions"

    # NOTE: Removed unique constraint to allow multiple active sessions per node (for branching)
    # Old constraint prevented conversation branching
    __table_args__ = (
        Index('idx_node_chat_sessions_node_active', 'node_id', 'is_active'),
        Index('idx_node_chat_sessions_parent', 'parent_session_id'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Reference to IdeaNode in backend
    project_id = Column(String(50), nullable=False, index=True)  # Project UUID string

    # Branching support - NEW FIELDS
    parent_session_id = Column(UUID(as_uuid=True), ForeignKey('node_chat_sessions.id'), nullable=True, index=True)
    parent_session = relationship("NodeChatSession", remote_side=[id], backref="child_sessions")
    branch_name = Column(String(100), default='main', nullable=False)  # 'main', 'branch-1', 'branch-2'
    branch_point_index = Column(Integer, nullable=True)  # Message index in parent where branch occurred
    branch_display_name = Column(String(255), nullable=True)  # User-friendly name

    # Hierarchical version numbering
    version_number = Column(String(50), default='1', nullable=False)  # '1', '2', '2.1', '2.1.1', etc.
    parent_version_number = Column(String(50), nullable=True)  # Version number of the parent branch

    # Session properties
    title = Column(String(255), default="Refine Node Content")
    is_active = Column(Boolean, default=True, index=True)

    # AI conversation history - stored as JSON array of {role, content, timestamp}
    # DEPRECATED: Use message_records relationship instead for new code
    # Kept for backward compatibility during migration
    messages = Column(JSON, default=list, nullable=False)

    # NEW: Relationship to individual message records (replaces JSON array)
    message_records = relationship(
        "NodeChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="NodeChatMessage.message_index"
    )

    # Context for AI - stores tree context, parent/children info, etc.
    context = Column(JSON, default=dict, nullable=False)

    # Session metadata
    message_count = Column(Integer, default=0)
    last_message_at = Column(DateTime, nullable=True)

    # Current conclusion from the chat (final refined context)
    # This is what gets displayed on the node in the tree canvas
    conclusion = Column(Text, nullable=True)
    conclusion_updated_at = Column(DateTime, nullable=True)

    # User who created this session
    created_by = Column(Integer, nullable=False)

    # MULTI-USER SUPPORT: Collaborative chat features
    # participant_user_ids: Array of user IDs who have access to this chat
    # Default to [created_by] for backward compatibility
    participant_user_ids = Column(ARRAY(Integer), nullable=True, default=list)

    # is_collaborative: Whether this chat allows multiple users to participate
    # True = multi-user collaborative chat
    # False = single-user chat (original behavior)
    is_collaborative = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'node_id': str(self.node_id),
            'project_id': self.project_id,
            'parent_session_id': str(self.parent_session_id) if self.parent_session_id else None,
            'branch_name': self.branch_name,
            'branch_point_index': self.branch_point_index,
            'branch_display_name': self.branch_display_name,
            'title': self.title,
            'is_active': self.is_active,
            'messages': self.messages,
            'context': self.context,
            'message_count': self.message_count,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'conclusion': self.conclusion,
            'conclusion_updated_at': self.conclusion_updated_at.isoformat() if self.conclusion_updated_at else None,
            'created_by': self.created_by,
            'participant_user_ids': self.participant_user_ids or [],  # MULTI-USER: Include participants
            'is_collaborative': self.is_collaborative,  # MULTI-USER: Include collaborative flag
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<NodeChatSession(id={self.id}, node_id={self.node_id}, branch={self.branch_name}, active={self.is_active})>"


# Import NodeChatMessage for relationship to work
from models.database.node_chat_message_models import NodeChatMessage

# Export models for easy import
__all__ = ['NodeChatSession']
