/**
 * TypeScript types for version control system
 * Matches the backend API response models
 */

export interface Version {
  id: string;
  node_id: string;
  version_number: number;
  branch_name: string;
  full_version: string;
  parent_version_id: string | null;
  is_current: boolean;
  is_archived: boolean;

  // Content
  title: string;
  summary: string;
  content: string;
  tags: string[] | null;
  metadata: Record<string, any> | null;

  // Version metadata
  change_description: string | null;
  change_type: string | null;
  changed_fields: string[] | null;
  chat_session_id: string | null;

  // Audit
  created_by: number;
  created_at: string;
}

export interface Branch {
  id: string;
  node_id: string;
  branch_name: string;
  display_name: string | null;
  description: string | null;
  prompt: string | null;
  parent_version_id: string | null;
  chat_session_id: string | null;
  is_active: boolean;
  is_merged: boolean;
  merged_at: string | null;
  merged_by: number | null;
  version_count: number;
  created_by: number;
  created_at: string;
}

export interface VersionTreeNode {
  version: Version;
  children: string[];  // Version IDs
}

export interface VersionTree {
  branches: Record<string, Version[]>;  // branch_name -> versions
  tree: Record<string, VersionTreeNode>;  // full_version -> node with children
}

export interface VersionDiffStats {
  added: number;
  removed: number;
  similarity: number;
}

export interface VersionComparison {
  version_a: Version;
  version_b: Version;
  title_changed: boolean;
  summary_diff: VersionDiffStats;
  content_diff: VersionDiffStats;
  tags_changed: boolean;
}

export interface AdoptVersionResponse {
  new_version: Version;
  adopted_from: string;
  target_branch: string;
  archived_branches: string[];
}

export interface CreateVersionRequest {
  node_id: string;
  branch_name?: string;
  title: string;
  summary: string;
  content: string;
  change_description?: string;
  parent_version_id?: string;
  changed_fields?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateBranchRequest {
  node_id: string;
  branch_name: string;
  display_name: string;
  description?: string;
  prompt: string;
  parent_version_id?: string;
}

export interface MultiOptionRequest {
  node_id: string;
  chat_session_id: string;
  options: Array<{
    branch_name: string;
    display_name: string;
    title: string;
    summary: string;
    content: string;
    prompt?: string;
  }>;
}

export interface AdoptVersionRequest {
  node_id: string;
  version_id: string;
  target_branch?: string;
}

// UI State types
export interface VersionsUIState {
  selectedVersionId: string | null;
  comparisonMode: boolean;
  compareVersionIds: [string | null, string | null];
  showTimeline: boolean;
  showArchived: boolean;
}

// Constants
export const DEFAULT_BRANCH = 'main';

export enum ChangeType {
  MANUAL_EDIT = 'manual_edit',
  AI_REFINEMENT = 'ai_refinement',
  CHAT_CONCLUSION = 'chat_conclusion',
  BRANCH_CREATION = 'branch_creation',
  MERGE = 'merge',
}

export enum BranchStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  ARCHIVED = 'archived',
}
