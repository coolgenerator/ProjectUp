# IdeaTree Implementation - Comprehensive UX Analysis

## Executive Summary

IdeaTree is an AI-native project management system built on a conversation-first approach. Instead of forcing users to categorize tasks upfront, the system lets users chat with an AI assistant that suggests relevant actions (create milestones, break down tasks, generate learning plans) contextually. The current implementation is well-structured but faces some critical UX challenges around discoverability and user confusion about the AI-first workflow.

---

## 1. Architecture Overview

### Core Components Structure

```
IdeaForest (Main Container)
├── ForestCanvas (Tree Session Management)
│   ├── Multiple Tree Sessions
│   ├── Tree-to-Tree Connections
│   └── Drag/positioning support
│
└── IdeaTree (Single Tree View)
    ├── IdeaTreeFlowCanvas (React Flow visualization)
    │   ├── CustomForestNode (Visual nodes with icons/colors)
    │   ├── Connection edges
    │   └── Collapse/expand support
    │
    ├── IdeaTreeSidebar (Node Details Panel)
    │   ├── Details Tab
    │   │   ├── Summary (one-liner)
    │   │   ├── Description (full details)
    │   │   ├── Tags
    │   │   └── Quick Actions
    │   │       ├── Create Tasks
    │   │       ├── Create Course
    │   │       ├── Create Milestones
    │   │       └── Extract Resources
    │   │
    │   ├── Chat Tab
    │   │   ├── NodeChatPanel
    │   │   ├── ChatMessageList
    │   │   ├── ChatInput with mentions
    │   │   ├── Suggestion bubbles
    │   │   └── Attachment support
    │   │
    │   └── Versions Tab
    │       ├── ConversationBranchTree
    │       └── Branch selector
    │
    └── QuickNodeCreator (Modal)
        ├── Node templates
        ├── AI suggestions
        └── Title/description input
```

### Data Flow

1. **Node Creation**: User creates node → Optional template selection → Immediate display on canvas
2. **Chat Initiation**: Click node → Sidebar opens → Chat tab selected → Messages fetch
3. **Auto-Update**: First chat message → AI generates summary/description → Node auto-updated
4. **Task Extraction**: User clicks "Create Tasks" → API extracts from node content → Modal review → Create
5. **Version Management**: Chat messages create conversation branches → Versions tab shows tree

---

## 2. Current UX Implementation

### 2.1 First-Time User Experience

**Empty State Flow:**
1. User opens project → sees empty canvas
2. Help tooltip suggests: "Drag to pan, double-click to create, shift+click to connect"
3. User creates first node
4. Node appears in center with generic styling
5. No onboarding modal or welcome screen
6. User must click node to understand they can chat

**Issues:**
- No clear "aha moment" about AI capabilities
- Generic node creation doesn't explain purpose
- Chat icon/affordance not immediately obvious
- No guidance on conversation patterns

### 2.2 Node Lifecycle

**Step-by-Step User Journey:**

```
1. CREATE NODE
   → Double-click canvas OR click "Quick Create" button
   → QuickNodeCreator modal opens
   → User can:
     • Pick a template (Explore Idea, Learning Path, Action Plan, etc.)
     • Or just type a title directly
     • Or use AI prompts for content generation
   → Node appears on canvas with random position

2. ORGANIZE NODES
   → Drag nodes to position them
   → Tree structure emerges (parent-child relationships)
   → Collapsed parents hide children
   → Colors/icons purely visual (no functional meaning)

3. OPEN NODE & CHAT
   → Click node on canvas
   → Sidebar appears on right (resizable, ~420px default)
   → Details tab shows:
     • Title (clickable to edit)
     • Summary (auto-generated or manual)
     • Description (full markdown-supported content)
     • Tags
     • Quick action buttons
   → Chat tab shows conversation history

4. CHAT WITH AI
   → User sends message about node
   → AI responds with general advice
   → First message triggers auto-update:
     • Generates summary
     • Generates description
     • Extracts tags
     • Updates node metadata
   → Subsequent messages don't auto-update (to preserve manual edits)

5. CREATE DERIVED CONTENT
   → From Details tab, click:
     • "Create Tasks" → Extract from node content
     • "Create Milestones" → Extract from node content
     • "Create Course" → Use node title/description
     • "Extract Resources" → Extract from node content
   → Modal appears with AI-extracted content
   → User reviews/edits
   → Confirm to create
   → New tasks/milestones created in task system

6. MANAGE VERSIONS
   → Versions tab shows conversation branches
   → Each branch has messages
   → Can switch between branches
   → Switching updates the chat but NOT the node content
```

### 2.3 Multi-Tree Organization

**Tree Sessions (Forest Canvas)**

Users can create multiple "trees" (sessions) within a project:
- Each tree is independent node hierarchy
- Trees shown as cards on Forest Canvas
- Trees can be connected (relates_to, builds_on, extends, alternative_to)
- Visual: circular layout, draggable cards, SVG connections

**Why Multiple Trees?**
- Planning tree (goals, milestones)
- Development tree (tasks, technical details)
- Research tree (learning plans, research tasks)
- Each tree has own chat conversations

---

## 3. Key UX Strengths

### 3.1 Conversation-Driven Structure
- **Strength**: Users naturally describe projects in conversation
- **Implementation**: Chat tab is central, all AI interaction happens here
- **Evidence**: Node auto-updates from first chat message

### 3.2 Flexible Node Representation
- **Strength**: No forced categorization (unlike traditional PM tools)
- **Current**: All nodes are generic with optional metadata flags
- **Impact**: Users can freely create any type of node without thinking about category

### 3.3 Multi-Dimensional Organization
- **Strength**: Multiple trees + parent-child hierarchy + connections + chat versions
- **Implementation**: Forest canvas for trees, flow canvas for hierarchy, branch selector for versions
- **Flexibility**: Users can organize by theme, phase, or any dimension

### 3.4 AI-Assisted Content Extraction
- **Strength**: Quick creation of tasks/milestones from node content
- **Implementation**: Intent detection extracts actionable content
- **UI**: Modal review before creation prevents mistakes

### 3.5 Rich Editing Experience
- **Sidebar with 3 tabs**: Details (view/edit), Chat (conversation), Versions (branches)
- **Markdown support**: Full rich content editing
- **Inline editing**: Title, summary, tags all editable
- **Resizable sidebar**: User can customize panel width

---

## 4. Critical UX Problems

### 4.1 🔴 CRITICAL: No Clear "Aha Moment"

**Problem:**
Users land on empty canvas with no understanding of:
- Why they would chat with a blank node
- What AI does vs. what they do manually
- How nodes become tasks/milestones
- Why multiple trees exist

**Current State:**
- Empty state shows generic message: "Start by creating your first idea node"
- Help tooltip is buried in bottom-right corner
- No onboarding tour or welcome screen
- No example workflow

**Evidence from Code:**
```typescript
// IdeaTree.tsx, lines 860-878
{nodes.length === 0 ? (
  <div className="flex items-center justify-center h-full">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <h3 className="text-lg font-medium text-blue-900 mb-2">No nodes yet</h3>
      <p className="text-blue-700">Start by creating your first idea node</p>
      <button onClick={handleCreateFirstNode}>Create First Node</button>
    </div>
  </div>
)}
```

**Impact**: High bounce rate for users expecting traditional PM tool

**Solution Path** (from roadmap):
- Add interactive tutorial showing: Create node → Chat → AI suggests action → Accept → Structure created
- Multiple onboarding layers (welcome screen, templates, example project)
- Messaging emphasizing "AI does the organizing"

---

### 4.2 🔴 CRITICAL: Confusing First-Time Chat Experience

**Problem:**
User creates node, clicks chat, sends message. Then what?

**Current Behavior:**
1. First message auto-updates node (summary + description generated)
2. No confirmation shown (happens silently)
3. User doesn't see what changed or why
4. Metadata flags are invisible (chat_prompt_pending, last_ai_update)

**Code Evidence:**
```typescript
// NodeChatPanel.tsx, lines 167-269
const autoUpdateNodeWithMessage = async (messageContent: string) => {
  // Auto-update happens with first message
  // No UI feedback until success modal
  if (onNodeUpdate) {
    console.log('[NodeChatPanel] Calling onNodeUpdate to refresh tree...');
    await onNodeUpdate();
  }
  // Show success notification
  setSuccessData({ summary: newSummary, description: newDescription });
  setShowSuccessModal(true);
}
```

**Impact**: User confusion about where content comes from, feels like magic

**Solution**: 
- Show "AI is updating your node..." status while processing
- Display before/after comparison
- Show which fields changed (summary, description, tags)

---

### 4.3  🔴 CRITICAL: Task/Milestone Creation is Hidden

**Problem:**
Users may not discover that clicking "Create Tasks" extracts actionable content from node

**Current Location:**
- Details tab, bottom section
- Only visible when Details tab is open
- Not prominent/discoverable
- No affordance explaining what will happen

**Code Evidence:**
```typescript
// IdeaTreeSidebar.tsx, lines 796-856
<div className="bg-gradient-to-br from-purple-50 ...">
  <h3>Quick Actions</h3>
  <button onClick={handleExtractTasks}>Create Tasks</button>
  <button onClick={handleOpenCourseModal}>Create Course</button>
  ...
</div>
```

**Impact**: Users create manual tasks instead of AI-extracted ones

**Solution**:
- More prominent button in chat tab (after AI response)
- Proactive suggestion: "Want me to extract action items from our chat?"
- Show example of what will be created

---

### 4.4 🟡 HIGH: Confusing Multiple Trees Feature

**Problem:**
Users don't understand why/when to use multiple trees vs. hierarchy

**Current UX:**
- Forest Canvas (tree level) seems optional/hidden
- Sidebar has "Tree Sessions" list but doesn't explain purpose
- No guidance on "when to use multiple trees vs. a single tree"

**Code Evidence:**
```typescript
// IdeaForest.tsx, lines 14-31
interface IdeaForestProps {
  projectId: string;
}

// Users see:
// - Toggle button to collapse/expand sidebar (12px wide)
// - Tree Sessions list with + button implied but not visible
// - No explanation of tree organization strategy
```

**Impact**: Users either:
- Use single tree with flat structure (not ideal for large projects)
- Create multiple trees but don't understand organization

**Solution**:
- Add card showing "Suggested tree organization: Planning | Development | Research"
- Help text: "Use multiple trees to organize by phase or theme"
- Example: "This project has 3 trees..."

---

### 4.5 🟡 HIGH: Node Hierarchy Clarity

**Problem:**
Parent-child relationships are purely visual (position on canvas)

**Current UX:**
- Parent-child shown by position + optional connection line
- Collapsed parent hides children (hidden by position flag)
- No visual hierarchy indicator (tree structure not obvious)
- Sibling relationships not shown

**Code Evidence:**
```typescript
// IdeaTree.tsx, lines 301-349
const nodesWithVisibility = useMemo(() => {
  const collapsedParents = new Set<string>();
  nodes.forEach(node => {
    if (!node.expanded && nodeHasChildren(node.id)) {
      collapsedParents.add(node.id);
    }
  });
  // Nodes marked with hidden:true if parent is collapsed
});
```

**Impact**: Users might not realize they have hidden child nodes

**Solution**:
- Show child count on parent nodes: "3 child nodes"
- Visual indent or connecting lines
- Expand/collapse indicators

---

### 4.6 🟡 HIGH: Overwhelming Sidebar Options

**Problem:**
Sidebar has many features packed into 3 tabs

**Details Tab Contains:**
- Summary editing
- Description editing
- Tags management
- Quick Action buttons (4 types)
- Edit/Delete options menu

**Chat Tab Contains:**
- Message history
- Mention autocomplete (can mention 20+ nodes/papers/resources)
- File attachments
- Suggestion bubbles
- Copy code buttons

**Versions Tab Contains:**
- Conversation branch tree
- Branch selector
- Switch branch notifications

**Impact**: Tab switching feels necessary, feature discovery is hard

**Solution**:
- Prioritize Details view → Summary + Description only
- Move Quick Actions to floating menu or modal
- Consider separate panels vs tabs for chat/versions

---

### 4.7 🟡 HIGH: Unclear Mention System

**Problem:**
Chat supports @mentions of nodes, papers, resources, but it's not discoverable

**Code Evidence:**
```typescript
// NodeChatPanel.tsx, lines 153-164
const allMaterials = useMemo(() => {
  if (mentionableMaterials.length > 0) {
    return mentionableMaterials;
  }
  return allNodes.map(node => ({
    id: node.id,
    title: node.title,
    type: 'node',
  }));
}, [allNodes, mentionableMaterials]);

// MentionMenu.tsx provides autocomplete but:
// - User must type @
// - No visible affordance that mentions are possible
// - Type hints @mentions but doesn't explain
```

**Impact**: Users may not use mentions, losing context in conversations

**Solution**:
- Show "tip: type @ to mention other nodes" in input field
- Example in placeholder text: "Ask about @Node Name"
- Show available mentions as expandable list above input

---

### 4.8 🟡 MEDIUM: Conversation Branch Management

**Problem:**
Version/branch system is complex but hidden in single tab

**Current UX:**
- Each chat response can create new branch point
- Branching happens automatically when editing past messages
- Versions tab shows tree of branches
- Users can switch branches but current branch shows in URL only

**Code Evidence:**
```typescript
// NodeChatPanel.tsx, lines 80-93
const [conversationBranches, setConversationBranches] = useState<{
  [branchPointIndex: number]: {
    branches: Array<{
      id: string;
      name: string;
      versionNumber: string;
      messages: Message[];
    }>;
  };
}>({});
```

**Impact**: Users might lose track of conversation history, confused by branches

**Solution**:
- Show "Viewing Version 2.1" status in chat header
- Visual branch indicator in message list
- Better naming: "Version 2.1 - Alternative approach"

---

### 4.9 🟡 MEDIUM: Canvas Affordances

**Problem:**
How to interact with canvas is not obvious

**Current Help:**
```typescript
// IdeaTree.tsx, lines 922-935
<li>• <kbd>Scroll</kbd> - Move around canvas</li>
<li>• <kbd>Ctrl/Cmd + Scroll</kbd> - Zoom in/out</li>
<li>• <kbd>Double Click</kbd> - Create node</li>
<li>• <kbd>Alt + Drag</kbd> - Pan canvas</li>
<li>• <kbd>Middle Click + Drag</kbd> - Pan canvas</li>
```

**Issues:**
- No visual cues (cursor changes, hover states)
- Keyboard shortcuts buried in help panel
- Double-click feels like standard UI (might not work)
- Dragging nodes doesn't feel drag-friendly

**Solution**:
- Show cursor as crosshair on canvas (indicates clickable)
- Hover over blank area shows "Double-click to create"
- Node drag feels smooth (current: works but not obvious)

---

## 5. Information Architecture & Navigation

### 5.1 Three-Level Navigation

```
Level 1: Projects (global navigation)
├── Project Dashboard
│   └── Level 2: Idea Forest
│       ├── ForestCanvas (Tree Sessions)
│       │   └── Level 3: IdeaTree (Single Tree)
│       │       ├── IdeaTreeFlowCanvas (visual)
│       │       ├── IdeaTreeSidebar (detail panel)
│       │       └── NodeChatPanel (chat)
```

### 5.2 URL State Management

**Current Implementation:**
- Forest Canvas: `/projects/:id/ideaforest?view=canvas`
- Tree View: `/projects/:id/ideaforest?view=tree&sessionId=xyz`
- Node Selected: `...?nodeId=abc&tab=details`
- Chat Session: `...?nodeId=abc&tab=chat&chatSessionId=xyz`

**Issues:**
- Deeply nested URL parameters can get long
- Session state not preserved on refresh (partial restore)
- No breadcrumb navigation back

**Solution**:
- Add breadcrumbs: "Project > Tree Name > Node Title"
- Simplify URL structure with cleaner routing

---

## 6. Task/Milestone/Resource Relationships

### 6.1 Data Model Relationships

```
Project
├── Idea Tree (Session)
│   └── Node
│       ├── Chat Session
│       │   ├── Messages
│       │   └── Branches
│       └── Metadata
│           ├── summary (auto-generated)
│           ├── description (editable)
│           ├── tags (auto-tagged or manual)
│           ├── ai_suggestions (detected intents)
│           └── extracted_content
│               ├── Tasks (from "Create Tasks")
│               ├── Milestones (from "Create Milestones")
│               └── Resources (from "Extract Resources")
```

### 6.2 Extraction Flow

**Current Process:**
1. User clicks "Create Tasks" in Details tab
2. API calls: `POST /ai-api/intents/extract-tasks`
3. Backend receives:
   - node_id
   - node_content (title + description + conclusion)
   - chat_session_id (for context)
4. AI extracts action items
5. TaskReviewModal opens with extracted items
6. User edits/reviews
7. On submit, API creates tasks: `POST /ai-api/tasks/`

**Problems:**
- Users might not understand that tasks are extracted from node content
- No preview of what will be extracted
- No undo if extraction is bad

**Solution**:
- Show "Extracting tasks from: [node title]..." during processing
- Preview extraction results in modal
- Better error handling if extraction fails

---

## 7. Onboarding & Help System

### 7.1 Current Onboarding

**What exists:**
- Quick Tips button (bottom-right on canvas)
- Keyboard shortcuts in help panel
- No interactive tutorial
- No welcome screen

**What's missing:**
- First-time user detection
- Interactive walkthrough
- Example conversation
- Explanation of AI capabilities

### 7.2 Help System

**Current:**
- "Quick Tips" button shows keyboard shortcuts
- Help text in empty state suggests "Click and drag"
- Contextual tooltips in progress (useAITooltip hook referenced)

**Missing:**
- In-app help documentation
- Example workflows
- Video tutorials
- Chat-based help

---

## 8. Visual Design Issues

### 8.1 Node Appearance

**Current:**
- Nodes have optional color/icon
- Default: light background with title
- No visual hierarchy
- All nodes look same except for custom colors

**Issues:**
- Can't distinguish node types at a glance
- No visual feedback for node state (loading, error, etc.)
- Icons are purely cosmetic

### 8.2 Sidebar Styling

**Current:**
- Gradient background (slate to blue)
- Border on left (teal)
- Shadow effect (shadow-2xl)
- Tab-based navigation

**Issues:**
- Gradient may be distracting
- Border doesn't communicate resizable
- Too much visual weight

### 8.3 Connection Visualization

**Current:**
- CollapsibleEdge component connects nodes
- Shows connection type as label
- Can be dragged to create new connections

**Issues:**
- Connection types not obviously different (all same style)
- Parent-child relationships not distinct from connection edges
- Hard to follow paths in complex graphs

---

## 9. Key User Flows

### 9.1 "Create a Project Structure from Scratch"

```
START
  ↓
1. Create First Node
   "Build authentication system"
  ↓
2. Click Node → Details Tab
   (No immediate need to chat)
  ↓
3. Edit Title/Summary
  ↓
4. Add Tags
  ↓
5. Click Chat Tab (when ready)
  ↓
6. Send message: "Need this by March 15"
  ↓
7. AI auto-updates node (summary + description)
  ↓
8. Click "Create Tasks"
  ↓
9. TaskReviewModal shows extracted items
  ↓
10. Approve → Tasks created
  ↓
11. Back to canvas, create sibling node
  ↓
REPEAT for other components
```

**Pain Points:**
- Step 1: No guidance on structure (node name should be what?)
- Step 3: Unclear what summary vs description means
- Step 5: No affordance that chat is AI-powered
- Step 7: Silent auto-update confuses users
- Step 8: Hidden feature, not discoverable

### 9.2 "Use Multiple Trees for Organized Planning"

```
START
  ↓
1. Close IdeaTree view
  ↓
2. Return to ForestCanvas
  ↓
3. See existing trees as cards
  ↓
4. Click "+" to create new tree
  ↓
5. Name the tree: "Development"
  ↓
6. Double-click tree card to enter
  ↓
7. Empty tree, create nodes
  ↓
8. Back to ForestCanvas
  ↓
9. Shift+click on source tree, then target
  ↓
10. Create connection: "develops"
  ↓
DONE
```

**Pain Points:**
- Step 1: No clear "back" button
- Step 3: Unclear why multiple trees are needed
- Step 4: "+" button not obvious in sidebar
- Step 5: No guidance on naming convention
- Step 9: Shift+click is not discoverable

---

## 10. Comparison with Roadmap Vision

### 10.1 Roadmap Goals (AI-First Approach)

From `IDEA_FOREST_ROADMAP.md`:

**Promised:**
- "Talk through your project with AI, it creates structure for you"
- Intent detection: "Mentioned a deadline? Let me create a milestone"
- AI suggests actions proactively

**Current Reality:**
- Users can chat, but must click "Create Tasks" manually
- No proactive AI suggestions visible
- First message auto-updates node (good) but not explained
- "Quick Actions" buttons are there but not prominent

### 10.2 Gap Analysis

**What's Built:**
- ✅ Node creation + chat
- ✅ Auto-update from first message
- ✅ Task/milestone extraction
- ✅ Multiple trees
- ✅ Version management

**What's Missing:**
- ❌ Intent detection UI (no AI suggestions appear)
- ❌ Proactive "Create milestone?" suggestions
- ❌ "Extract action items?" prompts
- ❌ Onboarding tutorial
- ❌ Example project walkthrough
- ❌ Clear messaging about AI capabilities

**Implication:**
Current implementation has the backend capabilities, but frontend doesn't expose AI agency clearly. Users don't see the AI actively suggesting things – they have to discover features.

---

## 11. Recommendations Summary

### 11.1 High-Impact Changes (Quick Wins)

| Issue | Solution | Effort | Impact |
|-------|----------|--------|--------|
| No clear "aha" moment | Add welcome screen with 60-second demo | Medium | 🔴 Critical |
| Task creation hidden | Show "Create Tasks" suggestion after chat | Low | 🔴 Critical |
| Confusing auto-update | Show "Node updated" notification with changes | Low | 🔴 Critical |
| Multiple trees unclear | Add explainer card "Use trees to organize by..." | Low | 🟡 High |
| Canvas interaction unclear | Show cursor change + hover tooltips | Low | 🟡 High |
| Mention system hidden | Show @ tips in input placeholder | Low | 🟡 High |
| Tree hierarchy unclear | Show child count + expand indicators | Medium | 🟡 High |

### 11.2 Medium-Term Improvements

- Interactive onboarding tutorial (Joyride library)
- Action suggestion UI (highlight intent detection)
- Better empty state with templates
- Sidebar reorganization (less cramped)
- Conversation branch clarity

### 11.3 Long-Term Vision

- Full intent detection UI (aligned with roadmap)
- Example project template
- Video tutorials
- Help documentation site
- Advanced analytics (show time saved, nodes created, etc.)

---

## 12. Specific Component Recommendations

### 12.1 IdeaForest.tsx

**Current:**
- Good overall structure (canvas + sidebar)
- Navigation via view stack works well

**Recommendations:**
- Add breadcrumb navigation
- Show current tree name in header
- Add "Help" button linking to documentation
- Simplify navbar (too much scrolling)

### 12.2 IdeaTree.tsx

**Current:**
- Excellent keyboard shortcuts
- Good zoom/pan controls
- Proper fullscreen support

**Recommendations:**
- Add "Create Root Node" button more prominently
- Show node count in header
- Add statistics (nodes, connections)
- Better empty state messaging

### 12.3 IdeaTreeSidebar.tsx

**Current:**
- Three-tab design is good
- Lots of functionality per tab

**Recommendations:**
- Move Quick Actions to always-visible area
- Simplify Details tab (focus on content, not all options)
- Show "AI suggestion" badge when action extraction available
- Better visual separation between tabs

### 12.4 NodeChatPanel.tsx

**Current:**
- Good chat architecture (messages, branches, suggestions)
- Auto-update works well

**Recommendations:**
- Show "Updating node..." status while processing
- Display "What changed" notification
- Add "AI Suggestion" section showing intent detection results
- Show "Extract these as tasks?" prompt after bot messages
- Better mention autocomplete (show available options)

### 12.5 QuickNodeCreator.tsx

**Current:**
- Template system is well-built
- AI-powered suggestions available

**Recommendations:**
- Simplify template selection (show 3 most relevant)
- Add "Blank Node" option
- Show node type hints ("Action, Idea, Milestone, etc.")
- Better description of each template

---

## 13. Conclusion

IdeaTree has strong fundamentals:
- Well-architected component hierarchy
- Good separation of concerns
- Proper state management (Redux + local)
- Comprehensive features (chat, extraction, versions)

However, **the main UX challenge is discoverability**:
1. Users don't understand why/how to use it
2. AI capabilities are hidden behind manual button clicks
3. No clear "aha moment" on first interaction
4. Missing onboarding and help system

**The solution is not to build more features, but to make existing features discoverable** through:
- Interactive onboarding
- Proactive AI suggestions
- Better empty state guidance
- Clearer messaging about AI capabilities

This aligns perfectly with the roadmap vision of "AI-first" – the code supports it, but the UX hasn't caught up yet.
