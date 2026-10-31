"""
LangGraph workflow routes for the AI Agent API.
Provides endpoints for creating, executing, and managing workflows.
"""

import logging
import os
import sys
from typing import Dict, Any

from fastapi import APIRouter, HTTPException

from models.requests.workflow_requests import (
    WorkflowCreateRequest,
    WorkflowExecuteRequest,
    WorkflowImportRequest,
    CustomWorkflowDefinition
)
from models.responses.workflow_responses import (
    WorkflowExecutionResult,
    WorkflowListResponse
)
from services.workflow_service import WorkflowService

# Import agents from agent_routes to access existing agents
from .agent_routes import agents

# Try to import workflow templates
try:
    from core.langgraph_workflow import WorkflowTemplate
except ImportError:
    WorkflowTemplate = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.post("/create")
async def create_workflow(request: WorkflowCreateRequest):
    """Create a new LangGraph workflow."""
    try:
        # For now, use the first available agent
        # In a production system, you might want to specify which agent to use
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent (or you could add agent_name to the request)
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows. Ensure LangGraph is installed."
            )
        
        # Create workflow based on type
        result = agent.create_workflow(
            workflow_type=request.workflow_type,
            workflow_id=request.workflow_id,
            custom_definition=request.custom_definition
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create workflow")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute")
async def execute_workflow(request: WorkflowExecuteRequest):
    """Execute a workflow with the given input."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Execute workflow
        result = agent.execute_workflow(
            workflow_id=request.workflow_id,
            message=request.message,
            session_id=request.session_id,
            config=request.config
        )
        
        if result.get("status") == "error":
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Workflow execution failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_workflows():
    """List all available workflows."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            return {
                "workflows": {},
                "count": 0,
                "success": True,
                "message": "LangGraph not available - no workflows"
            }
        
        # List workflows
        result = agent.list_workflows()
        return result
        
    except Exception as e:
        logger.error(f"Error listing workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}")
async def get_workflow_info(workflow_id: str):
    """Get information about a specific workflow."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Get workflow info
        result = agent.get_workflow_info(workflow_id)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Workflow not found")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting workflow info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Delete workflow
        result = agent.delete_workflow(workflow_id)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "Workflow not found")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error deleting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/export")
async def export_workflow(workflow_id: str):
    """Export workflow definition."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Export workflow
        result = agent.export_workflow(workflow_id)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Workflow not found")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error exporting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_workflow(request: WorkflowImportRequest):
    """Import workflow definition."""
    try:
        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Import workflow
        result = agent.import_workflow(
            workflow_definition=request.workflow_definition,
            workflow_id=request.workflow_id
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to import workflow")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error importing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/qa")
async def create_qa_workflow():
    """Create a Q&A workflow from template."""
    try:
        if WorkflowTemplate is None:
            raise HTTPException(
                status_code=400,
                detail="WorkflowTemplate not available. Please check dependencies."
            )

        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Create Q&A workflow from template
        template = WorkflowTemplate.create_simple_qa_workflow()
        result = agent.create_workflow(
            workflow_type="custom",
            custom_definition=template
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create Q&A workflow")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating Q&A workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/content-analysis")
async def create_content_analysis_workflow():
    """Create a content analysis workflow from template."""
    try:
        if WorkflowTemplate is None:
            raise HTTPException(
                status_code=400,
                detail="WorkflowTemplate not available. Please check dependencies."
            )

        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Create content analysis workflow from template
        template = WorkflowTemplate.create_content_analysis_workflow()
        result = agent.create_workflow(
            workflow_type="custom",
            custom_definition=template
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create content analysis workflow")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating content analysis workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/decision-support")
async def create_decision_support_workflow():
    """Create a decision support workflow from template."""
    try:
        if WorkflowTemplate is None:
            raise HTTPException(
                status_code=400,
                detail="WorkflowTemplate not available. Please check dependencies."
            )

        if not agents:
            raise HTTPException(
                status_code=400, 
                detail="No agents available. Create an agent first."
            )
        
        # Get the first agent
        agent_name = list(agents.keys())[0]
        agent = agents[agent_name]
        
        # Check if agent has LangGraph capabilities
        if not hasattr(agent, 'use_langgraph') or not agent.use_langgraph:
            raise HTTPException(
                status_code=400,
                detail="Agent does not support LangGraph workflows"
            )
        
        # Create decision support workflow from template
        template = WorkflowTemplate.create_decision_support_workflow()
        result = agent.create_workflow(
            workflow_type="custom",
            custom_definition=template
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create decision support workflow")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating decision support workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/list")
async def list_workflow_templates():
    """List available workflow templates."""
    try:
        templates = [
            {
                "name": "qa",
                "description": "Simple Q&A workflow with context retrieval",
                "endpoint": "/workflows/templates/qa"
            },
            {
                "name": "content_analysis", 
                "description": "Content analysis workflow with multiple validation steps",
                "endpoint": "/workflows/templates/content-analysis"
            },
            {
                "name": "decision_support",
                "description": "Decision support workflow with pros/cons analysis",
                "endpoint": "/workflows/templates/decision-support"
            },
            {
                "name": "basic_chat",
                "description": "Basic chat workflow with agent and tool processing",
                "endpoint": "/workflows/create (workflow_type: 'chat')"
            },
            {
                "name": "project_planning",
                "description": "Project planning workflow with idea generation and roadmap creation",
                "endpoint": "/workflows/create (workflow_type: 'project')"
            },
            {
                "name": "research",
                "description": "Research workflow with web search, validation, and synthesis",
                "endpoint": "/workflows/create (workflow_type: 'research')"
            }
        ]
        
        return {
            "templates": templates,
            "count": len(templates),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error listing workflow templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
