export interface IdeaForest {
  id: string;
  project_sid: string;  // Short string ID (VARCHAR 10)
  name: string;
  description?: string;
  trees_count: number;
  total_nodes_count: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaTree {
  id: string;
  forest_id: string;
  project_sid: string;  // Short string ID (VARCHAR 10)
  name: string;
  description: string;
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
  project_sid: string;  // Short string ID (VARCHAR 10)
  from_tree_id: string;
  to_tree_id: string;
  from_node_id?: string;
  to_node_id?: string;
  connection_type: string; // 'builds_on', 'relates_to', 'alternative_to', 'extends'
  label?: string;
  description?: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  from_tree?: IdeaTree;
  to_tree?: IdeaTree;
}

export interface IdeaTreeSummary {
  sessions: IdeaTree[];  // Keep 'sessions' key for backward compatibility
  connections: IdeaTreeConnection[];
  total_sessions: number;
  total_connections: number;
}
