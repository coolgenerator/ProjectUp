"""
User Event Model
Tracks user interactions for analytics and behavioral insights
"""

from sqlalchemy import Column, String, DateTime, Integer, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from models.database.base import Base


class EventType(str, enum.Enum):
    """Types of trackable user events"""
    # Onboarding Events
    USER_SIGNED_UP = "user_signed_up"
    FIRST_PROJECT_CREATED = "first_project_created"
    FIRST_NODE_CREATED = "first_node_created"
    FIRST_CHAT_MESSAGE = "first_chat_message"
    FIRST_TASK_ACCEPTED = "first_task_accepted"

    # Engagement Events
    NODE_CREATED = "node_created"
    CHAT_MESSAGE_SENT = "chat_message_sent"
    AI_SUGGESTION_SHOWN = "ai_suggestion_shown"
    AI_SUGGESTION_ACCEPTED = "ai_suggestion_accepted"
    AI_SUGGESTION_REJECTED = "ai_suggestion_rejected"

    # Task Events
    TASK_CREATED = "task_created"
    TASK_VIEWED = "task_viewed"
    TASK_GUIDANCE_VIEWED = "task_guidance_viewed"
    TASK_GUIDANCE_STEP_COMPLETED = "task_guidance_step_completed"
    TASK_COMPLETED = "task_completed"
    TASK_FEEDBACK_SUBMITTED = "task_feedback_submitted"

    # Extraction Events
    TASKS_EXTRACTED = "tasks_extracted"
    MILESTONES_EXTRACTED = "milestones_extracted"
    RESOURCES_EXTRACTED = "resources_extracted"
    COURSE_CREATED = "course_created"

    # Retention Events
    USER_RETURNED = "user_returned"
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"

    # Feature Usage
    TREE_CREATED = "tree_created"
    NODE_CHAT_OPENED = "node_chat_opened"
    GUIDANCE_ASKED_AI = "guidance_asked_ai"
    VERSION_CREATED = "version_created"


class UserEvent(Base):
    """
    Track user interactions and behavior

    Used for:
    - Onboarding metrics (first message, first task, etc.)
    - Engagement metrics (tasks viewed, guidance used, etc.)
    - Retention metrics (return visits, session duration, etc.)
    - A/B testing and feature adoption
    """
    __tablename__ = "user_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User identification
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Event details
    event_type = Column(SQLEnum(EventType), nullable=False, index=True)
    event_name = Column(String(255), nullable=False)  # Human-readable name

    # Context
    session_id = Column(String(255), nullable=True, index=True)  # Track within session
    node_id = Column(UUID(as_uuid=True), nullable=True)
    task_id = Column(UUID(as_uuid=True), nullable=True)

    # Event metadata
    properties = Column(JSON, nullable=True)  # Flexible event data
    """
    Example properties:
    {
        "chat_message_length": 150,
        "tasks_extracted_count": 5,
        "guidance_steps_total": 7,
        "guidance_steps_completed": 3,
        "time_spent_seconds": 120,
        "feedback_rating": 5,
        "feedback_comment": "Very helpful!",
        "suggestion_type": "extract_tasks",
        "accepted": true
    }
    """

    # Timing
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=True)  # For session/task duration

    # Device/context
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile, tablet, desktop

    # Flags
    is_first_time = Column(Boolean, default=False)  # First time this event for user

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert event to dictionary"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "project_id": str(self.project_id) if self.project_id else None,
            "event_type": self.event_type.value,
            "event_name": self.event_name,
            "session_id": self.session_id,
            "node_id": str(self.node_id) if self.node_id else None,
            "task_id": str(self.task_id) if self.task_id else None,
            "properties": self.properties,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "duration_seconds": self.duration_seconds,
            "is_first_time": self.is_first_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TaskInteraction(Base):
    """
    Detailed tracking for task-specific interactions

    Tracks the complete lifecycle of a task from creation to completion,
    including guidance usage and feedback.
    """
    __tablename__ = "task_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # References
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    task_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Lifecycle tracking
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    first_viewed_at = Column(DateTime, nullable=True)
    guidance_first_viewed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Engagement metrics
    view_count = Column(Integer, default=0)
    guidance_view_count = Column(Integer, default=0)
    total_time_spent_seconds = Column(Integer, default=0)

    # Guidance tracking
    guidance_steps_completed = Column(Integer, default=0)
    guidance_steps_total = Column(Integer, nullable=True)
    asked_ai_for_help = Column(Boolean, default=False)

    # Feedback
    feedback_submitted = Column(Boolean, default=False)
    feedback_rating = Column(Integer, nullable=True)  # 1-5 stars
    feedback_comment = Column(String(1000), nullable=True)
    feedback_was_helpful = Column(Boolean, nullable=True)
    feedback_timestamp = Column(DateTime, nullable=True)

    # Metadata
    task_type = Column(String(100), nullable=True)
    task_priority = Column(Integer, nullable=True)
    completion_status = Column(String(50), nullable=True)  # completed, skipped, abandoned

    # Updated
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert interaction to dictionary"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "task_id": str(self.task_id),
            "project_id": str(self.project_id),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "first_viewed_at": self.first_viewed_at.isoformat() if self.first_viewed_at else None,
            "guidance_first_viewed_at": self.guidance_first_viewed_at.isoformat() if self.guidance_first_viewed_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "view_count": self.view_count,
            "guidance_view_count": self.guidance_view_count,
            "total_time_spent_seconds": self.total_time_spent_seconds,
            "guidance_steps_completed": self.guidance_steps_completed,
            "guidance_steps_total": self.guidance_steps_total,
            "asked_ai_for_help": self.asked_ai_for_help,
            "feedback_submitted": self.feedback_submitted,
            "feedback_rating": self.feedback_rating,
            "feedback_was_helpful": self.feedback_was_helpful,
            "completion_status": self.completion_status,
        }


class UserJourney(Base):
    """
    Track high-level user journey milestones

    Used for cohort analysis and funnel optimization
    """
    __tablename__ = "user_journeys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)

    # Onboarding milestones
    signed_up_at = Column(DateTime, nullable=False)
    first_project_at = Column(DateTime, nullable=True)
    first_node_at = Column(DateTime, nullable=True)
    first_chat_at = Column(DateTime, nullable=True)
    first_task_accepted_at = Column(DateTime, nullable=True)
    first_task_completed_at = Column(DateTime, nullable=True)

    # Engagement milestones
    total_projects_created = Column(Integer, default=0)
    total_nodes_created = Column(Integer, default=0)
    total_chat_messages = Column(Integer, default=0)
    total_tasks_created = Column(Integer, default=0)
    total_tasks_completed = Column(Integer, default=0)
    total_guidance_viewed = Column(Integer, default=0)

    # Retention tracking
    last_active_at = Column(DateTime, nullable=True)
    day_2_returned = Column(Boolean, default=False)
    day_7_returned = Column(Boolean, default=False)
    day_30_returned = Column(Boolean, default=False)
    total_sessions = Column(Integer, default=0)

    # Activation status
    is_activated = Column(Boolean, default=False)  # Completed key onboarding steps
    activated_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert journey to dictionary"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "signed_up_at": self.signed_up_at.isoformat() if self.signed_up_at else None,
            "first_project_at": self.first_project_at.isoformat() if self.first_project_at else None,
            "first_node_at": self.first_node_at.isoformat() if self.first_node_at else None,
            "first_chat_at": self.first_chat_at.isoformat() if self.first_chat_at else None,
            "first_task_accepted_at": self.first_task_accepted_at.isoformat() if self.first_task_accepted_at else None,
            "first_task_completed_at": self.first_task_completed_at.isoformat() if self.first_task_completed_at else None,
            "total_projects_created": self.total_projects_created,
            "total_nodes_created": self.total_nodes_created,
            "total_chat_messages": self.total_chat_messages,
            "total_tasks_created": self.total_tasks_created,
            "total_tasks_completed": self.total_tasks_completed,
            "total_guidance_viewed": self.total_guidance_viewed,
            "last_active_at": self.last_active_at.isoformat() if self.last_active_at else None,
            "day_2_returned": self.day_2_returned,
            "day_7_returned": self.day_7_returned,
            "day_30_returned": self.day_30_returned,
            "total_sessions": self.total_sessions,
            "is_activated": self.is_activated,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
        }
