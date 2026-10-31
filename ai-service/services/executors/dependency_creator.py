"""
Dependency Creator

Creates dependency relationships when AI detects blockers or prerequisites.
"""

import logging
from typing import Dict, Any

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class DependencyCreator(BaseExecutor):
    """
    Executor for CREATE_DEPENDENCY action.

    Creates dependency relationships between nodes when:
    - User mentions being blocked by something
    - User says X depends on Y
    - User indicates prerequisites
    """

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute dependency creation.

        Expected parameters:
            - source_node_id: Node that is blocked/dependent
            - target_node_id: Node that blocks/is required
            - dependency_type: blocks/requires/relates_to
            - description: Why this dependency exists

        Expected context:
            - session_id: Tree session ID
        """
        try:
            logger.info("Executing CREATE_DEPENDENCY action")

            # Extract parameters
            source_id = parameters.get("source_node_id")
            target_id = parameters.get("target_node_id")
            dep_type = parameters.get("dependency_type", "blocks")
            description = parameters.get("description", "")

            if not source_id or not target_id:
                raise ValueError("source_node_id and target_node_id required")

            # Create dependency
            dependency = await self.create_dependency(
                source_node_id=source_id,
                target_node_id=target_id,
                dependency_type=dep_type,
                description=description,
                auto_created=True
            )

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.CREATE_DEPENDENCY,
                message=f"✅ Created dependency: {dep_type} relationship",
                created_dependencies=[dependency] if dependency else [],
                metadata={
                    "dependency_type": dep_type,
                    "source": source_id,
                    "target": target_id
                }
            )

        except Exception as e:
            logger.error(f"Error executing CREATE_DEPENDENCY: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.CREATE_DEPENDENCY,
                message="Failed to create dependency",
                error=str(e)
            )
