/**
 * Task Management Types
 *
 * TypeScript interfaces for tasks, resources, and subtasks.
 * Flexible, general-purpose task system with user-defined categorization via tags.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export type ResourceType = 'video' | 'article' | 'book' | 'course' | 'documentation' | 'practice' | 'other';
export type ResourceStatus = 'not_started' | 'in_progress' | 'completed';

export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  project_id: number;
  idea_node_id?: string;
  milestone_id?: number;
  section_id?: number;
  section_order?: number;
  parent_task_id?: string;

  title: string;
  description?: string;
  task_type?: string; // Optional, flexible field - can be any user-defined value

  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100

  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  due_date?: string;
  completed_at?: string;

  assigned_to?: string[]; // Array of usernames
  created_by: string;

  tags?: string[]; // Primary way to categorize tasks

  created_at: string;
  updated_at: string;

  // Optional includes - can be used for any task regardless of type
  learning_resources?: LearningResource[];
  subtasks?: Subtask[];

  // AI-generated execution guidance
  guidance?: {
    overview?: string;
    quick_start?: string[];
    prerequisites?: {
      skills?: string[];
      tools?: string[];
      dependencies?: string[];
    };
    resources?: Array<{
      title: string;
      url: string;
      type: 'documentation' | 'tutorial' | 'video' | 'article';
    }>;
    common_pitfalls?: Array<{
      issue: string;
      solution: string;
    }>;
    success_criteria?: string[];
    estimated_time?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
  };

  // Flexible metadata for any custom fields
  metadata?: Record<string, any>;
}

export interface LearningResource {
  id: string;
  task_id: string;

  title: string;
  type: ResourceType;
  url?: string;
  description?: string;

  status: ResourceStatus;
  progress: number; // 0-100

  estimated_time_minutes?: number;
  actual_time_minutes?: number;
  completed_at?: string;

  notes?: string;
  key_takeaways?: string[];

  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  parent_task_id: string;

  title: string;
  description?: string;
  status: SubtaskStatus;

  assigned_to?: string[]; // Array of usernames
  due_date?: string;

  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export interface Section {
  id: number;
  project_id: string;
  name: string;
  order: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  blocked: number;
  completion_rate: number;
}

// API Request types
export interface CreateTaskRequest {
  project_id: string;
  title: string;
  description?: string;
  task_type?: string; // Optional, flexible field
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  idea_node_id?: string;
  milestone_id?: number;
  section_id?: number;
  parent_task_id?: string;
  estimated_hours?: number;
  start_date?: string;
  due_date?: string;
  assigned_to?: string[]; // Array of usernames
  created_by: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  task_type?: string; // Optional, flexible field
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  assigned_to?: string[]; // Array of usernames
  tags?: string[];
  metadata?: Record<string, any>;
  idea_node_id?: string;
  milestone_id?: number;
  section_id?: number;
  section_order?: number;
}

export interface CreateLearningResourceRequest {
  title: string;
  type: ResourceType;
  url?: string;
  description?: string;
  estimated_time_minutes?: number;
  status?: ResourceStatus;
}

export interface UpdateLearningResourceRequest {
  title?: string;
  type?: ResourceType;
  url?: string;
  description?: string;
  status?: ResourceStatus;
  progress?: number;
  estimated_time_minutes?: number;
  actual_time_minutes?: number;
  notes?: string;
  key_takeaways?: string[];
}

export interface CreateSubtaskRequest {
  title: string;
  description?: string;
  assigned_to?: string[]; // Array of usernames
  due_date?: string;
  status?: SubtaskStatus;
}

export interface UpdateSubtaskRequest {
  title?: string;
  description?: string;
  status?: SubtaskStatus;
  assigned_to?: string[]; // Array of usernames
  due_date?: string;
}

export interface ConvertIdeaToTaskRequest {
  idea_node_id: string;
  project_id: number;
  created_by: string;
  title: string;
  description?: string;
  tags?: string[];
  metadata?: any;
}

export interface CreateSectionRequest {
  project_id: string;
  name: string;
  color?: string;
}

export interface UpdateSectionRequest {
  name?: string;
  order?: number;
  color?: string;
}

export interface ReorderSectionsRequest {
  section_orders: Record<number, number>; // { sectionId: newOrder }
}

// Filter types
export interface TaskFilters {
  status?: TaskStatus;
  task_type?: string; // Flexible field
  assigned_to?: string; // Filter by single username
  priority?: TaskPriority;
  milestone_id?: number;
  section_id?: number;
  tags?: string[];
}

// View modes
export type TaskViewMode = 'list' | 'board' | 'timeline' | 'graph';

// Constants
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo: {
    label: 'To Do',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  },
  in_progress: {
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe'
  },
  review: {
    label: 'Review',
    color: '#f59e0b',
    bgColor: '#fef3c7'
  },
  blocked: {
    label: 'Blocked',
    color: '#ef4444',
    bgColor: '#fee2e2'
  },
  done: {
    label: 'Done',
    color: '#10b981',
    bgColor: '#d1fae5'
  }
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  1: { label: 'P1 - Urgent', color: '#dc2626' },      // Bright red - very urgent
  2: { label: 'P2 - High', color: '#ea580c' },        // Bright orange - high priority
  3: { label: 'P3 - Medium', color: '#8b5cf6' },      // Purple - medium priority, more vibrant
  4: { label: 'P4 - Low', color: '#64748b' },         // Slate gray - low priority
  5: { label: 'P5 - Backlog', color: '#94a3b8' }      // Light slate - backlog
};

export const RESOURCE_TYPE_CONFIG: Record<ResourceType, { icon: string; label: string }> = {
  video: { icon: '🎥', label: 'Video' },
  article: { icon: '📄', label: 'Article' },
  book: { icon: '📖', label: 'Book' },
  course: { icon: '🎓', label: 'Course' },
  documentation: { icon: '📚', label: 'Documentation' },
  practice: { icon: '💪', label: 'Practice' },
  other: { icon: '📎', label: 'Other' }
};
