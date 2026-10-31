"""
Analysis Workflow Handlers

Handles:
- analyze_feasibility: Assess project/idea feasibility
- estimate_effort: Estimate time and resources
- find_dependencies: Identify task dependencies
- analyze_plan: Review and improve plans
"""

from typing import Dict, Any, List
import logging
from .base import BaseHandler

logger = logging.getLogger(__name__)

# Singleton handler instance
_handler = None


def _get_handler() -> "AnalysisHandlers":
    global _handler
    if _handler is None:
        _handler = AnalysisHandlers()
    return _handler


class AnalysisHandlers(BaseHandler):
    """Handlers for analysis workflows"""

    FEASIBILITY_SYSTEM_PROMPT = """You are an expert at analyzing project feasibility.
Provide honest, balanced assessments of technical, resource, and market feasibility.
Identify risks clearly and suggest practical mitigations."""

    EFFORT_SYSTEM_PROMPT = """You are an expert at software project estimation.
Provide realistic time and resource estimates based on industry standards.
Account for common factors that affect estimates like complexity, unknowns, and team experience."""

    DEPENDENCIES_SYSTEM_PROMPT = """You are an expert at identifying task dependencies and relationships.
Find both explicit and implicit dependencies. Consider technical, resource, and logical dependencies.
Help create efficient execution orders that minimize blockers."""

    PLAN_ANALYSIS_SYSTEM_PROMPT = """You are an expert project planner and reviewer.
Analyze plans for completeness, feasibility, and potential issues.
Provide constructive feedback and specific improvement suggestions."""

    async def analyze_feasibility_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze feasibility of a project or idea.

        Input:
            title: str - Project/idea title
            description: str - Detailed description
            constraints: Dict - Time, budget, resource constraints
            technical_requirements: List[str] - Technical needs
            team_skills: List[str] - Available team skills

        Output:
            feasibility_score: Overall score (0-100)
            technical_feasibility: Technical assessment
            resource_feasibility: Resource assessment
            risks: Identified risks
            recommendations: How to improve feasibility
        """
        title = input_data.get("title", "")
        description = input_data.get("description", "")
        constraints = input_data.get("constraints", {})
        technical_requirements = input_data.get("technical_requirements", [])
        team_skills = input_data.get("team_skills", [])
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        constraints_str = "\n".join(f"  - {k}: {v}" for k, v in constraints.items()) if constraints else "Not specified"
        tech_reqs_str = ", ".join(technical_requirements) if technical_requirements else "Not specified"
        skills_str = ", ".join(team_skills) if team_skills else "Not specified"
        context_section = f"\n\nExisting Project Context:\n{context_str}" if context_str else ""

        prompt = f"""Analyze the feasibility of this project:

Title: {title}
Description: {description}

Constraints:
{constraints_str}

Technical Requirements: {tech_reqs_str}
Team Skills Available: {skills_str}{context_section}

Provide an honest assessment of feasibility across multiple dimensions.
Be realistic about challenges while identifying paths to success.

Return your response as JSON:
{{
    "feasibility_score": 75,
    "score_breakdown": {{
        "technical": 80,
        "resource": 70,
        "timeline": 75,
        "market": 80
    }},
    "summary": "Overall feasibility assessment summary",
    "technical_feasibility": {{
        "score": 80,
        "assessment": "Technical assessment explanation",
        "strengths": ["Technical strength 1"],
        "challenges": ["Technical challenge 1"],
        "skill_gaps": ["Missing skill 1"],
        "technology_risks": ["Tech risk 1"]
    }},
    "resource_feasibility": {{
        "score": 70,
        "assessment": "Resource assessment explanation",
        "team_readiness": "Assessment of team capability",
        "resource_gaps": ["Missing resource 1"],
        "budget_concerns": ["Budget issue if any"]
    }},
    "timeline_feasibility": {{
        "score": 75,
        "assessment": "Timeline assessment",
        "realistic_duration": "Realistic estimate",
        "bottlenecks": ["Potential bottleneck 1"],
        "parallel_opportunities": ["What can be parallelized"]
    }},
    "risks": [
        {{
            "category": "technical|resource|timeline|external",
            "description": "Risk description",
            "probability": "high|medium|low",
            "impact": "high|medium|low",
            "mitigation": "How to mitigate"
        }}
    ],
    "recommendations": [
        {{
            "priority": 1,
            "recommendation": "Specific recommendation",
            "impact_on_feasibility": "How this improves feasibility",
            "effort_required": "low|medium|high"
        }}
    ],
    "go_no_go": {{
        "recommendation": "go|conditional_go|no_go",
        "conditions": ["Condition for proceeding"],
        "rationale": "Why this recommendation"
    }}
}}"""

        result = await self.generate_json(prompt, self.FEASIBILITY_SYSTEM_PROMPT)

        return {
            "success": True,
            "feasibility_score": result.get("feasibility_score", 0),
            "score_breakdown": result.get("score_breakdown", {}),
            "summary": result.get("summary", ""),
            "technical_feasibility": result.get("technical_feasibility", {}),
            "resource_feasibility": result.get("resource_feasibility", {}),
            "timeline_feasibility": result.get("timeline_feasibility", {}),
            "risks": result.get("risks", []),
            "recommendations": result.get("recommendations", []),
            "go_no_go": result.get("go_no_go", {}),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "risk_count": len(result.get("risks", []))
            }
        }

    async def estimate_effort_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estimate effort for tasks or projects.

        Input:
            items: List[Dict] - Items to estimate (title, description)
            estimation_type: str - story_points, hours, days
            team_size: int - Number of people
            include_buffer: bool - Add contingency buffer
            complexity_factors: List[str] - Factors affecting complexity

        Output:
            estimates: Per-item estimates
            total_estimate: Aggregate estimate
            confidence_level: Estimate confidence
            assumptions: Key assumptions made
        """
        items = input_data.get("items", [])
        estimation_type = input_data.get("estimation_type", "hours")
        team_size = input_data.get("team_size", 1)
        include_buffer = input_data.get("include_buffer", True)
        complexity_factors = input_data.get("complexity_factors", [])
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        items_str = "\n".join(
            f"  {i+1}. {item.get('title', 'Untitled')}: {item.get('description', '')}"
            for i, item in enumerate(items)
        )
        factors_str = ", ".join(complexity_factors) if complexity_factors else "None specified"
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""
        buffer_instruction = "Include a contingency buffer for unknowns." if include_buffer else ""

        prompt = f"""Estimate the effort for these items:

Items to Estimate:
{items_str}

Estimation Type: {estimation_type}
Team Size: {team_size}
Complexity Factors: {factors_str}{context_section}

{buffer_instruction}

Provide realistic estimates based on typical software development effort.
Account for common underestimation factors.

Return your response as JSON:
{{
    "estimates": [
        {{
            "item_title": "Item title",
            "estimate": 8,
            "unit": "{estimation_type}",
            "range": {{
                "optimistic": 6,
                "realistic": 8,
                "pessimistic": 12
            }},
            "complexity": "low|medium|high|very_high",
            "confidence": "high|medium|low",
            "breakdown": [
                {{"activity": "Activity name", "effort": 2}}
            ],
            "factors_affecting": ["Factor 1"],
            "risks_to_estimate": ["What could make this take longer"]
        }}
    ],
    "total_estimate": {{
        "sum": 40,
        "with_buffer": 52,
        "buffer_percentage": 30,
        "unit": "{estimation_type}",
        "calendar_duration": "X weeks with {team_size} people"
    }},
    "confidence_level": {{
        "overall": "medium",
        "rationale": "Why this confidence level"
    }},
    "assumptions": [
        "Key assumption made"
    ],
    "estimation_notes": [
        "Important note about these estimates"
    ],
    "recommendations": [
        "How to improve estimate accuracy"
    ]
}}"""

        result = await self.generate_json(prompt, self.EFFORT_SYSTEM_PROMPT)

        return {
            "success": True,
            "estimates": result.get("estimates", []),
            "total_estimate": result.get("total_estimate", {}),
            "confidence_level": result.get("confidence_level", {}),
            "assumptions": result.get("assumptions", []),
            "estimation_notes": result.get("estimation_notes", []),
            "recommendations": result.get("recommendations", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "estimation_type": estimation_type,
                "item_count": len(items),
                "team_size": team_size
            }
        }

    async def find_dependencies_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find dependencies between tasks.

        Input:
            tasks: List[Dict] - Tasks to analyze
            include_implicit: bool - Find implicit dependencies
            include_external: bool - Find external dependencies

        Output:
            dependencies: Dependency relationships
            dependency_graph: Visual representation
            critical_path: Longest dependency chain
            parallel_groups: Tasks that can run in parallel
        """
        tasks = input_data.get("tasks", [])
        include_implicit = input_data.get("include_implicit", True)
        include_external = input_data.get("include_external", True)
        project_id = input_data.get("_project_id")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        tasks_str = "\n".join(
            f"  {i+1}. {task.get('title', 'Untitled')}: {task.get('description', '')}"
            for i, task in enumerate(tasks)
        )
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""

        implicit_instruction = "Also identify implicit dependencies that aren't explicitly stated but logically exist." if include_implicit else ""
        external_instruction = "Include external dependencies (APIs, services, approvals, etc.)." if include_external else ""

        prompt = f"""Analyze dependencies between these tasks:

Tasks:
{tasks_str}{context_section}

{implicit_instruction}
{external_instruction}

Identify all dependency relationships and suggest an optimal execution order.

Return your response as JSON:
{{
    "dependencies": [
        {{
            "from_task": "Task title",
            "to_task": "Dependent task title",
            "dependency_type": "blocks|requires|soft_dependency|external",
            "reason": "Why this dependency exists",
            "is_implicit": false
        }}
    ],
    "external_dependencies": [
        {{
            "task": "Task title",
            "external_dependency": "What external thing is needed",
            "type": "api|service|approval|resource|data",
            "risk_level": "high|medium|low",
            "mitigation": "How to handle this"
        }}
    ],
    "dependency_graph": {{
        "nodes": ["Task 1", "Task 2"],
        "edges": [
            {{"from": "Task 1", "to": "Task 2", "type": "blocks"}}
        ]
    }},
    "critical_path": {{
        "path": ["Task 1", "Task 2", "Task 3"],
        "total_duration": "Estimated time for critical path",
        "bottleneck": "The most blocking task"
    }},
    "parallel_groups": [
        {{
            "group_name": "Phase 1 Parallel Tasks",
            "tasks": ["Task A", "Task B"],
            "can_start_after": "Prerequisite task or 'immediately'"
        }}
    ],
    "recommended_order": [
        {{
            "order": 1,
            "task": "Task title",
            "rationale": "Why this order"
        }}
    ],
    "risk_analysis": {{
        "high_dependency_tasks": ["Tasks with many dependencies"],
        "orphan_tasks": ["Tasks with no dependencies"],
        "circular_risks": ["Any potential circular dependency issues"]
    }}
}}"""

        result = await self.generate_json(prompt, self.DEPENDENCIES_SYSTEM_PROMPT)

        return {
            "success": True,
            "dependencies": result.get("dependencies", []),
            "external_dependencies": result.get("external_dependencies", []),
            "dependency_graph": result.get("dependency_graph", {}),
            "critical_path": result.get("critical_path", {}),
            "parallel_groups": result.get("parallel_groups", []),
            "recommended_order": result.get("recommended_order", []),
            "risk_analysis": result.get("risk_analysis", {}),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "task_count": len(tasks),
                "dependency_count": len(result.get("dependencies", []))
            }
        }

    async def analyze_plan_handler(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze and improve a project plan.

        Input:
            plan_content: str - Plan to analyze (or plan_id to fetch)
            plan_id: str - ID to fetch plan from backend
            analysis_focus: List[str] - Areas to focus on
            improvement_priority: str - What to optimize for

        Output:
            analysis: Detailed plan analysis
            issues: Identified issues
            improvements: Suggested improvements
            improved_plan: Revised plan if requested
        """
        plan_content = input_data.get("plan_content", "")
        plan_id = input_data.get("plan_id")
        analysis_focus = input_data.get("analysis_focus", ["completeness", "feasibility", "clarity"])
        improvement_priority = input_data.get("improvement_priority", "balanced")
        project_id = input_data.get("_project_id")

        # Fetch plan from backend if plan_id provided
        if plan_id and not plan_content:
            try:
                plan_data = await self.plan_integration.get_plan(plan_id)
                if plan_data:
                    plan_content = f"Title: {plan_data.get('title', '')}\n"
                    plan_content += f"Description: {plan_data.get('description', '')}\n"
                    if plan_data.get("phases"):
                        plan_content += f"Phases: {plan_data.get('phases')}\n"
                    if plan_data.get("tasks"):
                        plan_content += f"Tasks: {plan_data.get('tasks')}\n"
            except Exception as e:
                logger.warning(f"Failed to fetch plan {plan_id}: {e}")

        # Enrich with backend context
        if project_id:
            input_data = await self.enrich_context(project_id, input_data)
            context_str = self.format_context_for_prompt(input_data.get("_backend_context", {}))
        else:
            context_str = ""

        focus_str = ", ".join(analysis_focus)
        context_section = f"\n\nProject Context:\n{context_str}" if context_str else ""

        prompt = f"""Analyze this project plan:

Plan Content:
{plan_content}

Analysis Focus: {focus_str}
Improvement Priority: {improvement_priority}{context_section}

Provide a thorough analysis with specific, actionable feedback.

Return your response as JSON:
{{
    "overall_assessment": {{
        "score": 75,
        "summary": "Overall plan assessment",
        "strengths": ["Plan strength 1"],
        "weaknesses": ["Plan weakness 1"]
    }},
    "analysis_by_focus": {{
        "completeness": {{
            "score": 80,
            "assessment": "Completeness analysis",
            "missing_elements": ["Missing element 1"],
            "over_specified": ["Unnecessarily detailed area"]
        }},
        "feasibility": {{
            "score": 70,
            "assessment": "Feasibility analysis",
            "concerns": ["Feasibility concern 1"],
            "unrealistic_elements": ["Element that seems unrealistic"]
        }},
        "clarity": {{
            "score": 75,
            "assessment": "Clarity analysis",
            "ambiguous_areas": ["Ambiguous section 1"],
            "improvement_suggestions": ["How to clarify"]
        }}
    }},
    "issues": [
        {{
            "severity": "high|medium|low",
            "category": "scope|timeline|resource|risk|clarity",
            "description": "Issue description",
            "location": "Where in the plan",
            "recommendation": "How to fix"
        }}
    ],
    "improvements": [
        {{
            "priority": 1,
            "category": "structure|content|detail|scope",
            "suggestion": "Specific improvement",
            "rationale": "Why this helps",
            "implementation": "How to implement"
        }}
    ],
    "quick_wins": [
        "Easy improvement that adds value"
    ],
    "questions_for_clarification": [
        "Question that would improve the plan"
    ]
}}"""

        result = await self.generate_json(prompt, self.PLAN_ANALYSIS_SYSTEM_PROMPT)

        return {
            "success": True,
            "overall_assessment": result.get("overall_assessment", {}),
            "analysis_by_focus": result.get("analysis_by_focus", {}),
            "issues": result.get("issues", []),
            "improvements": result.get("improvements", []),
            "quick_wins": result.get("quick_wins", []),
            "questions_for_clarification": result.get("questions_for_clarification", []),
            "metadata": {
                "workflow_id": input_data.get("_workflow_id"),
                "analysis_focus": analysis_focus,
                "issue_count": len(result.get("issues", [])),
                "improvement_count": len(result.get("improvements", []))
            }
        }


# Module-level handler functions (called by registry)
async def analyze_feasibility_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().analyze_feasibility_handler(input_data)


async def estimate_effort_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().estimate_effort_handler(input_data)


async def find_dependencies_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().find_dependencies_handler(input_data)


async def analyze_plan_handler(input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    return await _get_handler().analyze_plan_handler(input_data)
