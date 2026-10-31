"""
Project-related response schemas for the AI Agent system.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ProjectIdea(BaseModel):
    """Model for a single project idea."""
    title: str
    description: str
    difficulty: str
    estimated_time: str
    key_features: List[str]
    tech_stack: List[str]
    learning_outcomes: List[str]


class RoadmapPhase(BaseModel):
    """Model for a roadmap phase."""
    phase_number: int
    title: str
    description: str
    duration: str
    deliverables: List[str]
    tasks: List[str]
    resources: Optional[List[str]] = None


class ProjectIdeasResponse(BaseModel):
    """Response model for project ideas."""
    ideas: List[ProjectIdea]
    total_count: int
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ProjectRoadmapResponse(BaseModel):
    """Response model for project roadmap."""
    project_title: str
    total_duration: str
    phases: List[RoadmapPhase]
    tech_requirements: List[str]
    learning_resources: Optional[List[str]] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None