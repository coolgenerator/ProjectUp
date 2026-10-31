"""
Database models for Node Chat Messages
Separates messages from sessions for better performance and scalability
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database.connection import Base


class NodeChatMessage(Base):
    """
    Individual message in a node chat session
    Replaces the JSON array in NodeChatSession for better performance

    Benefits of separate table:
    - Pagination support (load only recent messages)
    - Efficient querying and indexing
    - Better scalability for long conversations
    - Individual message operations (edit, delete, react)
    """
    __tablename__ = "node_chat_messages"

    # Composite index for efficient pagination queries
    __table_args__ = (
        Index('idx_node_chat_messages_session_timestamp', 'session_id', 'created_at'),
        Index('idx_node_chat_messages_session_index', 'session_id', 'message_index'),
    )

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to session
    session_id = Column(UUID(as_uuid=True), ForeignKey('node_chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)

    # Message position in conversation (0-indexed)
    message_index = Column(Integer, nullable=False)

    # Message content
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=False)

    # MULTI-USER SUPPORT: Track which user sent this message
    # Nullable for backward compatibility with existing messages
    # NULL for assistant/system/tool messages
    user_id = Column(Integer, nullable=True, index=True)  # Reference to user in backend DB

    # Optional: Tool use information for assistant messages
    tool_use = Column(JSON, nullable=True)  # Stores tool calls made by assistant

    # Optional: Attachments/files associated with message
    attachments = Column(JSON, default=list, nullable=False)  # List of file metadata

    # Optional: AI-generated suggestions for follow-up actions
    suggestions = Column(JSON, nullable=True)  # List of suggestion objects

    # Message metadata
    token_count = Column(Integer, nullable=True)  # Tokens used by this message
    model_used = Column(String(100), nullable=True)  # AI model version used
    reasoning_enabled = Column(String(20), nullable=True)  # 'enabled', 'disabled', null

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship back to session
    session = relationship("NodeChatSession", back_populates="message_records")

    def to_dict(self):
        """Convert message to dictionary format"""
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'message_index': self.message_index,
            'role': self.role,
            'content': self.content,
            'user_id': self.user_id,  # MULTI-USER: Include sender ID
            'tool_use': self.tool_use,
            'attachments': self.attachments,
            'suggestions': self.suggestions,  # Include AI-generated suggestions
            'token_count': self.token_count,
            'model_used': self.model_used,
            'reasoning_enabled': self.reasoning_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_chat_format(self):
        """Convert to simple chat format for AI context"""
        return {
            'role': self.role,
            'content': self.content
        }

    def __repr__(self):
        return f"<NodeChatMessage(id={self.id}, session={self.session_id}, role={self.role}, index={self.message_index})>"


# Export model
__all__ = ['NodeChatMessage']
