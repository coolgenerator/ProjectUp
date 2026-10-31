"""
Pydantic schemas for Project Assistant API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class DifficultyLevel(str, Enum):
    """Project difficulty levels."""
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    ANY = "Any"


# Request Models

class ProjectIdeasRequest(BaseModel):
    """Request model for generating project ideas."""
    skills: List[str] = Field(..., description="List of user skills")
    interests: List[str] = Field(..., description="List of user interests")
    goal: Optional[str] = Field(None, description="User's learning goal")
    reference: Optional[str] = Field(None, description="Additional reference information")
    hoursPerWeek: Optional[str] = Field(None, description="Available hours per week")
    preferredDifficulty: Optional[str] = Field("Any", description="Preferred difficulty level")
    preferredTimeframe: Optional[str] = Field("Any", description="Preferred project timeframe")
    deadline: Optional[str] = Field(None, description="Project deadline")
    customTimePeriod: Optional[str] = Field(None, description="Custom time period")
    numIdeas: int = Field(5, ge=1, le=10, description="Number of ideas to generate")


class RoadmapStepsRequest(BaseModel):
    """Request model for generating roadmap steps."""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Project description")
    difficulty: str = Field(..., description="Project difficulty level")
    projectType: Optional[str] = Field("Personal Project", description="Type of project")
    keyFeatures: Optional[List[str]] = Field(None, description="Key features of the project")


class CurriculumAlignmentRequest(BaseModel):
    """Request model for generating curriculum alignment."""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Project description")
    difficulty: str = Field(..., description="Project difficulty level")
    projectType: Optional[str] = Field("Personal Project", description="Type of project")
    keyFeatures: Optional[List[str]] = Field(None, description="Key features of the project")


class ProjectChecklistRequest(BaseModel):
    """Request model for generating project checklist."""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Project description")
    difficulty: str = Field(..., description="Project difficulty level")
    projectType: Optional[str] = Field("Personal Project", description="Type of project")
    keyFeatures: Optional[List[str]] = Field(None, description="Key features of the project")


# Response Models

class ProjectIdeasResponse(BaseModel):
    """Response model for project ideas generation."""
    response: Any = Field(..., description="Generated project ideas (can be dict or string)")
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")


class RoadmapStepsResponse(BaseModel):
    """Response model for roadmap steps generation."""
    response: Any = Field(..., description="Generated roadmap steps (can be dict or string)")
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")


class CurriculumAlignmentResponse(BaseModel):
    """Response model for curriculum alignment generation."""
    response: Any = Field(..., description="Generated curriculum alignment (can be dict or string)")
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")


class ProjectChecklistResponse(BaseModel):
    """Response model for project checklist generation."""
    response: Any = Field(..., description="Generated project checklist (can be dict or string)")
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")


# Internal Data Models (for type hints in service layer)

class ProjectIdea(BaseModel):
    """Model representing a single project idea."""
    title: str
    description: str
    difficulty: str
    estimatedTime: str
    estimatedHoursPerWeek: Optional[str] = None
    keyTechnologies: List[str]
    keyFeatures: List[str]
    learningOutcomes: List[str]


class RoadmapStep(BaseModel):
    """Model representing a single roadmap step."""
    title: str
    description: str
    timeEstimate: str
    resources: Optional[List[str]] = None
    deliverables: Optional[List[str]] = None


class ChecklistItem(BaseModel):
    """Model representing a checklist item."""
    description: str
    category: str
    priority: str
    completed: bool = False


class CurriculumTopic(BaseModel):
    """Model representing a curriculum topic."""
    topic: str
    category: str
    learningGoals: List[str]
    resources: Optional[List[str]] = None
