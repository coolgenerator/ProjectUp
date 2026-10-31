"""
Workflow Registry - Central registry for all AI workflows.

This module provides:
- WorkflowRegistry: Central registry for workflow discovery and execution
- IntegrationRegistry: Registry for 3rd party integrations and custom APIs
"""

from .loader import workflow_registry, WorkflowRegistry, WorkflowDefinition, WorkflowCategory
from .integration_registry import (
    integration_registry,
    IntegrationRegistry,
    IntegrationDefinition,
    IntegrationConfig,
    CustomAPIConfig
)

__all__ = [
    "workflow_registry",
    "WorkflowRegistry",
    "WorkflowDefinition",
    "WorkflowCategory",
    "integration_registry",
    "IntegrationRegistry",
    "IntegrationDefinition",
    "IntegrationConfig",
    "CustomAPIConfig"
]
