"""
Agent-related request schemas for the AI Agent system.
"""

from typing import Optional, List
from pydantic import BaseModel


class AgentCreateRequest(BaseModel):
    """Request model for creating agents."""
    name: str
    provider: str  # 'openai', 'google', 'anthropic', 'custom'
    model: str
    temperature: float = 0.7
    max_tokens: int = 8000
    memory_size: int = 10
    enable_url_search: bool = True
    enable_image_processing: bool = True
    enable_link_validator: bool = True
    google_vision_credentials: Optional[str] = None
    use_entity_memory: bool = False
    unlimited_memory: bool = False
    api_key: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None


class AgentUpdateRequest(BaseModel):
    """Request model for updating agents."""
    name: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    memory_size: Optional[int] = None
    enable_url_search: Optional[bool] = None
    enable_image_processing: Optional[bool] = None
    enable_link_validator: Optional[bool] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None