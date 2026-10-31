"""
Request models for roadmap API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class GenerateRoadmapRequest(BaseModel):
    """Request model for generating a roadmap."""
    topic: str = Field(..., description="The topic to generate a roadmap for")
    description: Optional[str] = Field(None, description="Description of the roadmap")
    category: Optional[str] = Field("Technology", description="Category of the roadmap")
    difficulty: Optional[str] = Field("intermediate", description="Difficulty level")
    estimated_hours: Optional[int] = Field(100, description="Estimated hours to complete")
    tags: Optional[List[str]] = Field(None, description="Tags for the roadmap")
    is_featured: Optional[bool] = Field(False, description="Whether to feature this roadmap")


class UpdateResourcesRequest(BaseModel):
    """Request model for updating node resources."""
    resources: List[Dict[str, Any]] = Field(..., description="List of resources to add")
