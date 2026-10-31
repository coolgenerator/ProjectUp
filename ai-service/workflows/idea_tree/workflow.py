"""
IdeaTree Workflow for ProjectUp

This workflow handles AI-powered operations for IdeaTree nodes including:
- Idea expansion
- Task generation
- Resource finding
- Feasibility analysis
- Milestone planning
- Learning path generation
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_google_vertexai import ChatVertexAI
from pydantic import BaseModel, Field

from config.settings import settings
from core.vertex_config import get_vertex_ai_llm
from core.vertex_pool import get_vertex_pool

logger = logging.getLogger(__name__)


class IdeaTreeState(BaseModel):
    """State for IdeaTree workflow."""
    node_id: str
    title: str
    description: str
    query_type: str
    query: str
    context: Dict[str, Any] = Field(default_factory=dict)
    response: Optional[str] = None
    suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    milestones: List[Dict[str, Any]] = Field(default_factory=list)  # Project milestones
    sections: List[Dict[str, Any]] = Field(default_factory=list)  # Task sections
    metadata: Dict[str, Any] = Field(default_factory=dict)
    plan: Optional[Dict[str, Any]] = None  # For plan generation
    plan_sections: List[Dict[str, Any]] = Field(default_factory=list)  # For plan expansion
    error: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True


class IdeaTreeWorkflow:
    """Workflow for processing IdeaTree node queries."""
    
    def __init__(self, provider: str = "vertexai", use_pool: bool = True):
        """Initialize the IdeaTree workflow.
        
        Args:
            provider: LLM provider to use
            use_pool: Whether to use connection pooling for better concurrency
        """
        self.provider = provider
        self.use_pool = use_pool
        self.vertex_pool = None
        
        # Initialize LLM only if not using pool
        if not use_pool:
            self.llm = self._initialize_llm(provider)
        else:
            self.llm = None  # Will use pool instances
            
        self.graph = self._build_graph()
    
    def _initialize_llm(self, provider: str):
        """Initialize the LLM based on provider."""
        if provider == "openai":
            # OpenAI support disabled - use Vertex AI instead
            provider = "vertexai"
        
        if provider == "vertexai":
            # Use the centralized vertex config with proper credentials
            try:
                return get_vertex_ai_llm()
            except Exception as e:
                logger.warning(f"Failed to get Vertex AI LLM from config: {e}")
                # Fallback to direct initialization with settings
                return ChatVertexAI(
                    model=settings.vertex_ai_model,
                    temperature=settings.vertex_ai_temperature,
                    max_output_tokens=settings.vertex_ai_max_tokens,
                    project=settings.gcp_project_id,
                    location=settings.gcp_location
                )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def _build_graph(self) -> CompiledStateGraph:
        """Build the workflow graph."""
        workflow = StateGraph(state_schema=IdeaTreeState)
        
        # Add nodes
        workflow.add_node("route_query", self.route_query)
        workflow.add_node("expand_idea", self.expand_idea)
        workflow.add_node("generate_tasks", self.generate_tasks)
        workflow.add_node("find_resources", self.find_resources)
        workflow.add_node("analyze_feasibility", self.analyze_feasibility)
        workflow.add_node("suggest_milestones", self.suggest_milestones)
        workflow.add_node("generate_learning_path", self.generate_learning_path)
        workflow.add_node("generate_plan", self.generate_plan)
        workflow.add_node("analyze_plan", self.analyze_plan)
        workflow.add_node("expand_plan", self.expand_plan)
        workflow.add_node("generic_query", self.generic_query)
        workflow.add_node("format_response", self.format_response)
        
        # Set entry point
        workflow.set_entry_point("route_query")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "route_query",
            self._route_to_handler,
            {
                "expand_idea": "expand_idea",
                "generate_tasks": "generate_tasks",
                "find_resources": "find_resources",
                "analyze_feasibility": "analyze_feasibility",
                "suggest_milestones": "suggest_milestones",
                "generate_learning_path": "generate_learning_path",
                "generate_plan": "generate_plan",
                "analyze_plan": "analyze_plan",
                "expand_plan": "expand_plan",
                "generic": "generic_query"
            }
        )

        # Connect all handlers to format_response
        for handler in ["expand_idea", "generate_tasks", "find_resources",
                       "analyze_feasibility", "suggest_milestones",
                       "generate_learning_path", "generate_plan", "analyze_plan",
                       "expand_plan", "generic_query"]:
            workflow.add_edge(handler, "format_response")
        
        # End after formatting
        workflow.add_edge("format_response", END)
        
        return workflow.compile()
    
    def _route_to_handler(self, state: IdeaTreeState) -> str:
        """Route to appropriate handler based on query type."""
        query_type = state.query_type

        if query_type in ["expand_idea", "generate_tasks", "find_resources",
                         "analyze_feasibility", "suggest_milestones",
                         "generate_learning_path", "generate_plan",
                         "analyze_plan", "expand_plan"]:
            return query_type
        else:
            return "generic"
    
    async def route_query(self, state: IdeaTreeState) -> IdeaTreeState:
        """Initial routing node."""
        logger.info(f"Routing query for node {state.node_id}: {state.query_type}")

        # Enrich context with backend data if project_sid is available
        project_sid = state.context.get("project_sid")
        if project_sid:
            await self._enrich_context_with_backend_data(state, project_sid)

        return state

    async def _enrich_context_with_backend_data(self, state: IdeaTreeState, project_sid: str):
        """Fetch and add backend data to state context."""
        try:
            # Import backend integration services locally to avoid circular imports
            from services.integrations.plan_integration import plan_integration
            from services.integrations.task_integration import task_integration
            from services.integrations.milestone_integration import milestone_integration

            # Fetch plans, tasks, and milestones in parallel
            import asyncio
            plans, tasks, milestones = await asyncio.gather(
                plan_integration.get_project_plans(project_sid),
                task_integration.get_project_tasks(project_sid),
                milestone_integration.get_project_milestones(project_sid),
                return_exceptions=True
            )

            # Add to context if successful
            if not isinstance(plans, Exception):
                state.context["backend_plans"] = plans
                state.context["plans_count"] = len(plans)

            if not isinstance(tasks, Exception):
                state.context["backend_tasks"] = tasks
                state.context["tasks_count"] = len(tasks)
                state.context["pending_tasks"] = [t for t in tasks if t.get("status") in ["todo", "in_progress"]]

            if not isinstance(milestones, Exception):
                state.context["backend_milestones"] = milestones
                state.context["milestones_count"] = len(milestones)
                state.context["pending_milestones"] = [m for m in milestones if m.get("status") != "completed"]

            logger.info(f"Enriched context with backend data: {len(plans) if not isinstance(plans, Exception) else 0} plans, "
                       f"{len(tasks) if not isinstance(tasks, Exception) else 0} tasks, "
                       f"{len(milestones) if not isinstance(milestones, Exception) else 0} milestones")

        except Exception as e:
            logger.warning(f"Failed to enrich context with backend data: {e}")

    def _format_backend_context(self, state: IdeaTreeState) -> str:
        """Format backend data into readable context for AI."""
        context_parts = []

        # Add plans context
        if "backend_plans" in state.context:
            plans = state.context["backend_plans"]
            if plans:
                context_parts.append(f"\n## Existing Plans ({len(plans)} total)")
                for plan in plans[:5]:  # Show top 5
                    context_parts.append(f"- **{plan.get('title')}** ({plan.get('plan_type')}) - {plan.get('status')}")
                if len(plans) > 5:
                    context_parts.append(f"- ...and {len(plans) - 5} more plans")

        # Add tasks context
        if "backend_tasks" in state.context:
            tasks = state.context["backend_tasks"]
            pending = state.context.get("pending_tasks", [])
            if tasks:
                context_parts.append(f"\n## Tasks ({len(tasks)} total, {len(pending)} pending)")
                for task in pending[:5]:  # Show top 5 pending
                    priority = {5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "Minimal"}.get(task.get("priority", 3), "Medium")
                    context_parts.append(f"- [{task.get('status')}] **{task.get('title')}** (Priority: {priority})")
                if len(pending) > 5:
                    context_parts.append(f"- ...and {len(pending) - 5} more pending tasks")

        # Add milestones context
        if "backend_milestones" in state.context:
            milestones = state.context["backend_milestones"]
            pending_ms = state.context.get("pending_milestones", [])
            if milestones:
                context_parts.append(f"\n## Milestones ({len(milestones)} total, {len(pending_ms)} pending)")
                for ms in pending_ms[:3]:  # Show top 3 pending
                    context_parts.append(f"- [{ms.get('status')}] **{ms.get('title')}** ({ms.get('progress', 0)}% complete)")

        return "\n".join(context_parts) if context_parts else ""
    
    async def _get_llm(self):
        """Get LLM instance from pool or use direct instance"""
        if self.use_pool:
            if not self.vertex_pool:
                self.vertex_pool = await get_vertex_pool()
            # Return the pool's acquire method for context manager usage
            return self.vertex_pool.acquire()
        else:
            # Return a dummy context manager for direct LLM usage
            llm_instance = self.llm
            class DummyContext:
                async def __aenter__(self_):
                    return llm_instance
                async def __aexit__(self_, *args):
                    pass
            return DummyContext()
    
    async def expand_idea(self, state: IdeaTreeState) -> IdeaTreeState:
        """Expand an idea into sub-ideas."""
        try:
            system_prompt = """You are an expert at breaking down complex ideas into actionable sub-components.
            Given an idea, provide a detailed breakdown with clear sub-ideas that can be independently worked on."""
            
            user_prompt = f"""
            Expand this idea: {state.title}
            Description: {state.description}
            Additional context: {state.query}
            
            Please provide:
            1. 3-7 sub-ideas with clear titles and descriptions
            2. How these sub-ideas connect to the main idea
            3. Priority levels for each sub-idea
            4. Potential challenges and solutions
            
            Format the response as JSON with the following structure:
            {{
                "suggestions": [
                    {{
                        "title": "Sub-idea title",
                        "description": "Detailed description",
                        "type": "idea",
                        "priority": 1-5,
                        "connection": "How it relates to main idea",
                        "challenges": ["challenge1", "challenge2"],
                        "solutions": ["solution1", "solution2"]
                    }}
                ],
                "response": "Natural language summary"
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)
            
            state.suggestions = result.get("suggestions", [])
            state.response = result.get("response", "")
            
        except Exception as e:
            logger.error(f"Error expanding idea: {e}")
            state.error = str(e)
            state.response = "Failed to expand idea. Please try again."
        
        return state
    
    async def generate_tasks(self, state: IdeaTreeState) -> IdeaTreeState:
        """Generate actionable tasks with milestones, sections, and dependencies."""
        try:
            system_prompt = """You are a project management expert who creates comprehensive project breakdowns.
            Create a structured plan with milestones, sections, tasks, and dependencies."""

            user_prompt = f"""
            Generate a comprehensive task breakdown for: {state.title}
            Description: {state.description}
            Requirements: {state.query}

            Create a complete project structure with:

            1. MILESTONES (2-4 major phases/checkpoints):
               - Each milestone represents a significant project checkpoint
               - Include clear deliverables and success criteria

            2. SECTIONS (3-6 task groupings):
               - Logical groupings of related tasks (e.g., "Setup", "Development", "Testing")
               - Assign each section to a milestone

            3. TASKS (5-15 specific actions):
               - Actionable tasks with clear outcomes
               - Assign each task to a section
               - Include time estimates (0.5-40 hours)
               - Set priority (1=Critical, 2=High, 3=Medium, 4=Low, 5=Optional)
               - Define task dependencies using task indices

            Format as JSON:
            {{
                "milestones": [
                    {{
                        "title": "Milestone name",
                        "description": "What this milestone achieves",
                        "deliverables": ["Deliverable 1", "Deliverable 2"],
                        "order": 1
                    }}
                ],
                "sections": [
                    {{
                        "name": "Section name",
                        "description": "Purpose of this section",
                        "milestone_index": 0,
                        "order": 1
                    }}
                ],
                "tasks": [
                    {{
                        "title": "Task title (start with action verb)",
                        "description": "Detailed description of what needs to be done",
                        "section_index": 0,
                        "priority": 1-5,
                        "estimated_hours": number,
                        "dependencies": [0, 1],
                        "tags": ["tag1", "tag2"],
                        "skills_required": ["skill1", "skill2"]
                    }}
                ],
                "response": "Brief summary of the project breakdown"
            }}

            Important:
            - Use indices (0-based) to reference milestones, sections, and dependencies
            - Ensure dependencies reference earlier tasks only (no circular dependencies)
            - Create a logical flow from setup to completion
            - Be specific and actionable
            """

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)

            # Store the structured breakdown in state
            state.milestones = result.get("milestones", [])
            state.sections = result.get("sections", [])
            state.actions = result.get("tasks", [])
            state.response = result.get("response", "")

        except Exception as e:
            logger.error(f"Error generating tasks: {e}")
            state.error = str(e)
            state.response = "Failed to generate task breakdown. Please try again."

        return state
    
    async def find_resources(self, state: IdeaTreeState) -> IdeaTreeState:
        """Find learning resources and references."""
        try:
            system_prompt = """You are a research assistant specializing in finding high-quality learning resources.
            Provide relevant tutorials, documentation, tools, and community resources."""
            
            user_prompt = f"""
            Find resources for: {state.title}
            Description: {state.description}
            Specific needs: {state.query}
            
            Please provide:
            1. Tutorials and courses (with difficulty level)
            2. Official documentation
            3. Useful tools and libraries
            4. Community resources and forums
            5. Example projects or case studies
            
            Format as JSON:
            {{
                "resources": [
                    {{
                        "title": "Resource name",
                        "url": "https://example.com",
                        "type": "tutorial|documentation|tool|community|example",
                        "description": "What this resource provides",
                        "difficulty": "beginner|intermediate|advanced",
                        "duration": "estimated time to complete (if applicable)"
                    }}
                ],
                "response": "Summary of resources found"
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)
            
            state.resources = result.get("resources", [])
            state.response = result.get("response", "")
            
        except Exception as e:
            logger.error(f"Error finding resources: {e}")
            state.error = str(e)
            state.response = "Failed to find resources. Please try again."
        
        return state
    
    async def analyze_feasibility(self, state: IdeaTreeState) -> IdeaTreeState:
        """Analyze the feasibility of an idea."""
        try:
            system_prompt = """You are a technical advisor who analyzes project feasibility.
            Provide realistic assessments of technical requirements, risks, and success factors."""
            
            user_prompt = f"""
            Analyze feasibility of: {state.title}
            Description: {state.description}
            Constraints: {state.query}
            
            Please provide:
            1. Technical feasibility assessment (1-10 scale with justification)
            2. Required resources (time, money, people, tools)
            3. Main risks and mitigation strategies
            4. Success factors and prerequisites
            5. Alternative approaches if main approach is challenging
            6. Recommended timeline
            
            Format as JSON:
            {{
                "metadata": {{
                    "feasibility_score": 1-10,
                    "estimated_duration": "X weeks/months",
                    "team_size": number,
                    "budget_range": "low|medium|high",
                    "technical_complexity": "low|medium|high"
                }},
                "suggestions": [
                    {{
                        "title": "Risk or Alternative",
                        "description": "Details",
                        "type": "risk|alternative|prerequisite",
                        "priority": 1-5
                    }}
                ],
                "response": "Detailed feasibility analysis"
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)
            
            state.metadata = result.get("metadata", {})
            state.suggestions = result.get("suggestions", [])
            state.response = result.get("response", "")
            
        except Exception as e:
            logger.error(f"Error analyzing feasibility: {e}")
            state.error = str(e)
            state.response = "Failed to analyze feasibility. Please try again."
        
        return state
    
    async def suggest_milestones(self, state: IdeaTreeState) -> IdeaTreeState:
        """Suggest project milestones."""
        try:
            system_prompt = """You are a project planning expert who creates realistic, achievable milestones.
            Define clear milestones with specific deliverables and success criteria."""
            
            user_prompt = f"""
            Suggest milestones for: {state.title}
            Description: {state.description}
            Timeline constraints: {state.query}
            
            Please provide:
            1. 3-6 key milestones with clear deliverables
            2. Success criteria for each milestone
            3. Estimated timeline for each
            4. Dependencies between milestones
            5. Risk factors for each milestone
            
            Format as JSON:
            {{
                "suggestions": [
                    {{
                        "title": "Milestone name",
                        "description": "What will be achieved",
                        "type": "milestone",
                        "priority": 1-5,
                        "deliverables": ["item1", "item2"],
                        "success_criteria": ["criterion1", "criterion2"],
                        "estimated_days": number,
                        "dependencies": ["milestone_id"],
                        "risks": ["risk1", "risk2"]
                    }}
                ],
                "response": "Milestone planning summary"
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)
            
            state.suggestions = result.get("suggestions", [])
            state.response = result.get("response", "")
            
        except Exception as e:
            logger.error(f"Error suggesting milestones: {e}")
            state.error = str(e)
            state.response = "Failed to suggest milestones. Please try again."
        
        return state
    
    async def generate_learning_path(self, state: IdeaTreeState) -> IdeaTreeState:
        """Generate a personalized learning path."""
        try:
            system_prompt = """You are an education specialist who creates personalized learning paths.
            Design a structured learning journey with clear progression and practical exercises."""
            
            user_prompt = f"""
            Create learning path for: {state.title}
            Description: {state.description}
            Learning preferences: {state.query}
            
            Please provide:
            1. Structured modules with clear learning objectives
            2. Resources for each module (videos, articles, exercises)
            3. Practical projects to apply knowledge
            4. Assessment methods
            5. Time estimates for completion
            
            Format as JSON:
            {{
                "metadata": {{
                    "total_duration": "X weeks",
                    "difficulty_progression": "gradual|steep",
                    "learning_style": "theoretical|practical|mixed"
                }},
                "resources": [
                    {{
                        "title": "Module/Resource name",
                        "url": "https://example.com (if applicable)",
                        "type": "course|video|article|exercise|project",
                        "description": "What you'll learn",
                        "duration": "X hours",
                        "module": "Module name",
                        "prerequisites": ["prerequisite1"]
                    }}
                ],
                "response": "Learning path overview"
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)
            
            state.metadata.update(result.get("metadata", {}))
            state.resources = result.get("resources", [])
            state.response = result.get("response", "")
            
        except Exception as e:
            logger.error(f"Error generating learning path: {e}")
            state.error = str(e)
            state.response = "Failed to generate learning path. Please try again."
        
        return state
    
    async def generate_plan(self, state: IdeaTreeState) -> IdeaTreeState:
        """Generate a comprehensive project plan."""
        try:
            system_prompt = """You are an expert project planner who creates detailed, actionable project plans.
            Generate plans with clear structure, markdown content, and relevant metadata."""

            user_prompt = f"""
            Generate a comprehensive project plan for: {state.title}
            Description: {state.description}
            Plan requirements: {state.query}

            Please create a detailed plan with the following structure:

            Format as JSON:
            {{
                "plan": {{
                    "title": "Plan title",
                    "description": "Plan overview",
                    "plan_type": "roadmap|curriculum|sprint|custom",
                    "content": {{
                        "markdown": "# Main Plan Content in Markdown\\n\\n## Overview\\n...detailed plan content..."
                    }},
                    "tags": ["tag1", "tag2"],
                    "category": "Plan category"
                }},
                "suggestions": [
                    {{
                        "title": "Related task or milestone",
                        "description": "Details",
                        "type": "task|milestone|resource",
                        "priority": 1-5
                    }}
                ],
                "resources": [
                    {{
                        "title": "Resource name",
                        "url": "URL if applicable",
                        "type": "documentation|tutorial|tool",
                        "description": "Resource description"
                    }}
                ],
                "metadata": {{
                    "estimated_duration": "X weeks/months",
                    "difficulty": "beginner|intermediate|advanced",
                    "prerequisites": ["prerequisite1"]
                }},
                "response": "Natural language summary of the plan"
            }}
            """

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)

            state.plan = result.get("plan", {})
            state.suggestions = result.get("suggestions", [])
            state.resources = result.get("resources", [])
            state.metadata = result.get("metadata", {})
            state.response = result.get("response", "")

        except Exception as e:
            logger.error(f"Error generating plan: {e}")
            state.error = str(e)
            state.response = "Failed to generate plan. Please try again."

        return state

    async def analyze_plan(self, state: IdeaTreeState) -> IdeaTreeState:
        """Analyze an existing project plan."""
        try:
            # Import locally to avoid circular imports
            from services.integrations.plan_integration import plan_integration

            system_prompt = """You are an expert plan reviewer who provides constructive analysis and improvement suggestions.
            Evaluate plans for completeness, feasibility, and clarity."""

            # Get backend context
            backend_context = self._format_backend_context(state)

            # Check if plan_id is in query to fetch from backend
            plan_content = state.query
            if state.context.get("plan_id") and state.context.get("project_sid"):
                try:
                    plan = await plan_integration.get_plan(
                        state.context["project_sid"],
                        state.context["plan_id"]
                    )
                    if plan:
                        plan_content = plan_integration.extract_plan_content(plan)
                        logger.info(f"Fetched plan {state.context['plan_id']} from backend for analysis")
                except Exception as e:
                    logger.warning(f"Failed to fetch plan from backend: {e}, using provided content")

            user_prompt = f"""
            Analyze the existing project plan: {state.title}
            Description: {state.description}
            Current plan content: {plan_content}

            {backend_context}

            Please provide:
            1. Strengths and weaknesses of the current plan
            2. Missing components or gaps
            3. Suggestions for improvement
            4. Risk assessment
            5. Feasibility analysis
            6. How this plan relates to existing tasks and milestones (if any)

            Format as JSON:
            {{
                "metadata": {{
                    "completeness_score": 1-10,
                    "feasibility_score": 1-10,
                    "clarity_score": 1-10,
                    "overall_score": 1-10
                }},
                "suggestions": [
                    {{
                        "title": "Improvement suggestion",
                        "description": "What to add or change",
                        "type": "improvement|gap|risk",
                        "priority": 1-5,
                        "category": "content|structure|timeline|resources"
                    }}
                ],
                "actions": [
                    {{
                        "title": "Action to take",
                        "description": "How to improve the plan",
                        "priority": 1-5
                    }}
                ],
                "response": "Detailed analysis and recommendations"
            }}
            """

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)

            state.metadata = result.get("metadata", {})
            state.suggestions = result.get("suggestions", [])
            state.actions = result.get("actions", [])
            state.response = result.get("response", "")

        except Exception as e:
            logger.error(f"Error analyzing plan: {e}")
            state.error = str(e)
            state.response = "Failed to analyze plan. Please try again."

        return state

    async def expand_plan(self, state: IdeaTreeState) -> IdeaTreeState:
        """Expand a project plan with additional sections."""
        try:
            system_prompt = """You are an expert at elaborating project plans with detailed sections and actionable content.
            Expand plans with specific implementation details and supporting information."""

            user_prompt = f"""
            Expand the project plan: {state.title}
            Description: {state.description}
            Section to expand: {state.query}

            Please provide:
            1. Additional detailed sections for the plan
            2. Subsections with specific content
            3. Implementation details
            4. Related tasks and milestones
            5. Resource recommendations

            Format as JSON:
            {{
                "plan_sections": [
                    {{
                        "section_title": "Section name",
                        "markdown_content": "# Section Title\\n\\nDetailed content...",
                        "order": 1,
                        "metadata": {{
                            "estimated_effort": "X hours/days",
                            "priority": 1-5
                        }}
                    }}
                ],
                "suggestions": [
                    {{
                        "title": "Related task or milestone",
                        "description": "Details",
                        "type": "task|milestone",
                        "priority": 1-5
                    }}
                ],
                "resources": [
                    {{
                        "title": "Resource name",
                        "url": "URL if applicable",
                        "type": "documentation|tutorial|tool",
                        "description": "Resource description"
                    }}
                ],
                "response": "Summary of plan expansion"
            }}
            """

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)
            result = json.loads(response.content)

            state.plan_sections = result.get("plan_sections", [])
            state.suggestions = result.get("suggestions", [])
            state.resources = result.get("resources", [])
            state.response = result.get("response", "")

        except Exception as e:
            logger.error(f"Error expanding plan: {e}")
            state.error = str(e)
            state.response = "Failed to expand plan. Please try again."

        return state

    async def generic_query(self, state: IdeaTreeState) -> IdeaTreeState:
        """Handle generic queries."""
        try:
            user_prompt = f"""
            Context: Working on idea "{state.title}" - {state.description}
            Query: {state.query}

            Please provide a helpful, actionable response.
            """

            messages = [HumanMessage(content=user_prompt)]
            # Get LLM from pool or direct instance
            async with await self._get_llm() as llm:
                response = await llm.ainvoke(messages)

            state.response = response.content

        except Exception as e:
            logger.error(f"Error processing generic query: {e}")
            state.error = str(e)
            state.response = "Failed to process query. Please try again."

        return state
    
    async def format_response(self, state: IdeaTreeState) -> IdeaTreeState:
        """Format the final response."""
        if not state.error:
            logger.info(f"Successfully processed {state.query_type} for node {state.node_id}")
        else:
            logger.error(f"Error processing {state.query_type} for node {state.node_id}: {state.error}")
        
        return state
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process an IdeaTree query."""
        try:
            # Create initial state
            state = IdeaTreeState(
                node_id=input_data.get("node_id", ""),
                title=input_data.get("title", ""),
                description=input_data.get("description", ""),
                query_type=input_data.get("query_type", "generic"),
                query=input_data.get("query", ""),
                context=input_data.get("context", {})
            )
            
            # Run the workflow
            result = await self.graph.ainvoke(state)
            
            # Return formatted response
            return {
                "node_id": result.node_id,
                "query_type": result.query_type,
                "response": result.response,
                "suggestions": result.suggestions,
                "resources": result.resources,
                "actions": result.actions,
                "metadata": result.metadata,
                "plan": result.plan,
                "plan_sections": result.plan_sections,
                "error": result.error
            }

        except Exception as e:
            logger.error(f"Error processing IdeaTree query: {e}")
            # Return all required fields even on error
            return {
                "node_id": input_data.get("node_id", ""),
                "query_type": input_data.get("query_type", "generic"),
                "response": "Failed to process query",
                "suggestions": [],
                "resources": [],
                "actions": [],
                "metadata": {},
                "plan": None,
                "plan_sections": [],
                "error": str(e)
            }