"""
Learning Workflow Handlers

Handles:
- find_resources: Find learning materials and documentation
- task_guidance: Get implementation guidance for tasks
- generate_learning_path: Create structured learning paths
"""

from typing import Dict, Any, List
import logging
from .base import BaseHandler

logger = logging.getLogger(__name__)

# Singleton handler instance
_handler = None


def _get_handler() -> "LearningHandlers":
    global _handler
    if _handler is None:
        _handler = LearningHandlers()
    return _handler


class LearningHandlers(BaseHandler):
    """Handlers for learning and guidance workflows"""

    RESOURCES_SYSTEM_PROMPT = """You are an expert at finding and recommending learning resources.
You help users discover documentation, tutorials, courses, and tools relevant to their tasks.
Prioritize official documentation, well-maintained resources, and practical examples."""

    GUIDANCE_SYSTEM_PROMPT = """You are an expert software development mentor.
Provide clear, actionable implementation guidance that helps users complete their tasks.
Include code examples, best practices, and common pitfalls to avoid."""

    LEARNING_PATH_SYSTEM_PROMPT = """You are an expert at creating structured learning paths.
Design progressive learning journeys that build skills systematically.
Balance theory with practice and include checkpoints to verify understanding."""

    async def find_resources_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find learning resources for a topic or task.

        Input:
            topic: str - Topic to find resources for
            task_title: str - Task title for context
            task_description: str - Task description
            resource_types: List[str] - Types to include (docs, tutorials, videos, tools)
            skill_level: str - beginner/intermediate/advanced
            max_resources: int - Maximum resources to return

        Output:
            resources: List of categorized resources
            recommended_order: Suggested learning order
            quick_start: Best resource to start with
        """
        topic = input_data.get("topic", "")
        task_title = input_data.get("task_title", "")
        task_description = input_data.get("task_description", "")
        resource_types = input_data.get("resource_types", ["docs", "tutorials", "tools"])
        skill_level = input_data.get("skill_level", "intermediate")
        max_resources = input_data.get("max_resources", 10)
        project_id = input_data.get("_project_id")

        # Build search context
        search_context = topic or task_title
        if task_description:
            search_context += f"\nContext: {task_description}"

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""
        types_str = ", ".join(resource_types)

        prompt = f"""Find up to {max_resources} learning resources for:

Topic/Task: {search_context}
Skill Level: {skill_level}
Resource Types Needed: {types_str}{context_section}

Identify the most valuable resources for learning and implementing this topic.
Prioritize practical, up-to-date resources from reputable sources.

Return your response as JSON:
{{
    "topic_summary": "Brief summary of what needs to be learned",
    "resources": [
        {{
            "title": "Resource title",
            "type": "docs|tutorial|video|tool|course|article|repo",
            "url": "Resource URL (use realistic URLs for well-known resources)",
            "description": "Why this resource is valuable",
            "skill_level": "beginner|intermediate|advanced",
            "time_to_complete": "Estimated time (e.g., '30 mins', '2 hours')",
            "key_topics": ["Topic 1", "Topic 2"],
            "is_free": true,
            "quality_score": 8
        }}
    ],
    "recommended_order": ["Resource title 1", "Resource title 2"],
    "quick_start": {{
        "resource_title": "Best starting point",
        "reason": "Why start here"
    }},
    "learning_tips": [
        "Tip for effective learning"
    ],
    "related_topics": ["Related topic 1", "Related topic 2"]
}}"""

        result = await self.generate_json(prompt, self.RESOURCES_SYSTEM_PROMPT)

        return {
            "success": True,
            "topic_summary": result.get("topic_summary", ""),
            "resources": result.get("resources", []),
            "recommended_order": result.get("recommended_order", []),
            "quick_start": result.get("quick_start", {}),
            "learning_tips": result.get("learning_tips", []),
            "related_topics": result.get("related_topics", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "skill_level": skill_level,
                "resource_count": len(result.get("resources", []))
            }
        }

    async def task_guidance_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get implementation guidance for a task.

        Input:
            task_title: str - Task title
            task_description: str - Task description
            tech_stack: List[str] - Technologies being used
            specific_questions: List[str] - Specific questions to answer
            include_code_examples: bool - Include code snippets

        Output:
            guidance: Structured implementation guidance
            steps: Step-by-step instructions
            code_examples: Code snippets if requested
            common_issues: Potential problems and solutions
        """
        task_title = input_data.get("task_title", "")
        task_description = input_data.get("task_description", "")
        tech_stack = input_data.get("tech_stack", [])
        specific_questions = input_data.get("specific_questions", [])
        include_code = input_data.get("include_code_examples", True)
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        tech_str = ", ".join(tech_stack) if tech_stack else "Not specified"
        questions_str = "\n".join(f"- {q}" for q in specific_questions) if specific_questions else ""
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""
        code_instruction = "Include practical code examples for key steps." if include_code else ""

        prompt = f"""Provide implementation guidance for this task:

Task: {task_title}
Description: {task_description}
Tech Stack: {tech_str}
{f"Specific Questions:{chr(10)}{questions_str}" if questions_str else ""}{context_section}

{code_instruction}

Provide clear, actionable guidance that helps complete this task efficiently.

Return your response as JSON:
{{
    "overview": "High-level approach summary",
    "prerequisites": [
        {{
            "item": "What's needed before starting",
            "importance": "required|recommended|optional"
        }}
    ],
    "steps": [
        {{
            "step_number": 1,
            "title": "Step title",
            "description": "Detailed explanation",
            "code_example": "// Code if applicable",
            "tips": ["Helpful tip"],
            "estimated_time": "15 mins"
        }}
    ],
    "common_issues": [
        {{
            "issue": "Common problem",
            "cause": "Why it happens",
            "solution": "How to fix it",
            "prevention": "How to avoid it"
        }}
    ],
    "best_practices": [
        "Best practice recommendation"
    ],
    "testing_suggestions": [
        "How to verify the implementation works"
    ],
    "questions_answered": {{
        "Question 1": "Answer 1"
    }}
}}"""

        result = await self.generate_json(prompt, self.GUIDANCE_SYSTEM_PROMPT)

        return {
            "success": True,
            "overview": result.get("overview", ""),
            "prerequisites": result.get("prerequisites", []),
            "steps": result.get("steps", []),
            "common_issues": result.get("common_issues", []),
            "best_practices": result.get("best_practices", []),
            "testing_suggestions": result.get("testing_suggestions", []),
            "questions_answered": result.get("questions_answered", {}),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "tech_stack": tech_stack,
                "step_count": len(result.get("steps", []))
            }
        }

    async def generate_learning_path_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a structured learning path.

        Input:
            goal: str - Learning goal
            current_skills: List[str] - Skills already possessed
            target_skills: List[str] - Skills to acquire
            time_available: str - Weekly time commitment
            preferred_formats: List[str] - Learning format preferences

        Output:
            learning_path: Structured path with modules
            timeline: Estimated completion timeline
            milestones: Learning milestones
        """
        goal = input_data.get("goal", "")
        current_skills = input_data.get("current_skills", [])
        target_skills = input_data.get("target_skills", [])
        time_available = input_data.get("time_available", "5 hours/week")
        preferred_formats = input_data.get("preferred_formats", ["tutorials", "projects", "docs"])
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        current_str = ", ".join(current_skills) if current_skills else "Beginner"
        target_str = ", ".join(target_skills) if target_skills else "Based on goal"
        formats_str = ", ".join(preferred_formats)
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""

        prompt = f"""Create a structured learning path:

Goal: {goal}
Current Skills: {current_str}
Target Skills: {target_str}
Time Available: {time_available}
Preferred Learning Formats: {formats_str}{context_section}

Design a progressive learning journey that builds skills systematically.
Include practical projects and checkpoints to verify progress.

Return your response as JSON:
{{
    "path_summary": "Overview of the learning journey",
    "estimated_duration": "Total time to complete (e.g., '8 weeks')",
    "modules": [
        {{
            "module_number": 1,
            "title": "Module title",
            "description": "What this module covers",
            "skills_covered": ["Skill 1", "Skill 2"],
            "duration": "2 weeks",
            "resources": [
                {{
                    "title": "Resource name",
                    "type": "tutorial|course|project|docs",
                    "time_required": "2 hours"
                }}
            ],
            "practical_project": {{
                "title": "Hands-on project",
                "description": "What to build",
                "skills_practiced": ["Skill 1"]
            }},
            "checkpoint": {{
                "title": "Progress check",
                "criteria": ["Can do X", "Understands Y"]
            }}
        }}
    ],
    "milestones": [
        {{
            "title": "Milestone title",
            "after_module": 2,
            "achievement": "What you can do at this point",
            "celebration_worthy": true
        }}
    ],
    "tips_for_success": [
        "Advice for staying on track"
    ],
    "alternative_paths": [
        {{
            "condition": "If you already know X",
            "skip_modules": [1],
            "focus_on": ["Module 3"]
        }}
    ]
}}"""

        result = await self.generate_json(prompt, self.LEARNING_PATH_SYSTEM_PROMPT)

        return {
            "success": True,
            "path_summary": result.get("path_summary", ""),
            "estimated_duration": result.get("estimated_duration", ""),
            "modules": result.get("modules", []),
            "milestones": result.get("milestones", []),
            "tips_for_success": result.get("tips_for_success", []),
            "alternative_paths": result.get("alternative_paths", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "module_count": len(result.get("modules", [])),
                "time_available": time_available
            }
        }


# Module-level handler functions (called by registry)
async def find_resources_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().find_resources_handler(input_data)


async def task_guidance_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().task_guidance_handler(input_data)


async def generate_learning_path_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().generate_learning_path_handler(input_data)
