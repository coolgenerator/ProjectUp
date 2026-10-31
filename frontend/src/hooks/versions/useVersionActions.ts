/**
 * Custom hook for performing version control actions
 * Provides functions to create, adopt, and archive versions/branches
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import {
  createVersion,
  adoptVersion,
  archiveBranch,
  selectLoading,
  selectError,
  invalidateNodeCache,
} from '../../store/slices/versionsSlice';
import type {
  CreateVersionRequest,
  AdoptVersionRequest,
} from '../../types/versions';

export function useVersionActions() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  /**
   * Create a new version in a branch
   */
  const createNewVersion = useCallback(
    async (request: CreateVersionRequest, userId: number) => {
      try {
        const result = await dispatch(createVersion({ request, userId })).unwrap();
        return { success: true, version: result.version };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create version' };
      }
    },
    [dispatch]
  );

  /**
   * Adopt a version from one branch to another (typically to main)
   */
  const adoptVersionToMain = useCallback(
    async (request: AdoptVersionRequest, userId: number) => {
      try {
        const result = await dispatch(adoptVersion({ request, userId })).unwrap();
        return {
          success: true,
          newVersion: result.result.new_version,
          adoptedFrom: result.result.adopted_from,
          archivedBranches: result.result.archived_branches,
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to adopt version' };
      }
    },
    [dispatch]
  );

  /**
   * Archive a branch and all its versions
   */
  const archiveBranchAndVersions = useCallback(
    async (nodeId: string, branchName: string) => {
      try {
        const result = await dispatch(archiveBranch({ nodeId, branchName })).unwrap();
        return { success: true, branch: result.branch };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to archive branch' };
      }
    },
    [dispatch]
  );

  /**
   * Invalidate cached data for a node (force refetch)
   */
  const invalidateCache = useCallback(
    (nodeId: string) => {
      dispatch(invalidateNodeCache(nodeId));
    },
    [dispatch]
  );

  return {
    // Actions
    createNewVersion,
    adoptVersionToMain,
    archiveBranchAndVersions,
    invalidateCache,

    // State
    loading,
    error,
  };
}
