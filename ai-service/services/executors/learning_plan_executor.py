"""
Learning Plan Executor

Generates structured learning paths when AI detects learning intent.
"""

import logging
from typing import Dict, Any, List

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class LearningPlanExecutor(BaseExecutor):
    """
    Executor for GENERATE_LEARNING_PLAN action.

    Creates a structured learning path by:
    - Calling existing course generation service
    - Creating nodes for modules/lessons
    - Linking to resources
    """

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute learning plan generation.

        Expected parameters:
            - topics: List of topics to learn (e.g., ["React", "OAuth"])
            - learning_goal: What the user wants to achieve
            - difficulty: beginner/intermediate/advanced
            - estimated_weeks: Time frame

        Expected context:
            - node_id: Parent node ID
            - session_id: Tree session ID
            - project_id: Project ID
        """
        try:
            logger.info("Executing GENERATE_LEARNING_PLAN action")

            # Extract parameters
            topics = parameters.get("topics", [])
            if isinstance(topics, str):
                topics = [topics]
            learning_goal = parameters.get("learning_goal", "")
            difficulty = parameters.get("difficulty", "intermediate")
            weeks = parameters.get("estimated_weeks", 4)

            session_id = context.get("session_id")
            parent_id = context.get("node_id")
            project_id = context.get("project_id")

            if not session_id:
                raise ValueError("session_id required in context")

            # Generate course content via existing course service
            import httpx

            async with httpx.AsyncClient(timeout=60.0) as client:
                course_request = {
                    "topic_name": " + ".join(topics),
                    "learning_goals": [learning_goal] if learning_goal else topics,
                    "estimated_weeks": weeks,
                    "difficulty": difficulty,
                    "project_id": project_id
                }

                response = await client.post(
                    f"{self.ai_agent_url}/workflows/learning-path/generate",
                    json=course_request
                )
                response.raise_for_status()

                course_data = response.json()
                learning_path = course_data.get("learning_path", {})

            # Create learning plan node as parent
            plan_title = learning_path.get("title", f"Learning Plan: {' + '.join(topics)}")
            plan_desc = learning_path.get("description", "")

            plan_node = await self.create_node(
                session_id=session_id,
                title=plan_title,
                description=plan_desc,
                metadata={
                    "is_learning_plan": True,
                    "auto_created": True,
                    "created_from_chat": True,
                    "topics": topics,
                    "difficulty": difficulty,
                    "duration": learning_path.get("duration", f"{weeks} weeks")
                },
                parent_id=parent_id
            )

            # Create module nodes
            created_nodes = [plan_node]
            modules = learning_path.get("modules", [])

            for i, module in enumerate(modules[:5]):  # Limit to 5 modules
                module_node = await self.create_node(
                    session_id=session_id,
                    title=f"Module {i + 1}: {module.get('title', 'Module')}",
                    description=module.get('description', ''),
                    metadata={
                        "auto_created": True,
                        "module_index": i + 1,
                        "duration": module.get("duration", ""),
                        "lessons": module.get("lessons", [])
                    },
                    parent_id=plan_node["id"]
                )
                created_nodes.append(module_node)

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.GENERATE_LEARNING_PLAN,
                message=f"✅ Created learning plan for {', '.join(topics)} with {len(modules)} modules",
                created_nodes=created_nodes,
                metadata={
                    "topics": topics,
                    "module_count": len(modules),
                    "difficulty": difficulty
                }
            )

        except Exception as e:
            logger.error(f"Error executing GENERATE_LEARNING_PLAN: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.GENERATE_LEARNING_PLAN,
                message="Failed to generate learning plan",
                error=str(e)
            )
