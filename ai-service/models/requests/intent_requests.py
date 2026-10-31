"""
Intent Detection Request Models
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from models.entities.intent import ActionType


class DetectIntentsRequest(BaseModel):
    """Request to detect intents from a message"""
    message: str = Field(..., description="User message to analyze for intents")
    node_id: str = Field(..., description="Current node ID")
    node_title: str = Field(..., description="Current node title")
    node_description: Optional[str] = Field(None, description="Current node description")
    project_id: str = Field(..., description="Project ID")
    session_id: str = Field(..., description="Tree session ID")
    conversation_history: List[str] = Field(
        default_factory=list,
        description="Recent conversation messages (last 3-5)"
    )
    existing_nodes_count: Optional[int] = Field(None, description="Count of existing child nodes")
    user_id: Optional[int] = Field(None, description="User ID for personalization")


class ExecuteActionRequest(BaseModel):
    """Request to execute a suggested action"""
    intent_id: str = Field(..., description="ID of the intent/suggestion")
    action_type: ActionType = Field(..., description="Type of action to execute")
    parameters: Dict[str, Any] = Field(..., description="Action parameters")
    node_id: str = Field(..., description="Current node ID")
    project_id: str = Field(..., description="Project ID")
    session_id: str = Field(..., description="Tree session ID")
    user_id: Optional[int] = Field(None, description="User executing the action")
    custom_modifications: Optional[Dict[str, Any]] = Field(
        None,
        description="User modifications to the suggested parameters"
    )


class BatchExecuteActionsRequest(BaseModel):
    """Request to execute multiple actions at once"""
    intent_ids: List[str] = Field(..., description="IDs of intents to execute")
    actions: List[ExecuteActionRequest] = Field(..., description="Actions to execute")
    execute_order: Optional[List[int]] = Field(
        None,
        description="Order of execution (indices into actions list)"
    )
