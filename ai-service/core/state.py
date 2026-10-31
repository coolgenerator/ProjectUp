"""
Base state schemas shared across workflows
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage


class BaseState(TypedDict):
    """Base state that all workflows can extend"""
    messages: Annotated[List[BaseMessage], operator.add]
    current_step: str
    error: Optional[str]
    metadata: Dict[str, Any]


class WorkflowState(BaseState):
    """Extended state for complex workflows"""
    workflow_id: str
    user_id: str
    session_id: str
    context: Dict[str, Any]
    history: List[Dict[str, Any]]


class AgentState(BaseState):
    """State for agent-based workflows"""
    agent_id: str
    tools_called: List[str]
    tool_results: Dict[str, Any]
    next_action: str


class ChatState(BaseState):
    """State for chat workflows"""
    user_input: str
    assistant_response: str
    conversation_history: List[Dict[str, str]]
    context_window: int


class ResearchState(BaseState):
    """State for research workflows"""
    query: str
    sources: List[Dict[str, Any]]
    findings: List[str]
    synthesis: str
    confidence_score: float