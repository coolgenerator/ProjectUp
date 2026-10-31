"""
Request models for node chat API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class ChatMessageRequest(BaseModel):
    """Request to send a message in a chat session"""
    node_id: str = Field(..., description="UUID of the node")
    project_id: str = Field(..., description="Project UUID string")
    user_id: int = Field(..., description="User ID")
    session_id: Optional[str] = Field(None, description="Optional: UUID of specific session (for branching)")
    message: str = Field(..., description="User's message")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context (tree structure, parent/children)")
    regenerate: Optional[bool] = Field(False, description="Whether this is a regenerate request")
    attachments: Optional[List[Dict[str, Any]]] = Field(None, description="Optional file attachments")


class CreateBranchRequest(BaseModel):
    """Request to create a new conversation branch from an existing session"""
    parent_session_id: str = Field(..., description="UUID of the parent session to branch from")
    branch_point_index: int = Field(..., description="Message index where the branch diverges")
    branch_display_name: Optional[str] = Field(None, description="User-friendly branch name")
    initial_messages: List[Dict[str, Any]] = Field(..., description="Messages up to the branch point")
    modified_message: Optional[str] = Field(None, description="Modified user message for the branch")
    version_number: str = Field(..., description="Hierarchical version number (e.g., '2', '2.1', '2.1.1')")
    parent_version_number: Optional[str] = Field(None, description="Parent's version number")


class CreateVersionRequest(BaseModel):
    """Request to create a new version"""
    session_id: str
    user_id: int


class RestoreVersionRequest(BaseModel):
    """Request to restore a version"""
    version_id: str
    user_id: int
