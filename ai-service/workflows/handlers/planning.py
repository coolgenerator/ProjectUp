"""
Planning Workflow Handlers

Handles:
- expand_idea: Break down ideas into sub-components
- generate_plan: Create comprehensive project plans
- suggest_milestones: Create project checkpoints
"""

from typing import Dict, Any, List
import logging
from .base import BaseHandler

logger = logging.getLogger(__name__)

# Singleton handler instance
_handler = None


def _get_handler() -> "PlanningHandlers":
    global _handler
    if _handler is None:
        _handler = PlanningHandlers()
    return _handler


class PlanningHandlers(BaseHandler):
    """Handlers for planning workflows"""

    EXPAND_IDEA_SYSTEM_PROMPT = """You are an expert at breaking down complex ideas into manageable components.
Your goal is to help users understand all dimensions of their idea and identify actionable sub-ideas.
Always provide practical, specific suggestions that can be acted upon."""

    GENERATE_PLAN_SYSTEM_PROMPT = """You are an expert project planner with experience in software development,
product management, and strategic planning. Create comprehensive, actionable project plans that are
realistic and well-structured. Include clear milestones, dependencies, and time estimates when appropriate."""

    MILESTONES_SYSTEM_PROMPT = """You are an expert at identifying key project milestones and deliverables.
Focus on measurable outcomes that indicate real progress. Milestones should be specific, achievable,
and represent meaningful checkpoints in the project journey."""

    async def expand_idea_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Break down an idea into sub-components.

        Input:
            title: str - Idea title
            description: str - Idea description
            depth: int - How deep to expand (1-3)
            focus_areas: List[str] - Areas to focus on

        Output:
            suggestions: List of sub-ideas
            dimensions: Different aspects explored
            next_steps: Recommended actions
        """
        title = input_data.get("title", "")
        description = input_data.get("description", "")
        depth = input_data.get("depth", 2)
        focus_areas = input_data.get("focus_areas", [])
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        focus_str = f"\nFocus particularly on: {', '.join(focus_areas)}" if focus_areas else ""
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""

        prompt = f"""Analyze and expand this idea into sub-components:

Title: {title}
Description: {description}
Expansion Depth: {depth} levels{focus_str}{context_section}

Break this idea down into its key components. For each component, provide:
1. A clear title
2. A brief description
3. Why it's important
4. Potential sub-components (if depth > 1)

Return your response as JSON:
{{
    "summary": "Brief summary of the idea analysis",
    "dimensions": [
        {{
            "name": "Dimension name (e.g., Technical, Business, User Experience)",
            "aspects": ["Aspect 1", "Aspect 2"]
        }}
    ],
    "suggestions": [
        {{
            "title": "Sub-idea title",
            "description": "What this involves",
            "type": "feature|task|research|decision",
            "priority": "high|medium|low",
            "children": [...]  // If depth > 1
        }}
    ],
    "next_steps": [
        "Recommended action 1",
        "Recommended action 2"
    ],
    "questions_to_consider": [
        "Question that needs answering"
    ]
}}"""

        result = await self.generate_json(prompt, self.EXPAND_IDEA_SYSTEM_PROMPT)

        return {
            "success": True,
            "summary": result.get("summary", ""),
            "dimensions": result.get("dimensions", []),
            "suggestions": result.get("suggestions", []),
            "next_steps": result.get("next_steps", []),
            "questions_to_consider": result.get("questions_to_consider", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "expansion_depth": depth
            }
        }

    async def generate_plan_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a comprehensive project plan.

        Input:
            title: str - Project/idea title
            description: str - Description
            include_milestones: bool - Include milestones
            include_tasks: bool - Include task breakdown
            timeline_weeks: int - Estimated duration

        Output:
            plan: Structured plan with phases
            milestones: Key checkpoints
            tasks: Actionable items
            risks: Potential risks
        """
        title = input_data.get("title", "")
        description = input_data.get("description", "")
        include_milestones = input_data.get("include_milestones", True)
        include_tasks = input_data.get("include_tasks", True)
        timeline_weeks = input_data.get("timeline_weeks")
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        timeline_str = f"\nTarget timeline: {timeline_weeks} weeks" if timeline_weeks else ""
        context_section = f"\n\nExisting Project Context:\n{context_str}" if context_str else ""

        milestones_section = """
    "milestones": [
        {
            "title": "Milestone title",
            "description": "What this milestone represents",
            "target_week": 2,
            "deliverables": ["Deliverable 1", "Deliverable 2"],
            "success_criteria": ["Criterion 1"]
        }
    ],""" if include_milestones else ""

        tasks_section = """
    "tasks": [
        {
            "title": "Task title",
            "description": "What needs to be done",
            "phase": "Phase name",
            "estimated_hours": 4,
            "priority": 1,
            "dependencies": [],
            "skills_required": ["Skill 1"]
        }
    ],""" if include_tasks else ""

        prompt = f"""Create a comprehensive project plan for:

Title: {title}
Description: {description}{timeline_str}{context_section}

Generate a detailed project plan with clear phases, objectives, and actionable items.

Return your response as JSON:
{{
    "plan_summary": "Executive summary of the plan",
    "phases": [
        {{
            "name": "Phase name",
            "description": "Phase description",
            "duration_weeks": 2,
            "objectives": ["Objective 1", "Objective 2"],
            "key_activities": ["Activity 1", "Activity 2"]
        }}
    ],{milestones_section}{tasks_section}
    "risks": [
        {{
            "description": "Risk description",
            "impact": "high|medium|low",
            "mitigation": "How to mitigate"
        }}
    ],
    "success_metrics": [
        "How to measure success"
    ],
    "resource_requirements": {{
        "skills": ["Required skill 1"],
        "tools": ["Required tool 1"],
        "estimated_total_hours": 100
    }}
}}"""

        result = await self.generate_json(prompt, self.GENERATE_PLAN_SYSTEM_PROMPT)

        return {
            "success": True,
            "plan_summary": result.get("plan_summary", ""),
            "phases": result.get("phases", []),
            "milestones": result.get("milestones", []) if include_milestones else [],
            "tasks": result.get("tasks", []) if include_tasks else [],
            "risks": result.get("risks", []),
            "success_metrics": result.get("success_metrics", []),
            "resource_requirements": result.get("resource_requirements", {}),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "timeline_weeks": timeline_weeks,
                "include_milestones": include_milestones,
                "include_tasks": include_tasks
            }
        }

    async def suggest_milestones_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest project milestones.

        Input:
            title: str - Project title
            description: str - Project description
            num_milestones: int - Number of milestones to suggest
            project_duration_weeks: int - Project duration

        Output:
            milestones: List of suggested milestones
        """
        title = input_data.get("title", "")
        description = input_data.get("description", "")
        num_milestones = input_data.get("num_milestones", 5)
        duration_weeks = input_data.get("project_duration_weeks")
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        duration_str = f"\nProject duration: {duration_weeks} weeks" if duration_weeks else ""
        context_section = f"\n\nExisting Project Context:\n{context_str}" if context_str else ""

        prompt = f"""Suggest {num_milestones} key milestones for this project:

Title: {title}
Description: {description}{duration_str}{context_section}

Create meaningful milestones that represent significant progress points.
Each milestone should be specific, measurable, and achievable.

Return your response as JSON:
{{
    "milestones": [
        {{
            "title": "Milestone title",
            "description": "What this milestone represents",
            "week_number": 2,
            "deliverables": ["Concrete deliverable 1", "Concrete deliverable 2"],
            "success_criteria": ["How to know it's complete"],
            "dependencies": ["What must be done first"],
            "risk_factors": ["Potential blockers"]
        }}
    ],
    "milestone_overview": "Summary of the milestone roadmap",
    "critical_path": ["Milestone 1 title", "Milestone 2 title"]
}}"""

        result = await self.generate_json(prompt, self.MILESTONES_SYSTEM_PROMPT)

        return {
            "success": True,
            "milestones": result.get("milestones", []),
            "milestone_overview": result.get("milestone_overview", ""),
            "critical_path": result.get("critical_path", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "num_milestones": num_milestones,
                "duration_weeks": duration_weeks
            }
        }


# Module-level handler functions (called by registry)
async def expand_idea_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().expand_idea_handler(input_data)


async def generate_plan_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().generate_plan_handler(input_data)


async def suggest_milestones_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().suggest_milestones_handler(input_data)
