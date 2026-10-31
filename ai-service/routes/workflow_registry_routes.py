"""
Workflow Registry Discovery Routes

Provides REST endpoints for:
- Workflow discovery (list, filter, get details)
- Workflow execution
- Integration management (list, configure, execute)
- Custom API management
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Path, Body
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/registry", tags=["workflow-registry"])


# ============================================================================
# Request/Response Models
# ============================================================================

class WorkflowExecuteRequest(BaseModel):
    """Request to execute a workflow"""
    workflow_id: str = Field(..., description="ID of the workflow to execute")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Input data for the workflow")
    project_id: Optional[str] = Field(None, description="Project context")
    user_id: Optional[str] = Field(None, description="User context")


class IntegrationConfigRequest(BaseModel):
    """Request to configure an integration"""
    integration_id: str = Field(..., description="ID of the integration")
    credentials: Dict[str, str] = Field(default_factory=dict, description="Integration credentials")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Additional settings")
    project_id: Optional[str] = Field(None, description="Project to configure for")


class IntegrationExecuteRequest(BaseModel):
    """Request to execute an integration action"""
    integration_id: str = Field(..., description="ID of the configured integration")
    action: str = Field(..., description="Action to perform")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Action payload")
    project_id: Optional[str] = Field(None, description="Project context")


class CustomAPIRequest(BaseModel):
    """Request to register a custom API"""
    api_id: str = Field(..., description="Unique ID for the API")
    name: str = Field(..., description="Display name")
    description: str = Field("", description="API description")
    base_url: str = Field(..., description="Base URL for API calls")
    auth: Dict[str, Any] = Field(default_factory=dict, description="Authentication configuration")
    endpoints: List[Dict[str, Any]] = Field(default_factory=list, description="Available endpoints")
    default_headers: Dict[str, str] = Field(default_factory=dict, description="Default headers")


class CustomAPIExecuteRequest(BaseModel):
    """Request to execute a custom API call"""
    api_config_id: Optional[str] = Field(None, description="Saved API config ID")
    api_config: Optional[Dict[str, Any]] = Field(None, description="Inline API config")
    endpoint: str = Field("", description="Endpoint to call")
    method: str = Field("GET", description="HTTP method")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Request payload")
    query_params: Dict[str, str] = Field(default_factory=dict, description="Query parameters")
    transform_response: bool = Field(False, description="Use AI to transform response")


# ============================================================================
# Workflow Discovery Endpoints
# ============================================================================

@router.get("/workflows", summary="List all available workflows")
async def list_workflows(
    context: Optional[str] = Query(None, description="Filter by context (idea_tree, task_board, project, etc.)"),
    category: Optional[str] = Query(None, description="Filter by category (planning, breakdown, learning, analysis, integration)")
):
    """
    Get a list of all available workflows.

    Optionally filter by context or category.
    """
    try:
        from workflows.registry.loader import workflow_registry

        if context:
            workflows_dict = workflow_registry.get_workflows_for_context(context)
        elif category:
            workflows_dict = workflow_registry.get_workflows_by_category(category)
        else:
            workflows_dict = workflow_registry.get_all_workflows()

        workflows = list(workflows_dict.values())

        return {
            "success": True,
            "workflows": [w.to_discovery_response() for w in workflows],
            "total": len(workflows),
            "filters": {
                "context": context,
                "category": category
            }
        }
    except Exception as e:
        logger.error(f"Error listing workflows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflows/{workflow_id}", summary="Get workflow details")
async def get_workflow(
    workflow_id: str = Path(..., description="Workflow ID")
):
    """Get detailed information about a specific workflow."""
    try:
        from workflows.registry.loader import workflow_registry

        workflow = workflow_registry.get_workflow(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")

        return {
            "success": True,
            "workflow": workflow.to_discovery_response()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflows/context/{context}", summary="Get workflows for a context")
async def get_workflows_for_context(
    context: str = Path(..., description="Context name (idea_tree, task_board, project, etc.)")
):
    """Get all workflows available for a specific context."""
    try:
        from workflows.registry.loader import workflow_registry

        workflows_dict = workflow_registry.get_workflows_for_context(context)
        workflows = list(workflows_dict.values())

        return {
            "success": True,
            "context": context,
            "workflows": [w.to_discovery_response() for w in workflows],
            "total": len(workflows)
        }
    except Exception as e:
        logger.error(f"Error getting workflows for context {context}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories", summary="List workflow categories")
async def list_categories():
    """Get all available workflow categories."""
    try:
        from workflows.registry.loader import workflow_registry

        categories = workflow_registry.get_categories()

        return {
            "success": True,
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "description": cat.description,
                    "icon": cat.icon,
                    "workflow_count": len(workflow_registry.get_workflows_by_category(cat.id))
                }
                for cat in categories
            ]
        }
    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contexts", summary="List available contexts")
async def list_contexts():
    """Get all available workflow contexts."""
    try:
        from workflows.registry.loader import workflow_registry

        contexts = workflow_registry.get_contexts()

        return {
            "success": True,
            "contexts": contexts
        }
    except Exception as e:
        logger.error(f"Error listing contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Workflow Execution Endpoints
# ============================================================================

@router.post("/workflows/execute", summary="Execute a workflow")
async def execute_workflow(request: WorkflowExecuteRequest):
    """
    Execute a workflow with the given input data.

    The workflow will be looked up by ID and executed with the provided input.
    """
    try:
        from workflows.registry.loader import workflow_registry

        result = await workflow_registry.execute(
            workflow_id=request.workflow_id,
            input_data={
                **request.input_data,
                "_project_id": request.project_id,
                "_user_id": request.user_id
            }
        )

        return {
            "success": result.get("success", False),
            "workflow_id": request.workflow_id,
            "result": result,
            "metadata": {
                "project_id": request.project_id,
                "user_id": request.user_id
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing workflow {request.workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Integration Discovery Endpoints
# ============================================================================

@router.get("/integrations", summary="List available integrations")
async def list_integrations(
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Get a list of all available integrations."""
    try:
        from workflows.registry.integration_registry import integration_registry

        integrations = integration_registry.get_all_integrations()

        if category:
            integrations = [i for i in integrations if i.category == category]

        return {
            "success": True,
            "integrations": [i.to_discovery_response() for i in integrations],
            "total": len(integrations),
            "categories": list(set(i.category for i in integration_registry.get_all_integrations()))
        }
    except Exception as e:
        logger.error(f"Error listing integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/integrations/{integration_id}", summary="Get integration details")
async def get_integration(
    integration_id: str = Path(..., description="Integration ID")
):
    """Get detailed information about a specific integration."""
    try:
        from workflows.registry.integration_registry import integration_registry

        integration = integration_registry.get_integration(integration_id)
        if not integration:
            raise HTTPException(status_code=404, detail=f"Integration '{integration_id}' not found")

        return {
            "success": True,
            "integration": integration.to_discovery_response()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting integration {integration_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Integration Configuration Endpoints
# ============================================================================

@router.post("/integrations/configure", summary="Configure an integration")
async def configure_integration(request: IntegrationConfigRequest):
    """
    Configure an integration with credentials and settings.

    This saves the configuration for later use.
    """
    try:
        from workflows.registry.integration_registry import integration_registry, IntegrationConfig
        import uuid

        config = IntegrationConfig(
            id=str(uuid.uuid4()),
            integration_id=request.integration_id,
            name=request.integration_id,
            config=request.settings,
            credentials=request.credentials,
            project_id=request.project_id
        )

        integration_registry.configure_integration(config)

        return {
            "success": True,
            "message": f"Integration '{request.integration_id}' configured successfully",
            "integration_id": request.integration_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error configuring integration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/integrations/configured", summary="List configured integrations")
async def list_configured_integrations(
    project_id: Optional[str] = Query(None, description="Filter by project")
):
    """Get a list of all configured integrations."""
    try:
        from workflows.registry.integration_registry import integration_registry

        configs = integration_registry.get_configured_integrations(project_id)

        return {
            "success": True,
            "configured_integrations": [
                {
                    "integration_id": c.integration_id,
                    "project_id": c.project_id,
                    "configured_at": c.configured_at.isoformat() if c.configured_at else None,
                    "has_credentials": bool(c.credentials)
                }
                for c in configs
            ],
            "total": len(configs)
        }
    except Exception as e:
        logger.error(f"Error listing configured integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/integrations/configured/{integration_id}", summary="Remove integration configuration")
async def remove_integration_config(
    integration_id: str = Path(..., description="Integration ID"),
    project_id: Optional[str] = Query(None, description="Project ID")
):
    """Remove an integration configuration."""
    try:
        from workflows.registry.integration_registry import integration_registry

        integration_registry.remove_configuration(integration_id, project_id)

        return {
            "success": True,
            "message": f"Integration configuration removed",
            "integration_id": integration_id
        }
    except Exception as e:
        logger.error(f"Error removing integration config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Integration Execution Endpoints
# ============================================================================

@router.post("/integrations/execute", summary="Execute an integration action")
async def execute_integration(request: IntegrationExecuteRequest):
    """
    Execute an action on a configured integration.

    The integration must be configured with credentials first.
    """
    try:
        from workflows.registry.integration_registry import integration_registry

        result = await integration_registry.execute(
            integration_id=request.integration_id,
            action=request.action,
            payload=request.payload,
            project_id=request.project_id
        )

        return {
            "success": result.get("success", False),
            "integration_id": request.integration_id,
            "action": request.action,
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing integration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Custom API Endpoints
# ============================================================================

@router.post("/custom-apis", summary="Register a custom API")
async def register_custom_api(request: CustomAPIRequest):
    """
    Register a new custom API configuration.

    This allows users to define their own API integrations.
    """
    try:
        from workflows.registry.integration_registry import integration_registry, CustomAPIConfig, AuthType, EndpointDefinition

        # Convert auth config
        auth_type = AuthType(request.auth.get("type", "none")) if request.auth else AuthType.NONE

        # Convert endpoints
        endpoints = {}
        for ep in request.endpoints:
            ep_name = ep.get("name", ep.get("path", "default"))
            endpoints[ep_name] = EndpointDefinition(**ep)

        config = CustomAPIConfig(
            id=request.api_id,
            name=request.name,
            description=request.description,
            base_url=request.base_url,
            auth_type=auth_type,
            auth_config=request.auth,
            endpoints=endpoints,
            default_headers=request.default_headers
        )

        integration_registry.register_custom_api(config)

        return {
            "success": True,
            "message": f"Custom API '{request.name}' registered successfully",
            "api_id": request.api_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error registering custom API: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-apis", summary="List custom APIs")
async def list_custom_apis():
    """Get a list of all registered custom APIs."""
    try:
        from workflows.registry.integration_registry import integration_registry

        apis = integration_registry.get_custom_apis()

        return {
            "success": True,
            "custom_apis": [
                {
                    "api_id": api.api_id,
                    "name": api.name,
                    "description": api.description,
                    "base_url": api.base_url,
                    "endpoint_count": len(api.endpoints),
                    "auth_type": api.auth.get("type", "none")
                }
                for api in apis
            ],
            "total": len(apis)
        }
    except Exception as e:
        logger.error(f"Error listing custom APIs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-apis/{api_id}", summary="Get custom API details")
async def get_custom_api(
    api_id: str = Path(..., description="API ID")
):
    """Get detailed information about a custom API."""
    try:
        from workflows.registry.integration_registry import integration_registry

        api = integration_registry.get_custom_api(api_id)
        if not api:
            raise HTTPException(status_code=404, detail=f"Custom API '{api_id}' not found")

        return {
            "success": True,
            "custom_api": api.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting custom API {api_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/custom-apis/{api_id}", summary="Remove a custom API")
async def remove_custom_api(
    api_id: str = Path(..., description="API ID")
):
    """Remove a custom API registration."""
    try:
        from workflows.registry.integration_registry import integration_registry

        integration_registry.remove_custom_api(api_id)

        return {
            "success": True,
            "message": f"Custom API '{api_id}' removed",
            "api_id": api_id
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error removing custom API: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-apis/execute", summary="Execute a custom API call")
async def execute_custom_api(request: CustomAPIExecuteRequest):
    """
    Execute a call to a custom API.

    Can use either a saved API config ID or provide an inline configuration.
    """
    try:
        from workflows.registry.loader import workflow_registry

        result = await workflow_registry.execute(
            workflow_id="execute_custom_api",
            input_data={
                "api_config_id": request.api_config_id,
                "api_config": request.api_config,
                "endpoint": request.endpoint,
                "method": request.method,
                "payload": request.payload,
                "query_params": request.query_params,
                "transform_response": request.transform_response
            }
        )

        return {
            "success": result.get("success", False),
            "result": result
        }
    except Exception as e:
        logger.error(f"Error executing custom API: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Discovery Response Endpoint (Combined)
# ============================================================================

@router.get("/discovery", summary="Get full discovery response")
async def get_discovery_response(
    context: Optional[str] = Query(None, description="Optional context filter")
):
    """
    Get a combined discovery response with all workflows, integrations, and custom APIs.

    This is useful for frontend initialization.
    """
    try:
        from workflows.registry.loader import workflow_registry
        from workflows.registry.integration_registry import integration_registry

        # Get workflows
        if context:
            workflows_dict = workflow_registry.get_workflows_for_context(context)
        else:
            workflows_dict = workflow_registry.get_all_workflows()

        workflows = list(workflows_dict.values())

        # Get categories
        categories = workflow_registry.get_categories()

        # Get integrations
        integrations = integration_registry.get_all_integrations()

        # Get custom APIs
        custom_apis = integration_registry.get_custom_apis()

        return {
            "success": True,
            "workflows": {
                "items": [w.to_discovery_response() for w in workflows],
                "total": len(workflows),
                "by_category": {
                    cat.id: [
                        w.to_discovery_response()
                        for w in workflow_registry.get_workflows_by_category(cat.id).values()
                    ]
                    for cat in categories
                }
            },
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "description": cat.description,
                    "icon": cat.icon
                }
                for cat in categories
            ],
            "contexts": workflow_registry.get_contexts(),
            "integrations": {
                "items": [i.to_discovery_response() for i in integrations],
                "total": len(integrations),
                "categories": list(set(i.category for i in integrations))
            },
            "custom_apis": {
                "items": [
                    {
                        "api_id": api.id,
                        "name": api.name,
                        "description": api.description
                    }
                    for api in custom_apis
                ],
                "total": len(custom_apis)
            }
        }
    except Exception as e:
        logger.error(f"Error getting discovery response: {e}")
        raise HTTPException(status_code=500, detail=str(e))
