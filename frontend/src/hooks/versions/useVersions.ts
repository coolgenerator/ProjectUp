/**
 * Custom hook for managing version data
 * Provides access to versions, branches, and version trees for a node
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import {
  fetchCurrentVersion,
  fetchVersionTree,
  fetchBranches,
  fetchVersions,
  selectCurrentVersion,
  selectVersions,
  selectBranches,
  selectVersionTree,
  selectLoading,
  selectTreeLoading,
  selectBranchesLoading,
  selectError,
} from '../../store/slices/versionsSlice';

interface UseVersionsOptions {
  nodeId: string;
  branch?: string;
  limit?: number;
  autoFetch?: boolean;
  fetchTree?: boolean;
  fetchBranches?: boolean;
}

export function useVersions({
  nodeId,
  branch = 'main',
  limit = 50,
  autoFetch = true,
  fetchTree = false,
  fetchBranches = false,
}: UseVersionsOptions) {
  const dispatch = useAppDispatch();

  // Select data from Redux store
  const currentVersion = useAppSelector(selectCurrentVersion(nodeId));
  const versions = useAppSelector(selectVersions(nodeId));
  const branches = useAppSelector(selectBranches(nodeId));
  const versionTree = useAppSelector(selectVersionTree(nodeId));
  const loading = useAppSelector(selectLoading);
  const treeLoading = useAppSelector(selectTreeLoading(nodeId));
  const branchesLoading = useAppSelector(selectBranchesLoading(nodeId));
  const error = useAppSelector(selectError);

  // Auto-fetch data on mount if enabled
  useEffect(() => {
    if (!autoFetch || !nodeId) return;

    // Fetch current version
    dispatch(fetchCurrentVersion({ nodeId, branch }));

    // Fetch versions list
    dispatch(fetchVersions({ nodeId, branch, limit }));

    // Optionally fetch tree
    if (fetchTree) {
      dispatch(fetchVersionTree(nodeId));
    }

    // Optionally fetch branches
    if (fetchBranches) {
      dispatch(fetchBranches({ nodeId, activeOnly: true }));
    }
  }, [nodeId, branch, limit, autoFetch, fetchTree, fetchBranches, dispatch]);

  // Manual fetch functions
  const refetchCurrentVersion = () => {
    dispatch(fetchCurrentVersion({ nodeId, branch }));
  };

  const refetchVersions = (customBranch?: string, customLimit?: number) => {
    dispatch(fetchVersions({
      nodeId,
      branch: customBranch || branch,
      limit: customLimit || limit
    }));
  };

  const refetchTree = () => {
    dispatch(fetchVersionTree(nodeId));
  };

  const refetchBranches = (activeOnly = true) => {
    dispatch(fetchBranches({ nodeId, activeOnly }));
  };

  return {
    // Data
    currentVersion,
    versions,
    branches,
    versionTree,

    // Loading states
    loading,
    treeLoading,
    branchesLoading,

    // Error
    error,

    // Refetch functions
    refetchCurrentVersion,
    refetchVersions,
    refetchTree,
    refetchBranches,
  };
}
