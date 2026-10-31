# Course Generation Workflow

A LangGraph-based workflow for generating personalized learning courses with free resources.

## Architecture

```
POST /ai-api/courses/generate
    ↓
CourseGenerationService.start_course_generation()
    ↓
CourseGenerationWorkflow (LangGraph)
    ↓
    ├─→ analyze_topics      (Step 1)
    ├─→ build_roadmap       (Step 2)
    ├─→ identify_sources    (Step 3)
    ├─→ gather_resources    (Step 4)
    └─→ format_output       (Step 5)
```

## Workflow Steps

### 1. **analyze_topics**
Analyzes the main topic and breaks it down into detailed subtopics.

**Input:**
- Main topic
- Learning goals
- User experience level
- Difficulty level

**Output (State):**
```python
{
    "topics": [
        {
            "topic_id": "topic_1",
            "name": "React Fundamentals",
            "description": "Core concepts of React",
            "difficulty": "beginner",
            "estimated_hours": 8,
            "key_concepts": ["Components", "Props", "State", "JSX", "Hooks"]
        }
    ]
}
```

### 2. **build_roadmap**
Creates a structured learning path with prerequisites.

**Input:** Topics from Step 1

**Output (State):**
```python
{
    "roadmap": [
        {
            "step_id": "step_1",
            "topic_id": "topic_1",
            "title": "Getting Started with React",
            "description": "Learn React basics",
            "prerequisites": [],  # First step has no prerequisites
            "topics": ["topic_1"],
            "estimated_hours": 10,
            "order": 1
        },
        {
            "step_id": "step_2",
            "topic_id": "topic_2",
            "title": "State Management",
            "description": "Master React state",
            "prerequisites": ["step_1"],  # Must complete step_1 first
            "topics": ["topic_2"],
            "estimated_hours": 12,
            "order": 2
        }
    ],
    "roadmap_graph": {
        "step_1": [],
        "step_2": ["step_1"],
        "step_3": ["step_1", "step_2"]
    }
}
```

### 3. **identify_sources**
Identifies the best FREE platforms for learning each topic.

**Input:** Topics from Step 1

**Output (State):**
```python
{
    "sources": [
        {
            "source_id": "source_1",
            "name": "freeCodeCamp YouTube",
            "type": "video_platform",
            "url": "https://youtube.com/@freecodecamp",
            "relevance_score": 0.95,
            "free": true,
            "topics_covered": ["topic_1", "topic_2"]
        },
        {
            "source_id": "source_2",
            "name": "React Official Docs",
            "type": "documentation",
            "url": "https://react.dev",
            "relevance_score": 1.0,
            "free": true,
            "topics_covered": ["topic_1", "topic_2", "topic_3"]
        }
    ],
    "sources_by_topic": {
        "topic_1": ["source_1", "source_2"],
        "topic_2": ["source_1", "source_2"]
    }
}
```

### 4. **gather_resources**
Finds specific learning resources (videos, tutorials, docs) for each roadmap step.

**Focus:** FREE resources without subscription:
- YouTube videos
- GitHub repositories (tutorials, awesome-lists)
- Free documentation
- Free tutorials (freeCodeCamp, MDN, W3Schools)
- Open-source courses

**Input:** Roadmap and sources from previous steps

**Output (State):**
```python
{
    "resources": [
        {
            "resource_id": "res_1",
            "title": "React Tutorial for Beginners - Full Course",
            "description": "Complete React tutorial covering all basics",
            "url": "https://youtube.com/watch?v=...",
            "type": "video",
            "source": "freeCodeCamp YouTube",
            "duration": "5 hours",
            "difficulty": "beginner",
            "quality_score": 0.9,
            "free": true,
            "topics": ["topic_1"],
            "for_step": "step_1"
        },
        {
            "resource_id": "res_2",
            "title": "awesome-react",
            "description": "Curated list of React resources",
            "url": "https://github.com/enaqx/awesome-react",
            "type": "code",
            "source": "GitHub",
            "duration": null,
            "difficulty": "all",
            "quality_score": 0.85,
            "free": true,
            "topics": ["topic_1", "topic_2"],
            "for_step": "step_1"
        }
    ],
    "resources_by_step": {
        "step_1": ["res_1", "res_2"],
        "step_2": ["res_3", "res_4"]
    }
}
```

### 5. **format_output**
Formats the complete course for frontend consumption.

**Output (Final Course):**
```json
{
    "course_id": "uuid",
    "title": "Complete React Learning Path",
    "description": "A comprehensive 8-week learning path",
    "metadata": {
        "difficulty": "intermediate",
        "estimated_weeks": 8,
        "hours_per_week": 10,
        "total_hours": 80
    },
    "topics": [...],
    "roadmap": {
        "steps": [...],
        "prerequisite_graph": {...}
    },
    "resources": {
        "all_resources": [...],
        "by_step": {...},
        "sources_used": [...]
    },
    "statistics": {
        "total_topics": 8,
        "total_steps": 10,
        "total_resources": 45,
        "free_resources": 45
    }
}
```

## State Management

The workflow uses a TypedDict state that flows through all nodes:

```python
class CourseGenerationState(TypedDict):
    # Input
    request_id: str
    topic: str
    goals: List[str]
    # ... other inputs

    # Step outputs
    topics: List[TopicDetail]
    roadmap: List[RoadmapStep]
    sources: List[ResourceSource]
    resources: List[LearningResource]

    # Final output
    final_course: Dict[str, Any]
```

## Resource Types

Resources are categorized by type for frontend rendering:

- **video**: YouTube tutorials, course videos
- **documentation**: Official docs, MDN, API references
- **article**: Blog posts, Medium articles
- **tutorial**: Step-by-step tutorials
- **code**: GitHub repos, CodePen examples
- **course**: Free online courses (Coursera free, Khan Academy)

## API Usage

### Start Course Generation

```bash
POST /ai-api/courses/generate
Content-Type: application/json

{
    "user_id": "user123",
    "topic": "React Development",
    "goals": ["Build web apps", "Learn hooks"],
    "user_experience": "beginner",
    "difficulty": "intermediate",
    "estimated_weeks": 8,
    "time_commitment": 10
}
```

### Check Status

```bash
GET /ai-api/courses/{request_id}/status
```

### List Courses

```bash
GET /ai-api/courses/list?user_id=user123
```

## File Structure

```
workflows/courses/
├── __init__.py                  # Exports
├── README.md                    # This file
├── state.py                     # State definitions (TypedDict)
├── nodes.py                     # Node functions (5 steps)
└── course_workflow.py           # LangGraph workflow
```

## Extending the Workflow

To add a new step:

1. Add state fields in `state.py`
2. Create node function in `nodes.py`
3. Add node to graph in `course_workflow.py`
4. Update edges to include new step

Example:
```python
# In nodes.py
async def validate_resources(state: CourseGenerationState) -> Dict[str, Any]:
    # Validate resource links
    return {"resources_validated": True}

# In course_workflow.py
workflow.add_node("validate", self.nodes.validate_resources)
workflow.add_edge("gather_resources", "validate")
workflow.add_edge("validate", "format_output")
```

## Testing

```python
from workflows.courses import CourseGenerationWorkflow

workflow = CourseGenerationWorkflow()

result = await workflow.generate(
    request_id="test_123",
    user_id="user123",
    topic="Python Programming",
    goals=["Learn basics", "Build projects"],
    user_experience="beginner",
    difficulty="beginner",
    estimated_weeks=4,
    time_commitment=10
)

print(result['course'])
```
