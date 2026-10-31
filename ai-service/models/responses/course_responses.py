"""
Response models for course-related API endpoints.
"""

from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class CourseItemResponse(BaseModel):
    """Individual course item in list response."""
    id: str
    request_id: Optional[str] = None  # Alias for id for frontend compatibility
    user_id: str
    topic: str
    title: str  # Alias for topic for frontend compatibility
    description: Optional[str] = None  # Course description
    status: str
    created_at: datetime
    updated_at: datetime
    difficulty: Optional[str] = None
    estimated_weeks: Optional[int] = None
    duration_weeks: Optional[int] = None  # Alias for estimated_weeks
    error_message: Optional[str] = None  # Error message if failed

    @field_validator('id', 'user_id', 'request_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, value):
        """Convert UUID objects to strings."""
        if isinstance(value, UUID):
            return str(value)
        return value

    class Config:
        from_attributes = True


class CourseListResponse(BaseModel):
    """Response model for course list endpoint."""
    courses: List[CourseItemResponse]
    total: int
    user_id: str


class CourseDeleteResponse(BaseModel):
    """Response model for course deletion."""
    status: str
    course_id: str


class CourseGenerationResponse(BaseModel):
    """Response model for course generation start."""
    request_id: str
    status: str
    message: str
    websocket_url: Optional[str] = None


class CourseStatusResponse(BaseModel):
    """Response model for course generation status."""
    request_id: str
    status: str
    topic: str
    created_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


class CourseResponse(BaseModel):
    """Response model for course operations."""
    status: str
    session_id: Optional[str] = None
    course: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
