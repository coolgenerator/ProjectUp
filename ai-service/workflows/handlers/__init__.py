"""
Workflow Handlers - Handler implementations for workflow registry.

Each handler module provides functions that can be called by the workflow registry.
Handlers are loaded dynamically based on the handler path in workflow_registry.yaml.
"""

from .base import BaseHandler

# Planning handlers
from .planning import (
    expand_idea_handler,
    generate_plan_handler,
    suggest_milestones_handler,
)

# Breakdown handlers
from .breakdown import generate_tasks_handler

# Learning handlers
from .learning import (
    find_resources_handler,
    task_guidance_handler,
    generate_learning_path_handler,
)

# Analysis handlers
from .analysis import (
    analyze_feasibility_handler,
    estimate_effort_handler,
    find_dependencies_handler,
    analyze_plan_handler,
)

# Integration handlers
from .integration import (
    sync_to_external_handler,
    import_from_external_handler,
    execute_custom_api_handler,
)

__all__ = [
    "BaseHandler",
    # Planning
    "expand_idea_handler",
    "generate_plan_handler",
    "suggest_milestones_handler",
    # Breakdown
    "generate_tasks_handler",
    # Learning
    "find_resources_handler",
    "task_guidance_handler",
    "generate_learning_path_handler",
    # Analysis
    "analyze_feasibility_handler",
    "estimate_effort_handler",
    "find_dependencies_handler",
    "analyze_plan_handler",
    # Integration
    "sync_to_external_handler",
    "import_from_external_handler",
    "execute_custom_api_handler",
]
