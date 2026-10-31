import { useState, useEffect, useCallback } from 'react';
import fetchWithAuth from './fetchWithAuth';
import { Milestone } from '../types/project/milestone';

interface UseProjectMilestonesProps {
  projectId: string | number;
  autoFetch?: boolean;
}

interface UseProjectMilestonesReturn {
  milestones: Milestone[];
  loading: boolean;
  error: string | null;
  fetchMilestones: () => Promise<void>;
}

/**
 * Hook to fetch milestones for a project (simplified for task management)
 * Returns a flat list of milestones without hierarchical structure
 */
export const useProjectMilestones = ({
  projectId,
  autoFetch = true
}: UseProjectMilestonesProps): UseProjectMilestonesReturn => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/project/${projectId}/milestones`);

      if (!response.ok) {
        throw new Error(`Failed to fetch milestones: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter out completed/cancelled milestones for cleaner task assignment
      const activeMilestones = (data.milestones || []).filter(
        (m: Milestone) => m.status !== 'cancelled'
      );

      setMilestones(activeMilestones);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to load milestones');
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoFetch && projectId) {
      fetchMilestones();
    }
  }, [autoFetch, projectId, fetchMilestones]);

  return {
    milestones,
    loading,
    error,
    fetchMilestones
  };
};
