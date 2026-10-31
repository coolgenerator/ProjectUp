"""
Brainstorm Executor

Captures brainstorming ideas as individual nodes for evaluation.
"""

import logging
from typing import Dict, Any, List

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class BrainstormExecutor(BaseExecutor):
    """
    Executor for BRAINSTORM_IDEAS action.

    When user is exploring multiple options or generating ideas,
    capture each as a separate node for evaluation and comparison.
    """

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute brainstorm idea capture.

        Expected parameters:
            - ideas: List of idea dictionaries with title/description
            - brainstorm_title: Overall brainstorm topic

        Expected context:
            - node_id: Parent node ID
            - session_id: Tree session ID
        """
        try:
            logger.info("Executing BRAINSTORM_IDEAS action")

            # Extract parameters
            ideas = parameters.get("ideas", [])
            brainstorm_title = parameters.get("brainstorm_title", "Brainstorm")

            session_id = context.get("session_id")
            parent_id = context.get("node_id")

            if not session_id:
                raise ValueError("session_id required in context")

            # Create nodes for each idea
            created_nodes = []
            for i, idea in enumerate(ideas):
                if isinstance(idea, str):
                    # Simple string idea
                    title = idea
                    description = ""
                else:
                    # Structured idea
                    title = idea.get("title", f"Idea {i + 1}")
                    description = idea.get("description", "")

                node = await self.create_node(
                    session_id=session_id,
                    title=title,
                    description=description,
                    metadata={
                        "auto_created": True,
                        "created_from_chat": True,
                        "brainstorm_idea": True,
                        "brainstorm_topic": brainstorm_title,
                        "idea_index": i + 1
                    },
                    parent_id=parent_id
                )
                created_nodes.append(node)

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.BRAINSTORM_IDEAS,
                message=f"✅ Captured {len(created_nodes)} ideas from brainstorm",
                created_nodes=created_nodes,
                metadata={
                    "idea_count": len(created_nodes),
                    "brainstorm_topic": brainstorm_title
                }
            )

        except Exception as e:
            logger.error(f"Error executing BRAINSTORM_IDEAS: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.BRAINSTORM_IDEAS,
                message="Failed to capture brainstorm ideas",
                error=str(e)
            )
