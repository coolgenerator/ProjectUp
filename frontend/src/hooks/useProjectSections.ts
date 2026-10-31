import { useState, useEffect, useCallback } from 'react';
import fetchWithAuth from './fetchWithAuth';
import { Section, CreateSectionRequest, UpdateSectionRequest, ReorderSectionsRequest } from '../types/task';

interface UseProjectSectionsProps {
  projectId: string | number;
  autoFetch?: boolean;
}

interface UseProjectSectionsReturn {
  sections: Section[];
  loading: boolean;
  error: string | null;
  fetchSections: () => Promise<void>;
  createSection: (request: CreateSectionRequest) => Promise<Section | null>;
  updateSection: (id: number, request: UpdateSectionRequest) => Promise<boolean>;
  deleteSection: (id: number) => Promise<boolean>;
  reorderSections: (request: ReorderSectionsRequest) => Promise<boolean>;
}

/**
 * Hook to manage sections for a project
 * Provides CRUD operations for task sections
 */
export const useProjectSections = ({
  projectId,
  autoFetch = true
}: UseProjectSectionsProps): UseProjectSectionsReturn => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/sections/project/${projectId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sections: ${response.statusText}`);
      }

      const data = await response.json();
      setSections(data.sections || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to load sections');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createSection = useCallback(async (request: CreateSectionRequest): Promise<Section | null> => {
    try {
      const response = await fetchWithAuth('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to create section');
      }

      const data = await response.json();

      if (data.success && data.section) {
        // Add the new section to the list
        setSections(prev => [...prev, data.section].sort((a, b) => a.order - b.order));
        return data.section;
      }
      return null;
    } catch (err) {
      console.error('Error creating section:', err);
      setError('Failed to create section');
      return null;
    }
  }, []);

  const updateSection = useCallback(async (id: number, request: UpdateSectionRequest): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      const data = await response.json();
      if (data.success && data.section) {
        // Update the section in the list
        setSections(prev =>
          prev.map(s => s.id === id ? data.section : s).sort((a, b) => a.order - b.order)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating section:', err);
      setError('Failed to update section');
      return false;
    }
  }, []);

  const deleteSection = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/sections/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete section');
      }

      // Remove the section from the list
      setSections(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section');
      return false;
    }
  }, []);

  const reorderSections = useCallback(async (request: ReorderSectionsRequest): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to reorder sections');
      }

      // Re-fetch sections to get the updated order
      await fetchSections();
      return true;
    } catch (err) {
      console.error('Error reordering sections:', err);
      setError('Failed to reorder sections');
      return false;
    }
  }, [fetchSections]);

  useEffect(() => {
    if (autoFetch && projectId) {
      fetchSections();
    }
  }, [autoFetch, projectId, fetchSections]);

  return {
    sections,
    loading,
    error,
    fetchSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections
  };
};
