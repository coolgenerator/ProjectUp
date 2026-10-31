import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

const { AI_AGENT_URL } = config;

interface Position {
  x: number;
  y: number;
}

interface IdeaNode {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description: string;
  position?: Position;
  is_root: boolean;
  color?: string;
  icon?: string;
  expanded: boolean;
  status: string;
  progress: number;
  priority: number;
  due_date?: string;
  completed_at?: string;
  sub_ideas_count: number;
  actions_count: number;
  threads_count: number;
  completion_rate: number;
  ai_generated: boolean;
  ai_suggestions?: any;
  tags?: string[];
  metadata?: any;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface NodeConnection {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  connection_type: string;
  label?: string;
  is_active: boolean;
  style?: any;
  created_at: string;
  updated_at: string;
}

interface IdeaThread {
  id: string;
  project_id: string;
  name: string;
  description: string;
  color?: string;
  is_active: boolean;
  memory?: any;
  context?: any;
  node_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface NodeAction {
  id: string;
  node_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority: number;
  due_date?: string;
  completed_at?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface IdeaForestState {
  nodes: IdeaNode[];
  connections: NodeConnection[];
  threads: IdeaThread[];
  actions: NodeAction[];
  selectedNodeId: string | null;
  selectedThreadId: string | null;
  loading: boolean;
  error: string | null;
  viewMode: 'tree' | 'board' | 'timeline';
  filters: {
    status?: string;
    tags?: string[];
    search?: string;
  };
  aiSuggestions: {
    nodeId: string;
    suggestions: any[];
    loading: boolean;
  } | null;
  lastFetchedProjectId: string | null;
  lastFetchTime: number | null;
}

const initialState: IdeaForestState = {
  nodes: [],
  connections: [],
  threads: [],
  actions: [],
  selectedNodeId: null,
  selectedThreadId: null,
  loading: false,
  error: null,
  viewMode: 'tree',
  filters: {},
  aiSuggestions: null,
  lastFetchedProjectId: null,
  lastFetchTime: null,
};

// Async thunks
export const fetchProjectIdeaForest = createAsyncThunk(
  'ideaForest/fetchProject',
  async (projectId: string, { getState }) => {
    const state = getState() as RootState;
    const { lastFetchedProjectId, lastFetchTime } = state.ideaForest;
    
    // Check if we've already fetched this project recently (within 10 seconds)
    const now = Date.now();
    if (lastFetchedProjectId === projectId && 
        lastFetchTime && 
        (now - lastFetchTime < 10000)) {
      // Skip fetch if data was loaded recently
      return null;
    }
    
    try {
      const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch idea forest');
      }
      const data = await response.json();
      return { 
        ...data, 
        projectId, 
        fetchTime: now 
      };
    } catch (error) {
      console.error('Error fetching idea forest:', error);
      throw error;
    }
  }
);

export const createNode = createAsyncThunk(
  'ideaForest/createNode',
  async ({ projectId, nodeData }: { projectId: string; nodeData: Partial<IdeaNode> }) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nodeData),
    });
    if (!response.ok) {
      throw new Error('Failed to create node');
    }
    return response.json();
  }
);

export const updateNode = createAsyncThunk(
  'ideaForest/updateNode',
  async ({ nodeId, updates }: { nodeId: string; updates: Partial<IdeaNode> }) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update node');
    }
    return response.json();
  }
);

export const deleteNode = createAsyncThunk(
  'ideaForest/deleteNode',
  async (nodeId: string) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete node');
    }
    return nodeId;
  }
);

export const createConnection = createAsyncThunk(
  'ideaForest/createConnection',
  async ({ projectId, connectionData }: { projectId: string; connectionData: Partial<NodeConnection> }) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/connections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionData),
    });
    if (!response.ok) {
      throw new Error('Failed to create connection');
    }
    return response.json();
  }
);

export const deleteConnection = createAsyncThunk(
  'ideaForest/deleteConnection',
  async (connectionId: string) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/connections/${connectionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete connection');
    }
    return connectionId;
  }
);

export const createThread = createAsyncThunk(
  'ideaForest/createThread',
  async ({ projectId, threadData }: { projectId: string; threadData: Partial<IdeaThread> }) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(threadData),
    });
    if (!response.ok) {
      throw new Error('Failed to create thread');
    }
    return response.json();
  }
);

export const generateAISuggestions = createAsyncThunk(
  'ideaForest/generateAISuggestions',
  async (nodeId: string) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}/ai-suggestions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to generate AI suggestions');
    }
    return response.json();
  }
);

export const analyzeTree = createAsyncThunk(
  'ideaForest/analyzeTree',
  async (projectId: string) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to analyze tree');
    }
    return response.json();
  }
);

export const createNodeAction = createAsyncThunk(
  'ideaForest/createNodeAction',
  async ({ nodeId, actionData }: { nodeId: string; actionData: Partial<NodeAction> }) => {
    const response = await fetch(`${AI_AGENT_URL}/ai-api/idea-tree/nodes/${nodeId}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actionData),
    });
    if (!response.ok) {
      throw new Error('Failed to create action');
    }
    return response.json();
  }
);

const ideaForestSlice = createSlice({
  name: 'ideaForest',
  initialState,
  reducers: {
    setSelectedNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    setSelectedThread: (state, action: PayloadAction<string | null>) => {
      state.selectedThreadId = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'tree' | 'board' | 'timeline'>) => {
      state.viewMode = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
    },
    updateNodePosition: (state, action: PayloadAction<{ nodeId: string; position: Position }>) => {
      const node = state.nodes.find(n => n.id === action.payload.nodeId);
      if (node) {
        node.position = action.payload.position;
      }
    },
    toggleNodeExpanded: (state, action: PayloadAction<string>) => {
      const node = state.nodes.find(n => n.id === action.payload);
      if (node) {
        node.expanded = !node.expanded;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearIdeaForest: (state) => {
      // MEMORY FIX: Clear idea forest state when switching projects to free memory
      state.nodes = [];
      state.connections = [];
      state.threads = [];
      state.actions = [];
      state.selectedNodeId = null;
      state.selectedThreadId = null;
      state.aiSuggestions = null;
      state.error = null;
      state.lastFetchedProjectId = null;
      state.lastFetchTime = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch project idea forest
    builder
      .addCase(fetchProjectIdeaForest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectIdeaForest.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        // Skip if we returned null (cached)
        if (action.payload === null) {
          return;
        }
        
        // Update state with fetched data
        state.nodes = action.payload.nodes || [];
        state.connections = action.payload.connections || [];
        state.threads = action.payload.threads || [];
        state.lastFetchedProjectId = action.payload.projectId;
        state.lastFetchTime = action.payload.fetchTime;
      })
      .addCase(fetchProjectIdeaForest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch idea forest';
        console.error('IdeaForest fetch error:', action.error);
      });

    // Create node
    builder
      .addCase(createNode.fulfilled, (state, action) => {
        state.nodes.push(action.payload);
      })
      .addCase(createNode.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create node';
      });

    // Update node
    builder
      .addCase(updateNode.fulfilled, (state, action) => {
        const index = state.nodes.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.nodes[index] = action.payload;
        }
      })
      .addCase(updateNode.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update node';
      });

    // Delete node
    builder
      .addCase(deleteNode.fulfilled, (state, action) => {
        // Find the deleted node to get its parent_id
        const deletedNode = state.nodes.find(n => n.id === action.payload);

        // Remove the node from state
        state.nodes = state.nodes.filter(n => n.id !== action.payload);

        // Update parent's child count if the node had a parent
        if (deletedNode?.parent_id) {
          const parentNode = state.nodes.find(n => n.id === deletedNode.parent_id);
          if (parentNode && parentNode.sub_ideas_count > 0) {
            parentNode.sub_ideas_count -= 1;
          }
        }

        // Remove connections related to this node
        state.connections = state.connections.filter(
          c => c.from_node_id !== action.payload && c.to_node_id !== action.payload
        );

        // Clear selection if this node was selected
        if (state.selectedNodeId === action.payload) {
          state.selectedNodeId = null;
        }
      })
      .addCase(deleteNode.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete node';
      });

    // Create connection
    builder
      .addCase(createConnection.fulfilled, (state, action) => {
        state.connections.push(action.payload);
      })
      .addCase(createConnection.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create connection';
      });

    // Delete connection
    builder
      .addCase(deleteConnection.fulfilled, (state, action) => {
        state.connections = state.connections.filter(c => c.id !== action.payload);
      })
      .addCase(deleteConnection.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete connection';
      });

    // Create thread
    builder
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads.push(action.payload);
      })
      .addCase(createThread.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create thread';
      });

    // Generate AI suggestions
    builder
      .addCase(generateAISuggestions.pending, (state, action) => {
        state.aiSuggestions = {
          nodeId: action.meta.arg,
          suggestions: [],
          loading: true,
        };
      })
      .addCase(generateAISuggestions.fulfilled, (state, action) => {
        if (state.aiSuggestions) {
          state.aiSuggestions.suggestions = action.payload.suggestions;
          state.aiSuggestions.loading = false;
        }
      })
      .addCase(generateAISuggestions.rejected, (state) => {
        if (state.aiSuggestions) {
          state.aiSuggestions.loading = false;
        }
        state.error = 'Failed to generate AI suggestions';
      });

    // Create node action
    builder
      .addCase(createNodeAction.fulfilled, (state, action) => {
        state.actions.push(action.payload);
        // Update the actions count for the node
        const node = state.nodes.find(n => n.id === action.payload.node_id);
        if (node) {
          node.actions_count += 1;
        }
      })
      .addCase(createNodeAction.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create action';
      });
  },
});

// Selectors
export const selectIdeaForest = (state: RootState) => state.ideaForest;
export const selectNodeById = (nodeId: string) => (state: RootState) =>
  state.ideaForest.nodes.find(n => n.id === nodeId);
export const selectChildNodes = (parentId: string | null) => (state: RootState) =>
  state.ideaForest.nodes.filter(n => n.parent_id === parentId);
export const selectNodeActions = (nodeId: string) => (state: RootState) =>
  state.ideaForest.actions.filter(a => a.node_id === nodeId);
export const selectFilteredNodes = (state: RootState) => {
  const { nodes, filters } = state.ideaForest;
  let filtered = nodes;

  if (filters.status) {
    filtered = filtered.filter(n => n.status === filters.status);
  }
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(n =>
      n.tags && filters.tags!.some(tag => n.tags!.includes(tag))
    );
  }
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(searchLower) ||
      n.description.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
};

export const {
  setSelectedNode,
  setSelectedThread,
  setViewMode,
  setFilters,
  updateNodePosition,
  toggleNodeExpanded,
  clearError,
  clearIdeaForest,
} = ideaForestSlice.actions;

export default ideaForestSlice.reducer;