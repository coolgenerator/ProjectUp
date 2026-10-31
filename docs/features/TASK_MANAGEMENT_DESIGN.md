# Task Management System - Design Document

## Executive Summary

This document outlines the architecture for a dedicated Task Management system that separates execution-focused tasks from the planning-focused Idea Forest. The Task Management section will provide structured workflows for tracking progress on learning resources, project tasks, and actionable items while maintaining links back to their originating ideas.

---

## 1. System Overview

### Purpose

The Task Management system transforms ideas into executable work by:

- Converting Idea Forest nodes into trackable tasks
- Providing execution-focused views (Board, Timeline, List)
- Tracking granular progress metrics (learning resources, subtasks, time)
- Offering project management features (dependencies, assignments, deadlines)

### Core Principle: Planning vs Execution Separation

| **Idea Forest**            | **Task Management**                |
| -------------------------- | ---------------------------------- |
| Planning & Exploration     | Execution & Tracking               |
| What to do and why         | How to do it and when              |
| Flexible, creative         | Structured, measurable             |
| Tree/graph visualization   | Board/Timeline/List views          |
| Ideas, concepts, questions | Tasks, actions, learning resources |

---

## 2. Architecture

### 2.1 Navigation Structure

```
Project Dashboard
├── Overview
├── Idea Forest (Planning)
├── Task Management (Execution) ← NEW
│   ├── Board View
│   ├── Timeline View
│   └── List View
├── Milestones
└── Analytics
```

### 2.2 Data Flow

```
Idea Forest Node (Learn/Action)
         ↓
    [Convert to Task]
         ↓
  Task Management System
         ↓
    Track Progress
         ↓
Update Idea Forest Node Status
```

---

## 3. Data Models

### 3.1 Task Model

```typescript
interface Task {
  // Core identifiers
  id: string;
  project_id: number;
  created_by: string;

  // Task details
  title: string;
  description: string;
  task_type: 'learning' | 'action' | 'research' | 'development';

  // Status & Progress
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
  priority: 1 | 2 | 3 | 4 | 5; // P1 (highest) to P5 (lowest)
  progress: number; // 0-100%

  // Time tracking
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: Date;
  due_date?: Date;
  completed_at?: Date;

  // Relationships
  idea_node_id?: string; // Link back to Idea Forest
  milestone_id?: number;
  parent_task_id?: string; // For subtasks
  assigned_to?: string;
  dependencies?: string[]; // Task IDs that must complete first

  // Learning-specific fields
  learning_metadata?: {
    total_resources: number;
    completed_resources: number;
    resources: LearningResource[];
  };

  // Action-specific fields
  action_metadata?: {
    subtasks: Subtask[];
    checklist_items: ChecklistItem[];
  };

  // Metadata
  tags?: string[];
  attachments?: Attachment[];
  comments?: Comment[];
  created_at: Date;
  updated_at: Date;
}
```

### 3.2 Learning Resource Model

```typescript
interface LearningResource {
  id: string;
  task_id: string;

  // Resource details
  title: string;
  type: 'video' | 'article' | 'book' | 'course' | 'documentation' | 'practice';
  url?: string;
  description?: string;

  // Progress
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100%

  // Time
  estimated_time_minutes?: number;
  actual_time_minutes?: number;
  completed_at?: Date;

  // Notes
  notes?: string;
  key_takeaways?: string[];

  created_at: Date;
  updated_at: Date;
}
```

### 3.3 Subtask Model

```typescript
interface Subtask {
  id: string;
  parent_task_id: string;

  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  due_date?: Date;

  created_at: Date;
  updated_at: Date;
}
```

---

## 4. UI Components

### 4.1 Task Card Component

**TaskCard.tsx** - Reusable card for all views

```typescript
interface TaskCardProps {
  task: Task;
  view: 'board' | 'timeline' | 'list';
  onEdit: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  showDetails?: boolean;
}
```

**Features:**

- Color-coded by priority
- Type icon (learning 📚, action ⚡, etc.)
- Progress bar
- Quick actions (edit, delete, convert back to idea)
- Link to Idea Forest node
- Assignee avatar
- Due date indicator with urgency color

### 4.2 Task Detail Modal

**TaskDetailModal.tsx** - Full task editor

**Sections:**

1. **Basic Info**: Title, description, type, priority
2. **Status & Progress**: Status dropdown, progress slider
3. **Time Tracking**: Estimated/actual hours, start/due dates
4. **Learning Resources** (if task_type = 'learning'):
   - List of resources with progress
   - Add resource button
   - Total completion percentage
5. **Subtasks** (if task_type = 'action'):
   - Checklist of subtasks
   - Create subtask inline
6. **Dependencies**: Link to other tasks that must complete first
7. **Idea Link**: Button to view original Idea Forest node
8. **Comments**: Discussion thread
9. **Activity Log**: History of changes

### 4.3 Learning Resource Tracker

**LearningResourceList.tsx** - Dedicated component for learning tasks

**Features:**

- Add new resource (title, type, URL, estimated time)
- Mark resource as complete
- Track time spent on each resource
- Add notes and key takeaways
- Progress calculation: `(completed_resources / total_resources) * 100`
- Auto-sync progress with parent task

### 4.4 Create Task Modal

**CreateTaskModal.tsx** - Convert Idea to Task or create standalone

**Two modes:**

1. **From Idea Forest Node**:
   
   - Pre-populate from node data
   - Show link to original node
   - Inherit tags and metadata
   - Convert "learn" nodes to learning tasks with resource tracker

2. **Standalone Task**:
   
   - Start from scratch
   - Optional link to existing idea node
   - Quick create from board/list views

---

## 5. Views

### 5.1 Board View (Kanban)

**Layout:**

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   To Do     │ In Progress │   Review    │   Blocked   │    Done     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │             │             │             │
│ [Task Card] │ [Task Card] │ [Task Card] │ [Task Card] │ [Task Card] │
│             │             │             │             │             │
│ [Task Card] │ [Task Card] │             │             │ [Task Card] │
│             │             │             │             │             │
│ [+ New]     │             │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**Features:**

- Drag & drop between columns
- Filter by priority, assignee, type, milestone
- Group by milestone, assignee, or priority
- Quick add task in each column
- Card count and completion % per column

**Implementation:**

- Use `react-beautiful-dnd` or `@dnd-kit/core`
- Persist column states to backend

### 5.2 Timeline View (Gantt)

**Layout:**

```
Task Name          | Jan 1-7 | Jan 8-14 | Jan 15-21 | Jan 22-28 |
───────────────────┼─────────┼──────────┼───────────┼───────────┤
Setup Environment  │ ████████│          │           │           │
API Development    │         │ █████████│ ████      │           │
Frontend UI        │         │          │ ██████████│ ████      │
Testing & QA       │         │          │           │ █████████ │
```

**Features:**

- Visualize task duration and dependencies
- Color-coded by priority
- Drag to adjust start/end dates
- Show milestones as markers
- Critical path highlighting
- Today marker line

**Implementation:**

- Use `gantt-task-react` or custom canvas-based component
- Support zooming (day/week/month views)

### 5.3 List View (Table)

**Columns:**
| Title | Type | Status | Priority | Progress | Due Date | Assigned | Actions |
|-------|------|--------|----------|----------|----------|----------|---------|
| Learn React Hooks | 📚 | In Progress | P2 | 60% | Jan 15 | You | ⋮ |
| Build API | ⚡ | To Do | P1 | 0% | Jan 10 | Alex | ⋮ |

**Features:**

- Sortable columns
- Inline editing
- Bulk actions (status update, delete, assign)
- Filter and search
- Export to CSV
- Pagination or infinite scroll

**Implementation:**

- Use `@tanstack/react-table` for performance
- Virtual scrolling for 1000+ tasks

---

## 6. Integration with Idea Forest

### 6.1 Convert Idea to Task

**From Idea Forest Quick Actions:**

```typescript
// Add "Convert to Task" button in node context menu
const handleConvertToTask = (node: IdeaNode) => {
  const taskData = {
    title: node.title,
    description: node.description,
    task_type: mapNodeTypeToTaskType(node.node_type),
    priority: node.priority || 3,
    tags: node.tags,
    idea_node_id: node.id,

    // Learning-specific conversion
    ...(node.node_type === 'learn' && node.metadata?.learning_resources && {
      learning_metadata: {
        total_resources: node.metadata.learning_resources,
        completed_resources: node.metadata.completed_resources || 0,
        resources: [] // Will be added manually in Task Management
      }
    })
  };

  createTask(taskData);
};
```

**Mapping:**

- `learn` → `learning` task with resource tracker
- `action` → `action` task with subtask checklist
- `milestone` → Create multiple tasks under milestone
- `idea` → `research` or `action` task

### 6.2 Bi-directional Sync

**Idea Forest → Task Management:**

- Task inherits idea node metadata
- Link displayed in task detail
- Changes to idea title/description can update task (with confirmation)

**Task Management → Idea Forest:**

- Task progress updates node progress
- Task completion auto-updates node status to "completed"
- Show "View Tasks" button in Idea Forest node that filters Task Management view

### 6.3 Visual Indicators

**In Idea Forest:**

- Badge showing number of tasks linked to node
- Icon indicating if tasks exist
- Quick preview of task statuses (e.g., "3 tasks: 1 done, 2 in progress")

---

## 7. Backend API Endpoints

### 7.1 Task CRUD

```
POST   /api/projects/:projectId/tasks              - Create task
GET    /api/projects/:projectId/tasks              - List all tasks (with filters)
GET    /api/projects/:projectId/tasks/:taskId      - Get task details
PUT    /api/projects/:projectId/tasks/:taskId      - Update task
DELETE /api/projects/:projectId/tasks/:taskId      - Delete task
```

### 7.2 Learning Resources

```
POST   /api/tasks/:taskId/resources                - Add learning resource
GET    /api/tasks/:taskId/resources                - List resources
PUT    /api/tasks/:taskId/resources/:resourceId    - Update resource
DELETE /api/tasks/:taskId/resources/:resourceId    - Delete resource
POST   /api/tasks/:taskId/resources/:resourceId/complete - Mark complete
```

### 7.3 Subtasks

```
POST   /api/tasks/:taskId/subtasks                 - Create subtask
PUT    /api/tasks/:taskId/subtasks/:subtaskId      - Update subtask
DELETE /api/tasks/:taskId/subtasks/:subtaskId      - Delete subtask
```

### 7.4 Conversions

```
POST   /api/idea-nodes/:nodeId/convert-to-task     - Convert Idea to Task
POST   /api/tasks/:taskId/convert-to-idea          - Convert Task back to Idea
```

---

## 8. Database Schema

### 8.1 Tasks Table

```sql
CREATE TABLE tasks (
  id VARCHAR(255) PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idea_node_id VARCHAR(255) REFERENCES idea_nodes(id) ON DELETE SET NULL,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
  parent_task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'learning', 'action', 'research', 'development'

  status VARCHAR(50) NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'blocked', 'done'
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  start_date TIMESTAMP,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,

  assigned_to VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,

  learning_metadata JSONB,
  action_metadata JSONB,
  tags TEXT[],

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_tasks_project (project_id),
  INDEX idx_tasks_idea_node (idea_node_id),
  INDEX idx_tasks_milestone (milestone_id),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_assigned (assigned_to),
  INDEX idx_tasks_due_date (due_date)
);
```

### 8.2 Learning Resources Table

```sql
CREATE TABLE learning_resources (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'video', 'article', 'book', 'course', 'documentation', 'practice'
  url TEXT,
  description TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  estimated_time_minutes INTEGER,
  actual_time_minutes INTEGER,
  completed_at TIMESTAMP,

  notes TEXT,
  key_takeaways TEXT[],

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_resources_task (task_id),
  INDEX idx_resources_status (status)
);
```

### 8.3 Subtasks Table

```sql
CREATE TABLE subtasks (
  id VARCHAR(255) PRIMARY KEY,
  parent_task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'done'

  assigned_to VARCHAR(255),
  due_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_subtasks_parent (parent_task_id)
);
```

### 8.4 Task Dependencies Table

```sql
CREATE TABLE task_dependencies (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(task_id, depends_on_task_id),
  INDEX idx_dependencies_task (task_id),
  INDEX idx_dependencies_depends_on (depends_on_task_id)
);
```

---

## 9. Implementation Phases

### Phase 1: Core Task Management (Week 1-2)

**Backend:**

- [ ] Create database migrations for tasks, learning_resources, subtasks tables
- [ ] Implement Task CRUD API endpoints
- [ ] Add Learning Resources API endpoints
- [ ] Add Subtasks API endpoints

**Frontend:**

- [ ] Create Task Management navigation section
- [ ] Build TaskCard component
- [ ] Build CreateTaskModal component
- [ ] Build TaskDetailModal component
- [ ] Implement List View (basic table)

**Deliverable:** Users can create, view, edit, and delete tasks in a list view

### Phase 2: Learning Resource Tracking (Week 3)

**Backend:**

- [ ] Add progress calculation logic for learning tasks
- [ ] Implement auto-sync with parent task progress

**Frontend:**

- [ ] Build LearningResourceList component
- [ ] Add resource tracker to TaskDetailModal
- [ ] Implement progress calculation UI
- [ ] Add quick "Mark as Complete" actions

**Deliverable:** Learning tasks have fully functional resource tracking

### Phase 3: Board View & Advanced Features (Week 4)

**Backend:**

- [ ] Add bulk update endpoints
- [ ] Implement task dependency logic
- [ ] Add filtering and search endpoints

**Frontend:**

- [ ] Build Board View (Kanban) with drag & drop
- [ ] Add filters (priority, assignee, type)
- [ ] Implement grouping options
- [ ] Add bulk actions

**Deliverable:** Kanban board with full task management capabilities

### Phase 4: Idea Forest Integration (Week 5)

**Backend:**

- [ ] Add "Convert to Task" endpoint
- [ ] Implement bi-directional sync logic
- [ ] Add task count/status aggregation for Idea nodes

**Frontend:**

- [ ] Add "Convert to Task" button in Idea Forest
- [ ] Show task link badge in Idea nodes
- [ ] Implement "View Tasks" filter from Idea Forest
- [ ] Add task status indicators in Idea Forest

**Deliverable:** Seamless integration between Idea Forest and Task Management

### Phase 5: Timeline View & Polish (Week 6)

**Backend:**

- [ ] Add timeline-specific queries (date range filtering)
- [ ] Implement dependency chain calculation

**Frontend:**

- [ ] Build Timeline View (Gantt chart)
- [ ] Add date range picker
- [ ] Implement milestone markers
- [ ] Add critical path highlighting

**Deliverable:** Timeline view with Gantt chart visualization

---

## 10. Technical Considerations

### 10.1 Performance

**Optimization strategies:**

- Virtual scrolling for list view with 1000+ tasks
- Lazy load task details on demand
- Paginated API responses (default 50 tasks per page)
- Indexed database queries on common filters (status, assignee, due_date)
- WebSocket for real-time updates (optional)

### 10.2 State Management

**Redux slices:**

```typescript
// Frontend state structure
{
  tasks: {
    items: Task[];
    loading: boolean;
    error: string | null;
    filters: TaskFilters;
    selectedTaskId: string | null;
  },
  learningResources: {
    byTaskId: Record<string, LearningResource[]>;
  },
  subtasks: {
    byTaskId: Record<string, Subtask[]>;
  }
}
```

**Actions:**

- `fetchTasks()` - Load tasks for project
- `createTask()` - Create new task
- `updateTask()` - Update task fields
- `updateTaskStatus()` - Quick status update
- `deleteTask()` - Remove task
- `convertIdeaToTask()` - Convert Idea node to task

### 10.3 Real-time Updates (Future Enhancement)

**WebSocket events:**

- `task:created` - New task added
- `task:updated` - Task modified
- `task:deleted` - Task removed
- `task:status_changed` - Status update (for live board view)

---

## 11. User Flows

### 11.1 Create Learning Task from Idea

1. User creates "Learn React Hooks" node in Idea Forest
2. User clicks "Convert to Task" in node menu
3. Modal opens with pre-filled data from Idea node
4. User selects "Learning" task type
5. System auto-creates task with link to Idea node
6. User navigates to Task Management
7. User opens learning task and adds resources:
   - "Official React Docs - Hooks" (article)
   - "Hooks Tutorial" (video, 45 min)
   - "Build a Hooks App" (practice)
8. User marks first resource as complete
9. Task progress updates: 33% (1/3 completed)
10. Idea Forest node progress syncs to 33%

### 11.2 Manage Action Task with Subtasks

1. User creates "Build Authentication" action task
2. User adds subtasks:
   - Setup JWT library
   - Create login endpoint
   - Add password hashing
   - Write tests
3. User moves task to "In Progress" on board
4. User completes first two subtasks
5. Task progress auto-updates: 50% (2/4 completed)
6. User marks task as "Review"
7. Team member reviews and marks "Done"

---

## 12. Future Enhancements

### 12.1 Advanced Features

- **Time Tracking**: Start/stop timer per task
- **Recurring Tasks**: Auto-create tasks on schedule
- **Task Templates**: Reusable task structures
- **Pomodoro Integration**: Built-in focus timer
- **AI Suggestions**: Recommend subtasks or resources based on task title

### 12.2 Collaboration

- **Task Assignment**: Assign to team members
- **Comments & Mentions**: @mention users in task discussions
- **Activity Feed**: Show task updates in real-time
- **Notifications**: Email/push for task assignments and due dates

### 12.3 Analytics

- **Burndown Charts**: Track sprint/milestone progress
- **Velocity Metrics**: Measure team productivity
- **Time Reports**: Estimated vs. actual time analysis
- **Completion Rates**: Task completion trends over time

---

## 13. Success Metrics

**Key Performance Indicators:**

- Task completion rate (target: >80% of created tasks completed)
- Average task duration (compare estimated vs. actual)
- Learning resource completion (target: >90% for learning tasks)
- User engagement (daily active users viewing Task Management)
- Idea-to-Task conversion rate (target: >40% of learn/action nodes)

**User Feedback:**

- Ease of converting ideas to tasks (rating)
- Usefulness of learning resource tracker (rating)
- Board view usability (task completion speed)

---

## 14. Migration Strategy

### 14.1 Existing Data

**If users have learning nodes with metadata:**

1. Run migration script to auto-convert to tasks
2. Preserve metadata in learning_metadata field
3. Create placeholder resources based on resource count
4. Link back to original Idea node

**Migration script:**

```python
# scripts/migrate_learn_nodes_to_tasks.py
def migrate_learn_nodes():
    learn_nodes = get_nodes_with_type('learn')

    for node in learn_nodes:
        if node.metadata and node.metadata.get('learning_resources'):
            task = create_task({
                'title': node.title,
                'description': node.description,
                'task_type': 'learning',
                'idea_node_id': node.id,
                'progress': node.progress,
                'learning_metadata': {
                    'total_resources': node.metadata['learning_resources'],
                    'completed_resources': node.metadata.get('completed_resources', 0),
                    'resources': []
                }
            })

            print(f"✅ Migrated '{node.title}' to task {task.id}")
```

---

## 15. Glossary

- **Idea Forest**: Planning-focused tree visualization of project concepts
- **Task**: Execution-focused work item with tracking capabilities
- **Learning Task**: Task with resource tracker for educational content
- **Action Task**: Task with subtask checklist for project work
- **Subtask**: Smaller work item belonging to a parent task
- **Learning Resource**: Individual piece of educational content (video, article, etc.)
- **Milestone**: High-level project goal containing multiple tasks
- **Dependency**: Relationship where one task must complete before another starts

---

## Conclusion

This Task Management system bridges the gap between planning (Idea Forest) and execution by providing structured, trackable workflows for learning and action tasks. By separating these concerns, users can:

1. **Plan freely** in Idea Forest without execution constraints
2. **Execute systematically** in Task Management with progress tracking
3. **Maintain context** through bidirectional links between ideas and tasks

The phased implementation approach ensures incremental value delivery while building toward a comprehensive project management solution.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-19
**Status:** Ready for Implementation
**Next Steps:** Review with team → Approve → Begin Phase 1 Development
