"""
Action Expand Routes

Expands AI suggestions into detailed, actionable items (tasks, milestones, plans, courses)
"""

import logging
import json
import re
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.llm.vertex_ai_service import vertex_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/actions", tags=["actions"])


class ActionExpandRequest(BaseModel):
    """Request to expand a suggestion into detailed action items"""
    suggestion_text: str = Field(..., description="The suggestion text to expand")
    suggestion_type: str = Field(..., description="Type of suggestion (e.g., extract_tasks, create_course)")
    action_type: Optional[str] = Field(None, description="Specific action type")
    project_id: str = Field(..., description="Project ID")
    node_id: Optional[str] = Field(None, description="Node ID for context")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


class Task(BaseModel):
    title: str
    description: str
    status: str = "pending"
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    milestone_id: Optional[str] = None
    dependencies: Optional[List[str]] = []


class Milestone(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    due_date: Optional[str] = None
    status: str = "not_started"
    task_ids: Optional[List[str]] = []


class Plan(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    plan_type: str = "action"
    milestone_ids: Optional[List[str]] = []


class CourseModule(BaseModel):
    title: str
    description: str
    lessons: Optional[List[Dict[str, str]]] = []


class Course(BaseModel):
    id: Optional[str] = None
    topic: str  # Required for API
    title: str
    goals: List[str]  # Required for API
    description: str
    category: Optional[str] = None
    difficulty: str = "intermediate"
    estimated_weeks: Optional[int] = 4
    time_commitment: Optional[int] = 10
    user_experience: Optional[str] = "beginner"
    preferred_learning_style: Optional[str] = "mixed"
    modules: Optional[List[CourseModule]] = []


class Node(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    parent_id: Optional[str] = None


class Resource(BaseModel):
    title: str
    description: str
    resource_type: str = "article"  # article, video, book, course, tool
    url: Optional[str] = None
    notes: Optional[str] = None


class ActionExpandResponse(BaseModel):
    tasks: Optional[List[Task]] = []
    milestones: Optional[List[Milestone]] = []
    plans: Optional[List[Plan]] = []
    courses: Optional[List[Course]] = []
    nodes: Optional[List[Node]] = []
    resources: Optional[List[Resource]] = []
    relationships: Optional[Dict[str, Any]] = {}


@router.post("/expand", response_model=ActionExpandResponse)
async def expand_action(request: ActionExpandRequest):
    """
    Expand a suggestion into detailed, actionable items with relationships.

    Uses AI to generate:
    - Tasks with details (title, description, priority, estimated hours)
    - Milestones with grouped tasks
    - Plans with grouped milestones
    - Courses with modules and lessons
    - Relationships between items
    """
    try:
        logger.info(f"Expanding action: {request.suggestion_type} - '{request.suggestion_text}'")

        # Build prompt based on action type
        action_type = request.action_type or request.suggestion_type

        # Create appropriate prompt
        if action_type in ['extract_tasks', 'create_tasks', 'breakdown_task']:
            prompt = _create_task_extraction_prompt(request)
        elif action_type in ['create_milestones']:
            prompt = _create_milestone_prompt(request)
        elif action_type in ['create_course', 'generate_learning_plan']:
            prompt = _create_course_prompt(request)
        elif action_type in ['create_node', 'create_child_node', 'brainstorm_ideas']:
            prompt = _create_node_prompt(request)
        elif action_type in ['extract_resources', 'add_resource']:
            prompt = _create_resource_extraction_prompt(request)
        else:
            # Default: comprehensive breakdown with tasks, milestones, and plans
            prompt = _create_comprehensive_prompt(request)

        # Generate using Vertex AI
        response_text = await vertex_ai_service.generate_text(
            prompt=prompt,
            temperature=0.7,
            max_output_tokens=4096
        )

        logger.info(f"AI response length: {len(response_text)} chars")

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            logger.error("No JSON found in AI response")
            raise ValueError("AI failed to generate valid JSON response")

        json_str = json_match.group().strip()

        # Clean up common JSON issues
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

        result = json.loads(json_str)

        # Validate and structure response
        response = ActionExpandResponse(
            tasks=result.get('tasks', []),
            milestones=result.get('milestones', []),
            plans=result.get('plans', []),
            courses=result.get('courses', []),
            nodes=result.get('nodes', []),
            resources=result.get('resources', []),
            relationships=result.get('relationships', {})
        )

        logger.info(f"Expanded into: {len(response.tasks)} tasks, {len(response.milestones)} milestones, "
                   f"{len(response.plans)} plans, {len(response.courses)} courses, {len(response.nodes)} nodes, "
                   f"{len(response.resources)} resources")

        return response

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Error expanding action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _create_task_extraction_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for extracting/creating tasks"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    return f"""You are a project management AI assistant. Extract detailed, actionable tasks from the given content.

**Input:**
Suggestion: {request.suggestion_text}
Context: {context_str}

**Your Task:**
Generate a comprehensive list of tasks with:
1. Clear, actionable titles
2. Detailed descriptions
3. Realistic time estimates
4. Appropriate priorities
5. Group related tasks into milestones

**Output Format (JSON only):**
{{
  "tasks": [
    {{
      "title": "Clear, specific task title",
      "description": "Detailed description of what needs to be done, why, and how",
      "status": "pending",
      "priority": "low|medium|high",
      "estimated_hours": 4.5,
      "milestone_id": "milestone-1"
    }}
  ],
  "milestones": [
    {{
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "What this milestone accomplishes",
      "due_date": "2025-02-15",
      "status": "not_started",
      "task_ids": ["task-1", "task-2"]
    }}
  ],
  "relationships": {{
    "task_to_milestone": {{
      "task-1": "milestone-1",
      "task-2": "milestone-1"
    }}
  }}
}}

Generate 4-8 tasks grouped into 2-3 logical milestones. Be specific and actionable.
"""


def _create_milestone_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for creating milestones"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    return f"""You are a project planning AI assistant. Create milestones for project planning.

**Input:**
Suggestion: {request.suggestion_text}
Context: {context_str}

**Your Task:**
Generate 3-5 major milestones that represent significant achievements in the project.

**Output Format (JSON only):**
{{
  "milestones": [
    {{
      "id": "milestone-1",
      "title": "Clear milestone title",
      "description": "What this milestone represents and why it's important",
      "due_date": "2025-02-28",
      "status": "not_started"
    }}
  ]
}}
"""


def _create_course_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for creating courses"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    # Extract goal/topic from context if available
    goal_text = ""
    if request.context and 'goal' in request.context:
        goal_text = request.context['goal']
    elif request.context and 'topic' in request.context:
        goal_text = request.context['topic']

    return f"""You are an educational content AI assistant. Create a comprehensive learning course structure.

**Input:**
Topic: {request.suggestion_text}
Context: {context_str}
Goal: {goal_text}

**Your Task:**
Generate a complete course structure with:
1. Course metadata (topic, goals, category, difficulty)
2. Detailed modules and lessons structure
3. Recommended learning parameters

**IMPORTANT:** Extract specific, actionable learning goals from the topic and context.
Goals should be concrete outcomes (e.g., "Build an iOS app for tracking workouts", "Analyze customer data with Python").
NOT vague goals like "Learn programming" or "Understand data science".

**Output Format (JSON only):**
{{
  "courses": [
    {{
      "topic": "Clear course topic (the main subject)",
      "title": "Course title (same as topic)",
      "goals": [
        "Specific, actionable goal 1 (what you'll BUILD or DO)",
        "Specific, actionable goal 2",
        "Specific, actionable goal 3"
      ],
      "description": "What students will learn and achieve in this course",
      "category": "Technical|Business|Design|Data Science|etc",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_weeks": 4,
      "time_commitment": 10,
      "user_experience": "beginner|some_experience|experienced",
      "preferred_learning_style": "hands-on|video|reading|mixed",
      "modules": [
        {{
          "title": "Module title",
          "description": "Module overview and learning objectives",
          "lessons": [
            {{
              "title": "Lesson title",
              "content": "Brief lesson description"
            }}
          ]
        }}
      ]
    }}
  ]
}}

**Important Guidelines:**
- Create 1 course with 3-5 modules
- Each module should have 3-5 lessons
- Goals MUST be specific and actionable (e.g., "Build X", "Create Y", "Analyze Z")
- Estimate realistic time_commitment (hours per week) and estimated_weeks
- Set appropriate difficulty level based on the topic complexity
- Include beginner-friendly explanations if difficulty is "beginner"
"""


def _create_node_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for creating nodes"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    return f"""You are a brainstorming AI assistant. Generate related ideas/nodes.

**Input:**
Topic: {request.suggestion_text}
Context: {context_str}

**Your Task:**
Generate 3-5 related ideas that expand on this topic.

**Output Format (JSON only):**
{{
  "nodes": [
    {{
      "title": "Idea title (4-8 words)",
      "description": "Detailed description of this idea and why it's valuable"
    }}
  ]
}}
"""


def _create_resource_extraction_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for extracting learning resources"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    return f"""You are a learning resource curator AI assistant. Extract and recommend high-quality learning resources.

**Input:**
Topic/Goal: {request.suggestion_text}
Context: {context_str}

**Your Task:**
Generate a curated list of 5-10 learning resources that would help someone learn or accomplish this goal.
Include diverse resource types: articles, videos, courses, books, tools, etc.

**Output Format (JSON only):**
{{
  "resources": [
    {{
      "title": "Specific, descriptive resource title",
      "description": "What this resource covers and why it's valuable for this topic",
      "resource_type": "article|video|book|course|tool|documentation",
      "url": "https://example.com/resource",
      "notes": "Additional tips or highlights about using this resource"
    }}
  ]
}}

**Guidelines:**
- Prioritize high-quality, reputable sources
- Include a mix of beginner and advanced resources
- Suggest both theoretical and practical/hands-on resources
- Include official documentation when relevant
- Provide specific URLs when possible (use realistic examples if needed)
- Make descriptions specific about what the resource covers
"""


def _create_comprehensive_prompt(request: ActionExpandRequest) -> str:
    """Create prompt for comprehensive breakdown"""
    context_str = json.dumps(request.context, indent=2) if request.context else "None"

    return f"""You are a comprehensive project planning AI assistant. Break down this suggestion into a complete project structure.

**Input:**
Suggestion: {request.suggestion_text}
Context: {context_str}

**Your Task:**
Create a complete project breakdown with:
1. Specific tasks (4-8 tasks)
2. Logical milestones (2-3 milestones)
3. Strategic plan (1 plan)

**Output Format (JSON only):**
{{
  "tasks": [
    {{
      "title": "Specific, actionable task",
      "description": "Detailed description",
      "status": "pending",
      "priority": "low|medium|high",
      "estimated_hours": 4,
      "milestone_id": "milestone-1"
    }}
  ],
  "milestones": [
    {{
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "Achievement description",
      "due_date": "2025-02-28",
      "status": "not_started",
      "task_ids": ["task-1", "task-2"]
    }}
  ],
  "plans": [
    {{
      "id": "plan-1",
      "title": "Strategic plan title",
      "description": "Overall strategy and approach",
      "plan_type": "action",
      "milestone_ids": ["milestone-1", "milestone-2"]
    }}
  ],
  "relationships": {{
    "task_to_milestone": {{
      "task-1": "milestone-1"
    }},
    "milestone_to_plan": {{
      "milestone-1": "plan-1"
    }}
  }}
}}

Be specific, actionable, and realistic.
"""
