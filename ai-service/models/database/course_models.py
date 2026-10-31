"""
Course Database Models

SQLAlchemy ORM models for course-related tables.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship
from database.connection import Base
import uuid


class CourseRequest(Base):
    """Course request table - stores user's course creation requests"""
    __tablename__ = 'course_requests'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    short_id = Column(String(10), nullable=True, unique=True, index=True)  # Short ID for URLs (e.g., "abc123xyz")
    user_id = Column(String(255), nullable=False, index=True)
    topic = Column(String(500), nullable=False)
    category = Column(String(255), nullable=True)  # Course category (Programming, Design, Business, etc.)
    goals = Column(JSON, nullable=True)
    user_experience = Column(Text, nullable=True)
    user_skills = Column(JSON, nullable=True)
    interests = Column(JSON, nullable=True)
    preferences = Column(JSON, nullable=True)
    estimated_weeks = Column(Integer, nullable=True)
    time_commitment = Column(Integer, nullable=True)
    difficulty = Column(String(255), nullable=True)
    preferred_learning_style = Column(String(255), nullable=True)
    include_prerequisites = Column(Boolean, nullable=True)
    max_concepts = Column(Integer, nullable=True)
    is_public = Column(Boolean, nullable=True, default=False)  # Whether course is publicly visible
    status = Column(String(50), nullable=True, default='pending')
    workflow_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=True)

    # Syllabus/Course overview fields
    course_overview = Column(Text, nullable=True)  # Comprehensive course description
    learning_goals = Column(JSON, nullable=True)  # Array of learning goals
    course_prerequisites = Column(JSON, nullable=True)  # Array of prerequisites

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    course_generation_progress = relationship("CourseGenerationProgress", back_populates="course_request", cascade="all, delete-orphan")
    course_sections = relationship("CourseSection", back_populates="course_request", cascade="all, delete-orphan")
    course_refinements = relationship("CourseRefinement", back_populates="course_request", cascade="all, delete-orphan")


class CourseGenerationProgress(Base):
    """Course generation progress - tracks the progress of AI course generation"""
    __tablename__ = 'course_generation_progress'

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(PostgresUUID(as_uuid=True), ForeignKey('course_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    task_name = Column(String(255), nullable=True)
    task_status = Column(String(50), nullable=True)
    progress_percentage = Column(Integer, nullable=True, default=0)
    message = Column(Text, nullable=True)
    node_name = Column(String(255), nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    course_request = relationship("CourseRequest", back_populates="course_generation_progress", foreign_keys=[request_id])


class CourseSection(Base):
    """Course sections - stores the generated course content by sections/weeks"""
    __tablename__ = 'course_sections'

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(PostgresUUID(as_uuid=True), ForeignKey('course_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    week_number = Column(Integer, nullable=True)
    order_index = Column(Integer, nullable=True)

    # AI-generated learning content (markdown/latex format)
    ai_generated_content = Column(Text, nullable=True)

    # Module/topic grouping
    parent_module_id = Column(Integer, ForeignKey('course_sections.id', ondelete='CASCADE'), nullable=True)
    is_module = Column(Boolean, default=False)  # True if this is a parent module, False if subtopic
    is_syllabus = Column(Boolean, default=False)  # True if this is the syllabus/overview page

    # Content type and organization
    content_type = Column(String(50), nullable=True)  # 'syllabus', 'video', 'text', 'mixed'
    video_content = Column(JSON, nullable=True)  # Array of video resources with metadata
    text_content = Column(Text, nullable=True)  # Text-based learning material
    content_references = Column(JSON, nullable=True)  # References/sources used for content generation
    extracted_content = Column(Text, nullable=True)  # Content extracted from source URLs

    concepts = Column(JSON, nullable=True)
    resources = Column(JSON, nullable=True)
    exercises = Column(JSON, nullable=True)
    estimated_hours = Column(Integer, nullable=True)
    milestones = Column(JSON, nullable=True)
    assessment_criteria = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    course_request = relationship("CourseRequest", back_populates="course_sections", foreign_keys=[course_id])

    # Self-referential relationship for module hierarchy
    # Parent module has many subtopics (one-to-many), each subtopic has one parent (many-to-one)
    subtopics = relationship(
        "CourseSection",
        back_populates="parent_module",
        cascade="all, delete-orphan",
        foreign_keys=[parent_module_id]
    )
    parent_module = relationship(
        "CourseSection",
        back_populates="subtopics",
        remote_side=[id]
    )


class CourseRefinement(Base):
    """Course refinements - stores user feedback and refinement requests"""
    __tablename__ = 'course_refinements'

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(PostgresUUID(as_uuid=True), ForeignKey('course_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    refinement_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    changes = Column(JSON, nullable=True)
    ai_prompt = Column(Text, nullable=True)
    ai_response = Column(Text, nullable=True)
    refined_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    course_request = relationship("CourseRequest", back_populates="course_refinements", foreign_keys=[request_id])


class UserCourseProgress(Base):
    """User course progress - tracks user's learning progress on courses"""
    __tablename__ = 'user_course_progress'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    course_id = Column(PostgresUUID(as_uuid=True), ForeignKey('course_requests.id', ondelete='CASCADE'), nullable=False, index=True)

    # Learning status
    learning_status = Column(String(50), nullable=False, default='NOT_STARTED')  # NOT_STARTED, IN_PROGRESS, COMPLETED, PAUSED

    # Progress tracking
    current_section_id = Column(Integer, ForeignKey('course_sections.id', ondelete='SET NULL'), nullable=True)
    completed_sections = Column(JSON, nullable=True, default=[])  # Array of completed section IDs
    progress_percentage = Column(Integer, nullable=True, default=0)  # 0-100

    # Time tracking
    total_time_spent = Column(Integer, nullable=True, default=0)  # Total minutes spent
    last_accessed_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Metadata
    notes = Column(Text, nullable=True)  # User's personal notes
    bookmarks = Column(JSON, nullable=True)  # Bookmarked resources
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class UserTaskCompletion(Base):
    """User task completion - tracks which tasks/lessons users have completed"""
    __tablename__ = 'user_task_completion'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    course_id = Column(PostgresUUID(as_uuid=True), ForeignKey('course_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey('course_sections.id', ondelete='CASCADE'), nullable=False, index=True)
    completed = Column(Boolean, nullable=False, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class Contact(Base):
    """Contacts table - stores contact form submissions"""
    __tablename__ = 'contacts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
