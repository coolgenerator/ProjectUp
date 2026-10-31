/**
 * Redux slice for version control state management
 * Manages versions, branches, and version comparisons
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { versionsAPI } from '../../api/versions';
import type {
  Version,
  Branch,
  VersionTree,
  VersionComparison,
  CreateVersionRequest,
  AdoptVersionRequest,
} from '../../types/versions';

interface VersionsState {
  // Data by node ID
  versionsByNode: Record<string, Version[]>;
  branchesByNode: Record<string, Branch[]>;
  currentVersionsByNode: Record<string, Version>;
  versionTrees: Record<string, VersionTree>;

  // Comparison cache (key: `${versionAId}-${versionBId}`)
  comparisonCache: Record<string, VersionComparison>;

  // UI state
  selectedVersionId: string | null;
  comparisonMode: boolean;
  compareVersionIds: [string | null, string | null];

  // Loading states
  loading: boolean;
  treeLoading: Record<string, boolean>;
  branchesLoading: Record<string, boolean>;
  comparisonLoading: boolean;

  // Error handling
  error: string | null;
}

const initialState: VersionsState = {
  versionsByNode: {},
  branchesByNode: {},
  currentVersionsByNode: {},
  versionTrees: {},
  comparisonCache: {},
  selectedVersionId: null,
  comparisonMode: false,
  compareVersionIds: [null, null],
  loading: false,
  treeLoading: {},
  branchesLoading: {},
  comparisonLoading: false,
  error: null,
};

// Async thunks
export const fetchCurrentVersion = createAsyncThunk(
  'versions/fetchCurrent',
  async ({ nodeId, branch = 'main' }: { nodeId: string; branch?: string }) => {
    const version = await versionsAPI.getCurrentVersion(nodeId, branch);
    return { nodeId, version };
  }
);

export const fetchVersionTree = createAsyncThunk(
  'versions/fetchTree',
  async (nodeId: string) => {
    const tree = await versionsAPI.getVersionTree(nodeId);
    return { nodeId, tree };
  }
);

export const fetchBranches = createAsyncThunk(
  'versions/fetchBranches',
  async ({ nodeId, activeOnly = true }: { nodeId: string; activeOnly?: boolean }) => {
    const result = await versionsAPI.getBranches(nodeId, activeOnly);
    return { nodeId, branches: result.branches };
  }
);

export const fetchVersions = createAsyncThunk(
  'versions/fetchVersions',
  async ({ nodeId, branch, limit = 50 }: { nodeId: string; branch?: string; limit?: number }) => {
    const result = await versionsAPI.getVersions(nodeId, branch, limit);
    return { nodeId, versions: result.versions };
  }
);

export const createVersion = createAsyncThunk(
  'versions/create',
  async ({ request, userId }: { request: CreateVersionRequest; userId: number }) => {
    const version = await versionsAPI.createVersion(request, userId);
    return { nodeId: request.node_id, version };
  }
);

export const adoptVersion = createAsyncThunk(
  'versions/adopt',
  async ({ request, userId }: { request: AdoptVersionRequest; userId: number }) => {
    const result = await versionsAPI.adoptVersion(request, userId);
    return { nodeId: request.node_id, result };
  }
);

export const compareVersions = createAsyncThunk(
  'versions/compare',
  async ({ versionAId, versionBId }: { versionAId: string; versionBId: string }) => {
    const comparison = await versionsAPI.compareVersions(versionAId, versionBId);
    const cacheKey = `${versionAId}-${versionBId}`;
    return { cacheKey, comparison };
  }
);

export const archiveBranch = createAsyncThunk(
  'versions/archiveBranch',
  async ({ nodeId, branchName }: { nodeId: string; branchName: string }) => {
    const branch = await versionsAPI.archiveBranch(nodeId, branchName);
    return { nodeId, branch };
  }
);

// Slice
const versionsSlice = createSlice({
  name: 'versions',
  initialState,
  reducers: {
    // UI state actions
    setSelectedVersion: (state, action: PayloadAction<string | null>) => {
      state.selectedVersionId = action.payload;
    },

    setComparisonMode: (state, action: PayloadAction<boolean>) => {
      state.comparisonMode = action.payload;
      if (!action.payload) {
        state.compareVersionIds = [null, null];
      }
    },

    setCompareVersionIds: (
      state,
      action: PayloadAction<[string | null, string | null]>
    ) => {
      state.compareVersionIds = action.payload;
    },

    addToComparison: (state, action: PayloadAction<string>) => {
      const versionId = action.payload;
      if (!state.compareVersionIds[0]) {
        state.compareVersionIds[0] = versionId;
      } else if (!state.compareVersionIds[1]) {
        state.compareVersionIds[1] = versionId;
      } else {
        // Replace first one
        state.compareVersionIds[0] = state.compareVersionIds[1];
        state.compareVersionIds[1] = versionId;
      }
    },

    clearComparison: (state) => {
      state.compareVersionIds = [null, null];
      state.comparisonMode = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Cache invalidation
    invalidateNodeCache: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      delete state.versionsByNode[nodeId];
      delete state.branchesByNode[nodeId];
      delete state.currentVersionsByNode[nodeId];
      delete state.versionTrees[nodeId];
    },
  },
  extraReducers: (builder) => {
    // Fetch current version
    builder
      .addCase(fetchCurrentVersion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentVersion.fulfilled, (state, action) => {
        const { nodeId, version } = action.payload;
        state.currentVersionsByNode[nodeId] = version;
        state.loading = false;
      })
      .addCase(fetchCurrentVersion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch current version';
      });

    // Fetch version tree
    builder
      .addCase(fetchVersionTree.pending, (state, action) => {
        const nodeId = action.meta.arg;
        state.treeLoading[nodeId] = true;
        state.error = null;
      })
      .addCase(fetchVersionTree.fulfilled, (state, action) => {
        const { nodeId, tree } = action.payload;
        state.versionTrees[nodeId] = tree;
        state.treeLoading[nodeId] = false;
      })
      .addCase(fetchVersionTree.rejected, (state, action) => {
        const nodeId = action.meta.arg;
        state.treeLoading[nodeId] = false;
        state.error = action.error.message || 'Failed to fetch version tree';
      });

    // Fetch branches
    builder
      .addCase(fetchBranches.pending, (state, action) => {
        const { nodeId } = action.meta.arg;
        state.branchesLoading[nodeId] = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        const { nodeId, branches } = action.payload;
        state.branchesByNode[nodeId] = branches;
        state.branchesLoading[nodeId] = false;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        const { nodeId } = action.meta.arg;
        state.branchesLoading[nodeId] = false;
        state.error = action.error.message || 'Failed to fetch branches';
      });

    // Fetch versions
    builder
      .addCase(fetchVersions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVersions.fulfilled, (state, action) => {
        const { nodeId, versions } = action.payload;
        state.versionsByNode[nodeId] = versions;
        state.loading = false;
      })
      .addCase(fetchVersions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch versions';
      });

    // Create version
    builder
      .addCase(createVersion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVersion.fulfilled, (state, action) => {
        const { nodeId, version } = action.payload;

        // Add to versions list
        if (!state.versionsByNode[nodeId]) {
          state.versionsByNode[nodeId] = [];
        }
        state.versionsByNode[nodeId].unshift(version);

        // Update current version if it's in main branch
        if (version.branch_name === 'main' && version.is_current) {
          state.currentVersionsByNode[nodeId] = version;
        }

        state.loading = false;
      })
      .addCase(createVersion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create version';
      });

    // Adopt version
    builder
      .addCase(adoptVersion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adoptVersion.fulfilled, (state, action) => {
        const { nodeId, result } = action.payload;

        // Update current version
        state.currentVersionsByNode[nodeId] = result.new_version;

        // Add to versions list
        if (!state.versionsByNode[nodeId]) {
          state.versionsByNode[nodeId] = [];
        }
        state.versionsByNode[nodeId].unshift(result.new_version);

        // Invalidate tree cache (will be refetched)
        delete state.versionTrees[nodeId];

        state.loading = false;
      })
      .addCase(adoptVersion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to adopt version';
      });

    // Compare versions
    builder
      .addCase(compareVersions.pending, (state) => {
        state.comparisonLoading = true;
        state.error = null;
      })
      .addCase(compareVersions.fulfilled, (state, action) => {
        const { cacheKey, comparison } = action.payload;
        state.comparisonCache[cacheKey] = comparison;
        state.comparisonLoading = false;
      })
      .addCase(compareVersions.rejected, (state, action) => {
        state.comparisonLoading = false;
        state.error = action.error.message || 'Failed to compare versions';
      });

    // Archive branch
    builder
      .addCase(archiveBranch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveBranch.fulfilled, (state, action) => {
        const { nodeId, branch } = action.payload;

        // Update branch in list
        if (state.branchesByNode[nodeId]) {
          const index = state.branchesByNode[nodeId].findIndex(
            (b) => b.id === branch.id
          );
          if (index !== -1) {
            state.branchesByNode[nodeId][index] = branch;
          }
        }

        state.loading = false;
      })
      .addCase(archiveBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to archive branch';
      });
  },
});

// Actions
export const {
  setSelectedVersion,
  setComparisonMode,
  setCompareVersionIds,
  addToComparison,
  clearComparison,
  clearError,
  invalidateNodeCache,
} = versionsSlice.actions;

// Selectors
export const selectCurrentVersion = (nodeId: string) => (state: RootState) =>
  state.versions.currentVersionsByNode[nodeId];

export const selectVersions = (nodeId: string) => (state: RootState) =>
  state.versions.versionsByNode[nodeId] || [];

export const selectBranches = (nodeId: string) => (state: RootState) =>
  state.versions.branchesByNode[nodeId] || [];

export const selectVersionTree = (nodeId: string) => (state: RootState) =>
  state.versions.versionTrees[nodeId];

export const selectComparison = (versionAId: string, versionBId: string) => (
  state: RootState
) => state.versions.comparisonCache[`${versionAId}-${versionBId}`];

export const selectSelectedVersion = (state: RootState) =>
  state.versions.selectedVersionId;

export const selectComparisonMode = (state: RootState) =>
  state.versions.comparisonMode;

export const selectCompareVersionIds = (state: RootState) =>
  state.versions.compareVersionIds;

export const selectLoading = (state: RootState) => state.versions.loading;

export const selectTreeLoading = (nodeId: string) => (state: RootState) =>
  state.versions.treeLoading[nodeId] || false;

export const selectBranchesLoading = (nodeId: string) => (state: RootState) =>
  state.versions.branchesLoading[nodeId] || false;

export const selectError = (state: RootState) => state.versions.error;

export default versionsSlice.reducer;
