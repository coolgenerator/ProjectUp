import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  ListTodo,
  BookOpen,
  CheckSquare,
  Milestone as MilestoneIcon,
  FileText,
  Lightbulb,
  ChevronRight,
  Edit2,
  Save,
  Loader,
  AlertCircle,
  Link as LinkIcon,
  Target,
  Calendar,
  Trash2
} from 'lucide-react';
import { Suggestion } from '../../../types/chat';
import config from '../../../config';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { createIdeaNode } from '../../../services/ideaNodeService';
import ActionSuccessModal, { CreatedItem } from './ActionSuccessModal';

const { AI_AGENT_URL, API_BASE_URL } = config;

interface ActionReviewModalProps {
  suggestion: Suggestion | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (suggestion: Suggestion, createdItems?: CreatedItem[]) => void;
  isExecuting?: boolean;
  projectId: string;
  nodeId?: string;
}

interface ActionDetails {
  tasks?: Array<{
    id?: string;
    title: string;
    description: string;
    status?: string;
    priority?: string;
    estimated_hours?: number;
    milestone_id?: string;
    dependencies?: string[];
  }>;
  milestones?: Array<{
    id?: string;
    title: string;
    description: string;
    due_date?: string;
    status?: string;
    task_ids?: string[];
  }>;
  plans?: Array<{
    id?: string;
    title: string;
    description: string;
    plan_type?: string;
    milestone_ids?: string[];
  }>;
  nodes?: Array<{
    id?: string;
    title: string;
    description: string;
    parent_id?: string;
  }>;
  relationships?: {
    task_to_milestone?: Record<string, string>;
    milestone_to_plan?: Record<string, string>;
  };
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  breakdown_task: ListTodo,
  generate_learning_plan: BookOpen,
  create_tasks: CheckSquare,
  create_milestones: MilestoneIcon,
  extract_resources: FileText,
  brainstorm_ideas: Lightbulb,
  extract_tasks: CheckSquare,
  create_node: Lightbulb,
  create_child_node: Lightbulb,
};

const ACTION_COLORS: Record<string, string> = {
  breakdown_task: 'from-blue-500 to-blue-600',
  generate_learning_plan: 'from-green-500 to-green-600',
  create_tasks: 'from-emerald-500 to-emerald-600',
  create_milestones: 'from-cyan-500 to-cyan-600',
  extract_resources: 'from-amber-500 to-amber-600',
  brainstorm_ideas: 'from-orange-500 to-orange-600',
  extract_tasks: 'from-emerald-500 to-emerald-600',
  create_node: 'from-purple-500 to-purple-600',
  create_child_node: 'from-indigo-500 to-indigo-600',
};

const ACTION_LABELS: Record<string, string> = {
  breakdown_task: 'Break Down Task',
  generate_learning_plan: 'Generate Learning Plan',
  create_tasks: 'Create Tasks',
  create_milestones: 'Create Milestones',
  extract_resources: 'Extract Resources',
  brainstorm_ideas: 'Brainstorm Ideas',
  extract_tasks: 'Extract Tasks',
  create_node: 'Create Node',
  create_child_node: 'Create Child Node',
};

export const ActionReviewModal: React.FC<ActionReviewModalProps> = ({
  suggestion,
  isOpen,
  onClose,
  onConfirm,
  isExecuting = false,
  projectId,
  nodeId,
}) => {
  const [actionDetails, setActionDetails] = useState<ActionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedDetails, setEditedDetails] = useState<ActionDetails | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'plans' | 'nodes'>('tasks');
  const [loadingMessage, setLoadingMessage] = useState('Analyzing context...');
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(0); // For node selection (only one can be chosen)
  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch action details when modal opens
  useEffect(() => {
    if (!isOpen || !suggestion) {
      setActionDetails(null);
      setEditedDetails(null);
      setError(null);
      setCreatedItems([]);
      setShowSuccessModal(false);
      return;
    }

    const fetchActionDetails = async () => {
      setLoading(true);
      setError(null);
      setLoadingMessage('Analyzing context...');

      try {
        console.log('[ActionReviewModal] Fetching action details for:', suggestion);

        // Update loading message after 2 seconds
        const timer1 = setTimeout(() => setLoadingMessage('Processing action details...'), 2000);
        const timer2 = setTimeout(() => setLoadingMessage('Generating structured data...'), 5000);
        const timer3 = setTimeout(() => setLoadingMessage('Almost done...'), 10000);

        // Call AI service to get detailed action items
        const response = await fetch(`${AI_AGENT_URL}/ai-api/actions/expand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestion_text: suggestion.text,
            suggestion_type: suggestion.type,
            action_type: suggestion.actionType,
            project_id: projectId,
            node_id: nodeId,
            context: suggestion.data || suggestion.parameters
          })
        });

        // Clear timers
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);

        if (!response.ok) {
          throw new Error('Failed to fetch action details');
        }

        const details: ActionDetails = await response.json();
        console.log('[ActionReviewModal] Received action details:', details);
        setActionDetails(details);
        setEditedDetails(JSON.parse(JSON.stringify(details))); // Deep clone

        // Set initial tab based on what's available
        if (details.tasks && details.tasks.length > 0) {
          setActiveTab('tasks');
        } else if (details.milestones && details.milestones.length > 0) {
          setActiveTab('milestones');
        } else if (details.plans && details.plans.length > 0) {
          setActiveTab('plans');
        } else if (details.nodes && details.nodes.length > 0) {
          setActiveTab('nodes');
        }
      } catch (err) {
        console.error('[ActionReviewModal] Error fetching action details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load action details');
      } finally {
        setLoading(false);
      }
    };

    fetchActionDetails();
  }, [isOpen, suggestion, projectId, nodeId]);

  const handleConfirm = async () => {
    if (!editedDetails) return;

    try {
      console.log('[ActionReviewModal] Processing creation:', editedDetails);
      const newCreatedItems: CreatedItem[] = [];

      // Handle nodes separately (create only the selected node)
      if (editedDetails.nodes && editedDetails.nodes.length > 0) {
        console.log('[ActionReviewModal] Creating selected node');

        const selectedNode = editedDetails.nodes[selectedNodeIndex];

        // Get session_id from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('treeSessionId');

        // Prepare node data in the correct API format
        const nodeData = {
          session_id: sessionId || undefined,
          parent_id: nodeId, // The parent node where this child will be created
          title: selectedNode.title,
          description: selectedNode.description || '',
          position: undefined, // Let backend calculate position
          color: '',
          icon: '',
          tags: [],
          is_root: false, // Since it has a parent, it's not a root node
        };

        console.log('[ActionReviewModal] Creating node with data:', nodeData);

        const response = await fetch(`${AI_AGENT_URL}/ai-api/projects/${projectId}/idea-tree/nodes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nodeData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create node');
        }

        const newNode = await response.json();
        console.log('[ActionReviewModal] Node created successfully:', newNode);

        // Track created node
        // Handle both response formats: {node: {...}} or direct node object
        const createdNode = newNode.node || newNode;
        newCreatedItems.push({
          type: 'node',
          id: createdNode.id,
          title: selectedNode.title,
        });
      }

      // Only send tasks/milestones/plans to backend
      const backendItems = {
        tasks: editedDetails.tasks || [],
        milestones: editedDetails.milestones || [],
        plans: editedDetails.plans || []
      };

      // Send bulk create request to backend if there are items
      if (backendItems.tasks.length > 0 ||
          backendItems.milestones.length > 0 ||
          backendItems.plans.length > 0) {
        console.log('[ActionReviewModal] Sending bulk create request to backend:', backendItems);

        const response = await fetchWithAuth(`${API_BASE_URL}/api/bulk/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            ...backendItems
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create items');
        }

        const result = await response.json();
        console.log('[ActionReviewModal] Bulk create successful:', result);

        // Track created tasks
        if (result.tasks) {
          result.tasks.forEach((task: any) => {
            newCreatedItems.push({
              type: 'task',
              id: task.id,
              title: task.title,
            });
          });
        }

        // Track created milestones
        if (result.milestones) {
          result.milestones.forEach((milestone: any) => {
            newCreatedItems.push({
              type: 'milestone',
              id: milestone.id,
              title: milestone.title,
            });
          });
        }

        // Track created plans
        if (result.plans) {
          result.plans.forEach((plan: any) => {
            newCreatedItems.push({
              type: 'plan',
              id: plan.id,
              title: plan.title,
            });
          });
        }
      }

      // Call original confirm handler with created items
      if (onConfirm && suggestion) {
        onConfirm(suggestion, newCreatedItems);
      }

      // Show success modal if items were created
      if (newCreatedItems.length > 0) {
        setCreatedItems(newCreatedItems);
        setShowSuccessModal(true);
      } else {
        // No items created, just close
        onClose();
      }
    } catch (err) {
      console.error('[ActionReviewModal] Error creating items:', err);
      setError(err instanceof Error ? err.message : 'Failed to create items');
    }
  };

  const updateField = (category: keyof ActionDetails, index: number, field: string, value: any) => {
    if (!editedDetails) return;

    setEditedDetails(prev => {
      if (!prev) return prev;

      const updated = { ...prev };
      const items = updated[category] as any[];

      if (items && items[index]) {
        items[index] = { ...items[index], [field]: value };
      }

      return updated;
    });
  };

  const deleteItem = (category: keyof ActionDetails, index: number) => {
    if (!editedDetails) return;

    setEditedDetails(prev => {
      if (!prev) return prev;

      const updated = { ...prev };
      const items = updated[category] as any[];

      if (items) {
        updated[category] = items.filter((_, i) => i !== index) as any;
      }

      return updated;
    });
  };

  const getMilestoneName = (milestoneId: string): string => {
    if (!editedDetails?.milestones) return milestoneId;
    const milestone = editedDetails.milestones.find(m => m.id === milestoneId);
    return milestone?.title || milestoneId;
  };

  const getTasksForMilestone = (milestoneId: string) => {
    if (!editedDetails?.tasks) return [];
    return editedDetails.tasks.filter(task => task.milestone_id === milestoneId);
  };

  const scrollToTab = (tab: 'tasks' | 'milestones' | 'plans') => {
    setActiveTab(tab);
  };

  if (!isOpen || !suggestion) return null;

  const Icon = suggestion.actionType
    ? ACTION_ICONS[suggestion.actionType] || Sparkles
    : Sparkles;
  const colorGradient = suggestion.actionType
    ? ACTION_COLORS[suggestion.actionType] || 'from-purple-500 to-purple-600'
    : 'from-purple-500 to-purple-600';
  const actionLabel = suggestion.actionType
    ? ACTION_LABELS[suggestion.actionType] || 'AI Action'
    : 'AI Action';

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colorGradient} p-6 text-white flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{actionLabel}</h2>
                <p className="text-sm text-white/80">Review and edit before creating</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-900 font-medium mb-2">{loadingMessage}</p>
              <p className="text-sm text-gray-500">This may take a moment for complex contexts...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && editedDetails && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-2">
                  {editedDetails.tasks && editedDetails.tasks.length > 0 && (
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'tasks'
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        <span>Tasks ({editedDetails.tasks.length})</span>
                      </div>
                    </button>
                  )}
                  {editedDetails.milestones && editedDetails.milestones.length > 0 && (
                    <button
                      onClick={() => setActiveTab('milestones')}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'milestones'
                          ? 'border-cyan-500 text-cyan-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MilestoneIcon className="w-4 h-4" />
                        <span>Milestones ({editedDetails.milestones.length})</span>
                      </div>
                    </button>
                  )}
                  {editedDetails.plans && editedDetails.plans.length > 0 && (
                    <button
                      onClick={() => setActiveTab('plans')}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'plans'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span>Plans ({editedDetails.plans.length})</span>
                      </div>
                    </button>
                  )}
                  {editedDetails.nodes && editedDetails.nodes.length > 0 && (
                    <button
                      onClick={() => setActiveTab('nodes')}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'nodes'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        <span>Nodes ({editedDetails.nodes.length})</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {/* Tasks Tab */}
                {activeTab === 'tasks' && editedDetails.tasks && editedDetails.tasks.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-emerald-900">Tasks ({editedDetails.tasks.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {editedDetails.tasks.map((task, idx) => (
                      <div key={idx} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Title
                              </label>
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => updateField('tasks', idx, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => deleteItem('tasks', idx)}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                              Description
                            </label>
                            <textarea
                              value={task.description}
                              onChange={(e) => updateField('tasks', idx, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Status
                              </label>
                              <select
                                value={task.status || 'pending'}
                                onChange={(e) => updateField('tasks', idx, 'status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Priority
                              </label>
                              <select
                                value={task.priority || 'medium'}
                                onChange={(e) => updateField('tasks', idx, 'priority', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Est. Hours
                              </label>
                              <input
                                type="number"
                                value={task.estimated_hours || ''}
                                onChange={(e) => updateField('tasks', idx, 'estimated_hours', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          {task.milestone_id && (
                            <button
                              onClick={() => scrollToTab('milestones')}
                              className="flex items-center gap-2 text-sm text-cyan-700 bg-cyan-50 px-3 py-2 rounded-md hover:bg-cyan-100 transition-colors w-fit"
                            >
                              <MilestoneIcon className="w-4 h-4 text-cyan-600" />
                              <span>Linked to milestone: <span className="font-medium">{getMilestoneName(task.milestone_id)}</span></span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones Tab */}
              {activeTab === 'milestones' && editedDetails.milestones && editedDetails.milestones.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-cyan-50 border-b border-cyan-200 px-4 py-3 flex items-center gap-2">
                    <MilestoneIcon className="w-5 h-5 text-cyan-600" />
                    <h3 className="font-semibold text-cyan-900">Milestones ({editedDetails.milestones.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {editedDetails.milestones.map((milestone, idx) => {
                      const linkedTasks = getTasksForMilestone(milestone.id || `milestone-${idx}`);
                      return (
                      <div key={idx} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Title
                              </label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => updateField('milestones', idx, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => deleteItem('milestones', idx)}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                              Description
                            </label>
                            <textarea
                              value={milestone.description}
                              onChange={(e) => updateField('milestones', idx, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={milestone.due_date || ''}
                                onChange={(e) => updateField('milestones', idx, 'due_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Status
                              </label>
                              <select
                                value={milestone.status || 'not_started'}
                                onChange={(e) => updateField('milestones', idx, 'status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          </div>
                          {linkedTasks.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 mb-2">
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                                <span>Linked Tasks ({linkedTasks.length})</span>
                              </div>
                              <div className="space-y-1">
                                {linkedTasks.map((task, taskIdx) => (
                                  <button
                                    key={taskIdx}
                                    onClick={() => scrollToTab('tasks')}
                                    className="flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 px-2 py-1 rounded transition-colors w-full text-left"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="truncate">{task.title}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Plans Tab */}
              {activeTab === 'plans' && editedDetails.plans && editedDetails.plans.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Plans ({editedDetails.plans.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {editedDetails.plans.map((plan, idx) => (
                      <div key={idx} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Title
                              </label>
                              <input
                                type="text"
                                value={plan.title}
                                onChange={(e) => updateField('plans', idx, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => deleteItem('plans', idx)}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete plan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                              Description
                            </label>
                            <textarea
                              value={plan.description}
                              onChange={(e) => updateField('plans', idx, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                              Plan Type
                            </label>
                            <select
                              value={plan.plan_type || 'action'}
                              onChange={(e) => updateField('plans', idx, 'plan_type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="action">Action Plan</option>
                              <option value="strategy">Strategy Plan</option>
                              <option value="timeline">Timeline Plan</option>
                            </select>
                          </div>
                          {plan.milestone_ids && plan.milestone_ids.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-cyan-50 px-3 py-2 rounded-md">
                              <LinkIcon className="w-4 h-4 text-cyan-600" />
                              <span>Contains {plan.milestone_ids.length} milestone(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nodes Tab */}
              {activeTab === 'nodes' && editedDetails.nodes && editedDetails.nodes.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 border-b border-purple-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">Node Ideas ({editedDetails.nodes.length})</h3>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">Select one idea to create as a child node</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {editedDetails.nodes.map((node, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedNodeIndex(idx)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedNodeIndex === idx
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                            selectedNodeIndex === idx
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300 bg-white'
                          }`}>
                            {selectedNodeIndex === idx && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{node.title}</h4>
                            <p className="text-sm text-gray-600">{node.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}


              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 mt-4">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-1">AI-Generated Content</p>
                  <p className="text-xs text-blue-700">
                    All fields are editable. Review the details and relationships. Click on linked items to jump to their tab.
                    {editedDetails?.nodes && editedDetails.nodes.length > 0 && (
                      <span className="block mt-2 text-purple-700 font-medium">
                        Note: Select one node idea to create as a child node. Only the selected node will be created.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isExecuting || loading || !!error || !editedDetails}
            className={`
              px-6 py-2 rounded-lg font-medium text-white
              bg-gradient-to-r ${colorGradient}
              hover:shadow-lg hover:scale-105
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center gap-2
            `}
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {editedDetails?.nodes && editedDetails.nodes.length > 0 &&
                   (!editedDetails.tasks || editedDetails.tasks.length === 0) &&
                   (!editedDetails.milestones || editedDetails.milestones.length === 0) &&
                   (!editedDetails.plans || editedDetails.plans.length === 0)
                    ? 'Create Selected Node'
                    : 'Create All'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return (
    <>
      {createPortal(modalContent, document.body)}
      <ActionSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedItems([]);
          onClose(); // Close the ActionReviewModal after success modal is dismissed
        }}
        createdItems={createdItems}
        projectId={projectId}
      />
    </>
  );
};

export default ActionReviewModal;
