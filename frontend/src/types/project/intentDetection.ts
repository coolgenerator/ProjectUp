/**
 * TypeScript interfaces for intent detection and action suggestions
 */

export type ActionType =
  | 'create_milestone'
  | 'breakdown_task'
  | 'generate_learning_plan'
  | 'extract_action_items'
  | 'create_dependency'
  | 'brainstorm_ideas'
  | 'save_version'
  | 'schedule_reminder'
  | 'extract_tasks'
  | 'create_milestones'
  | 'extract_resources';

export interface DetectedIntent {
  id: string;
  type: ActionType;
  confidence: number;
  title: string;
  description: string;
  parameters: Record<string, any>;
  preview: string;
  reasoning?: string;
  priority: number; // 1=high, 2=medium, 3=low
}
