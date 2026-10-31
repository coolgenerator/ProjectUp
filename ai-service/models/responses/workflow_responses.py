"""
Workflow response schemas for LangGraph integration.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class WorkflowInfo(BaseModel):
    """Model for workflow information."""
    workflow_id: str
    type: str
    description: str
    created_at: str
    updated_at: Optional[str] = None
    definition: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowExecutionResult(BaseModel):
    """Model for workflow execution results."""
    execution_id: str
    workflow_id: str
    session_id: Optional[str] = None
    status: str  # 'completed', 'error', 'running'
    result: Optional[str] = None
    tool_results: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


class WorkflowListResponse(BaseModel):
    """Response model for listing workflows."""
    workflows: Dict[str, WorkflowInfo]
    count: int
    success: bool
    error: Optional[str] = None