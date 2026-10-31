"""
Task Management Database Models

SQLAlchemy models for tasks, learning resources, subtasks, and dependencies.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP, Text, ForeignKey, ARRAY, DECIMAL
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database.connection import Base


class Task(Base):
    """
    Task model for execution-focused work items.

    Supports different task types: learning, action, research, development.
    """
    __tablename__ = "tasks"

    id = Column(String(255), primary_key=True)
    project_id = Column(String(255), nullable=False, index=True)  # Changed to String for UUID support
    idea_node_id = Column(String(255), nullable=True, index=True)
    milestone_id = Column(Integer, nullable=True, index=True)
    parent_task_id = Column(String(255), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), nullable=True)  # Optional, flexible field - can be any user-defined value

    status = Column(String(50), nullable=False, default='todo', index=True)  # 'todo', 'in_progress', 'review', 'blocked', 'done'
    priority = Column(Integer, default=3)  # 1 (highest) to 5 (lowest)
    progress = Column(Integer, default=0)  # 0-100%

    estimated_hours = Column(DECIMAL(10, 2), nullable=True)
    actual_hours = Column(DECIMAL(10, 2), nullable=True)
    start_date = Column(TIMESTAMP, nullable=True)
    due_date = Column(TIMESTAMP, nullable=True, index=True)
    completed_at = Column(TIMESTAMP, nullable=True)

    assigned_to = Column(String(255), nullable=True, index=True)
    created_by = Column(String(255), nullable=False, index=True)

    tags = Column(ARRAY(Text), nullable=True)
    task_metadata = Column("metadata", JSONB, nullable=True)  # Flexible metadata for custom fields (renamed to avoid SQLAlchemy conflict)
    guidance = Column(JSONB, nullable=True)  # AI-generated execution guidance
    """
    Guidance structure:
    {
        "overview": "What this task accomplishes",
        "quick_start": ["Step 1", "Step 2", "Step 3"],
        "prerequisites": {
            "skills": ["React", "TypeScript"],
            "tools": ["Node.js", "VS Code"],
            "dependencies": ["Task ID 1", "Task ID 2"]
        },
        "resources": [
            {"title": "React Docs", "url": "https://...", "type": "documentation"},
            {"title": "Tutorial Video", "url": "https://...", "type": "video"}
        ],
        "common_pitfalls": [
            {"issue": "Problem description", "solution": "How to avoid/fix"}
        ],
        "success_criteria": ["Criteria 1", "Criteria 2"],
        "estimated_time": "4 hours",
        "complexity": "moderate"
    }
    """

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    learning_resources = relationship("LearningResource", back_populates="task", cascade="all, delete-orphan")
    subtasks = relationship("Subtask", back_populates="parent_task", cascade="all, delete-orphan", foreign_keys="[Subtask.parent_task_id]")

    def to_dict(self, include_resources: bool = False, include_subtasks: bool = False) -> dict:
        """Convert to dictionary"""
        result = {
            "id": self.id,
            "project_id": self.project_id,
            "idea_node_id": self.idea_node_id,
            "milestone_id": self.milestone_id,
            "parent_task_id": self.parent_task_id,
            "title": self.title,
            "description": self.description,
            "task_type": self.task_type,
            "status": self.status,
            "priority": self.priority,
            "progress": self.progress,
            "estimated_hours": float(self.estimated_hours) if self.estimated_hours else None,
            "actual_hours": float(self.actual_hours) if self.actual_hours else None,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "assigned_to": self.assigned_to,
            "created_by": self.created_by,
            "tags": self.tags,
            "metadata": self.task_metadata,  # Use Python attribute name
            "guidance": self.guidance,  # AI-generated execution guidance
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_resources and self.learning_resources:
            result["learning_resources"] = [r.to_dict() for r in self.learning_resources]

        if include_subtasks and self.subtasks:
            result["subtasks"] = [s.to_dict() for s in self.subtasks]

        return result


class LearningResource(Base):
    """
    Learning resource model for tracking educational content.

    Used within learning tasks to track individual resources like videos,
    articles, books, courses, etc.
    """
    __tablename__ = "learning_resources"

    id = Column(String(255), primary_key=True)
    task_id = Column(String(255), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False)  # 'video', 'article', 'book', 'course', 'documentation', 'practice'
    url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    status = Column(String(50), nullable=False, default='not_started', index=True)  # 'not_started', 'in_progress', 'completed'
    progress = Column(Integer, default=0)  # 0-100%

    estimated_time_minutes = Column(Integer, nullable=True)
    actual_time_minutes = Column(Integer, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)

    notes = Column(Text, nullable=True)
    key_takeaways = Column(ARRAY(Text), nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="learning_resources")

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "task_id": self.task_id,
            "title": self.title,
            "type": self.type,
            "url": self.url,
            "description": self.description,
            "status": self.status,
            "progress": self.progress,
            "estimated_time_minutes": self.estimated_time_minutes,
            "actual_time_minutes": self.actual_time_minutes,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
            "key_takeaways": self.key_takeaways,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Subtask(Base):
    """
    Subtask model for breaking down tasks into smaller work items.

    Used within action tasks to create checklists.
    """
    __tablename__ = "subtasks"

    id = Column(String(255), primary_key=True)
    parent_task_id = Column(String(255), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default='todo')  # 'todo', 'in_progress', 'done'

    assigned_to = Column(String(255), nullable=True)
    due_date = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent_task = relationship("Task", back_populates="subtasks", foreign_keys=[parent_task_id])

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "parent_task_id": self.parent_task_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TaskDependency(Base):
    """
    Task dependency model for tracking task relationships.

    Defines which tasks must be completed before others can start.
    """
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(255), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_task_id = Column(String(255), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "task_id": self.task_id,
            "depends_on_task_id": self.depends_on_task_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
