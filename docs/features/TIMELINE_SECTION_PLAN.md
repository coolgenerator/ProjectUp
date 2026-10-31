# Timeline Section - Design Plan

## Overview

This document outlines the plan to extract Timeline as a standalone section in the Project Dashboard, separate from the Task Management section.

## Decision

**Extract Timeline as a standalone strategic overview section** that combines multiple time-based elements (milestones, tasks, project phases) into a unified visualization.

## Rationale

### Why Extract Timeline?

1. **Strategic vs Tactical Separation**
   - Timeline = Strategic project overview ("What's the roadmap? When is everything happening?")
   - Task Management = Tactical execution ("What do I work on today?")

2. **Richer Data Visualization**
   - Combine milestones + tasks in a single view
   - Show project phases and dependencies
   - Display resource allocation over time
   - Integrate meetings and deadlines

3. **Industry Standards**
   - Asana: Separate Timeline section alongside Board/List
   - ClickUp: Gantt Timeline distinct from task views
   - Monday.com: Dedicated Timeline for project overview

4. **Different User Intent**
   - Timeline users: Project managers, stakeholders viewing progress
   - Task Board users: Team members executing daily work

## Architecture

### Task Management (Tactical)

**Purpose**: Day-to-day task execution and management

**Views**:
- 📊 **Board View** - Kanban board for visual task flow (To Do, In Progress, Blocked, Done)
- 📋 **List View** - Table format for detailed task information

**Features**:
- Create/edit/delete tasks
- Update task status via drag-and-drop
- Filter by milestone
- Task details and comments
- Quick status changes

### Timeline (Strategic)

**Purpose**: High-level project roadmap and schedule visualization

**Views**:
- 📅 **Gantt Chart** - Horizontal timeline with bars for milestones and tasks
- 🗓️ **Calendar View** - Monthly/weekly calendar with all items
- 📊 **Resource Timeline** - Team member workload over time (future)

**Data Sources**:
1. **Milestones** - Major project phases with start/end dates
2. **Tasks** - Individual tasks with due dates and dependencies
3. **Project Metadata** - Project start date and deadline from Overview
4. **Meetings** - Scheduled meetings from Meetings section
5. **Resources** - Team availability and allocation (future)

## Timeline Section Features

### Core Features (MVP)

1. **Combined Milestone + Task Visualization**
   - Display milestones as major bars/blocks
   - Show tasks grouped under their parent milestones
   - Color-coding by status (planned, in-progress, completed, overdue)

2. **Time Scale Controls**
   - Switch between Day, Week, Month, Quarter views
   - Zoom in/out functionality
   - Pan across timeline

3. **Today Marker**
   - Clear indicator of current date
   - Auto-scroll to current week/month

4. **Progress Indicators**
   - Milestone completion percentage
   - Overall project progress
   - Visual indicators for items behind schedule

5. **Basic Filtering**
   - Filter by milestone
   - Filter by assignee
   - Show/hide completed items

### Advanced Features (Future)

1. **Dependencies**
   - Visual lines connecting dependent tasks
   - Critical path highlighting
   - Dependency validation

2. **Resource Allocation**
   - Team member workload bars
   - Capacity planning
   - Over-allocation warnings

3. **Drag-and-Drop Rescheduling**
   - Move tasks/milestones by dragging
   - Automatic dependency updates
   - Bulk rescheduling

4. **Baseline Comparison**
   - Original plan vs actual timeline
   - Variance analysis
   - Schedule slip indicators

5. **Export Capabilities**
   - Export as PNG/PDF
   - Share timeline view link
   - Print-friendly format

## Updated Dashboard Structure

The Project Dashboard will have the following sections:

| Order | Section | Icon | Purpose |
|-------|---------|------|---------|
| 1 | Overview | 🏠 | Project details and metadata |
| 2 | Idea Forest | 🌳 | AI-powered idea exploration |
| 3 | **Timeline** | 📅 | **Strategic roadmap (milestones + tasks)** |
| 4 | Milestones | 🎯 | Detailed milestone management |
| 5 | Tasks | ✅ | Tactical task board (Board/List views) |
| 6 | Plans | 📋 | Project plans and documentation |
| 7 | Resources | 📁 | Links and file resources |
| 8 | Workspaces | 💻 | Embedded tools and integrations |
| 9 | Meetings | 📆 | Meeting scheduling and coordination |
| 10 | Members | 👥 | Team member management |
| 11 | Settings | ⚙️ | Project settings and permissions |

## User Workflows

### Scenario 1: Project Manager Reviews Progress

1. Navigate to **Timeline** section
2. View combined milestones + tasks in Gantt chart
3. Identify items behind schedule (red indicators)
4. Check resource allocation for bottlenecks
5. Adjust schedules or reassign tasks

### Scenario 2: Team Member Plans Week

1. Navigate to **Tasks** section
2. Use Board view to see current task status
3. Move tasks through workflow (drag to In Progress)
4. Add comments and update task details

### Scenario 3: Stakeholder Review Meeting

1. Navigate to **Timeline** section
2. Switch to Month view for high-level overview
3. Present milestone progress to stakeholders
4. Discuss upcoming deadlines and dependencies

## Implementation Phases

### Phase 1: Basic Gantt Timeline (MVP)

**Goals**:
- Display milestones as horizontal bars with dates
- Display tasks grouped under milestones
- Time scale controls (day/week/month)
- Today marker
- Basic filtering

**Timeline**: 2-3 weeks

**Components**:
- `TimelineView.tsx` - Main timeline container
- `GanttChart.tsx` - Gantt visualization component
- `TimelineControls.tsx` - View controls and filters
- `TimelineItem.tsx` - Individual milestone/task bar

**APIs Needed**:
- GET `/api/timeline/project/:projectId` - Combined milestones + tasks with dates
- Reuse existing milestone and task APIs

### Phase 2: Enhanced Interactions

**Goals**:
- Click items to view details
- Tooltip on hover with quick info
- Filter by assignee, status, date range
- Export timeline as image

**Timeline**: 1-2 weeks

### Phase 3: Dependencies & Critical Path

**Goals**:
- Display task dependencies as connecting lines
- Highlight critical path
- Dependency validation warnings

**Timeline**: 2-3 weeks

### Phase 4: Resource Management

**Goals**:
- Resource allocation timeline
- Team workload visualization
- Capacity planning
- Over-allocation warnings

**Timeline**: 3-4 weeks

## Technical Considerations

### Frontend

**Libraries to Consider**:
- **react-gantt-chart** - Pre-built Gantt component
- **frappe-gantt** - Lightweight Gantt library
- **dhtmlx-gantt** - Full-featured (commercial)
- **Custom D3.js** - Maximum flexibility, more work

**Recommendation**: Start with **frappe-gantt** for MVP (open-source, lightweight), migrate to custom solution if needed.

### Backend

**New Endpoints**:
```
GET  /api/timeline/project/:projectId
     - Returns combined data: milestones, tasks, project dates
     - Includes: id, title, start_date, end_date, type (milestone/task),
                status, assignee, dependencies

GET  /api/timeline/project/:projectId/dependencies
     - Returns task dependency relationships

POST /api/tasks/:taskId/dependencies
     - Create task dependency

DELETE /api/tasks/:taskId/dependencies/:dependencyId
     - Remove task dependency
```

### Data Model Updates

**Add to Task model**:
```go
type Task struct {
    // ... existing fields
    StartDate    *time.Time `json:"start_date,omitempty"`
    EndDate      *time.Time `json:"end_date,omitempty"`  // Currently using DueDate
    Dependencies []string   `json:"dependencies,omitempty"` // Array of task IDs
}
```

**Add Dependency model**:
```go
type TaskDependency struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    ProjectID       string    `json:"project_id"`
    PredecessorID   string    `json:"predecessor_id"` // Task that must finish first
    SuccessorID     string    `json:"successor_id"`   // Task that depends on predecessor
    DependencyType  string    `json:"dependency_type"` // "finish_to_start", "start_to_start", etc.
    CreatedAt       time.Time `json:"created_at"`
}
```

## Design Mockup Description

### Timeline Header
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Timeline                                    [Month ▼] [⚙]│
│                                                              │
│ Filters: [All Milestones ▼] [All Assignees ▼] [⬜ Completed]│
└─────────────────────────────────────────────────────────────┘
```

### Gantt Chart Area
```
┌─────────────────────────────────────────────────────────────┐
│         │ Jan 1 │ Jan 8 │ Jan 15 │ Jan 22 │ Jan 29 │ Feb 5  │
│         │───────┼───────┼────────┼────────┼────────┼────────│
│ Phase 1 │████████████████████░░░░│        │        │        │ 75%
│  └Task1 │  ████████░░│        │        │        │        │ 80%
│  └Task2 │        │████████████│        │        │        │ 50%
│         │       │        │   ↓   │        │        │        │ ← Today
│ Phase 2 │        │        │░░░░░░░░░░░░░░░│        │        │ 20%
│  └Task3 │        │        │████░░░│        │        │        │ 40%
└─────────────────────────────────────────────────────────────┘

Legend: ████ Completed | ░░░░ In Progress/Planned | ──── Dependencies
```

## Success Metrics

### Adoption
- 70%+ of project managers use Timeline view within first month
- Average 2+ Timeline views per project per week

### Effectiveness
- Reduced time to identify schedule conflicts (measure via user survey)
- Improved on-time milestone completion rate
- Increased visibility into project status (stakeholder feedback)

### Engagement
- Average time spent in Timeline view: 3-5 minutes per session
- Timeline view accessed before 60% of project update meetings

## Next Steps

1. **Gather Requirements** - Survey users about timeline needs (1 week)
2. **Design UI/UX** - Create detailed mockups and prototypes (1 week)
3. **Technical Spike** - Evaluate Gantt libraries and approaches (3 days)
4. **Backend Development** - Create timeline API endpoints (1 week)
5. **Frontend Development** - Build Timeline component (2 weeks)
6. **Testing & Refinement** - User testing and bug fixes (1 week)
7. **Launch** - Roll out to users with documentation (2 days)

**Total Estimated Time for MVP**: 6-7 weeks

## Open Questions

1. Should Timeline be available for all users or only project admins/editors?
2. Do we need real-time updates when milestones/tasks change?
3. Should we support multiple project timelines in a portfolio view?
4. What's the maximum project duration we need to support (1 year? 5 years?)?
5. Do we need to support recurring tasks/milestones in timeline?

## References

- [Asana Timeline Documentation](https://asana.com/guide/help/premium/timeline)
- [frappe-gantt GitHub](https://github.com/frappe/gantt)
- [Gantt Chart Best Practices](https://www.projectmanager.com/guides/gantt-chart)
- TASK_MANAGEMENT_DESIGN.md (internal docs)
- IMMEDIATE_IMPLEMENTATION_PRIORITIES.md (internal docs)
