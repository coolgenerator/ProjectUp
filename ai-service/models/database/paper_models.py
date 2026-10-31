"""
Paper-related database models for AI Agent
Stores chat sessions, notes, outlines, and references for research papers
"""

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base


class PaperChatSession(Base):
    """Chat sessions for paper discussions"""
    __tablename__ = 'paper_chat_sessions'

    id = Column(String(36), primary_key=True)  # UUID format
    paper_id = Column(String(36), nullable=False, index=True)  # UUID format
    user_id = Column(String(36), nullable=False, index=True)  # UUID format
    title = Column(String(200), nullable=False, default='New Chat')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship to messages
    messages = relationship("PaperChatMessage", back_populates="session", cascade="all, delete-orphan")

    # Composite index for efficient querying
    __table_args__ = (
        Index('idx_paper_user_sessions', 'paper_id', 'user_id'),
    )


class PaperChatMessage(Base):
    """Individual messages in paper chat sessions"""
    __tablename__ = 'paper_chat_messages'

    id = Column(String(36), primary_key=True)  # UUID format
    session_id = Column(String(36), ForeignKey('paper_chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)  # UUID format
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context = Column(Text, nullable=True)  # Selected text context
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship to session
    session = relationship("PaperChatSession", back_populates="messages")


class PaperNote(Base):
    """User notes on specific paper pages"""
    __tablename__ = 'paper_notes'

    id = Column(String(36), primary_key=True)  # UUID format
    paper_id = Column(String(36), nullable=False, index=True)  # UUID format
    user_id = Column(String(36), nullable=False, index=True)  # UUID format
    page = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default='note')  # 'note', 'question', 'highlight'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_paper_user_notes', 'paper_id', 'user_id'),
    )


class PaperOutline(Base):
    """Generated outlines for papers"""
    __tablename__ = 'paper_outlines'

    id = Column(String(36), primary_key=True)  # UUID format
    paper_id = Column(String(36), nullable=False, unique=True, index=True)  # UUID format
    sections = Column(JSON, nullable=False)  # Structured outline data
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PaperReference(Base):
    """Extracted references from papers"""
    __tablename__ = 'paper_references'

    id = Column(String(100), primary_key=True)  # Composite format: {paper_id}_{ref_id}
    paper_id = Column(String(36), nullable=False, index=True)  # UUID format
    ref_id = Column(String(50), nullable=False)  # Reference identifier (e.g., "ref-1")
    title = Column(String(500), nullable=False)
    authors = Column(JSON, nullable=False)  # Array of author names
    year = Column(Integer, nullable=True)
    venue = Column(String(300), nullable=True)
    doi = Column(String(100), nullable=True)
    url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_paper_references', 'paper_id'),
    )
