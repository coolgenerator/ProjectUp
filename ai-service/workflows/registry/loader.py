"""
Workflow Registry - Central registry for all AI workflows.

Enables:
- Dynamic workflow discovery
- Cross-context sharing (IdeaTree, TaskBoard, etc.)
- Unified execution interface
- Frontend discovery API
"""

from typing import Dict, List, Optional, Callable, Any, Union
from pathlib import Path
import importlib
import logging
import yaml
from pydantic import BaseModel, Field
from enum import Enum

logger = logging.getLogger(__name__)


class WorkflowCategory(BaseModel):
    """Category grouping for workflows"""
    id: str
    name: str
    description: str
    icon: str
    order: int = 0


class InputSchemaField(BaseModel):
    """Schema field definition"""
    type: str
    description: Optional[str] = None
    default: Optional[Any] = None
    enum: Optional[List[str]] = None
    items: Optional[Union[str, Dict]] = None
    nullable: Optional[bool] = False


class WorkflowDefinition(BaseModel):
    """Schema for workflow definitions"""
    name: str
    description: str
    category: str
    icon: str
    contexts: List[str]  # ideatree, taskboard, courses, etc.
    handler: str  # module.function path
    cross_reference: Optional[str] = None
    enabled: bool = True
    requires_integration: bool = False
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    _id: Optional[str] = None  # Set by registry after loading

    class Config:
        extra = "allow"

    def to_discovery_response(self) -> Dict[str, Any]:
        """Convert to frontend-friendly format"""
        return {
            "id": self._id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "icon": self.icon,
            "contexts": self.contexts,
            "cross_reference": self.cross_reference,
            "requires_integration": self.requires_integration,
            "input_schema": self.input_schema
        }


class WorkflowExecutionResult(BaseModel):
    """Result from workflow execution"""
    success: bool
    result: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    workflow_id: str
    context: str
    execution_time_ms: Optional[float] = None


class WorkflowRegistry:
    """
    Central registry for all workflows.

    Features:
    - Load workflows from YAML definition
    - Dynamic handler discovery
    - Cross-context workflow sharing
    - Frontend discovery API

    Usage:
        registry = WorkflowRegistry()

        # Get workflows for a context
        workflows = registry.get_workflows_for_context('ideatree')

        # Execute a workflow
        result = await registry.execute('generate_tasks', input_data, 'ideatree')

        # Get cross-reference
        cross_ref = registry.get_cross_reference('generate_tasks')
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._workflows: Dict[str, WorkflowDefinition] = {}
        self._categories: Dict[str, WorkflowCategory] = {}
        self._handlers: Dict[str, Callable] = {}
        self._definitions: Dict[str, Any] = {}
        self._load_registry()
        self._initialized = True

    def _load_registry(self):
        """Load workflow definitions from YAML"""
        registry_path = Path(__file__).parent / "workflow_registry.yaml"

        try:
            with open(registry_path) as f:
                data = yaml.safe_load(f)

            # Load categories
            for cat_data in data.get("categories", []):
                self._categories[cat_data["id"]] = WorkflowCategory(**cat_data)

            # Load workflows
            for workflow_id, config in data.get("workflows", {}).items():
                try:
                    workflow = WorkflowDefinition(**config)
                    workflow._id = workflow_id
                    self._workflows[workflow_id] = workflow
                except Exception as e:
                    logger.error(f"Failed to load workflow '{workflow_id}': {e}")

            # Load type definitions
            self._definitions = data.get("definitions", {})

            logger.info(f"Loaded {len(self._workflows)} workflows in {len(self._categories)} categories")

        except FileNotFoundError:
            logger.warning(f"Workflow registry not found at {registry_path}")
        except Exception as e:
            logger.error(f"Failed to load workflow registry: {e}")

    def _load_handler(self, handler_path: str) -> Callable:
        """
        Dynamically load handler function.

        Handler path format: "module.function_name"
        Resolves to: workflows.handlers.{module}.{function_name}
        """
        if handler_path in self._handlers:
            return self._handlers[handler_path]

        try:
            module_path, func_name = handler_path.rsplit(".", 1)
            module = importlib.import_module(f"workflows.handlers.{module_path}")
            handler = getattr(module, func_name)
            self._handlers[handler_path] = handler
            return handler
        except Exception as e:
            logger.error(f"Failed to load handler '{handler_path}': {e}")
            raise ValueError(f"Handler not found: {handler_path}")

    def reload(self):
        """Reload the registry from YAML (useful for development)"""
        self._workflows.clear()
        self._categories.clear()
        self._handlers.clear()
        self._load_registry()

    # ═══════════════════════════════════════════════════════════════════════
    # QUERY METHODS
    # ═══════════════════════════════════════════════════════════════════════

    def get_workflow(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get single workflow by ID"""
        return self._workflows.get(workflow_id)

    def get_all_workflows(self) -> Dict[str, WorkflowDefinition]:
        """Get all registered workflows"""
        return self._workflows.copy()

    def get_enabled_workflows(self) -> Dict[str, WorkflowDefinition]:
        """Get only enabled workflows"""
        return {
            wid: w for wid, w in self._workflows.items()
            if w.enabled
        }

    def get_workflows_for_context(self, context: str) -> Dict[str, WorkflowDefinition]:
        """
        Get all workflows available in a context.

        Args:
            context: 'ideatree', 'taskboard', 'courses', etc.

        Returns:
            Dict mapping workflow_id to WorkflowDefinition
        """
        return {
            wid: w for wid, w in self._workflows.items()
            if context in w.contexts and w.enabled
        }

    def get_workflows_by_category(
        self,
        category: str,
        context: Optional[str] = None
    ) -> Dict[str, WorkflowDefinition]:
        """
        Get workflows by category, optionally filtered by context.

        Args:
            category: 'planning', 'breakdown', 'learning', 'analysis', 'integration'
            context: Optional context filter
        """
        workflows = {
            wid: w for wid, w in self._workflows.items()
            if w.category == category and w.enabled
        }

        if context:
            workflows = {
                wid: w for wid, w in workflows.items()
                if context in w.contexts
            }

        return workflows

    def get_cross_reference(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """
        Get the equivalent workflow in another context.

        Example:
            cross_ref = registry.get_cross_reference('generate_tasks')
            # Returns 'task_breakdown' definition
        """
        workflow = self._workflows.get(workflow_id)
        if workflow and workflow.cross_reference:
            return self._workflows.get(workflow.cross_reference)
        return None

    def get_shared_workflows(self) -> Dict[str, WorkflowDefinition]:
        """Get workflows available in multiple contexts"""
        return {
            wid: w for wid, w in self._workflows.items()
            if len(w.contexts) > 1 and w.enabled
        }

    def get_categories(self) -> List[WorkflowCategory]:
        """Get all workflow categories sorted by order"""
        return sorted(self._categories.values(), key=lambda c: c.order)

    def get_category(self, category_id: str) -> Optional[WorkflowCategory]:
        """Get a specific category by ID"""
        return self._categories.get(category_id)

    def get_contexts(self) -> List[str]:
        """Get all unique contexts across workflows"""
        contexts = set()
        for w in self._workflows.values():
            contexts.update(w.contexts)
        return sorted(list(contexts))

    def get_integration_workflows(self) -> Dict[str, WorkflowDefinition]:
        """Get workflows that require integrations"""
        return {
            wid: w for wid, w in self._workflows.items()
            if w.requires_integration and w.enabled
        }

    # ═══════════════════════════════════════════════════════════════════════
    # EXECUTION
    # ═══════════════════════════════════════════════════════════════════════

    async def execute(
        self,
        workflow_id: str,
        input_data: Dict[str, Any],
        context: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs
    ) -> WorkflowExecutionResult:
        """
        Execute a workflow by ID.

        Args:
            workflow_id: The workflow to execute
            input_data: Input parameters matching input_schema
            context: The calling context (for validation & analytics)
            user_id: Optional user ID for tracking
            project_id: Optional project ID for context enrichment
            **kwargs: Additional arguments passed to handler

        Returns:
            WorkflowExecutionResult with success status and result data

        Raises:
            ValueError: If workflow not found or context not allowed
        """
        import time
        start_time = time.time()

        workflow = self.get_workflow(workflow_id)

        if not workflow:
            return WorkflowExecutionResult(
                success=False,
                error=f"Unknown workflow: {workflow_id}",
                workflow_id=workflow_id,
                context=context
            )

        if not workflow.enabled:
            return WorkflowExecutionResult(
                success=False,
                error=f"Workflow '{workflow_id}' is disabled",
                workflow_id=workflow_id,
                context=context
            )

        if context not in workflow.contexts:
            return WorkflowExecutionResult(
                success=False,
                error=f"Workflow '{workflow_id}' not available in context '{context}'. Available: {workflow.contexts}",
                workflow_id=workflow_id,
                context=context
            )

        try:
            # Load handler
            handler = self._load_handler(workflow.handler)

            # Enrich input with metadata
            enriched_input = {
                **input_data,
                "_workflow_id": workflow_id,
                "_workflow_name": workflow.name,
                "_context": context,
                "_user_id": user_id,
                "_project_id": project_id
            }

            # Execute handler
            result = await handler(enriched_input, **kwargs)

            execution_time = (time.time() - start_time) * 1000

            return WorkflowExecutionResult(
                success=True,
                result=result if isinstance(result, dict) else {"data": result},
                workflow_id=workflow_id,
                context=context,
                execution_time_ms=execution_time
            )

        except Exception as e:
            logger.error(f"Workflow execution failed for '{workflow_id}': {e}", exc_info=True)
            execution_time = (time.time() - start_time) * 1000

            return WorkflowExecutionResult(
                success=False,
                error=str(e),
                workflow_id=workflow_id,
                context=context,
                execution_time_ms=execution_time
            )

    # ═══════════════════════════════════════════════════════════════════════
    # DISCOVERY API (for frontend)
    # ═══════════════════════════════════════════════════════════════════════

    def to_discovery_response(self, context: Optional[str] = None) -> Dict:
        """
        Generate API response for frontend discovery.

        Returns structure that frontend can use to build dynamic UI.
        Replaces hardcoded questionRegistry.ts.
        """
        if context:
            workflows = self.get_workflows_for_context(context)
        else:
            workflows = self.get_enabled_workflows()

        # Get categories that have workflows in this context
        active_category_ids = set(w.category for w in workflows.values())

        return {
            "workflows": [
                {
                    "id": wid,
                    "name": w.name,
                    "description": w.description,
                    "category": w.category,
                    "icon": w.icon,
                    "contexts": w.contexts,
                    "cross_reference": w.cross_reference,
                    "requires_integration": w.requires_integration,
                    "input_schema": w.input_schema
                }
                for wid, w in workflows.items()
            ],
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "icon": c.icon,
                    "order": c.order
                }
                for c in self.get_categories()
                if c.id in active_category_ids
            ],
            "available_contexts": list(set(
                ctx for w in workflows.values() for ctx in w.contexts
            ))
        }

    def get_workflow_schema(self, workflow_id: str) -> Optional[Dict]:
        """Get the input/output schema for a workflow"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return None

        return {
            "input_schema": workflow.input_schema,
            "output_schema": workflow.output_schema,
            "definitions": self._definitions
        }


# Singleton instance
workflow_registry = WorkflowRegistry()
