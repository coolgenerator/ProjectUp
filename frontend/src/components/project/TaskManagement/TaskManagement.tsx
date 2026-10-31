import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CreateTaskModal from './CreateTaskModal';
import CreateMilestoneModal from './CreateMilestoneModal';
import CreateSectionModal from './CreateSectionModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import TaskListView from './TaskListView';
import TaskBoardView from './TaskBoardView';
import TimelineView from './TimelineView';
import DependencyGraph from './DependencyGraph';
import BulkActionsToolbar from './BulkActionsToolbar';
import { Task, TaskStatus, TaskPriority, TaskViewMode, TaskStats } from '../../../types/task';
import { WorkItem, combineWorkItems } from '../../../types/workItem';
import { MilestoneStatus } from '../../../types/project/milestone';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { useProjectMilestones } from '../../../hooks/useProjectMilestones';
import { useProjectSections } from '../../../hooks/useProjectSections';

interface TaskManagementProps {
  projectId?: string; // Numeric project ID for tasks API
  projectSid?: string; // Short ID (SID) for milestones and other APIs
}

const TaskManagement: React.FC<TaskManagementProps> = ({ projectId: propProjectId, projectSid: propProjectSid }) => {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || paramProjectId; // Use prop if provided, otherwise useParams
  const projectSid = propProjectSid || projectId; // Use SID if provided, fallback to projectId
  const location = useLocation();
  const navigate = useNavigate();

  // Get initial view mode from URL or default to 'list'
  const getInitialViewMode = (): TaskViewMode => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view') as TaskViewMode | null;
    const validViews: TaskViewMode[] = ['list', 'board', 'timeline', 'graph'];
    return viewParam && validViews.includes(viewParam) ? viewParam : 'list';
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<TaskViewMode>(getInitialViewMode());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateMilestoneModal, setShowCreateMilestoneModal] = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | 'all'>('all');
  const [showMilestones, setShowMilestones] = useState(true);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [preSelectedSectionId, setPreSelectedSectionId] = useState<number | undefined>(undefined);
  const [preSelectedMilestoneId, setPreSelectedMilestoneId] = useState<number | undefined>(undefined);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [projectMembers, setProjectMembers] = useState<Array<{ user_id: number; username: string; name: string; avatar?: string }>>([]);

  // Sort state
  type SortField = 'created' | 'due_date' | 'priority' | 'progress';
  type SortDirection = 'asc' | 'desc';
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<number | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  // Get user ID from localStorage
  const userId = localStorage.getItem('user_id') || 'unknown';

  // Function to update view mode and URL
  const handleViewModeChange = (newViewMode: TaskViewMode) => {
    setViewMode(newViewMode);

    // Update URL with new view parameter
    const params = new URLSearchParams(location.search);
    params.set('view', newViewMode);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Sync view mode with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view') as TaskViewMode | null;
    const validViews: TaskViewMode[] = ['list', 'board', 'timeline', 'graph'];

    if (viewParam && validViews.includes(viewParam) && viewParam !== viewMode) {
      setViewMode(viewParam);
    }
  }, [location.search]);

  // Fetch milestones (using projectSid for milestone API)
  const { milestones, fetchMilestones } = useProjectMilestones({
    projectId: projectSid || '',
    autoFetch: !!projectSid
  });

  // Fetch sections
  const { sections, createSection, updateSection, deleteSection } = useProjectSections({
    projectId: projectId || '',
    autoFetch: !!projectId
  });

  // Filter and sort tasks (applied regardless of milestone visibility)
  const filteredTasks = useMemo(() => {
    let filtered: Task[] = [];

    // Don't filter by milestone anymore - we want all tasks
    // The milestone grouping happens in workItems/TaskListView
    filtered = [...tasks];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply section filter
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(task => task.section_id === sectionFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Then sort (if sortBy is set)
    if (!sortBy) {
      return filtered; // No sorting applied
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'due_date':
          // Handle null/undefined due dates - put them at the end
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tasks, sortBy, sortDirection, statusFilter, sectionFilter, priorityFilter]);

  // Combine tasks and milestones into work items
  // Use filteredTasks so that filters and sorting are applied
  const workItems = useMemo(() => {
    const items = combineWorkItems(filteredTasks, milestones);

    // Filter out milestones if toggle is off
    if (!showMilestones) {
      return items.filter(item => item.type === 'task');
    }

    return items;
  }, [filteredTasks, milestones, showMilestones]);

  // Fetch tasks
  const fetchTasks = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/project/${projectId}?limit=500`);

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        console.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!projectId) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/project/${projectId}/stats`);

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchProjectMembers();
  }, [projectId, projectSid]);

  // Fetch project members (use projectSid for members API)
  const fetchProjectMembers = async () => {
    if (!projectSid) return;

    try {
      const response = await fetchWithAuth(`/api/project/${projectSid}/members`);
      if (response.ok) {
        const data = await response.json();
        setProjectMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  // Handle task status update
  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/status?status=${status}`, {
        method: 'PATCH'
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
      } else {
        console.error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    console.log('[TaskManagement] Task clicked:', task.id, task.title);
    setSelectedTaskId(task.id);
    setShowDetailModal(true);
    console.log('[TaskManagement] Modal should open now');
  };

  // Handle task edit
  const handleEditTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setShowDetailModal(true);
  };

  // Bulk selection handlers
  const handleToggleSelection = (taskId: string, selected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
    setSelectionMode(false);
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      if (sortDirection === 'asc') {
        // Third click: deselect sorting
        setSortBy(null);
        setSortDirection('desc');
      } else {
        // Second click: toggle to ascending
        setSortDirection('asc');
      }
    } else {
      // First click: set new field with default direction
      setSortBy(field);
      setSortDirection(field === 'created' ? 'desc' : 'asc');
    }
  };

  const handleConvert = async (itemId: string, targetType: 'task' | 'milestone') => {
    try {
      const workItem = workItems.find(item => item.id === itemId);
      if (!workItem) return;

      let response;
      if (targetType === 'milestone') {
        // Convert task to milestone
        response = await fetchWithAuth(`/api/tasks/${itemId}/convert-to-milestone`, {
          method: 'POST'
        });
      } else {
        // Convert milestone to task
        const milestoneId = workItem.originalMilestone?.milestone_id;
        if (!milestoneId || !projectId) return;

        response = await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}/convert-to-task`, {
          method: 'POST'
        });
      }

      if (response.ok) {
        // Close the drawer
        setShowDetailModal(false);
        setSelectedTaskId(null);

        // Refresh data
        await fetchTasks();
        await fetchStats();
      } else {
        const error = await response.json();
        console.error(`Failed to convert to ${targetType}:`, error);
        alert(`Failed to convert: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error converting work item:', error);
      alert('Failed to convert. Please try again.');
    }
  };

  // Bulk action handlers
  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    const taskIds = Array.from(selectedTaskIds);

    try {
      const response = await fetchWithAuth('/api/tasks/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({
          task_ids: taskIds,
          updates: { status }
        })
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
        handleClearSelection();
      } else {
        console.error('Failed to bulk update tasks');
      }
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
    }
  };

  const handleBulkPriorityUpdate = async (priority: TaskPriority) => {
    const taskIds = Array.from(selectedTaskIds);

    try {
      const response = await fetchWithAuth('/api/tasks/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({
          task_ids: taskIds,
          updates: { priority }
        })
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
        handleClearSelection();
      } else {
        console.error('Failed to bulk update tasks');
      }
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
    }
  };

  const handleBulkAssign = async (username: string) => {
    const taskIds = Array.from(selectedTaskIds);

    try {
      const response = await fetchWithAuth('/api/tasks/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({
          task_ids: taskIds,
          updates: { assigned_to: username || null }
        })
      });

      if (response.ok) {
        await fetchTasks();
        handleClearSelection();
      } else {
        console.error('Failed to bulk assign tasks');
      }
    } catch (error) {
      console.error('Error bulk assigning tasks:', error);
    }
  };

  const handleBulkDelete = async () => {
    const taskIds = Array.from(selectedTaskIds);

    try {
      const response = await fetchWithAuth('/api/tasks/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({ task_ids: taskIds })
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
        handleClearSelection();
      } else {
        console.error('Failed to bulk delete tasks');
      }
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
    }
  };

  // Section handlers
  const handleCreateSection = async (name: string) => {
    if (!projectId) return;

    const section = await createSection({
      project_id: projectId,
      name
    });

    if (!section) {
      console.error('Failed to create section');
    }
  };

  const handleSectionRename = async (sectionId: number, newName: string) => {
    const success = await updateSection(sectionId, { name: newName });
    if (!success) {
      console.error('Failed to rename section');
    }
  };

  const handleSectionDelete = async (sectionId: number) => {
    if (window.confirm('Are you sure you want to delete this section? Tasks will not be deleted, but will be moved to "No Section".')) {
      const success = await deleteSection(sectionId);
      if (success) {
        await fetchTasks(); // Refresh tasks to show updated section assignments
      } else {
        console.error('Failed to delete section');
      }
    }
  };

  const handleSectionColorChange = async (sectionId: number, color: string) => {
    const success = await updateSection(sectionId, { color });
    if (!success) {
      console.error('Failed to update section color');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Compact Header - Asana Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Top Row: View switcher and Add task button */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* View switcher */}
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600 mr-2">View:</span>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`px-2.5 py-1 rounded text-sm transition-all ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => handleViewModeChange('board')}
                  className={`px-2.5 py-1 rounded text-sm transition-all ${
                    viewMode === 'board' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => handleViewModeChange('timeline')}
                  className={`px-2.5 py-1 rounded text-sm transition-all ${
                    viewMode === 'timeline' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => handleViewModeChange('graph')}
                  className={`px-2.5 py-1 rounded text-sm transition-all ${
                    viewMode === 'graph' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Dependencies Graph
                </button>
              </div>
            </div>

            {/* Right side: Add Task/Milestone Dropdown */}
            <div className="relative">
              <div className="inline-flex rounded">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white font-medium text-sm rounded-l hover:bg-blue-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add task
                </button>
                <button
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  className="px-2 py-1.5 bg-blue-600 text-white border-l border-blue-500 rounded-r hover:bg-blue-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu */}
              {showAddDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAddDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setShowAddDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="font-medium">Add task</div>
                      <div className="text-xs text-gray-500 mt-0.5">Tab + N</div>
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateMilestoneModal(true);
                        setShowAddDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="font-medium">Add milestone</div>
                      <div className="text-xs text-gray-500 mt-0.5">Tab + M</div>
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        setShowCreateSectionModal(true);
                        setShowAddDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="font-medium">Add section</div>
                      <div className="text-xs text-gray-500 mt-0.5">Tab + S</div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row: Filters and Sort - Only show in List/Board view */}
          {(viewMode === 'list' || viewMode === 'board') && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Filters</span>
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                    className="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                  {/* Section filter */}
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
                  >
                    <option value="all">All sections</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                  {/* Priority filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as TaskPriority)}
                    className="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All priorities</option>
                    <option value="1">P1 - Urgent</option>
                    <option value="2">P2 - High</option>
                    <option value="3">P3 - Medium</option>
                    <option value="4">P4 - Low</option>
                    <option value="5">P5 - Backlog</option>
                  </select>
                  {/* Hide Milestones toggle */}
                  <button
                    onClick={() => setShowMilestones(!showMilestones)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-all whitespace-nowrap"
                  >
                    {showMilestones ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    {showMilestones ? 'Hide' : 'Show'} Milestones
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 whitespace-nowrap">Sort by</span>
                  <button
                    onClick={() => handleSortChange('created')}
                    className={`px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                      sortBy === 'created'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Click to sort, click again to toggle direction, click third time to deselect"
                  >
                    Created {sortBy === 'created' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('due_date')}
                    className={`px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                      sortBy === 'due_date'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Click to sort, click again to toggle direction, click third time to deselect"
                  >
                    Due date {sortBy === 'due_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('priority')}
                    className={`px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                      sortBy === 'priority'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Click to sort, click again to toggle direction, click third time to deselect"
                  >
                    Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('progress')}
                    className={`px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                      sortBy === 'progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Click to sort, click again to toggle direction, click third time to deselect"
                  >
                    Progress {sortBy === 'progress' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {viewMode === 'board' && (
            <TaskBoardView
              tasks={filteredTasks}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateStatus={handleUpdateStatus}
              loading={loading}
              milestones={milestones}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onToggleSelection={handleToggleSelection}
              projectMembers={projectMembers}
            />
          )}

          {viewMode === 'list' && (
            <TaskListView
              tasks={filteredTasks}
              allTasks={tasks}
              workItems={workItems}
              sections={sections}
              sectionFilter={sectionFilter}
              showMilestones={showMilestones}
              onToggleMilestones={() => setShowMilestones(!showMilestones)}
              onTaskClick={handleTaskClick}
              onWorkItemClick={(workItem) => {
                // Handle clicking on work items (could be task or milestone)
                if (workItem.type === 'task' && workItem.originalTask) {
                  handleTaskClick(workItem.originalTask);
                } else if (workItem.type === 'milestone') {
                  // For now, show in detail drawer (we'll handle milestones later)
                  setSelectedTaskId(workItem.id);
                  setShowDetailModal(true);
                }
              }}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateStatus={handleUpdateStatus}
              onUpdateTask={async (itemId, updates) => {
                try {
                  const workItem = workItems.find(item => item.id === itemId);
                  if (!workItem) return;

                  let response;
                  if (workItem.type === 'milestone' && workItem.originalMilestone) {
                    const milestoneId = workItem.originalMilestone.milestone_id;
                    response = await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updates)
                    });
                  } else {
                    response = await fetchWithAuth(`/api/tasks/${itemId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updates)
                    });
                  }

                  if (response.ok) {
                    await fetchTasks();
                    await fetchStats();
                    // Refresh milestones if we updated a milestone
                    if (workItem.type === 'milestone') {
                      await fetchMilestones();
                    }

                    // Auto-complete milestone if all its tasks are done
                    if (workItem.type === 'task' && workItem.originalTask?.milestone_id && updates.status === 'done') {
                      const milestoneId = workItem.originalTask.milestone_id;
                      const milestoneTasks = tasks.filter(t => t.milestone_id === milestoneId);
                      const allTasksDone = milestoneTasks.every(t =>
                        t.id === itemId ? true : t.status === 'done'
                      );

                      if (allTasksDone) {
                        // Mark milestone as completed
                        await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'completed', completed: true })
                        });
                        await fetchMilestones();
                      }
                    }

                    // Reopen milestone if a task is marked as not done
                    if (workItem.type === 'task' && workItem.originalTask?.milestone_id && updates.status !== 'done') {
                      const milestoneId = workItem.originalTask.milestone_id;
                      const milestone = milestones.find(m => m.milestone_id === milestoneId);

                      if (milestone?.completed) {
                        // Reopen milestone
                        await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'in_progress', completed: false })
                        });
                        await fetchMilestones();
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error updating work item:', error);
                }
              }}
              onCreateSection={handleCreateSection}
              onSectionRename={handleSectionRename}
              onSectionDelete={handleSectionDelete}
              onSectionColorChange={handleSectionColorChange}
              onReorderTasks={async (sectionId, itemIds) => {
                try {
                  // Filter out milestones - only reorder actual tasks
                  const taskIds = itemIds.filter(id => !id.startsWith('milestone-'));

                  // Update task order for the section
                  const updatePromises = taskIds.map((taskId, index) =>
                    fetchWithAuth(`/api/tasks/${taskId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        section_id: sectionId,
                        section_order: index,
                      }),
                    })
                  );

                  await Promise.all(updatePromises);
                  await fetchTasks();
                } catch (error) {
                  console.error('Error reordering tasks:', error);
                }
              }}
              onAddTask={(sectionId, milestoneId) => {
                setPreSelectedSectionId(sectionId);
                setPreSelectedMilestoneId(milestoneId);
                setShowCreateModal(true);
              }}
              onAddMilestone={(sectionId) => {
                setPreSelectedSectionId(sectionId);
                setShowCreateMilestoneModal(true);
              }}
              onRefreshData={async () => {
                await fetchTasks();
                await fetchStats();
                await fetchMilestones();
              }}
              loading={loading}
              milestones={milestones}
              projectMembers={projectMembers}
              projectId={projectId}
            />
          )}

          {viewMode === 'graph' && projectId && (
            <DependencyGraph
              projectId={projectId}
              onTaskClick={(taskId) => {
                setSelectedTaskId(taskId);
                setShowDetailModal(true);
              }}
            />
          )}

          {viewMode === 'timeline' && (
            <TimelineView
              tasks={filteredTasks}
              workItems={workItems}
              onTaskClick={handleTaskClick}
              projectId={projectId}
            />
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedSectionId(undefined);
            setPreSelectedMilestoneId(undefined);
          }}
          onTaskCreated={() => {
            fetchTasks();
            fetchStats();
            setPreSelectedSectionId(undefined);
            setPreSelectedMilestoneId(undefined);
          }}
          projectId={projectId!}
          userId={userId}
          preSelectedSectionId={preSelectedSectionId}
          preSelectedMilestoneId={preSelectedMilestoneId}
        />
      )}

      {/* Create Milestone Modal */}
      {showCreateMilestoneModal && (
        <CreateMilestoneModal
          isOpen={showCreateMilestoneModal}
          onClose={() => {
            setShowCreateMilestoneModal(false);
            setPreSelectedSectionId(undefined);
          }}
          onMilestoneCreated={() => {
            fetchTasks();
            fetchStats();
            setPreSelectedSectionId(undefined);
            // Milestones will be refreshed via the hook
          }}
          projectId={projectId!}
          preSelectedSectionId={preSelectedSectionId}
        />
      )}

      {/* Create Section Modal */}
      {showCreateSectionModal && (
        <CreateSectionModal
          isOpen={showCreateSectionModal}
          onClose={() => setShowCreateSectionModal(false)}
          onSectionCreated={async (name) => {
            if (projectId) {
              try {
                await createSection({
                  project_id: projectId,
                  name: name
                });
              } catch (error) {
                console.error('Error creating section:', error);
                throw error;
              }
            }
          }}
        />
      )}

      {/* Bulk Actions Toolbar */}
      {selectionMode && selectedTaskIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedTaskIds.size}
          onClearSelection={handleClearSelection}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkPriorityUpdate={handleBulkPriorityUpdate}
          onBulkAssign={handleBulkAssign}
          onBulkDelete={handleBulkDelete}
          projectMembers={projectMembers}
        />
      )}

      {/* Work Item Detail Drawer */}
      <TaskDetailDrawer
        open={showDetailModal}
        workItem={selectedTaskId ? workItems.find(item => item.id === selectedTaskId) || null : null}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTaskId(null);
        }}
        onUpdate={async (itemId, updates) => {
          try {
            // Determine if this is a task or milestone
            const workItem = workItems.find(item => item.id === itemId);
            if (!workItem) return;

            let response;
            if (workItem.type === 'milestone' && workItem.originalMilestone) {
              // Update milestone via milestone API
              const milestoneId = workItem.originalMilestone.milestone_id;
              response = await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
            } else {
              // Update task via task API
              response = await fetchWithAuth(`/api/tasks/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
            }

            if (response.ok) {
              await fetchTasks();
              await fetchStats();
              // Also refresh milestones if we updated a milestone
              if (workItem.type === 'milestone') {
                await fetchMilestones();
              }
            } else {
              console.error(`Failed to update ${workItem.type}`);
            }
          } catch (error) {
            console.error('Error updating work item:', error);
          }
        }}
        onDelete={async (itemId) => {
          const workItem = workItems.find(item => item.id === itemId);
          if (!workItem) return;

          if (workItem.type === 'milestone' && workItem.originalMilestone) {
            // Delete milestone
            const milestoneId = workItem.originalMilestone.milestone_id;
            try {
              const response = await fetchWithAuth(`/api/project/${projectSid}/milestones/${milestoneId}`, {
                method: 'DELETE'
              });

              if (response.ok) {
                await fetchTasks();
                await fetchStats();
                await fetchMilestones();
              } else {
                console.error('Failed to delete milestone');
              }
            } catch (error) {
              console.error('Error deleting milestone:', error);
            }
          } else {
            // Delete task
            await handleDeleteTask(itemId);
          }
        }}
        onConvert={handleConvert}
        sections={sections}
        milestones={milestones}
        projectMembers={projectMembers}
      />
    </div>
  );
};

export default TaskManagement;
