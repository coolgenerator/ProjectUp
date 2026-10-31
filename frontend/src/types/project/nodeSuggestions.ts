/**
 * TypeScript interfaces for node suggestions
 */

export interface NodeSuggestion {
  id: string;
  title: string;
  description: string;
  template_type: string;
  rationale: string;
  priority: number; // 1=high, 2=medium, 3=low
}
