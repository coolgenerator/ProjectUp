"""
Plan models for AI service - matches backend Go models
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PlanSection(BaseModel):
    """Represents a section within a plan"""
    id: str
    type: str  # roadmap-step, skill, goal, text, checklist, category-breakdown, skills-list, goals-list
    title: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    subsections: Optional[List['PlanSection']] = None


class PlanContent(BaseModel):
    """Content structure for plans"""
    sections: List[PlanSection]


class ProjectPlan(BaseModel):
    """Project plan model matching backend"""
    id: Optional[int] = None
    project_id: int
    title: str
    description: Optional[str] = None
    plan_type: str  # roadmap, curriculum, sprint, custom
    content: PlanContent
    source: str = "ai-generated"  # ai-generated, manual, imported
    created_by: Optional[int] = None
    order_index: int = 0
    status: str = "draft"  # draft, active, completed, archived
    linked_task_ids: Optional[List[int]] = Field(default_factory=list)
    linked_idea_ids: Optional[List[int]] = Field(default_factory=list)
    linked_plan_ids: Optional[List[int]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RoadmapStep(BaseModel):
    """Roadmap step from AI generation"""
    title: str
    description: str
    timeEstimate: str
    resources: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class CurriculumSkill(BaseModel):
    """Skill from curriculum alignment"""
    name: str
    level: str  # Beginner, Intermediate, Advanced
    description: str
    relevanceScore: float  # 0.0 to 1.0


class CategoryBreakdown(BaseModel):
    """Category breakdown from curriculum"""
    name: str
    percentage: int


class LearningGoal(BaseModel):
    """Learning goal from curriculum"""
    goal: str
    description: str


class CurriculumAlignment(BaseModel):
    """Curriculum alignment from AI generation"""
    categories: Optional[List[CategoryBreakdown]] = Field(default_factory=list)
    skills: Optional[List[CurriculumSkill]] = Field(default_factory=list)
    learningGoals: Optional[List[LearningGoal]] = Field(default_factory=list)
    topics: Optional[List[str]] = Field(default_factory=list)


class ChecklistItem(BaseModel):
    """Checklist item from AI generation"""
    description: str
    category: str  # Requirements, Setup, Development, Testing, Deployment, Documentation
    priority: str  # High, Medium, Low


class AIGeneratedProject(BaseModel):
    """Complete AI-generated project data"""
    roadmap: List[RoadmapStep]
    curriculum: Optional[CurriculumAlignment] = None
    checklist: List[ChecklistItem]


# Helper functions to convert AI output to plan content

def roadmap_to_plan_content(roadmap: List[RoadmapStep]) -> PlanContent:
    """Convert roadmap steps to plan content structure"""
    sections = []

    for i, step in enumerate(roadmap):
        section = PlanSection(
            id=f"step-{i}",
            type="roadmap-step",
            title=step.title,
            content=step.description,
            metadata={
                "timeEstimate": step.timeEstimate,
                "stepNumber": i + 1,
                "resources": step.resources or []
            }
        )
        sections.append(section)

    return PlanContent(sections=sections)


def curriculum_to_plan_content(curriculum: CurriculumAlignment) -> PlanContent:
    """Convert curriculum alignment to plan content structure"""
    sections = []

    # Categories section
    if curriculum.categories:
        sections.append(PlanSection(
            id="categories",
            type="category-breakdown",
            title="Project Categories",
            content="",
            metadata={
                "categories": [cat.dict() for cat in curriculum.categories]
            }
        ))

    # Skills section
    if curriculum.skills:
        sections.append(PlanSection(
            id="skills",
            type="skills-list",
            title="Skills Development",
            content="",
            metadata={
                "skills": [skill.dict() for skill in curriculum.skills]
            }
        ))

    # Learning goals section
    if curriculum.learningGoals:
        sections.append(PlanSection(
            id="learning-goals",
            type="goals-list",
            title="Learning Goals",
            content="",
            metadata={
                "goals": [goal.dict() for goal in curriculum.learningGoals]
            }
        ))

    # Topics section
    if curriculum.topics:
        sections.append(PlanSection(
            id="topics",
            type="topics-list",
            title="Topics Covered",
            content="",
            metadata={
                "topics": curriculum.topics
            }
        ))

    return PlanContent(sections=sections)


def create_roadmap_plan(project_id: int, roadmap: List[RoadmapStep]) -> ProjectPlan:
    """Create a ProjectPlan from roadmap data"""
    content = roadmap_to_plan_content(roadmap)

    return ProjectPlan(
        project_id=project_id,
        title="Project Roadmap",
        description="AI-generated implementation roadmap with detailed steps and timelines",
        plan_type="roadmap",
        content=content,
        source="ai-generated",
        status="active",
        order_index=0
    )


def create_curriculum_plan(project_id: int, curriculum: CurriculumAlignment) -> ProjectPlan:
    """Create a ProjectPlan from curriculum data"""
    content = curriculum_to_plan_content(curriculum)

    return ProjectPlan(
        project_id=project_id,
        title="Learning & Curriculum Plan",
        description="AI-generated educational goals, skill development, and learning objectives",
        plan_type="curriculum",
        content=content,
        source="ai-generated",
        status="active",
        order_index=1
    )
