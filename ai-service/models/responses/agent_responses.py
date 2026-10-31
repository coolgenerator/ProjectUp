"""
Agent-related response schemas for the AI Agent system.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime


class AgentInfo(BaseModel):
    """Model for agent information."""
    agent_id: str
    name: str
    provider: str
    model: str
    status: str  # 'active', 'inactive', 'error'
    capabilities: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    """Response model for agent operations."""
    success: bool
    agent: Optional[AgentInfo] = None
    message: Optional[str] = None
    error: Optional[str] = None


class AgentListResponse(BaseModel):
    """Response model for listing agents."""
    agents: List[AgentInfo]
    total_count: int
    active_count: int
    metadata: Optional[Dict[str, Any]] = None