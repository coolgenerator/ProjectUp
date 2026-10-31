"""
Project-related request schemas for the AI Agent system.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ProjectIdeasRequest(BaseModel):
    """Request model for generating project ideas."""
    skills: List[str] = []
    interests: List[str] = []
    reference: Optional[str] = ""
    goal: Optional[str] = ""
    preferred_difficulty: Optional[str] = "Any"
    preferred_timeframe: Optional[str] = "Any"
    session_id: Optional[str] = None
    previous_ideas: Optional[List[Dict[str, Any]]] = None


class ProjectRoadmapRequest(BaseModel):
    """Request model for generating project roadmaps."""
    title: str
    description: str
    difficulty_level: Optional[str] = "Intermediate"
    key_features: Optional[List[str]] = None
    session_id: Optional[str] = None


class EnhancedRoadmapRequest(BaseModel):
    """Request model for generating enhanced roadmaps."""
    title: str
    description: str
    project_type: str
    difficulty_level: Optional[str] = "Intermediate"
    key_features: Optional[List[str]] = None
    session_id: Optional[str] = None