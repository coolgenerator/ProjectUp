"""
Request models for project roadmap generation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GenerateProjectRoadmapRequest(BaseModel):
    """Request to generate a comprehensive project roadmap"""
    project_id: str = Field(..., description="Project ID (short ID or numeric ID)")
    project_title: str = Field(..., description="Title of the project")
    project_description: str = Field(..., description="Description of the project")
    project_type: Optional[str] = Field(None, description="Type of project (e.g., software, research, design)")
    difficulty_level: str = Field("intermediate", description="Project difficulty: beginner, intermediate, advanced")
    duration_weeks: Optional[int] = Field(None, description="Expected duration in weeks")
    team_size: Optional[int] = Field(1, description="Team size")
    key_features: Optional[List[str]] = Field(default_factory=list, description="Key features to implement")
    tech_stack: Optional[List[str]] = Field(default_factory=list, description="Technologies to use")
    generate_proposals: bool = Field(True, description="Whether to generate proposals")
    generate_dependencies: bool = Field(True, description="Whether to generate task dependencies")


class RegenerateRoadmapSectionRequest(BaseModel):
    """Request to regenerate a specific section of the roadmap"""
    project_id: str
    section_id: int
    section_name: str
    additional_context: Optional[str] = None


class ExpandMilestoneRequest(BaseModel):
    """Request to expand a milestone with more detailed tasks"""
    project_id: str
    milestone_id: int
    milestone_title: str
    additional_requirements: Optional[List[str]] = None
