"""
Branching Version Control Models for IdeaNode

Supports Git-like branching where:
- Each chat session can create multiple option branches (Option A, Option B)
- Each branch can have multiple versions
- Versions can be compared, merged, or adopted
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database.connection import Base


class NodeVersion(Base):
    """
    Git-like version control for node content with branching support.

    Structure:
    - Main branch: version_number sequence (1, 2, 3...)
    - Feature branches: branch_name + version_number (option_a.1, option_a.2, option_b.1...)
    - Parent-child: parent_version_id creates branching tree

    Example tree:
    v1 (main)
      ├─> v2 (main) ─> v3 (main, current)
      └─> v2-option_a.1 ─> v2-option_a.2 (chat branch A)
          └─> v2-option_b.1 (chat branch B)
    """
    __tablename__ = 'node_versions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Version identity (supports branching)
    version_number = Column(Integer, nullable=False)  # Sequential number within branch
    branch_name = Column(String(100), default='main', nullable=False)  # 'main', 'option_a', 'option_b', 'experiment_1'
    full_version = Column(String(150), nullable=False)  # Computed: 'main.3', 'option_a.2', 'option_b.1'

    # Branching structure
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey('node_versions.id'), index=True)  # Where this branched from
    parent_version = relationship("NodeVersion", remote_side=[id], backref="child_versions")

    # Status
    is_current = Column(Boolean, default=False, index=True)  # Only one version per branch can be current
    is_archived = Column(Boolean, default=False)  # Mark old versions as archived

    # Content snapshot (ALL fields from IdeaNode)
    title = Column(String(255), nullable=False)
    summary = Column(Text)
    content = Column(Text)
    tags = Column(ARRAY(Text))
    node_metadata = Column('metadata', JSONB)

    # Version metadata
    change_description = Column(Text)  # Human-readable description of changes
    change_type = Column(String(50))  # 'manual_edit', 'ai_refinement', 'chat_conclusion', 'branch_creation', 'merge'
    changed_fields = Column(ARRAY(Text))  # ['summary', 'content', 'tags']

    # Chat context (if created from chat)
    chat_session_id = Column(UUID(as_uuid=True), ForeignKey('node_chat_sessions.id'), index=True)
    chat_session = relationship("NodeChatSession", backref="versions")

    # Comparison metadata (for merge decisions)
    diff_summary = Column(JSONB)  # {'added_chars': 150, 'removed_chars': 50, 'similarity': 0.85}

    # Audit
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'node_id': str(self.node_id),
            'version_number': self.version_number,
            'branch_name': self.branch_name,
            'full_version': self.full_version,
            'parent_version_id': str(self.parent_version_id) if self.parent_version_id else None,
            'is_current': self.is_current,
            'is_archived': self.is_archived,
            'title': self.title,
            'summary': self.summary,
            'content': self.content,
            'tags': self.tags,
            'metadata': self.node_metadata,
            'change_description': self.change_description,
            'change_type': self.change_type,
            'changed_fields': self.changed_fields,
            'chat_session_id': str(self.chat_session_id) if self.chat_session_id else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ChatBranch(Base):
    """
    Represents a chat-based exploration branch.

    Tracks the context and purpose of a branching exploration.
    Links multiple versions created during a chat session.
    """
    __tablename__ = 'chat_branches'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    branch_name = Column(String(100), nullable=False)  # 'option_a', 'option_b', etc.

    # Branch metadata
    display_name = Column(String(255))  # User-friendly name: "Explore microservices approach"
    description = Column(Text)  # What this branch explores
    prompt = Column(Text)  # Original prompt that created this branch

    # Parent context
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey('node_versions.id'))
    parent_version = relationship("NodeVersion", foreign_keys=[parent_version_id])

    # Chat session that created this branch
    chat_session_id = Column(UUID(as_uuid=True), ForeignKey('node_chat_sessions.id'))
    chat_session = relationship("NodeChatSession", backref="branches")

    # Branch status
    is_active = Column(Boolean, default=True)
    is_merged = Column(Boolean, default=False)  # If merged back to main
    merged_at = Column(DateTime)
    merged_by = Column(Integer)

    # Metrics
    version_count = Column(Integer, default=0)  # Number of versions in this branch

    # Audit
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'node_id': str(self.node_id),
            'branch_name': self.branch_name,
            'display_name': self.display_name,
            'description': self.description,
            'prompt': self.prompt,
            'parent_version_id': str(self.parent_version_id) if self.parent_version_id else None,
            'chat_session_id': str(self.chat_session_id) if self.chat_session_id else None,
            'is_active': self.is_active,
            'is_merged': self.is_merged,
            'version_count': self.version_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# Indexes for efficient queries
Index('idx_node_versions_node_branch', NodeVersion.node_id, NodeVersion.branch_name)
Index('idx_node_versions_full_version', NodeVersion.node_id, NodeVersion.full_version)
Index('idx_node_versions_current', NodeVersion.node_id, NodeVersion.is_current)
Index('idx_chat_branches_node_active', ChatBranch.node_id, ChatBranch.is_active)
