/**
 * Workflow Registry Service
 *
 * Provides API access to the AI workflow registry for:
 * - Workflow discovery and execution
 * - Integration management
 * - Custom API registration
 */

import config from '../config';

const AI_AGENT_URL = config.AI_AGENT_URL || 'http://localhost:8000';
const REGISTRY_BASE = `${AI_AGENT_URL}/ai-api/registry`;

// ============================================================================
// Types
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  contexts: string[];
  cross_reference?: string;
  requires_integration: boolean;
  input_schema?: Record<string, any>;
}

export interface WorkflowCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order?: number;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  auth_type: string;
  oauth_scopes?: string[];
  config_fields?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  endpoints: string[];
  graphql?: boolean;
}

export interface CustomAPIConfig {
  api_id: string;
  name: string;
  description?: string;
  base_url?: string;
  auth_type?: string;
  endpoint_count?: number;
}

export interface WorkflowExecuteRequest {
  workflow_id: string;
  input_data: Record<string, any>;
  project_id?: string;
  user_id?: string;
}

export interface WorkflowExecuteResponse {
  success: boolean;
  workflow_id: string;
  result: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IntegrationConfigRequest {
  integration_id: string;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  project_id?: string;
}

export interface CustomAPIRequest {
  api_id: string;
  name: string;
  description?: string;
  base_url: string;
  auth: Record<string, any>;
  endpoints: Array<Record<string, any>>;
  default_headers?: Record<string, string>;
}

export interface DiscoveryResponse {
  success: boolean;
  workflows: {
    items: WorkflowDefinition[];
    total: number;
    by_category: Record<string, WorkflowDefinition[]>;
  };
  categories: WorkflowCategory[];
  contexts: string[];
  integrations: {
    items: IntegrationDefinition[];
    total: number;
    categories: string[];
  };
  custom_apis: {
    items: CustomAPIConfig[];
    total: number;
  };
}

// ============================================================================
// API Functions
// ============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Discovery
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorkflows(options?: {
  context?: string;
  category?: string;
}): Promise<{ workflows: WorkflowDefinition[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.context) params.append('context', options.context);
  if (options?.category) params.append('category', options.category);

  const url = `${REGISTRY_BASE}/workflows${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function getWorkflow(workflowId: string): Promise<{ workflow: WorkflowDefinition }> {
  const response = await fetch(`${REGISTRY_BASE}/workflows/${workflowId}`);
  return handleResponse(response);
}

export async function getWorkflowsForContext(
  context: string
): Promise<{ workflows: WorkflowDefinition[]; total: number }> {
  const response = await fetch(`${REGISTRY_BASE}/workflows/context/${context}`);
  return handleResponse(response);
}

export async function getCategories(): Promise<{ categories: WorkflowCategory[] }> {
  const response = await fetch(`${REGISTRY_BASE}/categories`);
  return handleResponse(response);
}

export async function getContexts(): Promise<{ contexts: string[] }> {
  const response = await fetch(`${REGISTRY_BASE}/contexts`);
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Execution
// ─────────────────────────────────────────────────────────────────────────────

export async function executeWorkflow(
  request: WorkflowExecuteRequest
): Promise<WorkflowExecuteResponse> {
  const response = await fetch(`${REGISTRY_BASE}/workflows/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Discovery
// ─────────────────────────────────────────────────────────────────────────────

export async function getIntegrations(options?: {
  category?: string;
}): Promise<{ integrations: IntegrationDefinition[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.category) params.append('category', options.category);

  const url = `${REGISTRY_BASE}/integrations${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function getIntegration(
  integrationId: string
): Promise<{ integration: IntegrationDefinition }> {
  const response = await fetch(`${REGISTRY_BASE}/integrations/${integrationId}`);
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Configuration
// ─────────────────────────────────────────────────────────────────────────────

export async function configureIntegration(
  request: IntegrationConfigRequest
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${REGISTRY_BASE}/integrations/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(response);
}

export async function getConfiguredIntegrations(options?: {
  project_id?: string;
}): Promise<{ configured_integrations: any[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.project_id) params.append('project_id', options.project_id);

  const url = `${REGISTRY_BASE}/integrations/configured${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function removeIntegrationConfig(
  integrationId: string,
  projectId?: string
): Promise<{ success: boolean }> {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);

  const url = `${REGISTRY_BASE}/integrations/configured/${integrationId}${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url, { method: 'DELETE' });
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Execution
// ─────────────────────────────────────────────────────────────────────────────

export async function executeIntegration(request: {
  integration_id: string;
  action: string;
  payload: Record<string, any>;
  project_id?: string;
}): Promise<{ success: boolean; result: any }> {
  const response = await fetch(`${REGISTRY_BASE}/integrations/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom API Management
// ─────────────────────────────────────────────────────────────────────────────

export async function registerCustomAPI(
  request: CustomAPIRequest
): Promise<{ success: boolean; api_id: string }> {
  const response = await fetch(`${REGISTRY_BASE}/custom-apis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(response);
}

export async function getCustomAPIs(): Promise<{ custom_apis: CustomAPIConfig[]; total: number }> {
  const response = await fetch(`${REGISTRY_BASE}/custom-apis`);
  return handleResponse(response);
}

export async function getCustomAPI(apiId: string): Promise<{ custom_api: any }> {
  const response = await fetch(`${REGISTRY_BASE}/custom-apis/${apiId}`);
  return handleResponse(response);
}

export async function removeCustomAPI(apiId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${REGISTRY_BASE}/custom-apis/${apiId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

export async function executeCustomAPI(request: {
  api_config_id?: string;
  api_config?: Record<string, any>;
  endpoint: string;
  method?: string;
  payload?: Record<string, any>;
  query_params?: Record<string, string>;
  transform_response?: boolean;
}): Promise<{ success: boolean; result: any }> {
  const response = await fetch(`${REGISTRY_BASE}/custom-apis/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery (Combined)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDiscovery(context?: string): Promise<DiscoveryResponse> {
  const params = new URLSearchParams();
  if (context) params.append('context', context);

  const url = `${REGISTRY_BASE}/discovery${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  return handleResponse(response);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get all workflows available for the IdeaTree context
 */
export async function getIdeaTreeWorkflows(): Promise<WorkflowDefinition[]> {
  const result = await getWorkflowsForContext('idea_tree');
  return result.workflows;
}

/**
 * Get all workflows available for the TaskBoard context
 */
export async function getTaskBoardWorkflows(): Promise<WorkflowDefinition[]> {
  const result = await getWorkflowsForContext('task_board');
  return result.workflows;
}

/**
 * Execute a planning workflow
 */
export async function expandIdea(
  title: string,
  description: string,
  options?: {
    depth?: number;
    focus_areas?: string[];
    project_id?: string;
  }
): Promise<WorkflowExecuteResponse> {
  return executeWorkflow({
    workflow_id: 'expand_idea',
    input_data: {
      title,
      description,
      depth: options?.depth ?? 2,
      focus_areas: options?.focus_areas ?? [],
    },
    project_id: options?.project_id,
  });
}

/**
 * Execute the generate_plan workflow
 */
export async function generatePlan(
  title: string,
  description: string,
  options?: {
    include_milestones?: boolean;
    include_tasks?: boolean;
    timeline_weeks?: number;
    project_id?: string;
  }
): Promise<WorkflowExecuteResponse> {
  return executeWorkflow({
    workflow_id: 'generate_plan',
    input_data: {
      title,
      description,
      include_milestones: options?.include_milestones ?? true,
      include_tasks: options?.include_tasks ?? true,
      timeline_weeks: options?.timeline_weeks,
    },
    project_id: options?.project_id,
  });
}

/**
 * Execute the generate_tasks workflow
 */
export async function generateTasks(
  title: string,
  description: string,
  options?: {
    num_tasks?: number;
    include_estimates?: boolean;
    include_dependencies?: boolean;
    project_id?: string;
  }
): Promise<WorkflowExecuteResponse> {
  return executeWorkflow({
    workflow_id: 'generate_tasks',
    input_data: {
      title,
      description,
      num_tasks: options?.num_tasks ?? 5,
      include_estimates: options?.include_estimates ?? true,
      include_dependencies: options?.include_dependencies ?? false,
    },
    project_id: options?.project_id,
  });
}

/**
 * Execute the analyze_feasibility workflow
 */
export async function analyzeFeasibility(
  title: string,
  description: string,
  options?: {
    constraints?: Record<string, any>;
    technical_requirements?: string[];
    team_skills?: string[];
    project_id?: string;
  }
): Promise<WorkflowExecuteResponse> {
  return executeWorkflow({
    workflow_id: 'analyze_feasibility',
    input_data: {
      title,
      description,
      constraints: options?.constraints ?? {},
      technical_requirements: options?.technical_requirements ?? [],
      team_skills: options?.team_skills ?? [],
    },
    project_id: options?.project_id,
  });
}

/**
 * Execute the find_resources workflow
 */
export async function findResources(
  topic: string,
  options?: {
    skill_level?: 'beginner' | 'intermediate' | 'advanced';
    resource_types?: string[];
    max_resources?: number;
    project_id?: string;
  }
): Promise<WorkflowExecuteResponse> {
  return executeWorkflow({
    workflow_id: 'find_resources',
    input_data: {
      topic,
      skill_level: options?.skill_level ?? 'intermediate',
      resource_types: options?.resource_types ?? ['docs', 'tutorials', 'tools'],
      max_resources: options?.max_resources ?? 10,
    },
    project_id: options?.project_id,
  });
}
