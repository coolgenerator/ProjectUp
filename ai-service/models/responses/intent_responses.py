"""
Intent Detection Response Models
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from models.entities.intent import DetectedIntent, ActionExecutionResult


class DetectIntentsResponse(BaseModel):
    """Response containing detected intents"""
    success: bool = Field(..., description="Whether intent detection succeeded")
    intents: List[DetectedIntent] = Field(default_factory=list, description="Detected intents")
    message: Optional[str] = Field(None, description="Additional message or context")
    processing_time_ms: Optional[float] = Field(None, description="Time taken to process")


class ExecuteActionResponse(BaseModel):
    """Response from executing an action"""
    success: bool = Field(..., description="Whether execution succeeded")
    result: Optional[ActionExecutionResult] = Field(None, description="Execution result")
    error: Optional[str] = Field(None, description="Error message if failed")


class BatchExecuteActionsResponse(BaseModel):
    """Response from batch executing actions"""
    success: bool = Field(..., description="Whether all executions succeeded")
    results: List[ActionExecutionResult] = Field(default_factory=list, description="Individual results")
    total_nodes_created: int = Field(0, description="Total number of nodes created")
    total_dependencies_created: int = Field(0, description="Total dependencies created")
    errors: List[str] = Field(default_factory=list, description="Any errors encountered")
