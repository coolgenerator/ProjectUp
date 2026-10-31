"""
Intent Detection Models

Data models for AI-detected intents and suggested actions.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class ActionType(str, Enum):
    """Types of actions that can be triggered from conversation"""
    CREATE_MILESTONE = "create_milestone"
    BREAKDOWN_TASK = "breakdown_task"
    GENERATE_LEARNING_PLAN = "generate_learning_plan"
    EXTRACT_ACTION_ITEMS = "extract_action_items"
    CREATE_DEPENDENCY = "create_dependency"
    BRAINSTORM_IDEAS = "brainstorm_ideas"
    SAVE_VERSION = "save_version"
    SCHEDULE_REMINDER = "schedule_reminder"


class DetectedIntent(BaseModel):
    """A single detected intent from conversation analysis"""
    id: str = Field(..., description="Unique identifier for this intent")
    type: ActionType = Field(..., description="Type of action suggested")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    title: str = Field(..., description="Short title for the suggestion")
    description: str = Field(..., description="Detailed description of what will happen")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for executing this action")
    preview: str = Field(..., description="Preview text shown to user")
    reasoning: Optional[str] = Field(None, description="Why this action was suggested")
    priority: int = Field(1, ge=1, le=3, description="Priority level (1=high, 2=medium, 3=low)")

    class Config:
        use_enum_values = True


class IntentDetectionContext(BaseModel):
    """Context provided for intent detection"""
    node_id: str = Field(..., description="Current node ID")
    node_title: str = Field(..., description="Current node title")
    node_description: Optional[str] = Field(None, description="Current node description")
    message: str = Field(..., description="The user's message to analyze")
    conversation_history: List[str] = Field(default_factory=list, description="Recent messages (last 5)")
    project_id: str = Field(..., description="Project ID")
    session_id: str = Field(..., description="Tree session ID")
    existing_nodes_count: Optional[int] = Field(None, description="Number of existing child nodes")


class ActionExecutionRequest(BaseModel):
    """Request to execute a detected action"""
    intent_id: str = Field(..., description="ID of the intent to execute")
    action_type: ActionType = Field(..., description="Type of action to execute")
    parameters: Dict[str, Any] = Field(..., description="Parameters for execution")
    context: Dict[str, Any] = Field(..., description="Execution context (node_id, project_id, etc.)")
    user_id: Optional[int] = Field(None, description="User ID executing the action")
    confirmed: bool = Field(True, description="Whether user confirmed the action")


class ActionExecutionResult(BaseModel):
    """Result of executing an action"""
    success: bool = Field(..., description="Whether execution succeeded")
    action_type: ActionType = Field(..., description="Type of action executed")
    message: str = Field(..., description="Human-readable result message")
    created_nodes: List[Dict[str, Any]] = Field(default_factory=list, description="Nodes created by this action")
    created_dependencies: List[Dict[str, Any]] = Field(default_factory=list, description="Dependencies created")
    error: Optional[str] = Field(None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional execution metadata")

    class Config:
        use_enum_values = True


class IntentSuggestion(BaseModel):
    """A packaged suggestion ready for UI display"""
    intent: DetectedIntent
    ui_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="UI-specific data (icons, colors, etc.)"
    )
    estimated_time: Optional[str] = Field(None, description="Estimated time to complete")
    estimated_nodes: Optional[int] = Field(None, description="Estimated number of nodes to be created")
