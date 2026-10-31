# IdeaTree Workflow Integration & Question Matching Plan

## Overview

This document outlines the plan to:

1. Create a **centralized Workflow Registry** as an extension system
2. Add a visible workflow UI under IdeaTree that consumes the registry
3. Create unified question matching between IdeaTree and Task Management Board
4. Enable dynamic workflow discovery across all contexts

**Status:** Planning
**Created:** November 25, 2025
**Updated:** November 25, 2025
**Version:** 2.0 (Extension Architecture)

---

## Architectural Decision: Extension Pattern

### Decision

**Use a separate Workflow Registry with extension pattern** rather than merging workflows directly into IdeaTree.

### Rationale

| Approach                | Pros                                         | Cons                                                |
| ----------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Merge into IdeaTree** | Simpler initial implementation               | Feature lock-in, testing complexity, no reusability |
| **Extension Pattern**   | Reusable, testable, composable, discoverable | More upfront infrastructure                         |

### Why Extension Pattern Wins

| Benefit                   | Explanation                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Reusability**           | Same workflow callable from IdeaTree, Task Board, API, future features        |
| **Independent Evolution** | Workflows can be updated without touching UI code                             |
| **Testability**           | Unit test workflows in isolation                                              |
| **Composability**         | Chain workflows together for complex operations                               |
| **Dynamic Discovery**     | UI can discover available workflows at runtime                                |
| **Shared Handlers**       | `generate_tasks` (IdeaTree) and `task_breakdown` (TaskBoard) use same handler |

---

## Current State Analysis

### Existing Systems

| System              | Location                                           | Status                                                      |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| **IdeaTree**        | `/frontend/src/components/project/IdeaForest/`     | Full implementation with AI chat, node types, visual canvas |
| **Task Management** | `/frontend/src/components/project/TaskManagement/` | Complete with Kanban, timeline, dependencies                |
| **AI Workflows**    | `/ai-service/workflows/`                           | Multiple workflows, tightly coupled to features             |

### Current Workflow Architecture Issues

```
Current State (Tight Coupling):

IdeaTree ──────────► IdeaTreeWorkflow (955 lines, 10 handlers)
                          │
                          ├── expand_idea
                          ├── generate_tasks      ◄── Duplicates TaskBoard logic
                          ├── find_resources      ◄── Could be shared
                          └── ...

TaskBoard ─────────► TaskBreakdownExecutor
                          │
                          └── task_breakdown      ◄── Same as generate_tasks!
```

**Problems:**

- Duplicate logic between IdeaTree and TaskBoard
- No way to discover available workflows
- Frontend hardcodes workflow types
- Can't add new workflows without code changes

---

## Part 1: Workflow Registry System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW REGISTRY                            │
│              /ai-service/workflows/registry/                    │
│                                                                 │
│  workflow_registry.yaml  ←── Declarative definitions           │
│  loader.py               ←── Dynamic discovery & execution     │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  planning/  │  │  breakdown/ │  │  learning/  │  ...more    │
│  │  handlers   │  │  handlers   │  │  handlers   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │   IdeaTree    │  │  Task Board   │  │   Courses     │
    │   (consumer)  │  │   (consumer)  │  │   (consumer)  │
    └───────────────┘  └───────────────┘  └───────────────┘
```

### 1.1 Workflow Registry Definition

**File:** `/ai-service/workflows/registry/workflow_registry.yaml`

```yaml
# Workflow Registry - Central definition of all AI workflows
# Workflows are grouped by category and can be used across multiple contexts

version: "1.0"

categories:
  - id: planning
    name: Planning
    description: Strategic planning and roadmap workflows
    icon: "📋"
  - id: breakdown
    name: Breakdown
    description: Decompose ideas and tasks into smaller pieces
    icon: "🔨"
  - id: learning
    name: Learning
    description: Educational resources and learning paths
    icon: "📚"
  - id: analysis
    name: Analysis
    description: Feasibility, effort, and dependency analysis
    icon: "🔍"

workflows:
  # ══════════════════════════════════════════════════════════════
  # PLANNING WORKFLOWS
  # ══════════════════════════════════════════════════════════════

  expand_idea:
    name: "Expand Idea"
    description: "Break down an idea into sub-components and explore dimensions"
    category: planning
    icon: "💡"
    contexts:
      - ideatree
    handler: "planning.expand_idea_handler"
    cross_reference: null  # IdeaTree only
    input_schema:
      required:
        - title: string
        - description: string
      optional:
        - depth: number  # Default: 2
        - focus_areas: list[string]
    output_schema:
      suggestions: list[Suggestion]
      child_ideas: list[IdeaNode]
      metadata: object

  generate_plan:
    name: "Generate Plan"
    description: "Create comprehensive project plan with milestones and tasks"
    category: planning
    icon: "📋"
    contexts:
      - ideatree
      - taskboard
    handler: "planning.generate_plan_handler"
    cross_reference: null
    input_schema:
      required:
        - title: string
        - description: string
      optional:
        - include_milestones: boolean  # Default: true
        - include_tasks: boolean  # Default: true
        - timeline_weeks: number

  suggest_milestones:
    name: "Suggest Milestones"
    description: "Create project checkpoints and deliverables"
    category: planning
    icon: "🎯"
    contexts:
      - ideatree
    handler: "planning.suggest_milestones_handler"
    cross_reference: null

  # ══════════════════════════════════════════════════════════════
  # BREAKDOWN WORKFLOWS (Shared handlers!)
  # ══════════════════════════════════════════════════════════════

  generate_tasks:
    name: "Generate Tasks"
    description: "Create actionable tasks from idea or plan"
    category: breakdown
    icon: "✅"
    contexts:
      - ideatree
      - taskboard
    handler: "breakdown.generate_tasks_handler"  # SHARED HANDLER
    cross_reference: task_breakdown
    input_schema:
      required:
        - source_type: enum[idea, plan, task]
        - source_id: string
        - source_content: string
      optional:
        - num_tasks: number
        - include_estimates: boolean
        - include_dependencies: boolean

  task_breakdown:
    name: "Break Down Task"
    description: "Split task into subtasks with estimates"
    category: breakdown
    icon: "🔨"
    contexts:
      - taskboard
      - ideatree
    handler: "breakdown.generate_tasks_handler"  # SAME HANDLER as generate_tasks
    cross_reference: generate_tasks
    input_schema:
      required:
        - task_id: string
        - task_title: string
        - task_description: string
      optional:
        - subtask_count: number
        - detail_level: enum[brief, detailed]

  # ══════════════════════════════════════════════════════════════
  # LEARNING WORKFLOWS
  # ══════════════════════════════════════════════════════════════

  find_resources:
    name: "Find Resources"
    description: "Discover learning materials, courses, and documentation"
    category: learning
    icon: "📚"
    contexts:
      - ideatree
      - taskboard
    handler: "learning.find_resources_handler"
    cross_reference: task_guidance
    input_schema:
      required:
        - topic: string
      optional:
        - skill_level: enum[beginner, intermediate, advanced]
        - resource_types: list[enum[video, article, course, book, docs]]
        - max_results: number

  task_guidance:
    name: "How Do I Do This?"
    description: "Get step-by-step guidance for completing a task"
    category: learning
    icon: "💡"
    contexts:
      - taskboard
      - ideatree
    handler: "learning.find_resources_handler"  # SAME as find_resources
    cross_reference: find_resources

  generate_learning_path:
    name: "Generate Learning Path"
    description: "Create personalized learning journey with modules"
    category: learning
    icon: "🎓"
    contexts:
      - ideatree
    handler: "learning.generate_path_handler"
    cross_reference: null

  # ══════════════════════════════════════════════════════════════
  # ANALYSIS WORKFLOWS
  # ══════════════════════════════════════════════════════════════

  analyze_feasibility:
    name: "Analyze Feasibility"
    description: "Assess technical viability and identify challenges"
    category: analysis
    icon: "🔍"
    contexts:
      - ideatree
    handler: "analysis.feasibility_handler"
    cross_reference: null

  estimate_effort:
    name: "Estimate Effort"
    description: "Get time and complexity estimates"
    category: analysis
    icon: "⏱️"
    contexts:
      - taskboard
    handler: "analysis.effort_handler"
    cross_reference: null

  find_dependencies:
    name: "Find Dependencies"
    description: "Identify task dependencies and blockers"
    category: analysis
    icon: "🔗"
    contexts:
      - taskboard
    handler: "analysis.dependencies_handler"
    cross_reference: null

  analyze_plan:
    name: "Analyze Plan"
    description: "Review and score existing plan"
    category: analysis
    icon: "📊"
    contexts:
      - ideatree
    handler: "analysis.analyze_plan_handler"
    cross_reference: null
```

### 1.2 Workflow Registry Loader

**File:** `/ai-service/workflows/registry/loader.py`

```python
"""
Workflow Registry - Central registry for all AI workflows.

Enables:
- Dynamic workflow discovery
- Cross-context sharing (IdeaTree, TaskBoard, etc.)
- Unified execution interface
- Frontend discovery API
"""

from typing import Dict, List, Optional, Callable, Any
from pathlib import Path
from enum import Enum
import importlib
import yaml
from pydantic import BaseModel, Field

class WorkflowCategory(BaseModel):
    """Category grouping for workflows"""
    id: str
    name: str
    description: str
    icon: str

class WorkflowDefinition(BaseModel):
    """Schema for workflow definitions"""
    name: str
    description: str
    category: str
    icon: str
    contexts: List[str]  # ideatree, taskboard, courses, etc.
    handler: str  # module.function path
    cross_reference: Optional[str] = None
    input_schema: Optional[Dict] = None
    output_schema: Optional[Dict] = None

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
        self._load_registry()
        self._initialized = True

    def _load_registry(self):
        """Load workflow definitions from YAML"""
        registry_path = Path(__file__).parent / "workflow_registry.yaml"

        with open(registry_path) as f:
            data = yaml.safe_load(f)

        # Load categories
        for cat_data in data.get("categories", []):
            self._categories[cat_data["id"]] = WorkflowCategory(**cat_data)

        # Load workflows
        for workflow_id, config in data.get("workflows", {}).items():
            self._workflows[workflow_id] = WorkflowDefinition(**config)

    def _load_handler(self, handler_path: str) -> Callable:
        """
        Dynamically load handler function.

        Handler path format: "module.function_name"
        Resolves to: workflows.handlers.{module}.{function_name}
        """
        if handler_path in self._handlers:
            return self._handlers[handler_path]

        module_path, func_name = handler_path.rsplit(".", 1)
        module = importlib.import_module(f"workflows.handlers.{module_path}")
        handler = getattr(module, func_name)
        self._handlers[handler_path] = handler
        return handler

    # ═══════════════════════════════════════════════════════════════
    # QUERY METHODS
    # ═══════════════════════════════════════════════════════════════

    def get_workflow(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get single workflow by ID"""
        return self._workflows.get(workflow_id)

    def get_all_workflows(self) -> List[WorkflowDefinition]:
        """Get all registered workflows"""
        return list(self._workflows.values())

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
            if context in w.contexts
        }

    def get_workflows_by_category(
        self,
        category: str,
        context: Optional[str] = None
    ) -> Dict[str, WorkflowDefinition]:
        """
        Get workflows by category, optionally filtered by context.

        Args:
            category: 'planning', 'breakdown', 'learning', 'analysis'
            context: Optional context filter
        """
        workflows = {
            wid: w for wid, w in self._workflows.items()
            if w.category == category
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
            if len(w.contexts) > 1
        }

    def get_categories(self) -> List[WorkflowCategory]:
        """Get all workflow categories"""
        return list(self._categories.values())

    # ═══════════════════════════════════════════════════════════════
    # EXECUTION
    # ═══════════════════════════════════════════════════════════════

    async def execute(
        self,
        workflow_id: str,
        input_data: Dict[str, Any],
        context: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute a workflow by ID.

        Args:
            workflow_id: The workflow to execute
            input_data: Input parameters matching input_schema
            context: The calling context (for validation & analytics)
            **kwargs: Additional arguments passed to handler

        Returns:
            Workflow result matching output_schema

        Raises:
            ValueError: If workflow not found or context not allowed
        """
        workflow = self.get_workflow(workflow_id)

        if not workflow:
            raise ValueError(f"Unknown workflow: {workflow_id}")

        if context not in workflow.contexts:
            raise ValueError(
                f"Workflow '{workflow_id}' not available in context '{context}'. "
                f"Available contexts: {workflow.contexts}"
            )

        # Load and execute handler
        handler = self._load_handler(workflow.handler)

        # Add workflow metadata to input
        enriched_input = {
            **input_data,
            "_workflow_id": workflow_id,
            "_context": context,
            "_workflow_name": workflow.name
        }

        return await handler(enriched_input, **kwargs)

    # ═══════════════════════════════════════════════════════════════
    # DISCOVERY API (for frontend)
    # ═══════════════════════════════════════════════════════════════

    def to_discovery_response(self, context: Optional[str] = None) -> Dict:
        """
        Generate API response for frontend discovery.

        Returns structure that frontend can use to build dynamic UI.
        Replaces hardcoded questionRegistry.ts.
        """
        if context:
            workflows = self.get_workflows_for_context(context)
        else:
            workflows = self._workflows

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
                    "input_schema": w.input_schema
                }
                for wid, w in workflows.items()
            ],
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "icon": c.icon
                }
                for c in self._categories.values()
            ],
            "available_contexts": list(set(
                ctx for w in workflows.values() for ctx in w.contexts
            ))
        }


# Singleton instance
workflow_registry = WorkflowRegistry()
```

### 1.3 Workflow Handlers

**Directory Structure:**

```
/ai-service/workflows/handlers/
├── __init__.py
├── base.py              # Base handler class
├── planning.py          # expand_idea, generate_plan, suggest_milestones
├── breakdown.py         # generate_tasks, task_breakdown (shared!)
├── learning.py          # find_resources, task_guidance (shared!), generate_path
└── analysis.py          # feasibility, effort, dependencies, analyze_plan
```

**File:** `/ai-service/workflows/handlers/base.py`

```python
"""Base handler class for workflow handlers"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from services.llm.llm_service import llm_service
from services.integrations.plan_integration import plan_integration
from services.integrations.task_integration import task_integration
from services.integrations.milestone_integration import milestone_integration

class BaseHandler(ABC):
    """
    Base class for workflow handlers.

    Provides:
    - LLM access
    - Backend integrations (plans, tasks, milestones)
    - Standard error handling
    - Context enrichment
    """

    def __init__(self):
        self.llm = llm_service
        self.plan_integration = plan_integration
        self.task_integration = task_integration
        self.milestone_integration = milestone_integration

    async def enrich_context(
        self,
        project_id: Optional[str],
        input_data: Dict
    ) -> Dict[str, Any]:
        """
        Enrich input with backend context.

        Fetches existing plans, tasks, milestones for context-aware AI.
        """
        context = {}

        if project_id:
            try:
                context["existing_plans"] = await self.plan_integration.get_project_plans(project_id)
                context["existing_tasks"] = await self.task_integration.get_project_tasks(project_id)
                context["existing_milestones"] = await self.milestone_integration.get_project_milestones(project_id)
            except Exception as e:
                context["_enrichment_error"] = str(e)

        return {**input_data, "_context": context}
```

**File:** `/ai-service/workflows/handlers/breakdown.py`

```python
"""
Breakdown workflow handlers.

Handles both IdeaTree and TaskBoard breakdown operations
using a shared handler.
"""

from typing import Dict, Any, List
from .base import BaseHandler

class BreakdownHandlers(BaseHandler):
    """Handlers for breakdown workflows"""

    async def generate_tasks_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Shared handler for:
        - IdeaTree: generate_tasks (from idea)
        - TaskBoard: task_breakdown (from task)

        The source_type in input determines the processing path,
        but the core AI logic is shared.
        """
        workflow_id = input_data.get("_workflow_id", "generate_tasks")
        context = input_data.get("_context", "ideatree")

        # Determine source type from input
        source_type = input_data.get("source_type")

        # Handle different input formats
        if source_type == "idea" or "node_id" in input_data:
            return await self._breakdown_from_idea(input_data)
        elif source_type == "task" or "task_id" in input_data:
            return await self._breakdown_from_task(input_data)
        elif source_type == "plan":
            return await self._breakdown_from_plan(input_data)
        else:
            # Default: treat as idea/general content
            return await self._breakdown_from_idea(input_data)

    async def _breakdown_from_idea(self, input_data: Dict) -> Dict[str, Any]:
        """
        Break down an idea into tasks.

        Used by IdeaTree's generate_tasks workflow.
        """
        title = input_data.get("title") or input_data.get("source_content", "")
        description = input_data.get("description", "")
        num_tasks = input_data.get("num_tasks", 5)
        include_estimates = input_data.get("include_estimates", True)

        prompt = f"""
        Break down this idea into actionable tasks:

        Title: {title}
        Description: {description}

        Generate {num_tasks} specific, actionable tasks.
        {"Include time estimates for each task." if include_estimates else ""}

        Return as JSON:
        {{
            "tasks": [
                {{
                    "title": "Task title",
                    "description": "What needs to be done",
                    "estimated_hours": 4,
                    "priority": 1,
                    "dependencies": []
                }}
            ],
            "summary": "Brief summary of the breakdown"
        }}
        """

        response = await self.llm.generate_json(prompt)

        return {
            "success": True,
            "tasks": response.get("tasks", []),
            "summary": response.get("summary", ""),
            "source": "idea",
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "task_count": len(response.get("tasks", []))
            }
        }

    async def _breakdown_from_task(self, input_data: Dict) -> Dict[str, Any]:
        """
        Break down a task into subtasks.

        Used by TaskBoard's task_breakdown workflow.
        """
        task_title = input_data.get("task_title", "")
        task_description = input_data.get("task_description", "")
        subtask_count = input_data.get("subtask_count", 5)
        detail_level = input_data.get("detail_level", "detailed")

        prompt = f"""
        Break down this task into subtasks:

        Task: {task_title}
        Description: {task_description}
        Detail level: {detail_level}

        Generate {subtask_count} subtasks.

        Return as JSON:
        {{
            "subtasks": [
                {{
                    "title": "Subtask title",
                    "description": "What needs to be done",
                    "estimated_minutes": 60,
                    "order": 1
                }}
            ],
            "total_estimated_hours": 8
        }}
        """

        response = await self.llm.generate_json(prompt)

        return {
            "success": True,
            "subtasks": response.get("subtasks", []),
            "total_estimated_hours": response.get("total_estimated_hours"),
            "source": "task",
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "subtask_count": len(response.get("subtasks", []))
            }
        }

    async def _breakdown_from_plan(self, input_data: Dict) -> Dict[str, Any]:
        """Break down a plan section into tasks"""
        # Similar implementation for plan breakdown
        pass


# Module-level handler functions (called by registry)
_handlers = BreakdownHandlers()

async def generate_tasks_handler(input_data: Dict, **kwargs) -> Dict:
    return await _handlers.generate_tasks_handler(input_data)
```

### 1.4 Discovery API Endpoint

**File:** `/ai-service/routes/workflow_routes.py` (additions)

```python
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from workflows.registry.loader import workflow_registry
from pydantic import BaseModel

router = APIRouter(prefix="/ai-api/workflows", tags=["workflows"])

class WorkflowExecuteRequest(BaseModel):
    workflow_id: str
    context: str  # ideatree, taskboard, etc.
    input: dict

class WorkflowExecuteResponse(BaseModel):
    success: bool
    result: dict
    workflow_id: str
    context: str

# ═══════════════════════════════════════════════════════════════
# DISCOVERY ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/discover")
async def discover_workflows(context: Optional[str] = Query(None)):
    """
    Discovery endpoint for frontend.

    Returns all available workflows, optionally filtered by context.
    Frontend uses this to build dynamic UI instead of hardcoded registry.

    Query params:
        context: Optional filter (ideatree, taskboard, courses)

    Returns:
        {
            "workflows": [...],
            "categories": [...],
            "available_contexts": [...]
        }
    """
    return workflow_registry.to_discovery_response(context)

@router.get("/discover/{context}")
async def discover_workflows_for_context(context: str):
    """Get workflows available in a specific context"""
    workflows = workflow_registry.get_workflows_for_context(context)

    if not workflows:
        raise HTTPException(
            status_code=404,
            detail=f"No workflows found for context: {context}"
        )

    return workflow_registry.to_discovery_response(context)

@router.get("/{workflow_id}")
async def get_workflow_details(workflow_id: str):
    """Get detailed info about a specific workflow"""
    workflow = workflow_registry.get_workflow(workflow_id)

    if not workflow:
        raise HTTPException(
            status_code=404,
            detail=f"Workflow not found: {workflow_id}"
        )

    cross_ref = workflow_registry.get_cross_reference(workflow_id)

    return {
        "id": workflow_id,
        **workflow.dict(),
        "cross_reference_details": cross_ref.dict() if cross_ref else None
    }

@router.get("/{workflow_id}/cross-reference")
async def get_workflow_cross_reference(workflow_id: str):
    """Get the equivalent workflow in another context"""
    cross_ref = workflow_registry.get_cross_reference(workflow_id)

    if not cross_ref:
        return {"has_cross_reference": False}

    return {
        "has_cross_reference": True,
        "cross_reference": cross_ref.dict()
    }

# ═══════════════════════════════════════════════════════════════
# EXECUTION ENDPOINT
# ═══════════════════════════════════════════════════════════════

@router.post("/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow(request: WorkflowExecuteRequest):
    """
    Unified workflow execution endpoint.

    Request:
    {
        "workflow_id": "generate_tasks",
        "context": "ideatree",
        "input": {
            "title": "...",
            "description": "..."
        }
    }

    Response:
    {
        "success": true,
        "result": { ... },
        "workflow_id": "generate_tasks",
        "context": "ideatree"
    }
    """
    try:
        result = await workflow_registry.execute(
            workflow_id=request.workflow_id,
            input_data=request.input,
            context=request.context
        )

        return WorkflowExecuteResponse(
            success=True,
            result=result,
            workflow_id=request.workflow_id,
            context=request.context
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")
```

---

## Part 2: Frontend Workflow Service

### 2.1 Workflow Service with Discovery

**File:** `/frontend/src/services/workflowService.ts`

```typescript
/**
 * Workflow Service - Frontend client for workflow registry.
 *
 * Replaces hardcoded questionRegistry.ts with dynamic discovery.
 */

import { api } from './api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface WorkflowCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  contexts: string[];
  cross_reference?: string;
  input_schema?: Record<string, any>;
}

export interface DiscoveryResponse {
  workflows: WorkflowDefinition[];
  categories: WorkflowCategory[];
  available_contexts: string[];
}

export interface WorkflowExecuteRequest {
  workflow_id: string;
  context: 'ideatree' | 'taskboard' | 'courses';
  input: Record<string, any>;
}

export interface WorkflowExecuteResponse {
  success: boolean;
  result: Record<string, any>;
  workflow_id: string;
  context: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class WorkflowService {
  private cache: DiscoveryResponse | null = null;
  private contextCache: Map<string, DiscoveryResponse> = new Map();

  /**
   * Discover available workflows from backend.
   *
   * @param context Optional context filter (ideatree, taskboard)
   * @returns Discovery response with workflows and categories
   */
  async discoverWorkflows(context?: string): Promise<DiscoveryResponse> {
    // Check cache
    if (context && this.contextCache.has(context)) {
      return this.contextCache.get(context)!;
    }
    if (!context && this.cache) {
      return this.cache;
    }

    // Fetch from backend
    const endpoint = context
      ? `/ai-api/workflows/discover/${context}`
      : '/ai-api/workflows/discover';

    const response = await api.get<DiscoveryResponse>(endpoint);

    // Cache results
    if (context) {
      this.contextCache.set(context, response.data);
    } else {
      this.cache = response.data;
    }

    return response.data;
  }

  /**
   * Get workflows for a specific context
   */
  async getWorkflowsForContext(
    context: 'ideatree' | 'taskboard'
  ): Promise<WorkflowDefinition[]> {
    const discovery = await this.discoverWorkflows(context);
    return discovery.workflows;
  }

  /**
   * Get workflows grouped by category
   */
  async getWorkflowsByCategory(
    context: 'ideatree' | 'taskboard'
  ): Promise<Map<string, WorkflowDefinition[]>> {
    const discovery = await this.discoverWorkflows(context);

    const grouped = new Map<string, WorkflowDefinition[]>();

    for (const workflow of discovery.workflows) {
      if (!grouped.has(workflow.category)) {
        grouped.set(workflow.category, []);
      }
      grouped.get(workflow.category)!.push(workflow);
    }

    return grouped;
  }

  /**
   * Get cross-referenced workflow
   */
  async getCrossReference(workflowId: string): Promise<WorkflowDefinition | null> {
    const response = await api.get<{
      has_cross_reference: boolean;
      cross_reference?: WorkflowDefinition;
    }>(`/ai-api/workflows/${workflowId}/cross-reference`);

    return response.data.cross_reference || null;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    context: 'ideatree' | 'taskboard' | 'courses',
    input: Record<string, any>
  ): Promise<WorkflowExecuteResponse> {
    const response = await api.post<WorkflowExecuteResponse>(
      '/ai-api/workflows/execute',
      {
        workflow_id: workflowId,
        context,
        input
      }
    );

    return response.data;
  }

  /**
   * Clear cache (call when workflows may have changed)
   */
  clearCache(): void {
    this.cache = null;
    this.contextCache.clear();
  }
}

export const workflowService = new WorkflowService();
```

### 2.2 React Hook for Workflows

**File:** `/frontend/src/hooks/useWorkflows.ts`

```typescript
/**
 * React hook for workflow discovery and execution.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  workflowService,
  WorkflowDefinition,
  WorkflowCategory,
  WorkflowExecuteResponse
} from '@/services/workflowService';

interface UseWorkflowsOptions {
  context: 'ideatree' | 'taskboard';
  autoFetch?: boolean;
}

interface UseWorkflowsReturn {
  // Data
  workflows: WorkflowDefinition[];
  categories: WorkflowCategory[];
  workflowsByCategory: Map<string, WorkflowDefinition[]>;

  // State
  isLoading: boolean;
  error: Error | null;

  // Actions
  executeWorkflow: (workflowId: string, input: Record<string, any>) => Promise<WorkflowExecuteResponse>;
  getCrossReference: (workflowId: string) => Promise<WorkflowDefinition | null>;
  refresh: () => Promise<void>;
}

export function useWorkflows({ context, autoFetch = true }: UseWorkflowsOptions): UseWorkflowsReturn {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const discovery = await workflowService.discoverWorkflows(context);
      setWorkflows(discovery.workflows);
      setCategories(discovery.categories);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (autoFetch) {
      fetchWorkflows();
    }
  }, [autoFetch, fetchWorkflows]);

  const workflowsByCategory = useMemo(() => {
    const grouped = new Map<string, WorkflowDefinition[]>();

    for (const workflow of workflows) {
      if (!grouped.has(workflow.category)) {
        grouped.set(workflow.category, []);
      }
      grouped.get(workflow.category)!.push(workflow);
    }

    return grouped;
  }, [workflows]);

  const executeWorkflow = useCallback(async (
    workflowId: string,
    input: Record<string, any>
  ) => {
    return workflowService.executeWorkflow(workflowId, context, input);
  }, [context]);

  const getCrossReference = useCallback(async (workflowId: string) => {
    return workflowService.getCrossReference(workflowId);
  }, []);

  return {
    workflows,
    categories,
    workflowsByCategory,
    isLoading,
    error,
    executeWorkflow,
    getCrossReference,
    refresh: fetchWorkflows
  };
}
```

---

## Part 3: IdeaTree Workflow UI

### 3.1 WorkflowPanel Component

**File:** `/frontend/src/components/project/IdeaForest/WorkflowPanel/WorkflowPanel.tsx`

```typescript
/**
 * Workflow Panel - Sidebar panel showing available workflows.
 *
 * Dynamically loads workflows from registry via useWorkflows hook.
 * Shows cross-references to TaskBoard where applicable.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { ExpandMore, LinkOutlined } from '@mui/icons-material';
import { useWorkflows } from '@/hooks/useWorkflows';
import { WorkflowStepCard } from './WorkflowStepCard';
import { WorkflowWizardModal } from './WorkflowWizardModal';

interface WorkflowPanelProps {
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  projectId: string;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  nodeId,
  nodeTitle,
  nodeDescription,
  projectId
}) => {
  const {
    workflows,
    categories,
    workflowsByCategory,
    isLoading,
    error,
    executeWorkflow,
    getCrossReference
  } = useWorkflows({ context: 'ideatree' });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | false>('planning');

  const handleWorkflowClick = async (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    setWizardOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading workflows...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Failed to load workflows
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, px: 1 }}>
        AI Workflows
      </Typography>

      {categories.map(category => (
        <Accordion
          key={category.id}
          expanded={expandedCategory === category.id}
          onChange={(_, expanded) =>
            setExpandedCategory(expanded ? category.id : false)
          }
          sx={{
            '&:before': { display: 'none' },
            boxShadow: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{category.icon}</span>
              <Typography variant="body2" fontWeight={500}>
                {category.name}
              </Typography>
              <Chip
                label={workflowsByCategory.get(category.id)?.length || 0}
                size="small"
                sx={{ height: 18, fontSize: '0.7rem' }}
              />
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 1 }}>
            {workflowsByCategory.get(category.id)?.map(workflow => (
              <WorkflowStepCard
                key={workflow.id}
                workflow={workflow}
                onClick={() => handleWorkflowClick(workflow.id)}
                showCrossReference={!!workflow.cross_reference}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ px: 1, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          <LinkOutlined sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
          Linked icon = Also in Task Board
        </Typography>
      </Box>

      {/* Workflow Wizard Modal */}
      <WorkflowWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        workflowId={selectedWorkflow}
        nodeId={nodeId}
        nodeTitle={nodeTitle}
        nodeDescription={nodeDescription}
        projectId={projectId}
      />
    </Box>
  );
};
```

### 3.2 WorkflowStepCard Component

**File:** `/frontend/src/components/project/IdeaForest/WorkflowPanel/WorkflowStepCard.tsx`

```typescript
import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { PlayArrow, LinkOutlined } from '@mui/icons-material';
import { WorkflowDefinition } from '@/services/workflowService';

interface WorkflowStepCardProps {
  workflow: WorkflowDefinition;
  onClick: () => void;
  showCrossReference?: boolean;
  status?: 'pending' | 'in_progress' | 'completed';
}

export const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  workflow,
  onClick,
  showCrossReference,
  status = 'pending'
}) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      <Typography sx={{ fontSize: '1.2rem' }}>
        {workflow.icon}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {workflow.name}
          </Typography>
          {showCrossReference && (
            <Tooltip title="Also available in Task Board">
              <LinkOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
            </Tooltip>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap>
          {workflow.description}
        </Typography>
      </Box>

      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <PlayArrow fontSize="small" />
      </IconButton>
    </Box>
  );
};
```

---

## Part 4: Task Board Integration

### 4.1 TaskQuickActions Component

**File:** `/frontend/src/components/project/TaskManagement/TaskQuickActions.tsx`

```typescript
/**
 * Task Quick Actions - AI workflow buttons for Task Board.
 *
 * Uses same workflow registry as IdeaTree, showing TaskBoard-specific
 * workflows with cross-references to IdeaTree where applicable.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Divider,
  CircularProgress
} from '@mui/material';
import { AutoAwesome, AccountTree } from '@mui/icons-material';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useNavigate } from 'react-router-dom';

interface TaskQuickActionsProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectId: string;
  ideaNodeId?: string;  // If task is linked to IdeaTree
}

export const TaskQuickActions: React.FC<TaskQuickActionsProps> = ({
  taskId,
  taskTitle,
  taskDescription,
  projectId,
  ideaNodeId
}) => {
  const navigate = useNavigate();
  const {
    workflows,
    categories,
    workflowsByCategory,
    isLoading,
    executeWorkflow
  } = useWorkflows({ context: 'taskboard' });

  const [executing, setExecuting] = useState<string | null>(null);

  const handleExecute = async (workflowId: string) => {
    setExecuting(workflowId);

    try {
      const result = await executeWorkflow(workflowId, {
        task_id: taskId,
        task_title: taskTitle,
        task_description: taskDescription,
        source_type: 'task'
      });

      // Handle result (show in drawer, create subtasks, etc.)
      console.log('Workflow result:', result);

    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setExecuting(null);
    }
  };

  const handleOpenInIdeaTree = () => {
    if (ideaNodeId) {
      navigate(`/project/${projectId}/ideatree?node=${ideaNodeId}`);
    }
  };

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesome fontSize="small" color="primary" />
        <Typography variant="subtitle2">Ask AI</Typography>
      </Box>

      {categories.map(category => {
        const categoryWorkflows = workflowsByCategory.get(category.id);
        if (!categoryWorkflows?.length) return null;

        return (
          <Box key={category.id} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {category.name}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categoryWorkflows.map(workflow => (
                <Tooltip
                  key={workflow.id}
                  title={
                    workflow.cross_reference
                      ? `${workflow.description}. Also in IdeaTree.`
                      : workflow.description
                  }
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleExecute(workflow.id)}
                    disabled={executing === workflow.id}
                    startIcon={
                      executing === workflow.id
                        ? <CircularProgress size={14} />
                        : <span>{workflow.icon}</span>
                    }
                    endIcon={
                      workflow.cross_reference && (
                        <AccountTree sx={{ fontSize: 14 }} />
                      )
                    }
                  >
                    {workflow.name}
                  </Button>
                </Tooltip>
              ))}
            </Box>
          </Box>
        );
      })}

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          <AccountTree sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
          = Also available in IdeaTree for deeper exploration
        </Typography>

        {ideaNodeId && (
          <Button
            variant="text"
            size="small"
            startIcon={<AccountTree />}
            onClick={handleOpenInIdeaTree}
          >
            Open in IdeaTree
          </Button>
        )}
      </Box>
    </Box>
  );
};
```

---

## Part 5: Implementation Phases

### Phase 1: Workflow Registry Infrastructure (Week 1)

**Goal:** Create the central workflow registry system

| Task                           | Files                                                   | Effort |
| ------------------------------ | ------------------------------------------------------- | ------ |
| Create workflow_registry.yaml  | `/ai-service/workflows/registry/workflow_registry.yaml` | 3h     |
| Create WorkflowRegistry class  | `/ai-service/workflows/registry/loader.py`              | 4h     |
| Create base handler class      | `/ai-service/workflows/handlers/base.py`                | 2h     |
| Create discovery API endpoints | `/ai-service/routes/workflow_routes.py`                 | 3h     |

**Deliverable:** Working registry with API discovery

### Phase 2: Extract & Migrate Handlers (Week 2)

**Goal:** Extract handlers from IdeaTreeWorkflow into registry pattern

| Task                                   | Files                                         | Effort |
| -------------------------------------- | --------------------------------------------- | ------ |
| Extract planning handlers              | `/ai-service/workflows/handlers/planning.py`  | 4h     |
| Extract breakdown handlers (shared)    | `/ai-service/workflows/handlers/breakdown.py` | 4h     |
| Extract learning handlers (shared)     | `/ai-service/workflows/handlers/learning.py`  | 3h     |
| Extract analysis handlers              | `/ai-service/workflows/handlers/analysis.py`  | 3h     |
| Update IdeaTree routes to use registry | `/ai-service/routes/idea_tree_routes.py`      | 2h     |

**Deliverable:** All handlers migrated, IdeaTree using registry

### Phase 3: Frontend Workflow Service (Week 3)

**Goal:** Create frontend service with dynamic discovery

| Task                        | Files                                         | Effort |
| --------------------------- | --------------------------------------------- | ------ |
| Create workflowService.ts   | `/frontend/src/services/workflowService.ts`   | 3h     |
| Create useWorkflows hook    | `/frontend/src/hooks/useWorkflows.ts`         | 2h     |
| Create workflow types       | `/frontend/src/types/workflow.ts`             | 1h     |
| Add workflow state to Redux | `/frontend/src/store/slices/workflowSlice.ts` | 2h     |

**Deliverable:** Frontend can discover and execute workflows

### Phase 4: IdeaTree Workflow UI (Week 4)

**Goal:** Add visible workflow panel to IdeaTree

| Task                              | Files                                   | Effort |
| --------------------------------- | --------------------------------------- | ------ |
| Create WorkflowPanel component    | `WorkflowPanel/WorkflowPanel.tsx`       | 4h     |
| Create WorkflowStepCard component | `WorkflowPanel/WorkflowStepCard.tsx`    | 2h     |
| Create WorkflowWizardModal        | `WorkflowPanel/WorkflowWizardModal.tsx` | 5h     |
| Integrate into IdeaTreeSidebar    | `IdeaTreeSidebar.tsx`                   | 2h     |
| Add context menu integration      | `NodeContextMenu.tsx`                   | 1h     |

**Deliverable:** Workflow panel visible and functional in IdeaTree

### Phase 5: Task Board Integration (Week 5)

**Goal:** Add AI quick actions to Task Board

| Task                                 | Files                                 | Effort |
| ------------------------------------ | ------------------------------------- | ------ |
| Create TaskQuickActions component    | `TaskManagement/TaskQuickActions.tsx` | 4h     |
| Add to TaskDetailDrawer              | `TaskDetailDrawer.tsx`                | 2h     |
| Implement cross-context navigation   | Navigation utilities                  | 2h     |
| Add "Open in IdeaTree" functionality | Integration                           | 2h     |

**Deliverable:** Unified AI experience across IdeaTree and TaskBoard

### Phase 6: Polish & Testing (Week 6)

**Goal:** Production-ready feature

| Task                          | Description | Effort |
| ----------------------------- | ----------- | ------ |
| Loading states and animations | UX polish   | 3h     |
| Error handling and recovery   | Reliability | 3h     |
| Unit tests for registry       | Testing     | 4h     |
| Integration tests             | Testing     | 4h     |
| User testing                  | Validation  | 4h     |

**Deliverable:** Production-ready workflow system

---

## File Structure Summary

```
ai-service/
├── workflows/
│   ├── registry/                    # NEW: Central registry
│   │   ├── __init__.py
│   │   ├── workflow_registry.yaml   # Declarative workflow definitions
│   │   └── loader.py                # WorkflowRegistry class
│   ├── handlers/                    # NEW: Shared handlers
│   │   ├── __init__.py
│   │   ├── base.py                  # BaseHandler class
│   │   ├── planning.py              # expand_idea, generate_plan, etc.
│   │   ├── breakdown.py             # generate_tasks (shared!)
│   │   ├── learning.py              # find_resources (shared!)
│   │   └── analysis.py              # feasibility, effort, etc.
│   ├── idea_tree/                   # MODIFY: Use registry
│   │   └── workflow.py              # Delegates to registry
│   └── ...
├── routes/
│   └── workflow_routes.py           # MODIFY: Add discovery endpoints

frontend/src/
├── services/
│   └── workflowService.ts           # NEW: Workflow API client
├── hooks/
│   └── useWorkflows.ts              # NEW: React hook
├── types/
│   └── workflow.ts                  # NEW: TypeScript types
├── store/slices/
│   └── workflowSlice.ts             # NEW: Redux slice
├── components/project/
│   ├── IdeaForest/
│   │   ├── WorkflowPanel/           # NEW: Workflow UI
│   │   │   ├── index.ts
│   │   │   ├── WorkflowPanel.tsx
│   │   │   ├── WorkflowStepCard.tsx
│   │   │   └── WorkflowWizardModal.tsx
│   │   └── IdeaTreeSidebar.tsx      # MODIFY: Add WorkflowPanel
│   └── TaskManagement/
│       ├── TaskQuickActions.tsx     # NEW: AI actions
│       └── TaskDetailDrawer.tsx     # MODIFY: Add TaskQuickActions
```

---

## Success Metrics

### Quantitative

| Metric                          | Target   | Measurement                          |
| ------------------------------- | -------- | ------------------------------------ |
| Workflow discovery latency      | < 200ms  | API response time                    |
| Shared handler reuse rate       | 100%     | Same handler for cross-ref workflows |
| Workflow execution success rate | > 95%    | Track failures                       |
| Cross-reference click rate      | > 20%    | Track navigation between contexts    |
| Time to add new workflow        | < 1 hour | No code changes required             |

### Qualitative

| Metric                               | Method               |
| ------------------------------------ | -------------------- |
| Users understand available workflows | User testing         |
| Cross-references are helpful         | User feedback        |
| Adding new workflows is easy         | Developer experience |
| System is maintainable               | Code review          |

---

## Migration Notes

### Backward Compatibility

1. Keep existing `/ai-api/idea-tree/query` endpoint working
2. Route to registry internally: `workflow_registry.execute('expand_idea', ...)`
3. Deprecate direct workflow calls over time

### Gradual Migration Path

```python
# In idea_tree_routes.py - gradual migration

@router.post("/query")
async def query_idea_tree(request: IdeaTreeQueryRequest):
    """
    Legacy endpoint - delegates to workflow registry.
    """
    # Map old query_type to new workflow_id
    workflow_mapping = {
        "expand": "expand_idea",
        "tasks": "generate_tasks",
        "resources": "find_resources",
        # ...
    }

    workflow_id = workflow_mapping.get(request.query_type, request.query_type)

    return await workflow_registry.execute(
        workflow_id=workflow_id,
        input_data=request.dict(),
        context="ideatree"
    )
```

---

**Last Updated:** November 25, 2025
**Version:** 2.0 (Extension Architecture)
**Author:** Planning Document
**Next Steps:** Review architecture, start Phase 1 implementation
