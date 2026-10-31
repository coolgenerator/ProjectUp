/**
 * TypeScript interfaces for chat suggestions
 */

export type SuggestionType =
  | 'question'
  | 'action'
  | 'create_node'
  | 'create_child_node'
  | 'add_resource'
  | 'connect_nodes'
  | 'extract_tasks';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  text: string;
  description?: string;
  data?: any;
  executed?: boolean;  // Track if action was executed
  executionResult?: {  // Store results of execution
    createdItems?: Array<{
      type: 'task' | 'milestone' | 'plan' | 'node';
      id: string;
      title: string;
    }>;
    timestamp?: string;
  };
}
