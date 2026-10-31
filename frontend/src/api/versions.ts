/**
 * API client for version control operations
 * Connects to AI service version endpoints
 */

import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';
import type {
  Version,
  Branch,
  VersionTree,
  VersionComparison,
  AdoptVersionResponse,
  CreateVersionRequest,
  CreateBranchRequest,
  MultiOptionRequest,
  AdoptVersionRequest,
} from '../types/versions';

const AI_API_BASE = config.AI_AGENT_URL;

export const versionsAPI = {
  /**
   * Get current version of a node in a specific branch
   */
  getCurrentVersion: async (
    nodeId: string,
    branch: string = 'main'
  ): Promise<Version> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/node/${nodeId}/current?branch=${branch}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch current version');
    }
    return response.json();
  },

  /**
   * Get complete version tree for a node
   */
  getVersionTree: async (nodeId: string): Promise<VersionTree> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/node/${nodeId}/tree`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch version tree');
    }
    return response.json();
  },

  /**
   * Get all branches for a node
   */
  getBranches: async (
    nodeId: string,
    activeOnly: boolean = true
  ): Promise<{ branches: Branch[]; total: number }> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/node/${nodeId}/branches?active_only=${activeOnly}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }
    return response.json();
  },

  /**
   * Get versions for a node
   */
  getVersions: async (
    nodeId: string,
    branch?: string,
    limit: number = 50
  ): Promise<{ versions: Version[]; total: number; current_version: Version | null }> => {
    let url = `${AI_API_BASE}/ai-api/versions/node/${nodeId}/versions?limit=${limit}`;
    if (branch) {
      url += `&branch=${branch}`;
    }
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error('Failed to fetch versions');
    }
    return response.json();
  },

  /**
   * Get a specific version by ID
   */
  getVersionById: async (versionId: string): Promise<Version> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/version/${versionId}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch version');
    }
    return response.json();
  },

  /**
   * Create a new version in a branch
   */
  createVersion: async (
    request: CreateVersionRequest,
    userId: number
  ): Promise<Version> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/create?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create version');
    }
    return response.json();
  },

  /**
   * Create a new exploration branch
   */
  createBranch: async (
    request: CreateBranchRequest,
    userId: number,
    chatSessionId?: string
  ): Promise<Branch> => {
    let url = `${AI_API_BASE}/ai-api/versions/branches/create?user_id=${userId}`;
    if (chatSessionId) {
      url += `&chat_session_id=${chatSessionId}`;
    }
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create branch');
    }
    return response.json();
  },

  /**
   * Create multiple option branches from chat
   */
  createMultiOptions: async (
    request: MultiOptionRequest,
    userId: number
  ): Promise<{ versions: Version[]; branches: Branch[]; total_created: number }> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/multi-option/create?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create multi-options');
    }
    return response.json();
  },

  /**
   * Adopt a version into another branch (typically main)
   */
  adoptVersion: async (
    request: AdoptVersionRequest,
    userId: number
  ): Promise<AdoptVersionResponse> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/adopt?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to adopt version');
    }
    return response.json();
  },

  /**
   * Compare two versions
   */
  compareVersions: async (
    versionAId: string,
    versionBId: string
  ): Promise<VersionComparison> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/compare`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_a_id: versionAId,
          version_b_id: versionBId,
        }),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to compare versions');
    }
    return response.json();
  },

  /**
   * Archive a branch
   */
  archiveBranch: async (nodeId: string, branchName: string): Promise<Branch> => {
    const response = await fetchWithAuth(
      `${AI_API_BASE}/ai-api/versions/branches/archive`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: nodeId,
          branch_name: branchName,
        }),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to archive branch');
    }
    return response.json();
  },
};
