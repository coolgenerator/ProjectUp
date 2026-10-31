"""
Request models for course-related API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class CourseGenerationRequest(BaseModel):
    """Request model for course generation."""
    user_id: str = Field(..., description="User ID requesting the course")
    topic: str = Field(..., description="Course topic", min_length=3)
    goals: List[str] = Field(..., description="Learning goals", min_items=1)
    user_experience: str = Field(..., description="User's background/experience level")
    user_skills: Optional[List[str]] = Field(default=None, description="User's existing skills")
    interests: Optional[List[str]] = Field(default=None, description="User's interests")
    preferences: Optional[Dict[str, Any]] = Field(default=None, description="Additional preferences")
    estimated_weeks: int = Field(default=4, ge=1, le=52, description="Course duration in weeks")
    time_commitment: int = Field(default=10, ge=1, le=40, description="Hours per week")
    difficulty: str = Field(default="intermediate", description="Difficulty level")
    preferred_learning_style: str = Field(default="mixed", description="Learning style preference")


class CourseFeedback(BaseModel):
    """Feedback model for course refinement in workflow."""
    approved: bool
    comments: Optional[str] = None
    suggested_changes: Optional[Dict[str, Any]] = None
