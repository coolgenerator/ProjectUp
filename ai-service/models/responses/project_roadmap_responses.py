"""
Response models for project roadmap generation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class RoadmapSubtask(BaseModel):
    """Represents a subtask within a task"""
    title: str
    description: str
    estimated_hours: Optional[float] = None


class RoadmapTask(BaseModel):
    """Represents a task in the roadmap"""
    title: str
    description: str
    estimated_hours: float
    priority: int = Field(3, ge=1, le=5, description="Priority 1=urgent/highest, 5=backlog/lowest")
    subtasks: List[RoadmapSubtask] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list, description="Task titles this depends on")
    tags: List[str] = Field(default_factory=list)
    assigned_to: Optional[List[str]] = Field(default_factory=list)


class RoadmapMilestone(BaseModel):
    """Represents a milestone in the roadmap"""
    title: str
    description: str
    tasks: List[RoadmapTask]
    estimated_hours: float
    priority: int = Field(3, ge=1, le=5, description="Priority 1=urgent/highest, 5=backlog/lowest")
    start_offset_days: Optional[int] = Field(None, description="Days from project start")
    duration_days: Optional[int] = Field(None, description="Duration in days")
    status: str = Field("pending", description="pending, in_progress, completed, cancelled")


class RoadmapSection(BaseModel):
    """Represents a section/phase in the roadmap"""
    name: str
    description: str
    order: int
    color: Optional[str] = Field(None, description="Color code for section")
    milestones: List[RoadmapMilestone]


class ChallengeMitigation(BaseModel):
    """Represents a challenge with its mitigation strategy"""
    challenge: str
    mitigation: str


class DecisionFramework(BaseModel):
    """Framework for deciding when to use this approach"""
    best_for: str
    choose_if: str
    avoid_if: str


class ProjectProposal(BaseModel):
    """Represents a comprehensive project proposal/plan"""
    title: str
    description: str
    approach: str
    benefits: List[str] = Field(default_factory=list)

    # Enhanced fields
    challenges_with_mitigation: List[ChallengeMitigation] = Field(default_factory=list, description="Challenges with mitigation strategies")
    success_metrics: List[str] = Field(default_factory=list, description="Measurable KPIs for success")
    decision_framework: Optional[DecisionFramework] = Field(None, description="When to choose this approach")
    alternatives_considered: Optional[str] = Field(None, description="Alternative approaches and why this was chosen")

    # Legacy fields (kept for backward compatibility)
    challenges: List[str] = Field(default_factory=list, description="DEPRECATED: Use challenges_with_mitigation instead")

    timeline: Optional[str] = None
    resources_needed: List[str] = Field(default_factory=list)
    status: str = Field("draft", description="draft, active, approved, rejected")


class DependencyEdge(BaseModel):
    """Represents a dependency between tasks"""
    from_task: str
    to_task: str
    dependency_type: str = Field("finish_to_start", description="Type of dependency")


class GenerateProjectRoadmapResponse(BaseModel):
    """Response containing the generated roadmap"""
    success: bool = True
    sections: List[RoadmapSection]
    proposals: List[ProjectProposal] = Field(default_factory=list)
    total_estimated_hours: float
    total_tasks: int
    total_milestones: int
    dependencies_graph: List[DependencyEdge] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class StorageRoadmapResponse(BaseModel):
    """Response after storing roadmap in database"""
    success: bool
    project_id: str
    sections_created: int
    milestones_created: int
    tasks_created: int
    subtasks_created: int
    dependencies_created: int
    proposals_created: int
    error_message: Optional[str] = None
