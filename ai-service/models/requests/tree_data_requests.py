"""
Request models for tree data API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class IdeaForestCreate(BaseModel):
    name: str = "Idea Forest"
    description: Optional[str] = ""
    project_sid: str  # Short string ID (VARCHAR 10) - references projects.sid


class IdeaTreeCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "lightbulb"
    purpose: Optional[str] = ""
    forest_id: Optional[str] = None  # Optional to support auto-creation of forest
    project_sid: str  # Short string ID (VARCHAR 10) - references projects.sid


class IdeaNodeCreate(BaseModel):
    # project_sid comes from URL path parameter, not request body
    session_id: Optional[str] = None  # Tree session ID
    parent_id: Optional[str] = None
    title: str
    description: str = ""
    position: Optional[Dict[str, float]] = None
    color: Optional[str] = ""
    icon: Optional[str] = ""
    expanded: Optional[bool] = True
    tags: Optional[List[str]] = []
    is_root: Optional[bool] = False
    initial_chat_prompt: Optional[str] = None  # If provided, auto-create chat session and send first message
    user_id: Optional[int] = None  # User ID for chat session creation


class IdeaTreeQuery(BaseModel):
    prompt: Optional[str] = None
    query: Optional[str] = None
    query_type: Optional[str] = "expand_idea"
    context: Optional[Dict[str, Any]] = {}
    node_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
