/**
 * TypeScript interfaces for Tree Sessions (IdeaTree)
 * Tree Sessions are workspaces/collections for organizing related idea nodes
 */

export interface IdeaTree {
  id: string;
  project_sid: string;
  forest_id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  is_default: boolean;
  purpose?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  nodes_count: number;
  connections_count: number;
  completion_rate: number;
  ai_context?: any;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaTreeConnection {
  id: string;
  project_id: string;
  from_session_id: string;
  to_session_id: string;
  connection_type: 'builds_on' | 'relates_to' | 'alternative_to' | 'extends';
  label?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IdeaTreeSummary {
  sessions: IdeaTree[];
  connections: IdeaTreeConnection[];
  total_sessions: number;
  total_connections: number;
}
