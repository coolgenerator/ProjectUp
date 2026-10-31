"""
AI-powered project roadmap generator service.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from models.requests.project_roadmap_requests import (
    GenerateProjectRoadmapRequest,
    RegenerateRoadmapSectionRequest,
    ExpandMilestoneRequest
)
from models.responses.project_roadmap_responses import (
    GenerateProjectRoadmapResponse,
    RoadmapSection,
    RoadmapMilestone,
    RoadmapTask,
    RoadmapSubtask,
    ProjectProposal,
    DependencyEdge
)
from prompts.project_roadmap_prompts import (
    GENERATE_ROADMAP_SYSTEM_PROMPT,
    GENERATE_ROADMAP_USER_PROMPT,
    GENERATE_PROPOSALS_PROMPT,
    EXPAND_MILESTONE_PROMPT,
    REGENERATE_SECTION_PROMPT
)
from prompts.research_project_prompts import (
    RESEARCH_ROADMAP_SYSTEM_PROMPT,
    RESEARCH_ROADMAP_USER_PROMPT,
    RESEARCH_PROPOSALS_PROMPT
)
from utils.project_type_detector import detect_project_type
from services.llm.llm_service import LLMService

logger = logging.getLogger(__name__)


class ProjectRoadmapGenerator:
    """Service for generating comprehensive project roadmaps using AI"""

    def __init__(self):
        self.llm_service = LLMService()

    async def generate_roadmap(
        self,
        request: GenerateProjectRoadmapRequest
    ) -> GenerateProjectRoadmapResponse:
        """
        Generate a comprehensive project roadmap with sections, milestones, tasks, and dependencies.

        Args:
            request: The roadmap generation request

        Returns:
            Complete roadmap response with all components
        """
        try:
            logger.info(f"Generating roadmap for project: {request.project_title}")

            # Step 1: Generate the main roadmap structure
            roadmap_data = await self._generate_roadmap_structure(request)

            # Step 2: Parse and validate the roadmap
            sections = self._parse_sections(roadmap_data.get("sections", []))

            # Step 3: Generate proposals if requested
            proposals = []
            if request.generate_proposals:
                proposals = await self._generate_proposals(request, sections)

            # Step 4: Build dependency graph if requested
            dependencies_graph = []
            if request.generate_dependencies:
                dependencies_graph = self._build_dependency_graph(sections)

            # Step 5: Calculate totals
            total_hours, total_tasks, total_milestones = self._calculate_totals(sections)

            response = GenerateProjectRoadmapResponse(
                success=True,
                sections=sections,
                proposals=proposals,
                total_estimated_hours=total_hours,
                total_tasks=total_tasks,
                total_milestones=total_milestones,
                dependencies_graph=dependencies_graph,
                metadata={
                    "project_id": request.project_id,
                    "project_title": request.project_title,
                    "difficulty_level": request.difficulty_level,
                    "duration_weeks": request.duration_weeks,
                    "team_size": request.team_size,
                    "generation_method": "ai_llm"
                },
                generated_at=datetime.utcnow()
            )

            logger.info(
                f"Successfully generated roadmap: {total_milestones} milestones, "
                f"{total_tasks} tasks, {total_hours:.1f} hours"
            )

            return response

        except Exception as e:
            logger.error(f"Error generating roadmap: {str(e)}", exc_info=True)
            return GenerateProjectRoadmapResponse(
                success=False,
                sections=[],
                total_estimated_hours=0,
                total_tasks=0,
                total_milestones=0,
                error_message=str(e)
            )

    async def _generate_roadmap_structure(
        self,
        request: GenerateProjectRoadmapRequest
    ) -> Dict[str, Any]:
        """Generate the roadmap structure using LLM"""

        # Detect project type (research vs engineering)
        project_type_info = detect_project_type(
            project_description=request.project_description,
            goal=request.project_title,
            reference="",
            interests=[]
        )
        project_category = project_type_info['category']
        logger.info(f"Roadmap generator detected project type: {project_category} (confidence: {project_type_info['confidence']})")

        # Truncate long descriptions to save input tokens
        description = request.project_description
        if len(description) > 500:
            description = description[:497] + "..."
            logger.info(f"Truncated project description from {len(request.project_description)} to 500 chars")

        # Limit number of features and stack items to prevent token overflow
        max_items = 10
        features = request.key_features[:max_items] if request.key_features else []
        tech_stack = request.tech_stack[:max_items] if request.tech_stack else []

        if request.key_features and len(request.key_features) > max_items:
            logger.info(f"Truncated features from {len(request.key_features)} to {max_items} items")
        if request.tech_stack and len(request.tech_stack) > max_items:
            logger.info(f"Truncated tech stack from {len(request.tech_stack)} to {max_items} items")

        # Select appropriate prompts based on project type
        if project_category == 'research':
            system_prompt = RESEARCH_ROADMAP_SYSTEM_PROMPT
            user_prompt = RESEARCH_ROADMAP_USER_PROMPT.format(
                project_title=request.project_title,
                project_description=description,
                research_type=request.project_type or "General Research",
                difficulty_level=request.difficulty_level,
                duration_weeks=request.duration_weeks or "TBD",
                team_size=request.team_size,
                required_components="Literature review, data analysis, writing, presentation",
                deliverables=", ".join(features) if features else "Research paper, presentation slides",
                methodology="To be determined based on research question"
            )
        else:  # engineering or hybrid
            system_prompt = GENERATE_ROADMAP_SYSTEM_PROMPT
            user_prompt = GENERATE_ROADMAP_USER_PROMPT.format(
                project_title=request.project_title,
                project_description=description,
                project_type=request.project_type or "General",
                difficulty_level=request.difficulty_level,
                duration_weeks=request.duration_weeks or "TBD",
                team_size=request.team_size,
                key_features=", ".join(features) if features else "To be determined",
                tech_stack=", ".join(tech_stack) if tech_stack else "To be determined"
            )

        # Call LLM with sufficient tokens for comprehensive roadmap generation
        # Need 16000+ tokens to generate:
        # - 4-6 sections (research) or 3-5 sections (engineering)
        # - 2-4 milestones per section (8-24 milestones total)
        # - 3-8 tasks per milestone (24-192 tasks total)
        # - 2-5 subtasks per task
        #
        # CRITICAL: Gemini 2.0 Flash has 8192 output token limit
        # To get complete roadmaps, we need to stay within this limit
        # Strategy: Use concise descriptions, focus on structure
        response = await self.llm_service.generate_structured_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
            max_tokens=8000,  # Gemini 2.0 Flash maximum output tokens
            model_name="gemini-2.0-flash-exp"  # Model with 8K output capacity
        )

        # Parse JSON response
        try:
            roadmap_data = json.loads(response)

            # Validate that we got a complete response with multiple milestones
            sections = roadmap_data.get("sections", [])
            total_milestones = sum(len(s.get("milestones", [])) for s in sections)

            if total_milestones == 1:
                logger.warning(
                    "⚠️ Only 1 milestone generated - response may have been truncated! "
                    f"Response length: {len(response)} chars. "
                    "Consider using a model with higher token limits."
                )

            logger.info(
                f"Generated roadmap structure: {len(sections)} sections, "
                f"{total_milestones} total milestones"
            )

            return roadmap_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response length: {len(response)} characters")

            # Try to extract JSON from markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                return json.loads(json_str)
            raise ValueError("LLM did not return valid JSON")

    async def _generate_proposals(
        self,
        request: GenerateProjectRoadmapRequest,
        sections: List[RoadmapSection]
    ) -> List[ProjectProposal]:
        """Generate project proposals based on the roadmap"""

        try:
            # Detect project type to use appropriate proposal prompts
            project_type_info = detect_project_type(
                project_description=request.project_description,
                goal=request.project_title,
                reference="",
                interests=[]
            )
            project_category = project_type_info['category']

            # Select appropriate prompt based on project type
            if project_category == 'research':
                prompt = RESEARCH_PROPOSALS_PROMPT.format(
                    project_title=request.project_title,
                    project_description=request.project_description,
                    research_type=request.project_type or "General Research",
                    methodology="To be determined based on research question"
                )
            else:  # engineering or hybrid
                prompt = GENERATE_PROPOSALS_PROMPT.format(
                    project_title=request.project_title,
                    project_description=request.project_description
                )

            # Generate comprehensive strategic proposal with extensive detail
            # The prompt requests 8+ detailed sections:
            # 1. Approach & Methodology (4-6 paragraphs with markdown headers)
            # 2. Benefits (6-10 specific advantages)
            # 3. Challenges & Risk Mitigation (6-10 comprehensive pairs)
            # 4. Success Metrics (8-12 measurable KPIs)
            # 5. Decision Framework (comprehensive analysis)
            # 6. Alternative Approaches (4-6 detailed sections)
            # 7. Resources Needed (comprehensive categorized list)
            # 8. Implementation Timeline (detailed phase breakdown)
            # This requires 8000 tokens for full detail (Gemini 2.0 Flash limit)
            response = await self.llm_service.generate_structured_response(
                system_prompt="You are an expert project strategist who creates detailed project proposals.",
                user_prompt=prompt,
                temperature=0.8,
                max_tokens=8000  # Gemini 2.0 Flash maximum: 8192 (exclusive), so use 8000
            )

            logger.debug(f"Proposals LLM response (first 500 chars): {response[:500] if response else 'EMPTY'}")
            logger.debug(f"Proposals LLM response length: {len(response) if response else 0}")

            # Check if response is empty
            if not response or not response.strip():
                logger.warning("LLM returned empty response for proposals, skipping")
                return []

            # Parse proposals with error handling for markdown code blocks
            try:
                proposals_data = json.loads(response)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                if "```json" in response:
                    json_start = response.find("```json") + 7
                    json_end = response.find("```", json_start)
                    json_str = response[json_start:json_end].strip()
                    proposals_data = json.loads(json_str)
                elif "```" in response:
                    # Try generic code block
                    json_start = response.find("```") + 3
                    json_end = response.find("```", json_start)
                    json_str = response[json_start:json_end].strip()
                    proposals_data = json.loads(json_str)
                else:
                    logger.warning("Could not parse proposals from LLM response, returning empty list")
                    return []

            proposals = []

            for p_data in proposals_data.get("proposals", []):
                # Parse challenges with mitigation
                challenges_with_mitigation = []
                for cm in p_data.get("challenges_with_mitigation", []):
                    if isinstance(cm, dict):
                        challenges_with_mitigation.append({
                            "challenge": cm.get("challenge", ""),
                            "mitigation": cm.get("mitigation", "")
                        })

                # Parse decision framework
                decision_framework = None
                df_data = p_data.get("decision_framework")
                if df_data and isinstance(df_data, dict):
                    decision_framework = {
                        "best_for": df_data.get("best_for", ""),
                        "choose_if": df_data.get("choose_if", ""),
                        "avoid_if": df_data.get("avoid_if", "")
                    }

                proposal = ProjectProposal(
                    title=p_data.get("title", "Untitled Proposal"),
                    description=p_data.get("description", ""),
                    approach=p_data.get("approach", ""),
                    benefits=p_data.get("benefits", []),
                    challenges_with_mitigation=challenges_with_mitigation,
                    success_metrics=p_data.get("success_metrics", []),
                    decision_framework=decision_framework,
                    alternatives_considered=p_data.get("alternatives_considered"),
                    challenges=p_data.get("challenges", []),  # Legacy field
                    timeline=p_data.get("timeline"),
                    resources_needed=p_data.get("resources_needed", []),
                    status=p_data.get("status", "draft")
                )
                proposals.append(proposal)

            return proposals

        except Exception as e:
            logger.error(f"Error generating proposals: {e}", exc_info=True)
            logger.error(f"Full error details: {type(e).__name__}: {str(e)}")
            return []

    def _parse_sections(self, sections_data: List[Dict[str, Any]]) -> List[RoadmapSection]:
        """Parse sections data into RoadmapSection objects"""
        sections = []

        for s_data in sections_data:
            milestones = self._parse_milestones(s_data.get("milestones", []))

            section = RoadmapSection(
                name=s_data.get("name", "Untitled Section"),
                description=s_data.get("description", ""),
                order=s_data.get("order", 0),
                color=s_data.get("color"),
                milestones=milestones
            )
            sections.append(section)

        return sections

    def _parse_milestones(self, milestones_data: List[Dict[str, Any]]) -> List[RoadmapMilestone]:
        """Parse milestones data into RoadmapMilestone objects"""
        milestones = []

        for m_data in milestones_data:
            tasks = self._parse_tasks(m_data.get("tasks", []))

            # Calculate milestone priority from tasks if not provided
            # Use the highest priority (lowest number) task as milestone priority
            calculated_priority = 3  # Default to medium
            if tasks:
                calculated_priority = min(task.priority for task in tasks)

            milestone = RoadmapMilestone(
                title=m_data.get("title", "Untitled Milestone"),
                description=m_data.get("description", ""),
                tasks=tasks,
                estimated_hours=m_data.get("estimated_hours", sum(t.estimated_hours for t in tasks)),
                priority=m_data.get("priority", calculated_priority),
                start_offset_days=m_data.get("start_offset_days"),
                duration_days=m_data.get("duration_days"),
                status=m_data.get("status", "pending")
            )
            milestones.append(milestone)

        return milestones

    def _parse_tasks(self, tasks_data: List[Dict[str, Any]]) -> List[RoadmapTask]:
        """Parse tasks data into RoadmapTask objects"""
        tasks = []

        for t_data in tasks_data:
            subtasks = self._parse_subtasks(t_data.get("subtasks", []))

            task = RoadmapTask(
                title=t_data.get("title", "Untitled Task"),
                description=t_data.get("description", ""),
                estimated_hours=t_data.get("estimated_hours", 1),
                priority=t_data.get("priority", 3),
                subtasks=subtasks,
                dependencies=t_data.get("dependencies", []),
                tags=t_data.get("tags", []),
                assigned_to=t_data.get("assigned_to", [])
            )
            tasks.append(task)

        return tasks

    def _parse_subtasks(self, subtasks_data: List[Dict[str, Any]]) -> List[RoadmapSubtask]:
        """Parse subtasks data into RoadmapSubtask objects"""
        subtasks = []

        for st_data in subtasks_data:
            subtask = RoadmapSubtask(
                title=st_data.get("title", "Untitled Subtask"),
                description=st_data.get("description", ""),
                estimated_hours=st_data.get("estimated_hours")
            )
            subtasks.append(subtask)

        return subtasks

    def _build_dependency_graph(self, sections: List[RoadmapSection]) -> List[DependencyEdge]:
        """Build a dependency graph from all tasks"""
        edges = []

        # Collect all tasks with their dependencies
        all_tasks = {}
        for section in sections:
            for milestone in section.milestones:
                for task in milestone.tasks:
                    all_tasks[task.title] = task

        # Build edges
        for task_title, task in all_tasks.items():
            for dep_title in task.dependencies:
                if dep_title in all_tasks:
                    edge = DependencyEdge(
                        from_task=dep_title,
                        to_task=task_title,
                        dependency_type="finish_to_start"
                    )
                    edges.append(edge)

        return edges

    def _calculate_totals(self, sections: List[RoadmapSection]) -> tuple:
        """Calculate total hours, tasks, and milestones"""
        total_hours = 0.0
        total_tasks = 0
        total_milestones = 0

        for section in sections:
            total_milestones += len(section.milestones)
            for milestone in section.milestones:
                total_tasks += len(milestone.tasks)
                total_hours += milestone.estimated_hours

        return total_hours, total_tasks, total_milestones

    async def regenerate_section(
        self,
        request: RegenerateRoadmapSectionRequest
    ) -> RoadmapSection:
        """Regenerate a specific section of the roadmap"""

        prompt = REGENERATE_SECTION_PROMPT.format(
            section_name=request.section_name,
            project_context=f"Project ID: {request.project_id}",
            additional_context=request.additional_context or "None provided"
        )

        response = await self.llm_service.generate_structured_response(
            system_prompt=GENERATE_ROADMAP_SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.7,
            max_tokens=2000
        )

        section_data = json.loads(response)
        sections = self._parse_sections([section_data])
        return sections[0] if sections else None

    async def expand_milestone(
        self,
        request: ExpandMilestoneRequest
    ) -> RoadmapMilestone:
        """Expand a milestone with more detailed tasks"""

        prompt = EXPAND_MILESTONE_PROMPT.format(
            milestone_title=request.milestone_title,
            project_context=f"Project ID: {request.project_id}",
            additional_requirements=", ".join(request.additional_requirements or [])
        )

        response = await self.llm_service.generate_structured_response(
            system_prompt=GENERATE_ROADMAP_SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.7,
            max_tokens=1500
        )

        milestone_data = json.loads(response)
        milestones = self._parse_milestones([milestone_data])
        return milestones[0] if milestones else None
