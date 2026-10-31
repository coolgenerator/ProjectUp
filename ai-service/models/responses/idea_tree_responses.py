"""
Response models for idea tree API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class IdeaTreeQueryResponse(BaseModel):
    """Response model for IdeaTree queries."""
    node_id: str
    query_type: str
    response: str
    suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
