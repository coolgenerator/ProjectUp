# AI-Powered Project Roadmap Generation - Implementation Guide

## Overview

This document describes the comprehensive AI-powered project roadmap generation system that creates structured roadmaps with sections, milestones, tasks, subtasks, dependencies, and proposals.

## Architecture

### Component Diagram

```
Frontend → Backend (Go) → AI Service (Python) → LLM (Vertex AI/Gemini)
   ↑                             ↓
   └─────────── Database ←───────┘
```

### Data Flow

1. **User Request** → Frontend initiates roadmap generation
2. **Backend Request** → Backend calls AI service with project details
3. **AI Generation** → AI service uses LLM to generate structured roadmap
4. **Data Storage** → AI service sends data back to backend
5. **Database Storage** → Backend stores sections, milestones, tasks, dependencies, proposals
6. **Frontend Display** → Frontend retrieves and displays complete roadmap

## Implementation Details

### AI Service (Python/FastAPI)

#### 1. Request/Response Models

**Location:** `ai-service/models/requests/project_roadmap_requests.py`

```python
class GenerateProjectRoadmapRequest:
    project_id: str
    project_title: str
    project_description: str
    difficulty_level: str = "intermediate"
    duration_weeks: Optional[int]
    team_size: Optional[int]
    key_features: Optional[List[str]]
    tech_stack: Optional[List[str]]
    generate_proposals: bool = True
    generate_dependencies: bool = True
```

**Location:** `ai-service/models/responses/project_roadmap_responses.py`

```python
class GenerateProjectRoadmapResponse:
    success: bool
    sections: List[RoadmapSection]
    proposals: List[ProjectProposal]
    total_estimated_hours: float
    total_tasks: int
    total_milestones: int
    dependencies_graph: List[DependencyEdge]
```

#### 2. Roadmap Generation Service

**Location:** `ai-service/services/projects/project_roadmap_generator.py`

The `ProjectRoadmapGenerator` class:
- Uses Vertex AI (Gemini models) for generation
- Creates hierarchical structure (Sections → Milestones → Tasks → Subtasks)
- Generates task dependencies
- Creates project proposals with different approaches
- Provides methods for:
  - `generate_roadmap()` - Full roadmap generation
  - `regenerate_section()` - Regenerate specific section
  - `expand_milestone()` - Add more detail to milestone

#### 3. LLM Prompts

**Location:** `ai-service/prompts/project_roadmap_prompts.py`

Carefully crafted prompts ensure:
- Realistic time estimates
- Proper dependency chains
- Comprehensive task breakdowns
- Multiple strategic approaches (proposals)

#### 4. API Routes

**Location:** `ai-service/routes/project_roadmap_routes.py`

**Endpoints:**

- `POST /ai-api/project-roadmap/generate`
  - Generate roadmap without storing
  - Returns AI-generated structure

- `POST /ai-api/project-roadmap/generate-and-store`
  - Generate roadmap AND store in backend database
  - Returns both generation result and storage statistics

- `POST /ai-api/project-roadmap/regenerate-section`
  - Regenerate a specific section

- `POST /ai-api/project-roadmap/expand-milestone`
  - Expand milestone with more tasks

- `GET /ai-api/project-roadmap/health`
  - Health check

### Backend (Go/Gin)

#### 1. Integration Service

**Location:** `backend/services/roadmapIntegrationService.go`

The `RoadmapIntegrationService` handles:
- Parsing AI-generated JSON
- Creating database records in proper order
- Handling task dependencies (resolving by name)
- Transaction management for data integrity
- Creating proposals as ProjectPlans

**Key Method:**
```go
func (s *RoadmapIntegrationService) StoreAIGeneratedRoadmap(
    projectID uint,
    roadmapData AIGeneratedRoadmap,
) (*StoreResult, error)
```

**Process:**
1. Verify project exists
2. Create sections
3. Create milestones (linked to sections)
4. Create tasks (linked to milestones and sections)
5. Create subtasks (linked to tasks)
6. Create task dependencies (resolve names to IDs)
7. Create proposals as ProjectPlans

#### 2. API Controller

**Location:** `backend/controllers/roadmapIntegrationController.go`

**Endpoints:**

- `POST /api/projects/:sid/roadmap/store-ai-generated`
  - Receives AI-generated roadmap
  - Stores in database
  - Returns storage statistics

- `GET /api/projects/:sid/roadmap`
  - Retrieves complete roadmap
  - Optional query parameters:
    - `include_tasks=true`
    - `include_subtasks=true`
    - `include_dependencies=true`
  - Returns statistics

- `DELETE /api/projects/:sid/roadmap`
  - Deletes entire roadmap
  - Cascades to tasks, subtasks, dependencies

#### 3. Routes Registration

**Location:** `backend/routes/projectRouter.go`

Routes added to project group with authentication middleware.

### Database Models (PostgreSQL)

#### Existing Models Used

1. **Section** (`sections` table)
   - Groups milestones into phases
   - Fields: name, description, order, color

2. **Milestone** (`milestones` table)
   - Significant achievements
   - Fields: title, description, status, priority, start_date, due_date
   - Links to: workspace, section

3. **Task** (`tasks` table)
   - Actionable items
   - Fields: title, description, status, priority, estimated_hours, tags
   - Links to: milestone, section

4. **Subtask** (`subtasks` table)
   - Detailed breakdowns
   - Links to: parent task

5. **TaskDependency** (`task_dependencies` table)
   - Dependencies between tasks
   - Fields: task_id, depends_on_task_id

6. **ProjectPlan** (`project_plans` table)
   - Stores proposals with JSONB content
   - Fields: title, description, plan_type, content, status

## API Usage Examples

### Example 1: Generate and Store Roadmap

**Request:**
```bash
curl -X POST "http://localhost:8000/ai-api/project-roadmap/generate-and-store" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PRJ12345",
    "project_title": "E-commerce Platform",
    "project_description": "Build a modern e-commerce platform with React and Node.js",
    "difficulty_level": "intermediate",
    "duration_weeks": 12,
    "team_size": 3,
    "key_features": [
      "User authentication",
      "Product catalog",
      "Shopping cart",
      "Payment integration",
      "Order management"
    ],
    "tech_stack": ["React", "Node.js", "PostgreSQL", "Stripe"],
    "generate_proposals": true,
    "generate_dependencies": true
  }'
```

**Response:**
```json
{
  "success": true,
  "roadmap": {
    "sections": [
      {
        "name": "Planning & Setup",
        "description": "Initial project setup and requirements gathering",
        "order": 0,
        "color": "#8B5CF6",
        "milestones": [
          {
            "title": "Project Initialization",
            "description": "Set up development environment and project structure",
            "estimated_hours": 20,
            "priority": 4,
            "tasks": [
              {
                "title": "Set up Git repository",
                "description": "Initialize Git repo with proper .gitignore and README",
                "estimated_hours": 2,
                "priority": 5,
                "dependencies": [],
                "subtasks": [
                  {
                    "title": "Create GitHub repository",
                    "description": "Set up repo with initial structure"
                  },
                  {
                    "title": "Configure branch protection",
                    "description": "Set up main branch protection rules"
                  }
                ]
              },
              {
                "title": "Set up development environment",
                "description": "Install Node.js, React, PostgreSQL",
                "estimated_hours": 3,
                "priority": 5,
                "dependencies": ["Set up Git repository"],
                "subtasks": [...]
              }
            ]
          }
        ]
      },
      {
        "name": "Core Development",
        "description": "Implement main features",
        "order": 1,
        "milestones": [...]
      }
    ],
    "proposals": [
      {
        "title": "MVP-First Approach",
        "description": "Focus on minimal viable product",
        "approach": "Build core features first, iterate based on feedback",
        "benefits": [
          "Faster time to market",
          "Early user feedback",
          "Reduced initial development cost"
        ],
        "challenges": [
          "May lack features competitors have",
          "Requires disciplined scope management"
        ]
      }
    ],
    "total_estimated_hours": 480,
    "total_tasks": 45,
    "total_milestones": 12,
    "dependencies_graph": [
      {
        "from_task": "Set up Git repository",
        "to_task": "Set up development environment",
        "dependency_type": "finish_to_start"
      }
    ]
  },
  "storage": {
    "success": true,
    "sections_created": 4,
    "milestones_created": 12,
    "tasks_created": 45,
    "subtasks_created": 120,
    "dependencies_created": 38,
    "proposals_created": 3
  }
}
```

### Example 2: Retrieve Stored Roadmap

**Request:**
```bash
curl "http://localhost:8080/api/projects/PRJ12345/roadmap?include_tasks=true&include_dependencies=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "project_id": 123,
  "sections": [
    {
      "id": 1,
      "name": "Planning & Setup",
      "description": "Initial project setup",
      "order": 0,
      "color": "#8B5CF6"
    }
  ],
  "milestones": [
    {
      "milestone_id": 1,
      "title": "Project Initialization",
      "description": "Set up development environment",
      "tasks": [
        {
          "id": "task_1699123456_0",
          "title": "Set up Git repository",
          "description": "Initialize Git repo",
          "status": "todo",
          "priority": 5,
          "estimated_hours": 2,
          "milestone_id": 1,
          "section_id": 1
        }
      ]
    }
  ],
  "dependencies": [
    {
      "id": 1,
      "task_id": "task_1699123456_1",
      "depends_on_task_id": "task_1699123456_0"
    }
  ],
  "statistics": {
    "total_sections": 4,
    "total_milestones": 12,
    "total_tasks": 45,
    "estimated_hours": 480
  }
}
```

### Example 3: Regenerate Section

**Request:**
```bash
curl -X POST "http://localhost:8000/ai-api/project-roadmap/regenerate-section" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PRJ12345",
    "section_id": 2,
    "section_name": "Core Development",
    "additional_context": "User requested more detailed API implementation tasks"
  }'
```

## Frontend Integration

### Using the API

```typescript
// Generate and store roadmap
const generateRoadmap = async (projectId: string, projectData: ProjectData) => {
  const response = await fetch(
    `${AI_SERVICE_URL}/ai-api/project-roadmap/generate-and-store`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        project_title: projectData.title,
        project_description: projectData.description,
        difficulty_level: projectData.difficulty,
        duration_weeks: projectData.duration,
        team_size: projectData.teamSize,
        key_features: projectData.features,
        tech_stack: projectData.techStack,
        generate_proposals: true,
        generate_dependencies: true
      })
    }
  );

  return await response.json();
};

// Retrieve roadmap
const getRoadmap = async (projectId: string) => {
  const response = await fetch(
    `${BACKEND_URL}/api/projects/${projectId}/roadmap?include_tasks=true&include_dependencies=true`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};
```

### Display Components

Create React components to display:
- **Sections** - as tabs or accordion
- **Milestones** - as cards or timeline items
- **Tasks** - as checklist items with progress
- **Dependencies** - as Gantt chart or dependency graph
- **Proposals** - as selectable cards

## Configuration

### AI Service Environment Variables

```bash
# Vertex AI Configuration
GCP_PROJECT_ID=project-up66
GCP_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash-exp

# Backend Integration
BACKEND_URL=http://localhost:8080
BACKEND_API_PREFIX=/api
```

### Backend Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projectup
DB_USER=projectup
DB_PASSWORD=your_password

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

## Testing

### Unit Tests

**AI Service:**
```bash
cd ai-service
pytest tests/test_roadmap_generator.py -v
```

**Backend:**
```bash
cd backend
go test ./services/... -v
go test ./controllers/... -v
```

### Integration Test

```bash
# Start services
cd ai-service && python main.py &
cd backend && go run main.go &

# Run test script
curl -X POST "http://localhost:8000/ai-api/project-roadmap/generate-and-store" \
  -H "Content-Type: application/json" \
  -d @test_project.json

# Verify in database
psql -d projectup -c "SELECT COUNT(*) FROM sections;"
psql -d projectup -c "SELECT COUNT(*) FROM milestones;"
psql -d projectup -c "SELECT COUNT(*) FROM tasks;"
```

## Troubleshooting

### Common Issues

1. **AI Generation Fails**
   - Check Vertex AI credentials
   - Verify GCP project ID and location
   - Check API quotas

2. **Storage Fails**
   - Verify project exists in database
   - Check workspace creation (milestones require workspace)
   - Review transaction logs

3. **Dependencies Not Created**
   - Task names must match exactly
   - Dependencies reference earlier tasks only
   - Check logs for warnings

### Logs

**AI Service:**
```bash
tail -f ai-service/ai-service.log
```

**Backend:**
```bash
# Check Go application logs
```

## Future Enhancements

1. **Real-time Progress Tracking**
   - WebSocket updates
   - Task completion notifications

2. **AI-Powered Adjustments**
   - Rebalance workload
   - Suggest optimizations
   - Detect blockers

3. **Team Collaboration**
   - Auto-assign based on skills
   - Workload distribution
   - Dependency alerts

4. **Templates**
   - Pre-built roadmap templates
   - Industry-specific structures
   - Best practices library

5. **Analytics**
   - Time tracking
   - Velocity metrics
   - Burndown charts

## Support

For issues or questions:
- Check logs in `ai-service/ai-service.log` and backend logs
- Review API documentation at `/docs` (AI service)
- Check database state for data integrity

## License

MIT License - See LICENSE file for details
