/**
 * useWorkflowRegistry Hook
 *
 * React hook for interacting with the AI workflow registry.
 * Provides workflow discovery, execution, and integration management.
 *
 * Features:
 * - Automatic caching of discovery data
 * - Loading and error states
 * - Workflow execution with progress tracking
 * - Integration configuration management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  WorkflowDefinition,
  WorkflowCategory,
  IntegrationDefinition,
  CustomAPIConfig,
  DiscoveryResponse,
  WorkflowExecuteResponse,
  getDiscovery,
  getWorkflows,
  getWorkflowsForContext,
  executeWorkflow,
  getIntegrations,
  configureIntegration,
  getConfiguredIntegrations,
  getCustomAPIs,
  registerCustomAPI,
  removeCustomAPI,
  executeCustomAPI,
} from '../services/workflowRegistryService';

// ============================================================================
// Types
// ============================================================================

export interface UseWorkflowRegistryOptions {
  /** Automatically fetch discovery data on mount */
  autoFetch?: boolean;
  /** Context to filter workflows (e.g., 'idea_tree', 'task_board') */
  context?: string;
  /** Project ID for project-scoped operations */
  projectId?: string;
}

export interface WorkflowExecutionState {
  executing: boolean;
  workflowId: string | null;
  result: WorkflowExecuteResponse | null;
  error: Error | null;
}

export interface UseWorkflowRegistryResult {
  // Discovery data
  workflows: WorkflowDefinition[];
  categories: WorkflowCategory[];
  contexts: string[];
  integrations: IntegrationDefinition[];
  customAPIs: CustomAPIConfig[];

  // Loading states
  loading: boolean;
  discoveryLoading: boolean;
  executionState: WorkflowExecutionState;

  // Error state
  error: Error | null;

  // Discovery actions
  fetchDiscovery: (context?: string) => Promise<void>;
  refreshWorkflows: (options?: { context?: string; category?: string }) => Promise<void>;

  // Workflow execution
  execute: (workflowId: string, inputData: Record<string, any>) => Promise<WorkflowExecuteResponse>;

  // Workflow queries
  getWorkflowsByCategory: (categoryId: string) => WorkflowDefinition[];
  getWorkflowById: (workflowId: string) => WorkflowDefinition | undefined;
  getCrossReference: (workflowId: string) => WorkflowDefinition | undefined;

  // Integration management
  configureIntegration: (
    integrationId: string,
    credentials: Record<string, string>,
    settings?: Record<string, any>
  ) => Promise<void>;
  getConfiguredIntegrations: () => Promise<any[]>;

  // Custom API management
  registerAPI: (config: {
    api_id: string;
    name: string;
    description?: string;
    base_url: string;
    auth: Record<string, any>;
    endpoints: Array<Record<string, any>>;
    default_headers?: Record<string, string>;
  }) => Promise<void>;
  removeAPI: (apiId: string) => Promise<void>;
  executeAPI: (
    apiId: string,
    endpoint: string,
    options?: {
      method?: string;
      payload?: Record<string, any>;
      query_params?: Record<string, string>;
    }
  ) => Promise<any>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWorkflowRegistry(
  options: UseWorkflowRegistryOptions = {}
): UseWorkflowRegistryResult {
  const { autoFetch = true, context, projectId } = options;

  // State
  const [discoveryData, setDiscoveryData] = useState<DiscoveryResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [contexts, setContexts] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);
  const [customAPIs, setCustomAPIs] = useState<CustomAPIConfig[]>([]);

  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [executionState, setExecutionState] = useState<WorkflowExecutionState>({
    executing: false,
    workflowId: null,
    result: null,
    error: null,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Discovery
  // ─────────────────────────────────────────────────────────────────────────

  const fetchDiscovery = useCallback(async (ctx?: string) => {
    setDiscoveryLoading(true);
    setError(null);

    try {
      const response = await getDiscovery(ctx);
      setDiscoveryData(response);
      setWorkflows(response.workflows.items);
      setCategories(response.categories);
      setContexts(response.contexts);
      setIntegrations(response.integrations.items);
      setCustomAPIs(response.custom_apis.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch discovery data'));
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);

  const refreshWorkflows = useCallback(
    async (opts?: { context?: string; category?: string }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getWorkflows(opts);
        setWorkflows(response.workflows);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh workflows'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchDiscovery(context);
    }
  }, [autoFetch, context, fetchDiscovery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Execution
  // ─────────────────────────────────────────────────────────────────────────

  const execute = useCallback(
    async (workflowId: string, inputData: Record<string, any>): Promise<WorkflowExecuteResponse> => {
      setExecutionState({
        executing: true,
        workflowId,
        result: null,
        error: null,
      });

      try {
        const result = await executeWorkflow({
          workflow_id: workflowId,
          input_data: inputData,
          project_id: projectId,
        });

        setExecutionState({
          executing: false,
          workflowId,
          result,
          error: null,
        });

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Workflow execution failed');

        setExecutionState({
          executing: false,
          workflowId,
          result: null,
          error,
        });

        throw error;
      }
    },
    [projectId]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Queries
  // ─────────────────────────────────────────────────────────────────────────

  const getWorkflowsByCategory = useCallback(
    (categoryId: string): WorkflowDefinition[] => {
      return workflows.filter((w) => w.category === categoryId);
    },
    [workflows]
  );

  const getWorkflowById = useCallback(
    (workflowId: string): WorkflowDefinition | undefined => {
      return workflows.find((w) => w.id === workflowId);
    },
    [workflows]
  );

  const getCrossReference = useCallback(
    (workflowId: string): WorkflowDefinition | undefined => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow?.cross_reference) return undefined;
      return workflows.find((w) => w.id === workflow.cross_reference);
    },
    [workflows]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Integration Management
  // ─────────────────────────────────────────────────────────────────────────

  const configureIntegrationHandler = useCallback(
    async (
      integrationId: string,
      credentials: Record<string, string>,
      settings: Record<string, any> = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        await configureIntegration({
          integration_id: integrationId,
          credentials,
          settings,
          project_id: projectId,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to configure integration'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const getConfiguredIntegrationsHandler = useCallback(async () => {
    try {
      const response = await getConfiguredIntegrations({ project_id: projectId });
      return response.configured_integrations;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get configured integrations'));
      return [];
    }
  }, [projectId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Custom API Management
  // ─────────────────────────────────────────────────────────────────────────

  const registerAPI = useCallback(
    async (config: {
      api_id: string;
      name: string;
      description?: string;
      base_url: string;
      auth: Record<string, any>;
      endpoints: Array<Record<string, any>>;
      default_headers?: Record<string, string>;
    }) => {
      setLoading(true);
      setError(null);

      try {
        await registerCustomAPI(config);
        // Refresh custom APIs list
        const response = await getCustomAPIs();
        setCustomAPIs(response.custom_apis);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to register custom API'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removeAPI = useCallback(async (apiId: string) => {
    setLoading(true);
    setError(null);

    try {
      await removeCustomAPI(apiId);
      // Update local state
      setCustomAPIs((prev) => prev.filter((api) => api.api_id !== apiId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove custom API'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeAPI = useCallback(
    async (
      apiId: string,
      endpoint: string,
      opts?: {
        method?: string;
        payload?: Record<string, any>;
        query_params?: Record<string, string>;
      }
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await executeCustomAPI({
          api_config_id: apiId,
          endpoint,
          method: opts?.method ?? 'GET',
          payload: opts?.payload ?? {},
          query_params: opts?.query_params ?? {},
        });
        return result.result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to execute custom API'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Discovery data
    workflows,
    categories,
    contexts,
    integrations,
    customAPIs,

    // Loading states
    loading,
    discoveryLoading,
    executionState,

    // Error state
    error,

    // Discovery actions
    fetchDiscovery,
    refreshWorkflows,

    // Workflow execution
    execute,

    // Workflow queries
    getWorkflowsByCategory,
    getWorkflowById,
    getCrossReference,

    // Integration management
    configureIntegration: configureIntegrationHandler,
    getConfiguredIntegrations: getConfiguredIntegrationsHandler,

    // Custom API management
    registerAPI,
    removeAPI,
    executeAPI,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for IdeaTree-specific workflows
 */
export function useIdeaTreeWorkflows(projectId?: string) {
  return useWorkflowRegistry({
    context: 'idea_tree',
    projectId,
  });
}

/**
 * Hook for TaskBoard-specific workflows
 */
export function useTaskBoardWorkflows(projectId?: string) {
  return useWorkflowRegistry({
    context: 'task_board',
    projectId,
  });
}

/**
 * Hook for executing a specific workflow
 */
export function useWorkflowExecution(workflowId: string, projectId?: string) {
  const { execute, executionState, getWorkflowById } = useWorkflowRegistry({
    autoFetch: true,
    projectId,
  });

  const workflow = useMemo(() => getWorkflowById(workflowId), [getWorkflowById, workflowId]);

  const executeThis = useCallback(
    (inputData: Record<string, any>) => execute(workflowId, inputData),
    [execute, workflowId]
  );

  return {
    workflow,
    execute: executeThis,
    ...executionState,
  };
}

export default useWorkflowRegistry;
