"""
Request models for idea tree API endpoints
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List


class IdeaTreeQueryRequest(BaseModel):
    """Request model for IdeaTree queries."""
    node_id: str = Field(..., description="The ID of the node")
    title: str = Field(..., description="Title of the node")
    description: str = Field(..., description="Description of the node")
    query_type: str = Field(..., description="Type of query to process")
    query: str = Field(default="", description="Additional query context")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")


class BatchQueryRequest(BaseModel):
    """Request model for batch queries."""
    queries: List[IdeaTreeQueryRequest] = Field(..., description="List of queries to process")
