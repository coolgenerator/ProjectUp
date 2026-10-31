# AI Project Board Generation - Complete Implementation Guide

## Overview

The AI Project Board Generation system allows users to generate comprehensive, scenario-specific project boards with phases, tasks, milestones, and approval gates using AI assistance. This document covers the complete implementation including backend services, frontend components, and integration patterns.

## Table of Contents

1. [Architecture](#architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Integration Guide](#integration-guide)
5. [AI Providers](#ai-providers)
6. [Usage Examples](#usage-examples)
7. [Testing Guide](#testing-guide)

---

## Architecture

### System Flow

```
User Input → Guided Questions → AI Service → Board Generation → Preview → Project Creation
```

### Key Components

**Backend (Go)**:
- `aiService.go` - Multi-provider AI service (OpenAI, Groq, Claude)
- `aiProjectBoardController.go` - Board generation endpoints
- `projectTemplates.go` - Scenario-specific templates

**Frontend (React/TypeScript)**:
- `AIGuidedQuestions.tsx` - Question flow UI
- `AIBoardPreview.tsx` - Board preview/confirmation UI
- `AIProjectBoardAssistant.tsx` - Main orchestrator
- `*ProjectFlowWithAI.tsx` - Enhanced scenario flows

### Design Principles

1. **Structured Interaction**: Guided questions instead of free-form chat
2. **Fixed Framework + AI Enhancement**: Template structure with AI-generated tasks
3. **Optional Integration**: Users can skip AI and create manually
4. **Progressive Disclosure**: Show AI features without overwhelming users
5. **Multi-Provider Support**: Automatic fallback across AI providers

---

## Backend Implementation

### AI Service (`services/aiService.go`)

#### Supported AI Providers

1. **Groq (Recommended)** - Fastest and cheapest, Llama3-70b model
2. **OpenAI** - GPT-4o-mini for cost-effectiveness
3. **Anthropic Claude** - Claude Haiku for fast responses

#### Configuration

Set one or more environment variables:

```bash
export GROQ_API_KEY="your_groq_key"
export OPENAI_API_KEY="your_openai_key"
export ANTHROPIC_API_KEY="your_anthropic_key"
```

The system automatically uses the first available provider in order: Groq → OpenAI → Claude.

#### Key Functions

```go
// Get default AI service with automatic fallback
aiService := services.GetDefaultAIService()

// Generate completion
response, err := aiService.GenerateCompletion(prompt, systemPrompt)

// Parse syllabus (for course projects)
syllabusInfo, err := aiService.ParseSyllabusWithAI(syllabusText)

// Generate project tasks
tasks, err := aiService.GenerateProjectTasks(prompt, context)
```

#### Syllabus Parsing

For course projects, the AI can extract structured information from syllabi:

```go
type SyllabusInfo struct {
    Milestones      []GeneratedMilestone
    Requirements    []map[string]string
    Deliverables    []string
    GradingRubric   map[string]interface{}
}
```

### Project Board Controller (`controllers/aiProjectBoardController.go`)

#### Endpoints

##### 1. Get Project Templates

```
GET /api/projects/templates?scenario={course|research|product|personal}
```

Returns available templates for the specified scenario.

##### 2. Get Guided Questions

```
GET /api/projects/templates/questions?scenario={course|research|product|personal}
```

Returns scenario-specific guided questions.

##### 3. Generate Project Board

```
POST /api/projects/board/generate
```

**Request Body**:

```json
{
  "project_scenario": "course",
  "project_id": 123,  // Optional, for existing projects
  "user_inputs": {
    "name": "Mobile App Development",
    "description": "Build a cross-platform mobile app",
    "topics": ["React Native", "Firebase"],
    "duration_weeks": 8,
    "team_size": 4
  },
  "guided_answers": [
    {
      "question_id": "q1",
      "answer": "Create a social media app"
    },
    {
      "question_id": "q2",
      "answer": {
        "type": "text",
        "content": "Syllabus content here..."
      }
    }
  ],
  "syllabus_text": "Optional syllabus content..."
}
```

**Response**:

```json
{
  "board": {
    "phases": [
      {
        "phase_id": 1,
        "name": "Project Kickoff",
        "status": "active",
        "duration": "1-2 weeks",
        "sort_order": 0,
        "tasks": [...],
        "gates": {
          "type": "approval_required",
          "approver": "Professor",
          "checklist_before_submit": [...]
        }
      }
    ],
    "tasks": [...],
    "milestones": [...],
    "assignments": {}
  },
  "message": "Project board generated successfully"
}
```

### Project Templates (`controllers/projectTemplates.go`)

#### Template Structure

```go
type ProjectTemplate struct {
    Name                string
    Description         string
    Phases              []ProjectPhaseTemplate
    RequiredMilestones  []MilestoneTemplate
    GuidedQuestions     []GuidedQuestion
    DomainKnowledgePacks map[string]DomainKnowledge
}

type ProjectPhaseTemplate struct {
    Name              string
    Duration          string
    DynamicGeneration bool  // true = AI-generated, false = template tasks
    AIPrompt          string
    Gates             *PhaseGate
    TaskTemplates     []TaskTemplate
}
```

#### Available Templates

1. **Course Group Project** (`course`)
   - Phases: 项目启动 → 开发/执行 (AI) → 收尾与展示
   - Special: Syllabus parsing, grade-focused milestones
   - Guided Questions: Learning objectives, team background, syllabus upload

2. **Research Project** (`research`)
   - Phases: 文献调研 → Proposal准备 (with gate) → 实验/实施 (AI) → 论文写作
   - Special: Approval gates, domain-specific knowledge packs
   - Guided Questions: Research type, domain, methodology

3. **Product Development** (`product`)
   - Phases: Discovery → Design → Build (AI, sprint-based) → Launch
   - Special: Lean startup methodology, sprint planning
   - Guided Questions: Target users, MVP features, success metrics

4. **Personal Practice** (`personal`)
   - Phases: 学习计划 → 实践 (AI)
   - Special: Quick start, minimal questions
   - Guided Questions: Learning goals, skill level, time commitment

---

## Frontend Implementation

### Component Architecture

```
AIProjectBoardAssistant (Orchestrator)
├── AIGuidedQuestions (Question Flow)
└── AIBoardPreview (Preview & Confirmation)
```

### AIGuidedQuestions Component

Located: `frontend/src/components/onboarding/shared/AIGuidedQuestions.tsx`

#### Supported Question Types

1. **text** - Textarea input
2. **select** - Single choice with radio buttons
3. **multi_select** - Multiple choices with checkboxes
4. **slider** - Range input (1-5 scale)
5. **file_or_text** - Toggle between paste text or file upload
6. **structured_input** - Dynamic fields based on question definition

#### Usage

```tsx
<AIGuidedQuestions
  questions={questions}
  onComplete={(answers) => {
    // Handle completion
  }}
  onSkip={() => {
    // Handle skip
  }}
/>
```

#### Question Format

```typescript
interface GuidedQuestion {
  question_id: string;
  question: string;
  question_type: 'text' | 'select' | 'multi_select' | 'slider' | 'file_or_text' | 'structured_input';
  options?: QuestionOption[];
  required?: boolean;
  ai_usage_explanation?: string;
  placeholder?: string;
}
```

### AIBoardPreview Component

Located: `frontend/src/components/onboarding/shared/AIBoardPreview.tsx`

#### Features

- Phase expansion/collapse
- Task details with acceptance criteria
- Priority and type badges
- Estimated hours display
- Phase gates visualization
- Milestone cards
- Summary statistics

#### Usage

```tsx
<AIBoardPreview
  board={generatedBoard}
  isGenerating={false}
  onConfirm={() => {
    // User confirmed, proceed with creation
  }}
  onRegenerate={() => {
    // Go back to questions for editing
  }}
  onCancel={() => {
    // Cancel AI flow
  }}
/>
```

### AIProjectBoardAssistant Component

Located: `frontend/src/components/onboarding/shared/AIProjectBoardAssistant.tsx`

#### State Machine

```typescript
type Step = 'loading' | 'questions' | 'generating' | 'preview';
```

#### Usage

```tsx
<AIProjectBoardAssistant
  projectScenario="course"
  projectData={{
    name: "Mobile App Project",
    description: "Build a social media app",
    topics: ["React Native", "Firebase"],
    duration_weeks: 8,
    team_size: 4
  }}
  onBoardGenerated={(board) => {
    // Board generated successfully
  }}
  onSkip={() => {
    // User skipped AI assistant
  }}
/>
```

---

## Integration Guide

### Adding AI to an Existing Flow

#### Step 1: Import Required Components

```tsx
import AIProjectBoardAssistant from '../shared/AIProjectBoardAssistant';
import { GeneratedBoard } from '../shared/AIBoardPreview';
```

#### Step 2: Add AI Step to Flow

```tsx
type Step = 'basic' | 'details' | 'ai-optional' | 'preview';
```

#### Step 3: Add State Management

```tsx
const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);

const handleBoardGenerated = (board: GeneratedBoard) => {
  setGeneratedBoard(board);
  setCurrentStep('preview');
};

const handleSkipAI = () => {
  setGeneratedBoard(null);
  setCurrentStep('nextStep'); // Your next step
};
```

#### Step 4: Render AI Step

```tsx
{currentStep === 'ai-optional' && (
  <AIProjectBoardAssistant
    projectScenario="course"
    projectData={{
      name: basicInfo.name,
      description: basicInfo.description,
      // ... other collected data
    }}
    onBoardGenerated={handleBoardGenerated}
    onSkip={handleSkipAI}
  />
)}
```

#### Step 5: Include Board in Submission

```tsx
const payload: any = {
  // ... existing fields
  onboarding_metadata: {
    flow_version: '1.1',
    has_ai_board: !!generatedBoard,
    completion_time: new Date().toISOString(),
  },
};

if (generatedBoard) {
  payload.ai_board = generatedBoard;
}
```

#### Step 6: Display Confirmation in Preview

```tsx
{generatedBoard && (
  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center space-x-2 text-green-800">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="font-medium">
        AI-Generated Board Ready ({generatedBoard.phases.length} phases, {generatedBoard.tasks.length} tasks)
      </span>
    </div>
  </div>
)}
```

### Example: Personal Project with Collapsible AI

For simpler flows, use collapsible sections:

```tsx
const [showAI, setShowAI] = useState(false);

<button onClick={() => setShowAI(!showAI)}>
  AI Project Assistant (Optional)
</button>

{showAI && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <AIProjectBoardAssistant
      projectScenario="personal"
      projectData={basicInfo}
      onBoardGenerated={handleBoardGenerated}
      onSkip={() => setShowAI(false)}
    />
  </motion.div>
)}
```

---

## AI Providers

### Provider Comparison

| Provider | Model | Speed | Cost | Best For |
|----------|-------|-------|------|----------|
| **Groq** | Llama3-70b | ⚡⚡⚡ | $ | Default choice, fastest responses |
| **OpenAI** | GPT-4o-mini | ⚡⚡ | $$ | Better reasoning, fallback option |
| **Claude** | Haiku | ⚡⚡ | $$ | Alternative fallback |

### Configuration Examples

#### Development (.env)

```bash
# Recommended: Use Groq for development
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Optional backups
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

#### Production

Use secure environment variable management (AWS Secrets Manager, etc.) for production deployments.

### Custom Provider Setup

To add a new provider, modify `services/aiService.go`:

```go
const (
    OpenAI AIProvider = "openai"
    Groq   AIProvider = "groq"
    Claude AIProvider = "claude"
    CustomProvider AIProvider = "custom" // Add here
)

func (s *AIService) GenerateCompletion(prompt string, systemPrompt string) (string, error) {
    switch s.Provider {
    case CustomProvider:
        return s.generateCustomProvider(prompt, systemPrompt)
    // ...
    }
}
```

---

## Usage Examples

### Example 1: Course Project with Syllabus

**User Journey**:
1. Select "Course Group Project" scenario
2. Enter basic info (project name, description)
3. Enter course details (course name, school, class code)
4. AI Assistant asks guided questions:
   - Learning objectives
   - Upload or paste syllabus
   - Team background
5. AI generates board with:
   - Phases aligned with syllabus milestones
   - Tasks for each deliverable
   - Approval gates before submission
6. Preview and confirm
7. Project created with AI board

**Generated Board Example**:

```
Phase 1: 项目启动 (Week 1-2)
  - Form team and assign roles
  - Review course requirements
  - Initial project proposal
  - Get professor feedback

Phase 2: 开发/执行 (Week 3-8) - AI Generated
  - Sprint 1: Core feature implementation
  - Sprint 2: Testing and refinement
  - Mid-project check-in (Milestone)
  - Documentation preparation

Phase 3: 收尾与展示 (Week 9-10)
  - Final testing and bug fixes
  - Presentation preparation
  - Demo day (Milestone)
  - Final report submission (Gate: Approval Required)
```

### Example 2: Research Project with Domain Knowledge

**User Journey**:
1. Select "Research Project" scenario
2. Enter basic info
3. Enter research details (type: PhD Thesis, domain: Machine Learning)
4. AI Assistant asks:
   - Research methodology
   - Expected contributions
   - Timeline constraints
5. AI generates board with:
   - Literature review tasks with ML-specific papers
   - Proposal milestones with advisor approval gate
   - Experiment tasks tailored to ML research
   - Paper writing checklist

### Example 3: Personal Learning Project

**User Journey**:
1. Select "Personal Practice" scenario
2. Enter project name and description
3. (Optional) Expand AI Assistant section
4. Answer 2-3 quick questions about learning goals
5. AI generates simple learning plan
6. Create project immediately

---

## Testing Guide

### Backend Testing

#### Test AI Service Connectivity

```bash
cd backend

# Test with sample prompt
curl -X POST http://localhost:8080/api/projects/board/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_scenario": "personal",
    "user_inputs": {
      "name": "Learn React",
      "description": "Master React fundamentals"
    },
    "guided_answers": []
  }'
```

#### Unit Tests

```bash
go test ./services -v -run TestAIService
go test ./controllers -v -run TestGenerateProjectBoard
```

### Frontend Testing

#### Component Testing

```bash
cd frontend

# Run development server
npm run dev

# Test individual components
# Navigate to http://localhost:5173/create-project
# Select each scenario and test AI flow
```

#### Integration Testing Checklist

- [ ] Course project: Upload syllabus → Generate board → Preview → Create
- [ ] Research project: Select domain → Answer questions → Generate → Preview
- [ ] Product project: Define MVP → Generate sprints → Preview
- [ ] Personal project: Quick setup → Optional AI → Create
- [ ] Skip AI flow: Works for all scenarios
- [ ] Regenerate flow: Can go back and modify answers
- [ ] Cancel flow: Returns to previous step
- [ ] Error handling: API failures show appropriate messages

### End-to-End Testing

1. **Setup Test Environment**:
   ```bash
   export GROQ_API_KEY="your_test_key"
   cd backend && go run main.go &
   cd frontend && npm run dev &
   ```

2. **Test Complete Flow**:
   - Create new project → Select Course scenario
   - Fill basic info → Fill course details
   - Use AI assistant → Answer all questions
   - Verify board preview shows phases/tasks/milestones
   - Confirm creation → Verify project appears in list
   - Check project has phases and tasks populated

3. **Verify Database**:
   ```sql
   -- Check project metadata
   SELECT onboarding_metadata FROM projects WHERE project_id = ?;

   -- Should show: {"has_ai_board": true, "flow_version": "1.1"}

   -- Check phases created
   SELECT * FROM project_phases WHERE project_id = ?;
   ```

---

## Troubleshooting

### Common Issues

#### 1. "AI API key not configured"

**Cause**: No AI provider API key set in environment variables.

**Solution**:
```bash
export GROQ_API_KEY="your_key"
# or OPENAI_API_KEY or ANTHROPIC_API_KEY
```

#### 2. "Failed to generate project board"

**Causes**:
- Invalid API key
- Rate limit exceeded
- Network issues
- Invalid prompt/context

**Solutions**:
- Verify API key is correct
- Check provider dashboard for rate limits
- Test network connectivity
- Review backend logs for detailed error

#### 3. Board Preview Shows Empty Tasks

**Cause**: AI generation returned invalid JSON or no tasks.

**Solution**:
- Check backend logs for AI response
- Verify prompt templates in `projectTemplates.go`
- Ensure AI service is using correct model

#### 4. Frontend Shows "Loading..." Indefinitely

**Causes**:
- API endpoint unreachable
- CORS issues
- Authentication token expired

**Solutions**:
- Check browser console for errors
- Verify backend is running
- Check auth token in localStorage

---

## Performance Considerations

### Response Times

- **Guided Questions Load**: ~500ms (database lookup)
- **AI Generation**: 10-30 seconds (depends on provider)
- **Board Preview**: Instant (client-side rendering)

### Optimization Tips

1. **Use Groq**: Fastest provider, typically 5-10 seconds
2. **Limit Context**: Keep user inputs concise
3. **Cache Templates**: Templates are static, cache aggressively
4. **Async Processing**: Consider background job queue for very large boards

### Cost Estimation

Per project generation (approx.):
- **Groq**: ~$0.001 (1000 tokens)
- **OpenAI GPT-4o-mini**: ~$0.01 (5000 tokens)
- **Claude Haiku**: ~$0.005 (3000 tokens)

For 1000 projects/month with Groq: ~$1/month

---

## Future Enhancements

### Planned Features

1. **Iterative Refinement**: Allow users to refine generated boards
2. **Task Templates Library**: Pre-built task templates for common scenarios
3. **Team Skill Matching**: Assign tasks based on team member skills
4. **Dependency Auto-Detection**: Automatically create task dependencies
5. **Timeline Optimization**: Suggest optimal timeline based on task estimates
6. **Progress Prediction**: Predict completion time based on historical data

### Extension Points

The system is designed for easy extension:

- **Add New Scenarios**: Create new template in `projectTemplates.go`
- **Custom Guided Questions**: Add questions to scenario templates
- **Domain Knowledge Packs**: Extend `DomainKnowledge` maps
- **New AI Providers**: Implement in `aiService.go`

---

## Summary

The AI Project Board Generation system provides:

✅ **Multi-scenario support** (Course, Research, Product, Personal)
✅ **Guided question flow** for structured input
✅ **AI-powered task generation** with domain knowledge
✅ **Syllabus parsing** for course projects
✅ **Phase gates** for approval workflows
✅ **Optional integration** - users can skip AI
✅ **Multi-provider support** with automatic fallback
✅ **Clean architecture** with separation of concerns

### Quick Start

1. **Set up AI provider** (Groq recommended):
   ```bash
   export GROQ_API_KEY="your_key"
   ```

2. **Start backend**:
   ```bash
   cd backend && go run main.go
   ```

3. **Start frontend**:
   ```bash
   cd frontend && npm run dev
   ```

4. **Test the flow**:
   - Navigate to http://localhost:5173/create-project
   - Select any scenario
   - Try the AI assistant feature
   - Preview and create project

### Support

For issues or questions:
- Check troubleshooting section above
- Review backend logs for detailed errors
- Verify API keys and network connectivity
- Test with minimal input first

---

**Last Updated**: November 19, 2025
**Version**: 1.1
**Status**: ✅ Complete and Integrated
