"""
Embedding models for RAG and document search

This module provides the DocumentChunk model for storing document embeddings
with rich metadata for RAG (Retrieval Augmented Generation) systems.

For structured entities (IdeaNode, NodeTemplate, etc.), embeddings are stored
directly in the entity table for fast similarity search.
"""

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from database.connection import Base
from pgvector.sqlalchemy import Vector


class DocumentChunk(Base):
    """
    Stores document chunks with embeddings for RAG.

    Used for unstructured content that needs to be chunked:
    - Crawled web content
    - PDF documents (papers, articles)
    - External documentation
    - Long-form text content

    For structured entities (IdeaNode, NodeTemplate), use direct embedding columns instead.
    """
    __tablename__ = 'document_chunks'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Source tracking
    source_type = Column(String(50), nullable=False, index=True)  # 'web_crawl', 'paper', 'article', 'roadmap', 'documentation'
    source_id = Column(UUID(as_uuid=True), index=True)  # References the source entity (optional)
    source_url = Column(Text)  # Original URL or source location

    # Content
    content = Column(Text, nullable=False)  # The actual text chunk
    chunk_index = Column(Integer, default=0)  # Order of chunk in original document (0-indexed)
    total_chunks = Column(Integer)  # Total number of chunks in the document

    # Embedding vector (768 dimensions for text-embedding-004)
    embedding = Column(Vector(768), nullable=False)

    # Model tracking for versioning
    model_name = Column(String(100), default='text-embedding-004', nullable=False)
    model_version = Column(String(50))  # e.g., 'v1.0', '2024-01'

    # Additional metadata (flexible JSON for source-specific data)
    # Examples:
    # - {'title': '...', 'author': '...', 'section': '...'} for papers
    # - {'url': '...', 'domain': '...', 'scraped_at': '...'} for web content
    # - {'headers': [...], 'tags': [...]} for structured content
    # Note: Using 'chunk_metadata' in Python to avoid SQLAlchemy reserved 'metadata' attribute
    chunk_metadata = Column('metadata', JSONB, default={})

    # Timestamps
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.current_timestamp())

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'source_type': self.source_type,
            'source_id': str(self.source_id) if self.source_id else None,
            'source_url': self.source_url,
            'content': self.content,
            'chunk_index': self.chunk_index,
            'total_chunks': self.total_chunks,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'metadata': self.chunk_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# Create HNSW index for efficient similarity search
# HNSW (Hierarchical Navigable Small World) is optimized for high-dimensional vectors
Index(
    'idx_document_chunks_embedding_hnsw',
    DocumentChunk.embedding,
    postgresql_using='hnsw',
    postgresql_with={'m': 16, 'ef_construction': 64},
    postgresql_ops={'embedding': 'vector_cosine_ops'}
)

# Composite index for filtering by source
Index('idx_document_chunks_source', DocumentChunk.source_type, DocumentChunk.source_id)

# Index for chronological queries
Index('idx_document_chunks_created_at', DocumentChunk.created_at.desc())
