/**
 * TypeScript interfaces for milestone management
 */

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Milestone {
  milestone_id: number;
  project_id: number;
  parent_id?: number;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  priority: number; // 0-4 (0=lowest, 4=highest)
  category?: string;
  completed: boolean;
  sort_order: number;
  section_id?: number; // Section assignment for organization
  section_order?: number; // Order within the section
  color?: string; // Custom color for milestone
  custom_attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMilestoneRequest {
  project_id: number;
  parent_id?: number;
  title: string;
  description?: string;
  due_date?: string;
  status?: MilestoneStatus;
  priority?: number;
  category?: string;
  sort_order?: number;
  section_id?: number;
  section_order?: number;
  custom_attributes?: Record<string, any>;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  due_date?: string;
  status?: MilestoneStatus;
  priority?: number;
  category?: string;
  completed?: boolean;
  sort_order?: number;
  section_id?: number;
  section_order?: number;
  custom_attributes?: Record<string, any>;
}

// Milestone configuration for UI display
export const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'Pending',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  },
  in_progress: {
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe'
  },
  completed: {
    label: 'Completed',
    color: '#10b981',
    bgColor: '#d1fae5'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    bgColor: '#fee2e2'
  }
};

export const MILESTONE_PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: 'Lowest', color: '#94a3b8' },
  1: { label: 'Low', color: '#64748b' },
  2: { label: 'Medium', color: '#8b5cf6' },
  3: { label: 'High', color: '#ea580c' },
  4: { label: 'Highest', color: '#dc2626' }
};
