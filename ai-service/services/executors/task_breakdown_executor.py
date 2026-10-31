"""
Task Breakdown Executor

Uses AI to break down complex tasks into manageable subtasks.
"""

import logging
from typing import Dict, Any, List
import json
import re

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from .base_executor import BaseExecutor
from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class TaskBreakdownExecutor(BaseExecutor):
    """
    Executor for BREAKDOWN_TASK action.

    Uses LLM to:
    - Analyze complex task description
    - Break into 3-5 concrete subtasks
    - Create dependencies between subtasks
    - Estimate effort/priority for each
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.llm = ChatVertexAI(model="gemini-2.5-pro", temperature=0.5)

    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute task breakdown.

        Expected parameters:
            - task_description: Description of complex task
            - parent_title: Title of parent task
            - suggested_count: Number of subtasks to create (default 3-5)

        Expected context:
            - node_id: Parent node ID
            - session_id: Tree session ID
        """
        try:
            logger.info("Executing BREAKDOWN_TASK action")

            # Extract parameters
            task_desc = parameters.get("task_description", "")
            parent_title = parameters.get("parent_title", "Task")
            suggested_count = parameters.get("suggested_count", 4)

            session_id = context.get("session_id")
            parent_id = context.get("node_id")

            if not session_id:
                raise ValueError("session_id required in context")

            # Generate subtasks using LLM
            subtasks = await self._generate_subtasks(
                parent_title=parent_title,
                task_description=task_desc,
                count=suggested_count
            )

            # Create nodes for each subtask
            created_nodes = []
            for i, subtask in enumerate(subtasks):
                node = await self.create_node(
                    session_id=session_id,
                    title=subtask["title"],
                    description=subtask.get("description", ""),
                    metadata={
                        "auto_created": True,
                        "created_from_chat": True,
                        "subtask_index": i + 1,
                        "estimated_effort": subtask.get("effort"),
                        "priority": subtask.get("priority")
                    },
                    parent_id=parent_id
                )
                created_nodes.append(node)

            # Create dependencies if specified
            created_deps = []
            for i, subtask in enumerate(subtasks):
                if subtask.get("depends_on"):
                    # depends_on is a list of indices
                    for dep_idx in subtask["depends_on"]:
                        if 0 <= dep_idx < len(created_nodes):
                            try:
                                dep = await self.create_dependency(
                                    source_node_id=created_nodes[i]["id"],
                                    target_node_id=created_nodes[dep_idx]["id"],
                                    dependency_type="blocks",
                                    description=f"Subtask {dep_idx + 1} must complete first"
                                )
                                if dep:
                                    created_deps.append(dep)
                            except Exception as e:
                                logger.warning(f"Could not create dependency: {e}")

            return ActionExecutionResult(
                success=True,
                action_type=ActionType.BREAKDOWN_TASK,
                message=f"✅ Broke down '{parent_title}' into {len(created_nodes)} subtasks",
                created_nodes=created_nodes,
                created_dependencies=created_deps,
                metadata={"subtask_count": len(created_nodes)}
            )

        except Exception as e:
            logger.error(f"Error executing BREAKDOWN_TASK: {e}")
            return ActionExecutionResult(
                success=False,
                action_type=ActionType.BREAKDOWN_TASK,
                message="Failed to break down task",
                error=str(e)
            )

    async def _generate_subtasks(
        self,
        parent_title: str,
        task_description: str,
        count: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to generate subtasks.

        Returns list of subtasks with:
            - title
            - description
            - effort (hours)
            - priority (1-3)
            - depends_on (list of indices)
        """
        system_prompt = f"""You are a project breakdown expert. Break down complex tasks into {count} concrete, actionable subtasks.

Each subtask should:
1. Be specific and actionable (starts with a verb)
2. Be completable in 1-8 hours
3. Have clear deliverables
4. Include dependencies on other subtasks if needed

Return ONLY a JSON array of subtasks:
```json
[
  {{
    "title": "Subtask title",
    "description": "What needs to be done and why",
    "effort": "2-4 hours",
    "priority": 1,
    "depends_on": []
  }}
]
```

depends_on is a list of zero-indexed subtask numbers that must complete first.
priority: 1=high, 2=medium, 3=low"""

        human_prompt = f"""Break down this task into {count} subtasks:

**Task:** {parent_title}
**Details:** {task_description}

Return the JSON array of {count} subtasks."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]

        try:
            response = await self.llm.ainvoke(messages)

            # Parse JSON from response
            json_match = re.search(r'```json\s*(.*?)\s*```', response.content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r'\[.*\]', response.content, re.DOTALL)
                json_str = json_match.group() if json_match else "[]"

            subtasks = json.loads(json_str)
            return subtasks if isinstance(subtasks, list) else []

        except Exception as e:
            logger.error(f"Error generating subtasks: {e}")
            # Fallback: create generic subtasks
            return [
                {
                    "title": f"Subtask {i + 1}: {parent_title}",
                    "description": task_description,
                    "effort": "2-4 hours",
                    "priority": 2,
                    "depends_on": []
                }
                for i in range(min(count, 3))
            ]
