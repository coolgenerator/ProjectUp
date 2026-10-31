"""
Executor Manager

Routes action execution requests to appropriate executors.
"""

import logging
from typing import Dict, Any

from models.entities.intent import ActionType, ActionExecutionResult
from .milestone_executor import MilestoneExecutor
from .task_breakdown_executor import TaskBreakdownExecutor
from .learning_plan_executor import LearningPlanExecutor
from .action_item_extractor import ActionItemExtractor
from .dependency_creator import DependencyCreator
from .brainstorm_executor import BrainstormExecutor

logger = logging.getLogger(__name__)


class ExecutorManager:
    """
    Manages action executors and routes execution requests.

    Singleton pattern ensures consistent executor instances.
    """

    def __init__(
        self,
        backend_url: str = "http://localhost:8080",
        ai_agent_url: str = "http://localhost:8000"
    ):
        """Initialize executor manager with all executors"""
        self.executors = {
            ActionType.CREATE_MILESTONE: MilestoneExecutor(backend_url, ai_agent_url),
            ActionType.BREAKDOWN_TASK: TaskBreakdownExecutor(backend_url, ai_agent_url),
            ActionType.GENERATE_LEARNING_PLAN: LearningPlanExecutor(backend_url, ai_agent_url),
            ActionType.EXTRACT_ACTION_ITEMS: ActionItemExtractor(backend_url, ai_agent_url),
            ActionType.CREATE_DEPENDENCY: DependencyCreator(backend_url, ai_agent_url),
            ActionType.BRAINSTORM_IDEAS: BrainstormExecutor(backend_url, ai_agent_url),
        }

    async def execute_action(
        self,
        action_type: ActionType,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute an action using the appropriate executor.

        Args:
            action_type: Type of action to execute
            parameters: Action parameters from intent detection
            context: Execution context (node_id, session_id, etc.)

        Returns:
            ActionExecutionResult with success status and created resources
        """
        try:
            logger.info(f"Executing action: {action_type.value}")

            executor = self.executors.get(action_type)
            if not executor:
                logger.error(f"No executor found for action type: {action_type}")
                return ActionExecutionResult(
                    success=False,
                    action_type=action_type,
                    message=f"No executor available for {action_type.value}",
                    error="Executor not implemented"
                )

            # Execute via appropriate executor
            result = await executor.execute(parameters, context)
            return result

        except Exception as e:
            logger.error(f"Error executing action {action_type}: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=action_type,
                message="Action execution failed",
                error=str(e)
            )


# Singleton instance
_executor_manager = None


def get_executor_manager() -> ExecutorManager:
    """Get or create executor manager instance"""
    global _executor_manager
    if _executor_manager is None:
        _executor_manager = ExecutorManager()
    return _executor_manager
