/**
 * Custom hook for comparing versions
 * Manages comparison mode and provides comparison data
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import {
  compareVersions,
  setComparisonMode,
  setCompareVersionIds,
  addToComparison,
  clearComparison,
  selectComparison,
  selectComparisonMode,
  selectCompareVersionIds,
  selectLoading,
  selectError,
} from '../../store/slices/versionsSlice';

export function useVersionComparison() {
  const dispatch = useAppDispatch();

  const comparisonMode = useAppSelector(selectComparisonMode);
  const compareVersionIds = useAppSelector(selectCompareVersionIds);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  // Get comparison data if both versions are selected
  const [versionAId, versionBId] = compareVersionIds;
  const comparison = useAppSelector(
    state => versionAId && versionBId
      ? selectComparison(versionAId, versionBId)(state)
      : null
  );

  /**
   * Auto-fetch comparison when both versions are selected
   */
  useEffect(() => {
    if (versionAId && versionBId && !comparison) {
      dispatch(compareVersions({ versionAId, versionBId }));
    }
  }, [versionAId, versionBId, comparison, dispatch]);

  /**
   * Enable comparison mode
   */
  const enableComparisonMode = useCallback(() => {
    dispatch(setComparisonMode(true));
  }, [dispatch]);

  /**
   * Disable comparison mode and clear selections
   */
  const disableComparisonMode = useCallback(() => {
    dispatch(setComparisonMode(false));
  }, [dispatch]);

  /**
   * Add a version to the comparison
   */
  const addVersionToCompare = useCallback(
    (versionId: string) => {
      dispatch(addToComparison(versionId));
    },
    [dispatch]
  );

  /**
   * Set both versions at once
   */
  const setVersionsToCompare = useCallback(
    (versionA: string | null, versionB: string | null) => {
      dispatch(setCompareVersionIds([versionA, versionB]));
    },
    [dispatch]
  );

  /**
   * Clear comparison selections
   */
  const clearComparisonSelections = useCallback(() => {
    dispatch(clearComparison());
  }, [dispatch]);

  /**
   * Manually trigger comparison fetch
   */
  const fetchComparison = useCallback(
    (versionA: string, versionB: string) => {
      dispatch(compareVersions({ versionAId: versionA, versionBId: versionB }));
    },
    [dispatch]
  );

  /**
   * Check if comparison is ready (both versions selected)
   */
  const isComparisonReady = versionAId !== null && versionBId !== null;

  /**
   * Check if a version is selected for comparison
   */
  const isVersionSelected = useCallback(
    (versionId: string) => {
      return compareVersionIds[0] === versionId || compareVersionIds[1] === versionId;
    },
    [compareVersionIds]
  );

  return {
    // State
    comparisonMode,
    compareVersionIds,
    comparison,
    loading,
    error,
    isComparisonReady,

    // Actions
    enableComparisonMode,
    disableComparisonMode,
    addVersionToCompare,
    setVersionsToCompare,
    clearComparisonSelections,
    fetchComparison,
    isVersionSelected,
  };
}
