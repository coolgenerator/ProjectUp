"""
Response models for roadmap API endpoints
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any


class RoadmapResponse(BaseModel):
    """Response model for roadmap operations."""
    success: bool
    roadmap: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    error: Optional[str] = None
