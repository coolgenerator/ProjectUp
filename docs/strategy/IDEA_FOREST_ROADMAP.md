# Idea Forest - Development Roadmap

## Vision: AI-Native Project Management with Dynamic Workflows

Transform project management by letting AI naturally guide users from conversation to action - no predefined categories, just intelligent suggestions based on chat context.

---

## Core Innovation

**Problem:** Traditional PM tools force users into rigid categories (epic/story/task) before they've thought things through. Users waste time categorizing instead of thinking.

**Solution:**

- **Generic Nodes**: All nodes start as blank canvases - no forced categorization
- **AI-Triggered Actions**: During conversation, AI suggests relevant actions:
  - "Want me to create a milestone for this?"
  - "Should I break this into tasks?"
  - "I can generate a learning plan - interested?"
  - "Let me extract action items from our chat"
- **Emergent Structure**: Project organization emerges naturally from AI suggestions, not forced upfront
- **Minimal Context**: Only refined conclusions stored, reducing tokens by 10x

---

## Paradigm Shift: From Categories to Conversations

### Old Approach (Rigid)

```
User: *Creates node*
System: "Choose type: Idea, Action, Learn, or Milestone?"
User: *Confused* "Uh... it's kind of both an idea AND an action?"
System: "Pick one."
Result: Cognitive load, forced decisions, incorrect categorization
```

### New Approach (AI-Driven)

```
User: *Creates node* "Implement user authentication"
AI: "I see you're planning authentication. Would you like me to:
     • Create a task breakdown?
     • List security considerations?
     • Generate a learning plan for OAuth?"
User: "Yes, task breakdown please"
AI: *Creates child tasks automatically*
Result: Natural flow, AI does the organizing
```

---

## AI-Triggered Actions (New Feature)

### Core Concept

During any chat conversation, AI analyzes context and offers relevant actions:

**Detection Patterns:**

```python
# AI analyzes user's message for intent signals

if mentions_deadline or contains_date:
    suggest("Create a milestone?")

if describes_complex_task or says_"breakdown":
    suggest("Break this into subtasks?")

if asks_"how_to" or "learn":
    suggest("Generate a learning plan/course?")

if lists_multiple_ideas:
    suggest("Extract these as separate nodes?")

if discusses_blockers:
    suggest("Mark dependencies or blockers?")

if concludes_discussion:
    suggest("Save this conclusion as a version?")
```

**UI Flow:**

```
User: "We need to build authentication with OAuth, JWT, and MFA by March 15"

AI Response: "Got it! I see a few things here:

     📅 Deadline detected: March 15
     ✅ Would you like to create a milestone?

     🔨 Complex implementation detected
     ✅ Should I break this into implementation tasks?

     📚 Technical topics mentioned
     ✅ Want a learning plan for OAuth/JWT best practices?

     [Yes to all] [Pick & choose] [No thanks]"

User: *Clicks "Yes to all"*

AI: *Creates:*
     - Milestone node "Auth Complete" (due: March 15)
     - 5 task nodes (OAuth setup, JWT implementation, MFA, Testing, Docs)
     - Learning plan with courses/papers on OAuth
     - All automatically linked with dependencies
```

---

## Development Phases

### 🔴 Phase 0: AI Action Triggers (NEW - HIGHEST PRIORITY)

**Goal:** Build the intelligent action suggestion system

#### Task 0.1: Intent Detection Engine

**Priority:** 🔴 P0 | **Effort:** High | **Impact:** Revolutionary

**Description:**
AI analyzes chat messages to detect user intent and suggest contextual actions.

**Implementation:**

```python
# /ai-service/services/intent_detector.py

class IntentDetector:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def detect_intents(
        self,
        message: str,
        conversation_history: List[str],
        node_context: Dict
    ) -> List[DetectedIntent]:
        """
        Analyze message for actionable intents using LLM.

        Returns suggested actions like:
        - CreateMilestone(date="2025-03-15", title="Auth Complete")
        - BreakdownIntoTasks(parent_description="...")
        - GenerateLearningPlan(topics=["OAuth", "JWT"])
        - ExtractActionItems(items=[...])
        """

        # Build prompt for intent detection
        prompt = f"""
        Analyze this user message and suggest relevant project management actions.

        Message: "{message}"
        Recent context: {conversation_history[-3:]}
        Current node: {node_context}

        Detect if the user:
        1. Mentioned a deadline/date → suggest milestone
        2. Described complex work → suggest task breakdown
        3. Asked "how to" or mentioned learning → suggest course/plan
        4. Listed multiple ideas → suggest extracting to nodes
        5. Mentioned blockers/waiting → suggest marking dependencies
        6. Concluded a discussion → suggest saving version

        Return JSON with detected intents and parameters.
        """

        response = await self.llm.complete(prompt, temperature=0.3)
        return self.parse_intents(response)

    def parse_intents(self, llm_response) -> List[DetectedIntent]:
        """Parse LLM response into structured actions"""
        # Returns: [
        #   DetectedIntent(
        #     type="create_milestone",
        #     confidence=0.92,
        #     parameters={"date": "2025-03-15", "title": "..."}
        #   ),
        #   ...
        # ]
```

**Action Types:**

```python
class ActionType(Enum):
    CREATE_MILESTONE = "create_milestone"
    BREAKDOWN_TASKS = "breakdown_tasks"
    GENERATE_LEARNING_PLAN = "generate_learning_plan"
    EXTRACT_ACTION_ITEMS = "extract_action_items"
    CREATE_DEPENDENCIES = "create_dependencies"
    SAVE_VERSION = "save_version"
    BRAINSTORM_IDEAS = "brainstorm_ideas"
    GENERATE_CHECKLIST = "generate_checklist"
    CREATE_DECISION_MATRIX = "create_decision_matrix"
```

**API Endpoints:**

```python
# Real-time intent detection during chat
POST /ai-api/chat/detect-intents
Request:
{
  "message": "We need auth by March 15",
  "node_id": "node_123",
  "conversation_history": ["...", "..."]
}

Response:
{
  "intents": [
    {
      "type": "create_milestone",
      "confidence": 0.95,
      "suggestion": "Create a milestone: 'Auth Complete' (Due: March 15)",
      "parameters": {
        "title": "Auth Complete",
        "due_date": "2025-03-15",
        "description": "User authentication system ready"
      },
      "preview": "🎯 Milestone: Auth Complete (Due Mar 15, 2025)"
    },
    {
      "type": "breakdown_tasks",
      "confidence": 0.88,
      "suggestion": "Break 'implement authentication' into subtasks?",
      "parameters": {
        "parent_title": "Implement Authentication",
        "suggested_tasks": [
          "Setup OAuth provider",
          "Implement JWT tokens",
          "Add MFA support",
          "Write tests",
          "Documentation"
        ]
      }
    }
  ],
  "message": "I detected 2 potential actions. Would you like me to proceed?"
}

# Execute suggested action
POST /ai-api/chat/execute-action
Request:
{
  "intent_id": "intent_abc123",
  "action_type": "create_milestone",
  "parameters": {...},
  "confirm": true
}

Response:
{
  "success": true,
  "created_nodes": [
    {
      "id": "milestone_xyz",
      "title": "Auth Complete",
      "type": "milestone",
      "due_date": "2025-03-15"
    }
  ],
  "message": "✅ Created milestone 'Auth Complete' (Due: March 15)"
}
```

**Acceptance Criteria:**

- [ ] Detects dates/deadlines with 90%+ accuracy
- [ ] Suggests task breakdown for complex descriptions
- [ ] Identifies learning opportunities
- [ ] Real-time suggestions (< 500ms latency)
- [ ] Non-intrusive UI (doesn't interrupt flow)

---

#### Task 0.2: Action Suggestion UI Component

**Priority:** 🔴 P0 | **Effort:** Medium | **Impact:** Critical

**Description:**
Elegant, non-intrusive UI for AI to suggest actions during chat.

**UI Design:**

```typescript
// Appears in chat stream, between messages
┌─────────────────────────────────────────────────────┐
│  💡 AI Suggestion                                   │
├─────────────────────────────────────────────────────┤
│  I noticed a few things in your message:            │
│                                                      │
│  📅 Deadline: March 15, 2025                        │
│  ☐ Create milestone "Auth Complete"?               │
│                                                      │
│  🔨 Complex task detected                           │
│  ☐ Break into 5 subtasks?                          │
│     • OAuth setup                                   │
│     • JWT implementation                            │
│     • MFA support                                   │
│     • Testing                                       │
│     • Documentation                                 │
│                                                      │
│  📚 Learning opportunity                            │
│  ☐ Generate OAuth/JWT learning plan?               │
│                                                      │
│  [✓ Create all] [Customize] [Dismiss]              │
└─────────────────────────────────────────────────────┘
```

**Component:**

```typescript
// /frontend/src/components/project/IdeaForest/ActionSuggestionCard.tsx

interface ActionSuggestion {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  confidence: number;
  parameters: any;
  preview: string;
}

interface ActionSuggestionCardProps {
  suggestions: ActionSuggestion[];
  onAccept: (suggestionIds: string[]) => void;
  onCustomize: (suggestion: ActionSuggestion) => void;
  onDismiss: () => void;
}

const ActionSuggestionCard: React.FC<ActionSuggestionCardProps> = ({
  suggestions, onAccept, onCustomize, onDismiss
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <div className="action-suggestion-card">
      <div className="header">
        <Sparkles className="icon" />
        <span>AI Suggestion</span>
        <Badge>{suggestions.length} actions</Badge>
      </div>

      <div className="suggestions">
        {suggestions.map(s => (
          <SuggestionItem
            key={s.id}
            suggestion={s}
            selected={selected.has(s.id)}
            onToggle={() => toggleSelection(s.id)}
          />
        ))}
      </div>

      <div className="actions">
        <Button onClick={() => onAccept(Array.from(selected))}>
          Create {selected.size} selected
        </Button>
        <Button variant="secondary" onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
};
```

**Features:**

- Checkbox selection (multi-select)
- Expandable previews
- "Customize" button opens modal
- Keyboard shortcuts (Enter = accept all, Esc = dismiss)
- Smooth animations (slide in from bottom)
- Auto-dismiss after 30s if ignored

**Acceptance Criteria:**

- [ ] Non-blocking (user can continue typing)
- [ ] Visually distinct from chat messages
- [ ] Checkboxes work for multi-select
- [ ] Preview shows what will be created
- [ ] Animations smooth (60fps)

---

#### Task 0.3: Action Executors

**Priority:** 🔴 P0 | **Effort:** High | **Impact:** Critical

**Description:**
Backend services that execute each type of suggested action.

**Implementation:**

```python
# /ai-service/services/action_executors/

class MilestoneExecutor:
    async def execute(self, parameters: Dict, context: Dict) -> ExecutionResult:
        """
        Create milestone node with deadline tracking.
        """
        node = await create_node(
            parent_id=context["current_node_id"],
            title=parameters["title"],
            metadata={
                "is_milestone": True,
                "due_date": parameters["due_date"],
                "auto_created": True,
                "created_from_chat": True
            }
        )

        # Set up deadline reminder
        await schedule_reminder(node.id, parameters["due_date"])

        return ExecutionResult(
            success=True,
            created_nodes=[node],
            message=f"✅ Created milestone '{node.title}'"
        )


class TaskBreakdownExecutor:
    async def execute(self, parameters: Dict, context: Dict) -> ExecutionResult:
        """
        Break complex task into subtasks using AI.
        """
        # Use LLM to generate detailed subtasks
        subtasks = await self.llm.generate_subtasks(
            parent_description=parameters["parent_description"],
            num_tasks=parameters.get("num_tasks", 5)
        )

        created_nodes = []
        for i, task in enumerate(subtasks):
            node = await create_node(
                parent_id=context["current_node_id"],
                title=task["title"],
                description=task["description"],
                metadata={
                    "estimated_hours": task.get("estimated_hours"),
                    "order": i,
                    "auto_created": True
                }
            )
            created_nodes.append(node)

        # Create dependencies (sequential by default)
        if parameters.get("sequential", False):
            for i in range(len(created_nodes) - 1):
                await create_dependency(
                    source=created_nodes[i+1].id,
                    target=created_nodes[i].id,
                    type="requires"
                )

        return ExecutionResult(
            success=True,
            created_nodes=created_nodes,
            message=f"✅ Created {len(created_nodes)} subtasks"
        )


class LearningPlanExecutor:
    async def execute(self, parameters: Dict, context: Dict) -> ExecutionResult:
        """
        Generate a structured learning plan/course.
        """
        topics = parameters["topics"]

        # Use LLM to create learning path
        learning_plan = await self.llm.generate_learning_plan(topics)

        # Create learning nodes
        plan_node = await create_node(
            parent_id=context["current_node_id"],
            title=f"Learning Plan: {', '.join(topics)}",
            metadata={
                "is_learning_plan": True,
                "topics": topics,
                "auto_created": True
            }
        )

        # Add learning resources
        for module in learning_plan["modules"]:
            module_node = await create_node(
                parent_id=plan_node.id,
                title=module["title"],
                description=module["description"],
                metadata={
                    "estimated_duration": module["duration"],
                    "resources": module["resources"]
                }
            )

        return ExecutionResult(
            success=True,
            created_nodes=[plan_node],
            message=f"✅ Created learning plan with {len(learning_plan['modules'])} modules"
        )


class ActionItemExtractor:
    async def execute(self, parameters: Dict, context: Dict) -> ExecutionResult:
        """
        Extract action items from conversation.
        """
        messages = parameters["messages"]

        # Use LLM to extract actionable items
        action_items = await self.llm.extract_action_items(messages)

        created_nodes = []
        for item in action_items:
            node = await create_node(
                parent_id=context["current_node_id"],
                title=item["action"],
                metadata={
                    "is_action_item": True,
                    "assignee": item.get("assignee"),
                    "priority": item.get("priority"),
                    "auto_created": True
                }
            )
            created_nodes.append(node)

        return ExecutionResult(
            success=True,
            created_nodes=created_nodes,
            message=f"✅ Extracted {len(action_items)} action items"
        )
```

**Acceptance Criteria:**

- [ ] All executor types implemented
- [ ] Creates nodes with proper metadata
- [ ] Sets up relationships (dependencies, parent-child)
- [ ] Returns helpful user messages
- [ ] Handles errors gracefully

---

### 🔴 Phase 1: Context Engineering Core (2-3 weeks)

**Goal:** Prove the "least context" architecture works

#### Task 1: Smart Context Selection Service

**Priority:** 🔴 P1 | **Effort:** High | **Impact:** Critical

*(Implementation details same as before - no changes needed)*

#### Task 2: Context Service Implementation

**Priority:** 🔴 P1 | **Effort:** High | **Impact:** Critical

*(No changes needed)*

#### Task 3: Node Dependencies Data Model

**Priority:** 🔴 P1 | **Effort:** Medium | **Impact:** Critical

**Updated:** Remove node type categorization, add metadata for AI-created nodes

**Database Schema:**

```sql
CREATE TABLE node_dependencies (
    id SERIAL PRIMARY KEY,
    source_node_id VARCHAR(50) NOT NULL,
    target_node_id VARCHAR(50) NOT NULL,
    dependency_type VARCHAR(20) NOT NULL,     -- 'blocks', 'requires', 'relates_to', 'implements'
    strength VARCHAR(20) DEFAULT 'important', -- 'critical', 'important', 'optional'
    description TEXT,
    auto_created BOOLEAN DEFAULT FALSE,       -- NEW: Track if AI created this
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- NEW: Track node metadata for AI-created content
ALTER TABLE nodes ADD COLUMN metadata JSONB;
-- metadata can contain:
-- {
--   "is_milestone": true,
--   "due_date": "2025-03-15",
--   "is_learning_plan": true,
--   "auto_created": true,
--   "created_from_chat": true,
--   "ai_suggestion_id": "suggestion_123"
-- }
```

**Acceptance Criteria:**

- [ ] Metadata field supports flexible attributes
- [ ] Auto-created flag tracks AI suggestions
- [ ] Existing schema remains compatible

---

### Remaining phases stay largely the same but update to remove node type references...

---

## Updated Success Metrics

### Phase 0 Success Criteria:

- [ ] AI suggests relevant actions 80%+ of the time
- [ ] Users accept suggestions 60%+ of the time
- [ ] Action execution succeeds 95%+ of the time
- [ ] Suggestion latency < 500ms
- [ ] Users report "feels natural" in 80%+ of tests

### Phase 1 Success Criteria:

- [ ] AI can generate accurate responses using only refined conclusions
- [ ] Context size reduced by 80% compared to full chat history
- [ ] Dependency graph renders for 100+ nodes
- [ ] Zero circular dependencies in production

---

## Technical Stack Updates

**New Additions:**

- Intent detection prompting framework
- LLM-based task breakdown
- Action executor pattern
- Real-time suggestion streaming

**AI/ML:**

- OpenAI GPT-4 for intent detection & action generation
- tiktoken for token management
- (Future) Fine-tuned model for intent classification

---

## Implementation Priority (UPDATED)

### Sprint 1: AI Action System (Week 1-2)

**Build the core differentiator first**

1. ✅ Intent Detection Engine (Task 0.1)
2. ✅ Action Suggestion UI (Task 0.2)
3. ✅ Milestone Executor (Task 0.3 - partial)
4. ✅ Task Breakdown Executor (Task 0.3 - partial)

**Goal:** Users can have natural conversations and AI creates structure

---

### Sprint 2: UX Essentials (Week 3-4)

**Make it discoverable**

5. ✅ Empty State Guidance (updated to show AI capabilities)
6. ✅ Template Gallery (showing AI-suggested workflows)
7. ✅ Interactive Tutorial (teaching AI suggestion system)

**Goal:** Users understand the AI-first workflow

---

### Sprint 3-4: Context Engineering (Week 5-6)

**Build the foundation**

8. ✅ Node Dependencies (Task 3-4)
9. ✅ Smart Context Selection (Task 1-2)
10. ✅ Dependency Graph UI (Task 5-6)

**Goal:** Prove "least context" works with AI-created structure

---

## Next Steps

1. **Prototype AI suggestion UI** - Build mockup to test with users
2. **Define intent patterns** - Create comprehensive list of detectable intents
3. **Build intent detector** - Start with Task 0.1
4. **User test the flow** - Show 5 users, get feedback
5. **Iterate based on feedback** - Refine suggestion patterns

---

**Last Updated:** January 20, 2025
**Status:** Ready for AI-First Implementation
**Version:** 2.0 (AI-Triggered Actions)
