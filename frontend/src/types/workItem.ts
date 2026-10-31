/**
 * Unified Work Item Type
 *
 * Represents both Tasks and Milestones in a single unified view (Asana-style)
 */

import { Task, TaskStatus } from './task';
import { Milestone, MilestoneStatus } from './project/milestone';

export type WorkItemType = 'task' | 'milestone';

// Unified work item that can be either a task or milestone
export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: TaskStatus | MilestoneStatus;
  priority: number;
  progress?: number;
  due_date?: string;
  section_id?: number;
  section_order?: number;
  milestone_id?: number;
  assigned_to?: string[]; // Array of usernames to match Task type
  created_at: string;
  updated_at: string;

  // Original data for reference
  originalTask?: Task;
  originalMilestone?: Milestone;
}

/**
 * Convert a Task to a WorkItem
 */
export function taskToWorkItem(task: Task): WorkItem {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    due_date: task.due_date,
    section_id: task.section_id,
    section_order: task.section_order,
    milestone_id: task.milestone_id,
    assigned_to: task.assigned_to,
    created_at: task.created_at,
    updated_at: task.updated_at,
    originalTask: task,
  };
}

/**
 * Convert a Milestone to a WorkItem
 */
export function milestoneToWorkItem(milestone: Milestone): WorkItem {
  // Map milestone status to task status
  const statusMap: Record<MilestoneStatus, TaskStatus> = {
    'pending': 'todo',
    'in_progress': 'in_progress',
    'completed': 'done',
    'cancelled': 'blocked',
  };

  return {
    id: `milestone-${milestone.milestone_id}`,
    type: 'milestone',
    title: milestone.title,
    description: milestone.description,
    status: statusMap[milestone.status],
    priority: milestone.priority + 1, // Convert 0-4 to 1-5
    progress: milestone.completed ? 100 : 0,
    due_date: milestone.due_date,
    section_id: milestone.section_id, // CRITICAL: Include section_id
    section_order: milestone.section_order, // Also include section_order for proper sorting
    created_at: milestone.created_at,
    updated_at: milestone.updated_at,
    originalMilestone: milestone,
  };
}

/**
 * Combine tasks and milestones into a unified list
 * Does NOT sort - preserves the order from parent component to respect user's sort selection
 */
export function combineWorkItems(tasks: Task[], milestones: Milestone[]): WorkItem[] {
  const taskItems = tasks.map(taskToWorkItem);
  const milestoneItems = milestones.map(milestoneToWorkItem);

  // Just combine, don't sort - the tasks are already sorted by the parent component
  return [...milestoneItems, ...taskItems];
}
