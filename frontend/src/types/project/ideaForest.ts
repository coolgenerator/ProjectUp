/**
 * TypeScript interfaces for IdeaForest feature
 */

export interface IdeaNode {
  id: string;
  project_id: string;
  parent_id?: string;
  session_id?: string;
  title: string;
  summary?: string;  // Short 1-2 sentence summary (for cards/previews)
  description: string;  // Full detailed content
  position?: { x: number; y: number };
  is_root: boolean;
  color?: string;
  icon?: string;
  expanded: boolean;
  hidden?: boolean;  // Set to true to hide node in React Flow (used for collapsed children)
  status: string;
  progress: number;
  priority: number;
  due_date?: string;
  completed_at?: string;
  sub_ideas_count: number;
  actions_count: number;
  threads_count: number;
  completion_rate: number;
  ai_generated: boolean;
  ai_suggestions?: any;
  tags?: string[];
  metadata?: any;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface NodeConnection {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  connection_type: string;
  label?: string;
  is_active: boolean;
  style?: any;
  created_at: string;
  updated_at: string;
}

export interface IdeaThread {
  id: string;
  project_id: string;
  name: string;
  description: string;
  color?: string;
  is_active: boolean;
  memory?: any;
  context?: any;
  node_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}
