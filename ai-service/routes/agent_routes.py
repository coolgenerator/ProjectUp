"""
Agent routes for the AI Agent API.
Provides endpoints for managing AI agents.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from models.requests.agent_requests import AgentCreateRequest, AgentUpdateRequest
from models.requests.common_requests import MessageRequest
from models.requests.tool_requests import ToolRequest
from services.agent_service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize service
agent_service = AgentService()

@router.post("/agents")
async def create_agent(request: AgentCreateRequest):
    """Create a new AI agent."""
    try:
        result = await agent_service.create_agent(request)
        return result
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/agents/{agent_name}/chat")
async def chat_with_agent(agent_name: str, request: MessageRequest):
    """Send a message to an agent and get a response."""
    try:
        result = await agent_service.send_message(agent_name, request.message)
        return result
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/{agent_name}/tools")
async def use_tool(agent_name: str, request: ToolRequest):
    """Use a tool from an agent."""
    try:
        result = await agent_service.use_tool(
            agent_name, 
            request.tool_name, 
            request.parameters
        )
        return {"result": result}
    except Exception as e:
        logger.error(f"Error using tool: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/agents")
async def list_agents():
    """List all active agents."""
    try:
        result = await agent_service.list_agents()
        return result
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/agents/{agent_name}")
async def delete_agent(agent_name: str):
    """Delete an agent."""
    try:
        result = await agent_service.delete_agent(agent_name)
        return result
    except Exception as e:
        logger.error(f"Error deleting agent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# For compatibility with workflow_routes.py
agents: Dict[str, Any] = {}