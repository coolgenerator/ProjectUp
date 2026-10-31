"""
Base Handler - Base class for workflow handlers.

Provides:
- LLM access via Vertex AI
- Backend integrations (plans, tasks, milestones)
- Standard error handling
- Context enrichment
"""

from abc import ABC
from typing import Dict, Any, Optional, List
import logging
import json

logger = logging.getLogger(__name__)


class BaseHandler(ABC):
    """
    Base class for workflow handlers.

    Provides:
    - LLM access
    - Backend integrations (plans, tasks, milestones)
    - Standard error handling
    - Context enrichment
    """

    def __init__(self):
        self._llm = None
        self._plan_integration = None
        self._task_integration = None
        self._milestone_integration = None

    @property
    def llm(self):
        """Lazy load LLM to avoid import issues"""
        if self._llm is None:
            try:
                from core.vertex_config import get_vertex_ai_llm
                self._llm = get_vertex_ai_llm()
            except Exception as e:
                logger.warning(f"Failed to get Vertex AI LLM: {e}")
                # Fallback
                from langchain_google_vertexai import ChatVertexAI
                from config.settings import settings
                self._llm = ChatVertexAI(
                    model=settings.vertex_ai_model,
                    temperature=settings.vertex_ai_temperature,
                    max_output_tokens=settings.vertex_ai_max_tokens,
                    project=settings.gcp_project_id,
                    location=settings.gcp_location
                )
        return self._llm

    @property
    def plan_integration(self):
        """Lazy load plan integration"""
        if self._plan_integration is None:
            from services.integrations.plan_integration import plan_integration
            self._plan_integration = plan_integration
        return self._plan_integration

    @property
    def task_integration(self):
        """Lazy load task integration"""
        if self._task_integration is None:
            from services.integrations.task_integration import task_integration
            self._task_integration = task_integration
        return self._task_integration

    @property
    def milestone_integration(self):
        """Lazy load milestone integration"""
        if self._milestone_integration is None:
            from services.integrations.milestone_integration import milestone_integration
            self._milestone_integration = milestone_integration
        return self._milestone_integration

    async def enrich_context(
        self,
        project_id: Optional[str],
        input_data: Dict
    ) -> Dict[str, Any]:
        """
        Enrich input with backend context.

        Fetches existing plans, tasks, milestones for context-aware AI.
        """
        context = {}

        if project_id:
            try:
                import asyncio
                plans, tasks, milestones = await asyncio.gather(
                    self.plan_integration.get_project_plans(project_id),
                    self.task_integration.get_project_tasks(project_id),
                    self.milestone_integration.get_project_milestones(project_id),
                    return_exceptions=True
                )

                if not isinstance(plans, Exception):
                    context["existing_plans"] = plans
                    context["plans_count"] = len(plans)

                if not isinstance(tasks, Exception):
                    context["existing_tasks"] = tasks
                    context["tasks_count"] = len(tasks)
                    context["pending_tasks"] = [
                        t for t in tasks
                        if t.get("status") in ["todo", "in_progress"]
                    ]

                if not isinstance(milestones, Exception):
                    context["existing_milestones"] = milestones
                    context["milestones_count"] = len(milestones)

            except Exception as e:
                context["_enrichment_error"] = str(e)
                logger.warning(f"Failed to enrich context: {e}")

        return {**input_data, "_backend_context": context}

    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate JSON response from LLM.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt for context

        Returns:
            Parsed JSON response
        """
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        try:
            response = await self.llm.ainvoke(messages)
            content = response.content

            # Extract JSON from response
            json_str = self._extract_json(content)
            return json.loads(json_str)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return {"error": "Failed to parse response", "raw": content}
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return {"error": str(e)}

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text response from LLM"""
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        try:
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return f"Error: {str(e)}"

    def _extract_json(self, content: str) -> str:
        """Extract JSON from LLM response (handles markdown code blocks)"""
        # Try to find JSON in code blocks
        if "```json" in content:
            start = content.find("```json") + 7
            end = content.find("```", start)
            if end > start:
                return content[start:end].strip()

        if "```" in content:
            start = content.find("```") + 3
            end = content.find("```", start)
            if end > start:
                return content[start:end].strip()

        # Try to find JSON object/array
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = content.find(start_char)
            if start != -1:
                # Find matching end
                depth = 0
                for i, char in enumerate(content[start:], start):
                    if char == start_char:
                        depth += 1
                    elif char == end_char:
                        depth -= 1
                        if depth == 0:
                            return content[start:i+1]

        # Return as-is and let JSON parser handle it
        return content.strip()

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Format backend context for inclusion in prompts"""
        parts = []

        if context.get("existing_plans"):
            plans = context["existing_plans"][:5]  # Limit for context window
            parts.append("Existing Plans:")
            for plan in plans:
                parts.append(f"  - {plan.get('title', 'Untitled')}")

        if context.get("pending_tasks"):
            tasks = context["pending_tasks"][:10]
            parts.append("\nPending Tasks:")
            for task in tasks:
                status = task.get("status", "unknown")
                parts.append(f"  - [{status}] {task.get('title', 'Untitled')}")

        if context.get("existing_milestones"):
            milestones = context["existing_milestones"][:5]
            parts.append("\nMilestones:")
            for ms in milestones:
                parts.append(f"  - {ms.get('title', 'Untitled')}")

        return "\n".join(parts) if parts else "No existing project context available."
