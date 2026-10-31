"""
Breakdown Workflow Handlers

Handles:
- generate_tasks: Create actionable tasks from ideas/plans
- task_breakdown: Split tasks into subtasks

These handlers are SHARED between IdeaTree and TaskBoard contexts.
The same handler serves both workflows via the cross_reference system.
"""

from typing import Dict, Any, List
import logging
from .base import BaseHandler

logger = logging.getLogger(__name__)

# Singleton handler instance
_handler = None


def _get_handler() -> "BreakdownHandlers":
    global _handler
    if _handler is None:
        _handler = BreakdownHandlers()
    return _handler


class BreakdownHandlers(BaseHandler):
    """Handlers for breakdown workflows"""

    BREAKDOWN_SYSTEM_PROMPT = """You are an expert at breaking down complex work into manageable,
actionable tasks. Create clear, specific tasks that can be completed independently.
Include realistic time estimates based on the complexity of each task.
Consider dependencies between tasks and order them logically."""

    async def generate_tasks_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Shared handler for:
        - IdeaTree: generate_tasks (from idea)
        - TaskBoard: task_breakdown (from task)

        The source_type in input determines the processing path,
        but the core AI logic is shared.

        Input:
            source_type: "idea" | "plan" | "task"
            source_content: str - Content to break down
            source_id: str - Optional ID of source
            task_title: str - For task breakdown
            task_description: str - For task breakdown
            num_tasks/subtask_count: int - Number of items to generate
            include_estimates: bool - Include time estimates
            include_dependencies: bool - Include task dependencies
            detail_level: "brief" | "detailed"

        Output:
            tasks/subtasks: List of generated items
            summary: Overview of the breakdown
            total_estimated_hours: Sum of estimates
        """
        # Determine source type from input
        source_type = input_data.get("source_type")

        # Handle different input formats (IdeaTree vs TaskBoard)
        if source_type == "task" or "task_title" in input_data:
            return await self._breakdown_from_task(input_data)
        elif source_type == "plan":
            return await self._breakdown_from_plan(input_data)
        else:
            # Default: treat as idea breakdown
            return await self._breakdown_from_idea(input_data)

    async def _breakdown_from_idea(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Break down an idea into tasks.

        Used by IdeaTree's generate_tasks workflow.
        """
        title = input_data.get("title") or input_data.get("source_content", "")
        description = input_data.get("description", "")
        num_tasks = input_data.get("num_tasks", 5)
        include_estimates = input_data.get("include_estimates", True)
        include_dependencies = input_data.get("include_dependencies", False)
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""
        estimates_instruction = "Include realistic time estimates for each task." if include_estimates else ""
        dependencies_instruction = "Identify dependencies between tasks." if include_dependencies else ""

        prompt = f"""Break down this idea into {num_tasks} actionable tasks:

Idea: {title}
Description: {description}{context_section}

{estimates_instruction}
{dependencies_instruction}

Create specific, actionable tasks that can be assigned and tracked.
Order tasks logically based on dependencies and priority.

Return your response as JSON:
{{
    "summary": "Brief summary of the task breakdown approach",
    "tasks": [
        {{
            "title": "Clear, actionable task title",
            "description": "What needs to be done in detail",
            "estimated_hours": 4,
            "priority": 1,
            "complexity": "low|medium|high",
            "skills_required": ["Skill 1", "Skill 2"],
            "dependencies": [],
            "acceptance_criteria": ["Criterion 1", "Criterion 2"]
        }}
    ],
    "total_estimated_hours": 20,
    "suggested_order": ["Task 1 title", "Task 2 title"],
    "potential_blockers": ["Potential issue 1"]
}}"""

        result = await self.generate_json(prompt, self.BREAKDOWN_SYSTEM_PROMPT)

        tasks = result.get("tasks", [])
        total_hours = sum(t.get("estimated_hours", 0) for t in tasks)

        return {
            "success": True,
            "tasks": tasks,
            "summary": result.get("summary", ""),
            "total_estimated_hours": result.get("total_estimated_hours", total_hours),
            "suggested_order": result.get("suggested_order", []),
            "potential_blockers": result.get("potential_blockers", []),
            "source": "idea",
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "task_count": len(tasks),
                "include_estimates": include_estimates,
                "include_dependencies": include_dependencies
            }
        }

    async def _breakdown_from_task(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Break down a task into subtasks.

        Used by TaskBoard's task_breakdown workflow.
        """
        task_title = input_data.get("task_title", "")
        task_description = input_data.get("task_description", "")
        subtask_count = input_data.get("subtask_count") or input_data.get("num_tasks", 5)
        detail_level = input_data.get("detail_level", "detailed")
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""

        detail_instruction = (
            "Provide comprehensive details for each subtask including all implementation steps."
            if detail_level == "detailed"
            else "Keep subtask descriptions concise and focused."
        )

        prompt = f"""Break down this task into {subtask_count} subtasks:

Task: {task_title}
Description: {task_description}
Detail Level: {detail_level}{context_section}

{detail_instruction}

Create subtasks that together complete the parent task.
Each subtask should be independently completable.

Return your response as JSON:
{{
    "subtasks": [
        {{
            "title": "Subtask title",
            "description": "What needs to be done",
            "estimated_minutes": 60,
            "order": 1,
            "is_optional": false,
            "tips": "Helpful implementation tips"
        }}
    ],
    "total_estimated_hours": 8,
    "completion_checklist": [
        "Verification step 1",
        "Verification step 2"
    ],
    "notes": "Any additional context or recommendations"
}}"""

        result = await self.generate_json(prompt, self.BREAKDOWN_SYSTEM_PROMPT)

        subtasks = result.get("subtasks", [])
        total_minutes = sum(s.get("estimated_minutes", 0) for s in subtasks)
        total_hours = total_minutes / 60

        return {
            "success": True,
            "subtasks": subtasks,
            "total_estimated_hours": result.get("total_estimated_hours", total_hours),
            "completion_checklist": result.get("completion_checklist", []),
            "notes": result.get("notes", ""),
            "source": "task",
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "subtask_count": len(subtasks),
                "detail_level": detail_level
            }
        }

    async def _breakdown_from_plan(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Break down a plan into tasks.

        Extracts actionable tasks from a plan or plan section.
        """
        plan_content = input_data.get("source_content") or input_data.get("plan_content", "")
        num_tasks = input_data.get("num_tasks", 10)
        include_estimates = input_data.get("include_estimates", True)
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        context_section = f"\n\nExisting Project Context:\n{context_str}" if context_str else ""

        prompt = f"""Extract up to {num_tasks} actionable tasks from this plan:

Plan Content:
{plan_content}{context_section}

Identify concrete, actionable tasks mentioned or implied in this plan.
Prioritize based on dependencies and importance.
{"Include time estimates for each task." if include_estimates else ""}

Return your response as JSON:
{{
    "tasks": [
        {{
            "title": "Task extracted from plan",
            "description": "Detailed description",
            "estimated_hours": 4,
            "priority": 1,
            "phase": "Which phase this belongs to",
            "dependencies": [],
            "source_section": "Which part of plan this came from"
        }}
    ],
    "total_estimated_hours": 40,
    "phases_identified": ["Phase 1", "Phase 2"],
    "tasks_by_phase": {{
        "Phase 1": ["Task 1", "Task 2"]
    }}
}}"""

        result = await self.generate_json(prompt, self.BREAKDOWN_SYSTEM_PROMPT)

        tasks = result.get("tasks", [])
        total_hours = sum(t.get("estimated_hours", 0) for t in tasks)

        return {
            "success": True,
            "tasks": tasks,
            "total_estimated_hours": result.get("total_estimated_hours", total_hours),
            "phases_identified": result.get("phases_identified", []),
            "tasks_by_phase": result.get("tasks_by_phase", {}),
            "source": "plan",
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "task_count": len(tasks)
            }
        }


# Module-level handler functions (called by registry)
async def generate_tasks_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """Shared handler for generate_tasks and task_breakdown workflows"""
    return await _get_handler().generate_tasks_handler(input_data)
