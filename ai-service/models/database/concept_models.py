"""
Concept and roadmap models for storing learning resources and their relationships
"""

from sqlalchemy import Column, String, Integer, Boolean, ARRAY, Text, DECIMAL, DateTime, func, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime as dt
from database.connection import Base

# Note: For vector support, you'll need to install pgvector extension
# and sqlalchemy-pgvector: pip install pgvector sqlalchemy-pgvector
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False
    Vector = None


class Source(Base):
    __tablename__ = 'sources'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    url = Column(Text)
    platform = Column(String(100))
    credibility_score = Column(DECIMAL(3, 2), default=0.5)
    last_scraped_at = Column(DateTime)
    scrape_frequency_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    meta_data = Column(JSONB)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Relationships
    roadmaps = relationship("Roadmap", back_populates="source")
    crawl_jobs = relationship("CrawlJob", back_populates="source")


class Roadmap(Base):
    __tablename__ = 'roadmaps'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True)
    description = Column(Text)
    category = Column(String(100))
    difficulty_level = Column(String(50))
    estimated_hours = Column(Integer)
    tags = Column(ARRAY(Text))
    is_featured = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    source_id = Column(UUID(as_uuid=True), ForeignKey('sources.id', ondelete='SET NULL'))
    meta_data = Column(JSONB)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Relationships
    source = relationship("Source", back_populates="roadmaps")
    # Removed direct nodes relationship - now use domains and concepts through bridge tables
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "slug": self.slug,
            "description": self.description,
            "category": self.category,
            "difficulty_level": self.difficulty_level,
            "estimated_hours": self.estimated_hours,
            "tags": self.tags,
            "is_featured": self.is_featured,
            "view_count": self.view_count,
            "meta_data": self.meta_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Domain(Base):
    """Domain represents the highest level of knowledge organization"""
    __tablename__ = 'domains'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Relationships
    topics = relationship("Topic", back_populates="domain", cascade="all, delete-orphan")
    domain_roadmaps = relationship("DomainRoadmap", back_populates="domain", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Topic(Base):
    """Topic represents a subject area within a domain"""
    __tablename__ = 'topics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    domain_id = Column(Integer, ForeignKey('domains.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    parent_topic_id = Column(Integer, ForeignKey('topics.id'))
    level = Column(Integer, default=0)  # Depth in hierarchy
    order_index = Column(Integer)  # Order within parent
    meta_data = Column(JSONB)  # Flexible additional data
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('domain_id', 'name', name='_domain_topic_uc'),
    )
    
    # Relationships
    domain = relationship("Domain", back_populates="topics")
    parent = relationship("Topic", remote_side=[id], backref="children")
    concepts = relationship("Concept", back_populates="topic", cascade="all, delete-orphan")
    
    def to_dict(self, include_children=False):
        result = {
            "id": self.id,
            "domain_id": self.domain_id,
            "name": self.name,
            "description": self.description,
            "parent_topic_id": self.parent_topic_id,
            "level": self.level,
            "order_index": self.order_index,
            "metadata": self.meta_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        if include_children:
            result["children"] = [child.to_dict(include_children=True) for child in self.children]
        return result


class Concept(Base):
    """Concept represents an atomic piece of knowledge within a topic"""
    __tablename__ = 'concepts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(500), nullable=False)
    topic_id = Column(Integer, ForeignKey('topics.id', ondelete='CASCADE'))
    
    # Core concept definition - the actual knowledge
    description = Column(Text)  # What this concept is about
    summary = Column(Text)  # Brief summary of the concept
    is_atomic = Column(Boolean, default=True)  # Is this an atomic concept?
    
    # Concept characteristics (aggregated from resources)
    resource_count = Column(Integer, default=0)  # Number of associated resources
    
    # Embeddings for similarity search (optional, requires pgvector)
    if HAS_PGVECTOR:
        embedding = Column(Vector(768))  # 768-dimensional vector for embeddings
    
    # Metadata
    keywords = Column(JSONB)  # Key terms and tags for this concept
    prerequisites = Column(JSONB)  # Prerequisite concepts (list of concept names/IDs)
    learning_outcomes = Column(JSONB)  # What learner will be able to do
    meta_data = Column(JSONB)  # Flexible additional data
    search_vector = Column(TSVECTOR)  # Full-text search
    
    # verification
    verified = Column(Boolean, default=False)  # Has this concept been verified?
    
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Relationships
    topic = relationship("Topic", back_populates="concepts")
    # Link to ConceptResource for multiple resources per concept
    concept_resources = relationship("ConceptResource", back_populates="concept", cascade="all, delete-orphan", lazy="dynamic")
    concept_roadmaps = relationship("ConceptRoadmap", back_populates="concept", cascade="all, delete-orphan")
    
    def to_dict(self, include_resources=False):
        result = {
            "id": self.id,
            "name": self.name,
            "topic_id": self.topic_id,
            "description": self.description,
            "summary": self.summary,
            "is_atomic": self.is_atomic,
            "resource_count": self.resource_count,
            "keywords": self.keywords,
            "prerequisites": self.prerequisites,
            "learning_outcomes": self.learning_outcomes,
            "metadata": self.meta_data,
            "verified": self.verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_resources:
            # Include resources if requested
            result["resources"] = [r.to_dict() for r in self.concept_resources]
        
        return result


class ConceptResource(Base):
    """Resources linked to concepts - can be links, text, markdown, etc."""
    __tablename__ = 'concept_resources'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concept_id = Column(Integer, ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False)
    
    # Resource content
    title = Column(String(500), nullable=False)
    description = Column(Text)  # Brief description of what this resource covers
    content = Column(Text)  # For text/markdown content
    url = Column(Text)  # For external links
    
    # Resource categorization
    resource_type = Column(String(50))  # 'video', 'article', 'tutorial', 'documentation', 'course', 'book', 'tool', 'example', 'exercise', 'reference'
    content_format = Column(String(50))  # 'url', 'inline', 'markdown', 'pdf', 'html'
    media_type = Column(String(50))  # 'text', 'video', 'audio', 'interactive', 'mixed'
    
    # Language and accessibility
    language = Column(String(10), default='en')  # ISO 639-1 language code
    is_free = Column(Boolean, default=True)
    requires_registration = Column(Boolean, default=False)
    
    # Resource metadata
    difficulty_level = Column(String(20))  # 'beginner', 'intermediate', 'advanced', 'all'
    estimated_minutes = Column(Integer)  # Time to consume this resource
    target_audience = Column(String(100))  # 'developers', 'students', 'professionals', etc.
    
    # Validation status
    is_valid = Column(Boolean, default=True)  # For links - checked if accessible
    last_validated = Column(DateTime)
    validation_error = Column(Text)  # Store error message if validation fails
    
    # Resource quality and metrics
    quality_score = Column(DECIMAL(3, 2))  # 0-1 quality rating
    relevance_score = Column(DECIMAL(3, 2))  # How relevant to the concept
    popularity_score = Column(DECIMAL(3, 2))  # Based on stars, views, etc.
    
    # Source information
    source_platform = Column(String(50))  # 'github', 'youtube', 'medium', 'official_docs', etc.
    source_repo = Column(String(255))  # GitHub repo it came from
    source_file = Column(String(500))  # File path in repo
    source_line = Column(Integer)  # Line number if applicable
    author = Column(String(255))  # Resource author/creator
    
    # Extraction metadata
    extracted_at = Column(DateTime, server_default=func.current_timestamp())
    extraction_method = Column(String(50))  # 'manual', 'auto', 'llm', 'scraper'
    
    # Learning outcomes (what the user will learn from this resource)
    learning_outcomes = Column(JSONB)  # List of outcomes
    prerequisites = Column(JSONB)  # What user should know before using this resource
    
    # Additional metadata
    meta_data = Column(JSONB)  # Flexible storage for platform-specific data
    
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=dt.utcnow)
    
    # Relationships
    concept = relationship("Concept", back_populates="concept_resources")
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "concept_id": self.concept_id,
            "title": self.title,
            "description": self.description,
            "content": self.content,
            "url": self.url,
            "resource_type": self.resource_type,
            "content_format": self.content_format,
            "media_type": self.media_type,
            "language": self.language,
            "is_free": self.is_free,
            "requires_registration": self.requires_registration,
            "difficulty_level": self.difficulty_level,
            "estimated_minutes": self.estimated_minutes,
            "target_audience": self.target_audience,
            "is_valid": self.is_valid,
            "quality_score": float(self.quality_score) if self.quality_score else None,
            "relevance_score": float(self.relevance_score) if self.relevance_score else None,
            "popularity_score": float(self.popularity_score) if self.popularity_score else None,
            "source_platform": self.source_platform,
            "source_repo": self.source_repo,
            "author": self.author,
            "learning_outcomes": self.learning_outcomes,
            "prerequisites": self.prerequisites,
            "metadata": self.meta_data,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ConceptRelationship(Base):
    """Relationships between concepts"""
    __tablename__ = 'concept_relationships'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    from_concept_id = Column(Integer, ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False)
    to_concept_id = Column(Integer, ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False)
    relationship_type = Column(String(50))  # 'prerequisite', 'related', 'extends', 'implements'
    strength = Column(DECIMAL(3, 2))  # Relationship strength 0-1
    
    created_at = Column(DateTime, server_default=func.current_timestamp())
    
    __table_args__ = (
        UniqueConstraint('from_concept_id', 'to_concept_id', 'relationship_type', 
                        name='_concept_relationship_uc'),
    )


# Bridge tables for many-to-many relationships
class DomainRoadmap(Base):
    """Links domains to roadmaps"""
    __tablename__ = 'domain_roadmaps'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey('roadmaps.id', ondelete='CASCADE'), nullable=False)
    domain_id = Column(Integer, ForeignKey('domains.id', ondelete='CASCADE'), nullable=False)
    order_index = Column(Integer)
    
    # Relationships
    roadmap = relationship("Roadmap", backref="domain_roadmaps")
    domain = relationship("Domain", back_populates="domain_roadmaps")
    
    __table_args__ = (
        UniqueConstraint('roadmap_id', 'domain_id', name='_roadmap_domain_uc'),
    )


class ConceptRoadmap(Base):
    """Links concepts to roadmaps for flexible organization"""
    __tablename__ = 'concept_roadmaps'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey('roadmaps.id', ondelete='CASCADE'), nullable=False)
    concept_id = Column(Integer, ForeignKey('concepts.id', ondelete='CASCADE'), nullable=False)
    order_index = Column(Integer)
    is_optional = Column(Boolean, default=False)
    is_core = Column(Boolean, default=True)
    
    # Relationships
    roadmap = relationship("Roadmap", backref="concept_roadmaps")
    concept = relationship("Concept", back_populates="concept_roadmaps")
    
    __table_args__ = (
        UniqueConstraint('roadmap_id', 'concept_id', name='_roadmap_concept_uc'),
    )


# Keep backward compatibility - create aliases
RoadmapNode = Domain  # Temporary alias for migration