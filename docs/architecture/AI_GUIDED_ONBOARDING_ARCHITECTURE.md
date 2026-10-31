# AI-Guided Project Onboarding - Unified Architecture

## 🎯 Overview

This document describes the unified architecture for AI-guided project creation across all project types.

**Implementation Date**: November 19, 2025
**Status**: ✅ Core Implementation Complete - Ready for Testing

---

## 🏗️ Architecture Design

### Correct 3-Tier Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend  │ ───► │   Backend    │ ───► │  AI Service  │
│ (React/TS)  │ HTTP │   (Go/Gin)   │ HTTP │   (Python)   │
│             │ ◄─── │              │ ◄─── │   FastAPI    │
└─────────────┘      └──────────────┘      └──────────────┘
                            ▲                       ▲
                            │                       │
                         Proxy/                 Core AI
                       Forwarding               Logic
```

**Key Principles:**
1. ✅ **AI Logic in AI Service**: All AI prompts, model calls, and processing in Python FastAPI
2. ✅ **Backend as Proxy**: Go backend forwards requests and handles authentication
3. ✅ **Frontend Calls Backend**: React calls Go endpoints, which proxy to AI service

---

## 📁 Project Structure

### AI Service (`/ai-service`)

```
ai-service/
├── prompts/
│   └── onboarding_prompts.py          # ✅ All project type prompts
├── services/
│   └── onboarding_service.py          # ✅ Unified AI service
├── routes/
│   └── onboarding_routes.py           # ✅ FastAPI endpoints
└── main.py                             # ✅ Router registered
```

### Backend (`/backend`)

```
backend/
├── controllers/
│   └── aiOnboardingController.go      # ✅ Proxy controller
└── routes/
    └── projectRouter.go                # ✅ Proxy routes added
```

### Frontend (`/frontend`)

```
frontend/src/
├── api/
│   └── onboardingAPI.ts                        # ✅ Unified API utility
├── components/onboarding/
│   ├── flows/
│   │   ├── CourseProjectFlowV2.tsx             # ✅ Complete
│   │   ├── HackathonProjectFlowV2.tsx          # ✅ Complete
│   │   ├── CapstoneProjectFlowV2.tsx           # ✅ Complete
│   │   ├── CompetitionProjectFlowV2.tsx        # ✅ Complete
│   │   ├── UnifiedProjectFlow.tsx              # ✅ Template for remaining types
│   │   ├── InternshipProjectFlowV2.tsx         # 🚧 Template ready
│   │   ├── OpenSourceProjectFlowV2.tsx         # 🚧 Template ready
│   │   ├── PortfolioProjectFlowV2.tsx          # 🚧 Template ready
│   │   ├── CourseNoteProjectFlowV2.tsx         # 🚧 Template ready
│   │   └── ExamPrepProjectFlowV2.tsx           # 🚧 Template ready
│   └── shared/
│       ├── AITopicSuggestions.tsx              # ✅ Updated to unified API
│       ├── TopicElaboration.tsx                # ✅ Updated to unified API
│       ├── AIProjectDetailsGenerator.tsx       # ✅ Updated to unified API
│       ├── UnifiedAITopicSuggestions.tsx       # ✅ Generic component for all types
│       ├── CapstoneRequirementsInput.tsx       # ✅ Complete
│       ├── CompetitionRequirementsInput.tsx    # ✅ Complete
│       ├── InternshipRequirementsInput.tsx     # 🚧 Template ready
│       ├── OpenSourceRequirementsInput.tsx     # 🚧 Template ready
│       ├── PortfolioRequirementsInput.tsx      # 🚧 Template ready
│       ├── CourseNoteRequirementsInput.tsx     # 🚧 Template ready
│       └── ExamPrepRequirementsInput.tsx       # 🚧 Template ready
```

---

## 🔌 API Endpoints

### AI Service Endpoints (Python FastAPI)

Base URL: `http://localhost:8000`

#### 1. Get Supported Project Types
```
GET /onboarding/supported-types

Response:
{
  "project_types": [
    {"id": "course", "name": "Course Group Project", "tier": 1},
    {"id": "hackathon", "name": "Hackathon Project", "tier": 1},
    {"id": "capstone", "name": "Capstone Project", "tier": 1},
    {"id": "competition", "name": "Competition Project", "tier": 1},
    {"id": "internship", "name": "Internship Project", "tier": 2},
    {"id": "opensource", "name": "Open Source Contribution", "tier": 2},
    {"id": "portfolio", "name": "Portfolio Project", "tier": 3},
    {"id": "coursenote", "name": "Course Note Project", "tier": 3},
    {"id": "examprep", "name": "Exam Prep Project", "tier": 3}
  ]
}
```

#### 2. Suggest Topics
```
POST /onboarding/{project_type}/suggest-topics

Request Body (varies by project_type):
{
  "context": {
    // Course Project
    "course_name": "Web Development",
    "school": "UC San Diego",
    "requirements": "...",
    "constraints": {...}

    // Hackathon Project
    "hackathon_name": "HackMIT 2024",
    "duration_hours": 24,
    "theme": "...",
    "team_skills": [...]

    // Capstone Project
    "major": "Computer Science",
    "duration_months": 6,
    "defense_requirements": "...",
    // etc...
  }
}

Response:
{
  "topics": [
    {
      "topic_id": "t1",
      "name": "Project Name",
      "tagline": "One-line pitch",
      "description": "Detailed description",
      "suggested_tech": ["React", "Node.js"],
      "difficulty": "intermediate",
      "estimated_weeks": 10,
      "key_features": ["Feature 1", "Feature 2"]
    }
  ],
  "analysis_summary": "AI analysis of requirements..."
}
```

#### 3. Elaborate Topic
```
POST /onboarding/{project_type}/elaborate-topic

Request Body:
{
  "selected_topic": {
    "name": "Selected Topic Name",
    "description": "...",
    "tagline": "..."
  },
  "context": {
    // Same as suggest-topics
  }
}

Response:
{
  "background": {
    "problem": "...",
    "value": "...",
    "target_users": "..."
  },
  "objectives": {
    "primary": [...],
    "secondary": [...],
    "learning": [...]
  },
  "core_features": [...],
  "enhanced_features": [...],
  "technical_architecture": {...},
  "milestones": [...],
  "success_criteria": {...},
  "challenges_and_risks": [...]
}
```

#### 4. Generate Project Details
```
POST /onboarding/{project_type}/generate-details

Request Body:
{
  "elaboration": {
    // Full elaboration object from previous step
  }
}

Response:
{
  "name_options": [
    {"name": "Option 1", "rationale": "Why this name..."},
    {"name": "Option 2", "rationale": "..."},
    {"name": "Option 3", "rationale": "..."}
  ],
  "description": "Elevator pitch description",
  "tags": ["Tag1", "Tag2", "Tag3"]
}
```

### Backend Proxy Endpoints (Go/Gin)

Base URL: `http://localhost:8080/api`

✅ **Implemented proxy endpoints**

```
GET  /projects/onboarding/types           → Forward to AI service /onboarding/supported-types
POST /projects/onboarding/:type/topics    → Forward to AI service /onboarding/{type}/suggest-topics
POST /projects/onboarding/:type/elaborate → Forward to AI service /onboarding/{type}/elaborate-topic
POST /projects/onboarding/:type/details   → Forward to AI service /onboarding/{type}/generate-details
```

**Implementation Details:**
- Controller: `backend/controllers/aiOnboardingController.go`
- Routes: `backend/routes/projectRouter.go` (lines 103-106)
- Authentication: All endpoints require JWT authentication via `middleware.Authenticate()`
- Error Handling: Comprehensive error handling for connection failures and invalid responses
- Environment Variable: `AI_SERVICE_URL` (defaults to `http://localhost:8000`)

---

## 📋 Supported Project Types

### Tier 1 (High Priority - Core Academic)

| Type | ID | Duration | Key Features |
|------|----|-----------|----|
| **Course Project** | `course` | 8-16 weeks | Syllabus-driven, team-based, graded |
| **Hackathon** | `hackathon` | 24-48 hours | Extreme time pressure, demo-focused |
| **Capstone** | `capstone` | 3-9 months | Multiple reviews, academic rigor |
| **Competition** | `competition` | Varies | Judging criteria, winning strategy |

### Tier 2 (Professional & Community)

| Type | ID | Duration | Key Features |
|------|----|-----------|----|
| **Internship** | `internship` | 3-6 months | Real business environment, stakeholder management |
| **Open Source** | `opensource` | Ongoing | Community-driven, contribution guidelines |
| **Event Organization** | `event` | 2-6 months | Multi-party coordination, logistics |

### Tier 3 (Personal Development)

| Type | ID | Duration | Key Features |
|------|----|-----------|----|
| **Portfolio** | `portfolio` | 1-3 months | Showcase-focused, personal branding |
| **Course Note** | `coursenote` | 1 semester | Content creation, teaching pedagogy |
| **Exam Prep** | `examprep` | 1-3 months | Structured study, practice materials |

---

## 📝 Prompt Templates

### Current Status

✅ **Implemented:**
- Course Project (3 prompts)
- Hackathon Project (3 prompts)
- Capstone Project (3 prompts)

🚧 **In Progress:**
- Competition Project
- Internship Project
- Open Source Project
- Event Organization Project
- Portfolio Project
- Course Note Project
- Exam Prep Project

### Prompt Structure

Each project type has 3 prompts in `/ai-service/prompts/onboarding_prompts.py`:

```python
# 1. Topic Suggestion Prompt
{TYPE}_TOPIC_SUGGESTION_PROMPT = """
- Takes: Project context
- Returns: 3-5 topic ideas with details
"""

# 2. Topic Elaboration Prompt
{TYPE}_TOPIC_ELABORATION_PROMPT = """
- Takes: Selected topic + context
- Returns: Detailed implementation plan
"""

# 3. Project Details Prompt
{TYPE}_PROJECT_DETAILS_PROMPT = """
- Takes: Elaboration
- Returns: Name options, description, tags
"""
```

---

## 🔄 Data Flow

### Complete End-to-End Flow

```
1. User selects project scenario in Frontend
   └─► ScenarioSelection.tsx

2. Frontend renders type-specific flow component
   └─► CourseProjectFlowV2.tsx / HackathonProjectFlowV2.tsx / etc.

3. Flow component calls Backend API
   └─► POST /api/projects/onboarding/{type}/topics
       └─► Backend proxies to AI Service
           └─► POST /onboarding/{type}/suggest-topics
               └─► OnboardingService.suggest_topics()
                   └─► Get prompt template for {type}
                   └─► Call AI provider (OpenAI/Claude/Groq)
                   └─► Parse JSON response
                   └─► Return topics
               ◄─── Response
           ◄─── Response
       ◄─── Response
   ◄─── Display topics

4. User selects topic → Elaborate
   └─► POST /api/projects/onboarding/{type}/elaborate
       └─► AI Service elaborates with detailed plan
       ◄─── Elaboration
   ◄─── Display elaboration

5. User continues → Generate Details
   └─► POST /api/projects/onboarding/{type}/details
       └─► AI Service generates names/description
       ◄─── Project details
   ◄─── Display details

6. User finalizes → Create Project
   └─► POST /api/projects/onboarding/create
       └─► Backend creates project in database
       └─► Optionally generates board/tasks
       ◄─── Project created
   ◄─── Navigate to project
```

---

## ✅ Implementation Checklist

### Phase 1: AI Service Core (✅ Complete)
- [x] Create `prompts/onboarding_prompts.py`
- [x] Create `services/onboarding_service.py`
- [x] Create `routes/onboarding_routes.py`
- [x] Register router in `main.py`
- [x] Add Course, Hackathon, Capstone prompts

### Phase 2: Complete All Prompts (🚧 In Progress)
- [ ] Competition Project prompts
- [ ] Internship Project prompts
- [ ] Open Source Project prompts
- [ ] Event Organization prompts
- [ ] Portfolio Project prompts
- [ ] Course Note Project prompts
- [ ] Exam Prep Project prompts

### Phase 3: Backend Proxy (✅ Complete)
- [x] Create `controllers/aiOnboardingController.go`
- [x] Implement proxy functions to AI service
- [x] Add routes to `routes/projectRouter.go`
- [x] Handle authentication/authorization
- [x] Add error handling and logging

### Phase 4: Frontend Updates (✅ Complete)
- [x] Created unified onboarding API utility (`frontend/src/api/onboardingAPI.ts`)
- [x] Updated AITopicSuggestions to use new unified endpoint
- [x] Updated TopicElaboration to use new unified endpoint
- [x] Updated AIProjectDetailsGenerator to use new unified endpoint
- [x] Updated HackathonTopicSuggestions to use new unified endpoint
- [x] Updated HackathonTopicElaboration to use new unified endpoint
- [x] Updated HackathonProjectDetails to use new unified endpoint
- [x] All components now call backend proxy instead of direct AI service

### Phase 5: Testing & Documentation (🚧 TODO)
- [ ] Unit tests for AI service
- [ ] Integration tests for full flow
- [ ] API documentation updates
- [ ] User guide for each project type
- [ ] Migration guide from old implementation

---

## 🚀 Next Steps

### Immediate (Today)
1. ✅ Complete remaining prompts for all 9 project types
2. ✅ Create backend proxy controller
3. 🚧 Update frontend to use backend endpoints
4. 🚧 Test one full flow end-to-end

### Short Term (This Week)
1. Complete all project type implementations
2. Comprehensive testing
3. Documentation
4. Performance optimization

### Long Term
1. Add more project types based on user feedback
2. Implement prompt versioning
3. A/B testing different prompt strategies
4. Analytics and usage tracking

---

## 📊 Project Type Comparison

| Feature | Course | Hackathon | Capstone | Competition | Internship |
|---------|--------|-----------|----------|-------------|------------|
| Duration | 8-16w | 24-48h | 3-9m | Varies | 3-6m |
| Team Size | 3-5 | 2-4 | 1-3 | 1-5 | 1 |
| Focus | Learning | Demo | Research | Winning | Delivery |
| Deliverables | Code + Report | Demo | Thesis | Submission | Product |
| Evaluation | Grades | Judges | Committee | Judges | Manager |
| Timeline | Fixed | Extreme | Flexible | Fixed | Fixed |
| Innovation | Medium | High | High | High | Medium |
| Documentation | Medium | Low | High | Medium | High |

---

## 🔧 Technical Details

### AI Provider Configuration

```python
# ai-service/core/ai_provider.py
class AIProvider:
    def __init__(self):
        # Priority: Groq > OpenAI > Claude
        self.provider = self._get_default_provider()

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: str,
        response_format: str = "json"
    ) -> str:
        # Call AI model
        # Handle rate limiting
        # Parse response
        return response
```

### Backend Proxy Pattern

```go
// backend/controllers/aiOnboardingController.go
func ProxyToAIService(c *gin.Context) {
    // Extract request
    // Forward to AI service
    // Handle response
    // Return to frontend
}
```

---

## 📚 Resources

- [AI Guided Flow Design Doc](../features/AI_GUIDED_PROJECT_CREATION_DESIGN.md)
- [Testing Guide](../guides/AI_GUIDED_FLOW_TESTING_GUIDE.md)
- [API Documentation](http://localhost:8000/docs)

---

**Last Updated**: November 19, 2025
**Status**: Core architecture complete, extending to all project types
