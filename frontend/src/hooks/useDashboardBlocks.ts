import { useState, useEffect, useCallback } from 'react';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

export interface DashboardBlock {
  block_id: number;
  project_id: number;
  user_id: number;
  type: string;
  title: string;
  content: any;
  sort_order: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDashboardBlockRequest {
  type: string;
  title?: string;
  content?: any;
  sort_order?: number;
  parent_id?: number;
}

export interface UpdateDashboardBlockRequest {
  type?: string;
  title?: string;
  content?: any;
  sort_order?: number;
}

export interface BatchUpdateOrderRequest {
  updates: Array<{
    block_id: number;
    sort_order: number;
  }>;
}

export const useDashboardBlocks = (projectId: string) => {
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard blocks
  const fetchBlocks = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/dashboard-blocks/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard blocks');
      }

      const data = await response.json();
      setBlocks(data.blocks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard blocks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Create a new dashboard block
  const createBlock = useCallback(async (blockData: CreateDashboardBlockRequest) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/dashboard-blocks/projects/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockData),
      });

      if (!response.ok) {
        throw new Error('Failed to create dashboard block');
      }

      const data = await response.json();
      setBlocks(prev => [...prev, data.block]);
      return data.block;
    } catch (err) {
      console.error('Error creating dashboard block:', err);
      throw err;
    }
  }, [projectId]);

  // Update a dashboard block
  const updateBlock = useCallback(async (blockId: number, updates: UpdateDashboardBlockRequest) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/dashboard-blocks/${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update dashboard block');
      }

      const data = await response.json();
      setBlocks(prev => prev.map(block => 
        block.block_id === blockId ? data.block : block
      ));
      return data.block;
    } catch (err) {
      console.error('Error updating dashboard block:', err);
      throw err;
    }
  }, [projectId]);

  // Delete a dashboard block
  const deleteBlock = useCallback(async (blockId: number) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete dashboard block');
      }

      setBlocks(prev => prev.filter(block => block.block_id !== blockId));
    } catch (err) {
      console.error('Error deleting dashboard block:', err);
      throw err;
    }
  }, []);

  // Batch update block order
  const batchUpdateOrder = useCallback(async (updates: BatchUpdateOrderRequest) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/dashboard-blocks/projects/${projectId}/batch-order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update block order');
      }

      // Update local state with new order
      setBlocks(prev => {
        const updated = [...prev];
        updates.updates.forEach(update => {
          const index = updated.findIndex(b => b.block_id === update.block_id);
          if (index !== -1) {
            updated[index].sort_order = update.sort_order;
          }
        });
        return updated.sort((a, b) => a.sort_order - b.sort_order);
      });
    } catch (err) {
      console.error('Error updating block order:', err);
      throw err;
    }
  }, [projectId]);

  // Transform a block to a different type
  const transformBlock = useCallback(async (blockId: number, newType: string) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/dashboard-blocks/${blockId}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_type: newType }),
      });

      if (!response.ok) {
        throw new Error('Failed to transform block');
      }

      const data = await response.json();
      setBlocks(prev => prev.map(block => 
        block.block_id === blockId ? data.block : block
      ));
      return data.block;
    } catch (err) {
      console.error('Error transforming block:', err);
      throw err;
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return {
    blocks,
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    batchUpdateOrder,
    transformBlock,
    refetch: fetchBlocks,
  };
};