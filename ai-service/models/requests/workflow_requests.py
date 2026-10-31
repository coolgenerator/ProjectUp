"""
Workflow request schemas for LangGraph integration.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class WorkflowNodeDefinition(BaseModel):
    """Model for workflow node definition."""
    id: str
    type: str  # 'agent', 'tool', 'condition', 'human', 'router', 'aggregator'
    name: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    tool_name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    prompt: Optional[str] = None
    condition: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class WorkflowEdgeDefinition(BaseModel):
    """Model for workflow edge definition."""
    from_node: str = ""
    to_node: str = ""
    condition: Optional[Dict[str, Any]] = None
    paths: Optional[Dict[str, str]] = None


class CustomWorkflowDefinition(BaseModel):
    """Model for custom workflow definition."""
    description: str
    nodes: List[WorkflowNodeDefinition]
    edges: List[WorkflowEdgeDefinition]
    start: Optional[str] = None
    end: Optional[str] = None


class WorkflowRequest(BaseModel):
    """Base request model for workflow operations."""
    workflow_type: str
    input_data: Dict[str, Any]
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class WorkflowCreateRequest(BaseModel):
    """Request model for creating workflows."""
    workflow_type: str  # 'chat', 'project', 'research', 'custom'
    workflow_id: Optional[str] = None
    custom_definition: Optional[CustomWorkflowDefinition] = None
    description: Optional[str] = None


class WorkflowExecuteRequest(BaseModel):
    """Request model for executing workflows."""
    workflow_id: str
    message: str
    session_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class WorkflowImportRequest(BaseModel):
    """Request model for importing workflows."""
    workflow_definition: Dict[str, Any]
    workflow_id: Optional[str] = None