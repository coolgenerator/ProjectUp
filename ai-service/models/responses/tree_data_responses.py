"""
Response models for tree data API endpoints
"""

from pydantic import BaseModel
from typing import Optional, Dict, List


class IdeaForestResponse(BaseModel):
    id: str
    project_sid: str  # Short string ID (VARCHAR 10)
    name: str
    description: Optional[str] = ""
    trees_count: int = 0
    total_nodes_count: int = 0
    created_at: str
    updated_at: str


class IdeaTreeResponse(BaseModel):
    id: str
    forest_id: Optional[str] = None  # Optional - not used in virtual sessions
    project_sid: str  # Short string ID (VARCHAR 10)
    name: str
    description: Optional[str] = ""
    color: str
    icon: str
    purpose: Optional[str] = ""
    is_default: bool = False
    is_active: bool = True  # Added field
    nodes_count: int = 0
    connections_count: int = 0
    completion_rate: float = 0.0  # Added field
    created_at: str
    updated_at: str


class IdeaNodeResponse(BaseModel):
    id: str
    project_sid: str  # Short string ID (VARCHAR 10)
    parent_id: Optional[str] = None
    # session_id: Optional[str] = None  # Not in production DB
    # node_type: str = ""  # Not in production DB
    title: str
    description: str = ""
    position: Optional[Dict[str, float]] = None
    is_root: bool = False
    color: Optional[str] = ""
    icon: Optional[str] = ""
    expanded: bool = True
    # status: str = ""  # Not in production DB
    # progress: int = 0  # Not in production DB
    # priority: int = 0  # Not in production DB
    sub_ideas_count: int = 0
    actions_count: int = 0
    threads_count: int = 0
    completion_rate: float = 0.0
    ai_generated: bool = False
    tags: Optional[list] = []
    metadata: Optional[Dict] = None  # Added - this exists in DB as node_metadata
    created_by: int
    created_at: str
    updated_at: str
