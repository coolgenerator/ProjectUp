"""
Course Generation Workflow State

Defines the state structure for the course generation workflow.
"""

from typing import TypedDict, List, Dict, Any, Optional


class TopicDetail(TypedDict):
    """Detailed topic information."""
    topic_id: str
    name: str
    description: str
    difficulty: str
    estimated_hours: int
    key_concepts: List[str]


class RoadmapStep(TypedDict):
    """A step in the learning roadmap."""
    step_id: str
    topic_id: str
    title: str
    description: str
    prerequisites: List[str]  # List of step_ids that must be completed first
    topics: List[str]  # Topics covered in this step
    estimated_hours: int
    order: int


class ResourceSource(TypedDict):
    """Source platform information."""
    source_id: str
    name: str
    type: str  # 'video_platform', 'documentation', 'tutorial_site', 'repository'
    url: str
    relevance_score: float
    free: bool


class LearningResource(TypedDict):
    """Individual learning resource."""
    resource_id: str
    title: str
    description: str
    url: str
    type: str  # 'video', 'documentation', 'article', 'tutorial', 'code', 'course'
    source: str  # Source platform name
    duration: Optional[str]
    difficulty: str
    quality_score: float
    free: bool
    topics: List[str]  # Topics this resource covers


class CourseGenerationState(TypedDict):
    """State for the course generation workflow."""

    # Input parameters
    request_id: str
    user_id: str
    topic: str
    goals: List[str]
    user_experience: str
    difficulty: str
    estimated_weeks: int
    time_commitment: int
    user_skills: List[str]
    interests: List[str]

    # Step 1: Topic Analysis
    topics: List[TopicDetail]
    analysis_complete: bool

    # Step 2: Roadmap Building
    roadmap: List[RoadmapStep]
    roadmap_graph: Dict[str, List[str]]  # Adjacency list for prerequisites
    roadmap_complete: bool

    # Step 3: Source Identification
    sources: List[ResourceSource]
    sources_by_topic: Dict[str, List[str]]  # topic_id -> [source_ids]
    sources_complete: bool

    # Step 4: Resource Gathering
    resources: List[LearningResource]
    resources_by_step: Dict[str, List[str]]  # step_id -> [resource_ids]
    resources_complete: bool

    # Step 4.5: Content Extraction
    extracted_content_by_resource: Dict[str, str]  # resource_id -> extracted content
    github_resources: List[Dict[str, Any]]  # Resources extracted from GitHub repos
    extraction_complete: bool

    # Step 4.7: Deep GitHub Roadmap Extraction (NEW!)
    github_roadmap_resources: List[Dict[str, Any]]  # Detailed resources from roadmap READMEs
    github_learning_paths: List[Dict[str, Any]]  # Structured learning paths from roadmaps

    # Step 4.6: Learning Content Generation (with references)
    learning_content: List[Dict[str, str]]  # step_id -> generated markdown/latex content
    content_references: Dict[str, List[str]]  # step_id -> [resource_ids used as references]
    content_generation_complete: bool

    # Step 5: Topic Grouping
    grouped_modules: List[Dict[str, Any]]  # Modules with grouped topics
    grouping_complete: bool

    # Step 6: Syllabus Generation
    syllabus_content: Optional[str]  # Markdown content for syllabus page
    syllabus_complete: bool

    # Output
    final_course: Optional[Dict[str, Any]]

    # Error handling
    error: Optional[str]
    current_step: str
    progress: int
