import React, { useState, useEffect, useMemo } from 'react';
import LearningResourceList from './LearningResourceList';
import SubtaskList from './SubtaskList';
import DependencyList from './DependencyList';
import { TaskGuidance } from '../TaskGuidance';
import {
  Task,
  TaskStatus,
  TaskPriority,
  UpdateTaskRequest,
  STATUS_CONFIG
} from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { useProjectMilestones } from '../../../hooks/useProjectMilestones';

interface ProjectMember {
  user_id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdated: () => void;
}

type TabType = 'details' | 'dependencies' | 'guidance' | 'resources' | 'subtasks' | 'time' | 'activity';

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>(3);
  const [progress, setProgress] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [milestoneId, setMilestoneId] = useState<number | ''>('');

  // Fetch milestones
  const { milestones, loading: loadingMilestones } = useProjectMilestones({
    projectId: task?.project_id || '',
    autoFetch: !!task?.project_id
  });

  // Fetch task details
  const fetchTask = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `/api/tasks/${taskId}?include_resources=true&include_subtasks=true`
      );

      if (response.ok) {
        const data = await response.json();
        const taskData = data.task;
        setTask(taskData);

        // Populate form
        setTitle(taskData.title);
        setDescription(taskData.description || '');
        // Validate status before setting, default to 'todo' if invalid
        const validStatus = taskData.status && STATUS_CONFIG[taskData.status as keyof typeof STATUS_CONFIG] ? taskData.status : 'todo';
        setStatus(validStatus);
        setPriority(taskData.priority);
        setProgress(taskData.progress);
        setEstimatedHours(taskData.estimated_hours?.toString() || '');
        setActualHours(taskData.actual_hours?.toString() || '');
        setStartDate(taskData.start_date ? taskData.start_date.split('T')[0] : '');
        setDueDate(taskData.due_date ? taskData.due_date.split('T')[0] : '');
        setAssignedTo(taskData.assigned_to || []);
        setTags(taskData.tags || []);
        setMilestoneId(taskData.milestone_id || '');
      } else {
        setError('Failed to load task');
      }
    } catch (err) {
      setError('Error loading task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[TaskDetailModal] Effect triggered - isOpen:', isOpen, 'taskId:', taskId);
    if (isOpen && taskId) {
      console.log('[TaskDetailModal] Fetching task...');
      fetchTask();
      setActiveTab('details');
    }
  }, [isOpen, taskId]);

  // Fetch project members when task is loaded
  useEffect(() => {
    const fetchMembers = async () => {
      if (!task || !task.project_id) return;

      setLoadingMembers(true);
      try {
        const response = await fetchWithAuth(`/api/project/${task.project_id}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error('Error fetching project members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [task?.project_id]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updateData: UpdateTaskRequest = {
        title,
        description,
        status,
        priority,
        progress,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        actual_hours: actualHours ? parseFloat(actualHours) : undefined,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        assigned_to: assignedTo, // Always send array, even if empty
        tags: tags.length > 0 ? tags : undefined,
        milestone_id: milestoneId || undefined
      };

      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchTask();
        onTaskUpdated();
      } else {
        setError('Failed to update task');
      }
    } catch (err) {
      setError('Error updating task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle description change and auto-save
  const handleDescriptionChange = async (newDescription: string) => {
    setDescription(newDescription);

    // Auto-save the changes
    try {
      await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ description: newDescription })
      });

      onTaskUpdated();
    } catch (err) {
      console.error('Error updating description:', err);
    }
  };

  if (!isOpen) {
    console.log('[TaskDetailModal] Not rendering - isOpen is false');
    return null;
  }
  console.log('[TaskDetailModal] Rendering modal for task:', taskId);

  // Safety check: ensure status is valid, default to 'todo' if not
  const validStatus = status && STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ? status : 'todo';
  const statusConfig = STATUS_CONFIG[validStatus as keyof typeof STATUS_CONFIG];
  const cardColor = '#3b82f6'; // Default blue color

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-2 border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-sky-50">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-3xl">✅</span>
            <div className="flex-1">
              {loading ? (
                <div className="h-8 bg-slate-200 rounded animate-pulse w-64"></div>
              ) : (
                <h2 className="text-2xl font-bold text-slate-800">{task?.title}</h2>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    color: statusConfig.color,
                    backgroundColor: statusConfig.bgColor
                  }}
                >
                  {statusConfig.label}
                </span>
                <span className="text-xs text-slate-500">
                  ID: {taskId.slice(0, 8)}
                </span>
                {task?.idea_node_id && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Linked to Idea Forest
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-all text-slate-600 hover:text-slate-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-slate-200 bg-slate-50 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📝 Details
            </button>
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'dependencies'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              🔗 Dependencies
            </button>
            <button
              onClick={() => setActiveTab('guidance')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'guidance'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📋 How-To Guide
              {task?.guidance && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  AI
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'resources'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📚 Resources ({task?.learning_resources?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('subtasks')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'subtasks'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              ✅ Subtasks ({task?.subtasks?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'time'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              ⏱️ Time Tracking
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === 'activity'
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📊 Activity
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-slate-600">Loading task details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      placeholder="Add task description... Tip: Use [ ] or [] syntax, they'll be auto-detected and can be imported as subtasks!"
                    />
                  </div>

                  {/* Status and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
                      <div className="flex gap-2">
                        {([1, 2, 3, 4, 5] as TaskPriority[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2 rounded-lg border-2 font-semibold transition-all ${
                              priority === p
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            P{p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Progress: {progress}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(parseInt(e.target.value))}
                      className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${statusConfig.color} 0%, ${statusConfig.color} ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)`
                      }}
                    />
                  </div>

                  {/* Milestone and Assignment Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Milestone */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Milestone</label>
                      {loadingMilestones ? (
                        <div className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-center">
                          Loading milestones...
                        </div>
                      ) : (
                        <select
                          value={milestoneId}
                          onChange={(e) => setMilestoneId(e.target.value ? parseInt(e.target.value) : '')}
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white"
                        >
                          <option value="">No milestone</option>
                          {milestones.map((milestone) => (
                            <option key={milestone.milestone_id} value={milestone.milestone_id}>
                              🎯 {milestone.title}
                              {milestone.due_date && ` (Due: ${new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Assigned To */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Assigned To</label>
                      {loadingMembers ? (
                        <div className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-center">
                          Loading team members...
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-slate-200 rounded-lg p-2">
                          {members.length > 0 ? (
                            members.map((member) => (
                              <label
                                key={member.user_id}
                                className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={assignedTo.includes(member.username)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignedTo([...assignedTo, member.username]);
                                    } else {
                                      setAssignedTo(assignedTo.filter(u => u !== member.username));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                  {member.name} (@{member.username})
                                </span>
                                <span className="text-xs text-slate-500 ml-auto">{member.role}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-sm text-slate-500 text-center py-2">
                              No team members available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-slate-500 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Type a tag and press Enter..."
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Dependencies Tab */}
              {activeTab === 'dependencies' && task && (
                <DependencyList
                  taskId={taskId}
                  projectId={task.project_id.toString()}
                  onTaskClick={(clickedTaskId) => {
                    // Open the clicked task in a new modal (or handle navigation)
                    console.log('Navigate to task:', clickedTaskId);
                  }}
                />
              )}

              {/* Guidance Tab */}
              {activeTab === 'guidance' && task && (
                <div>
                  {task.guidance ? (
                    <TaskGuidance
                      taskId={taskId}
                      projectId={task.project_id.toString()}
                      guidance={task.guidance as any}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        No Guidance Available
                      </h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        This task doesn't have AI-generated execution guidance yet.
                        Guidance is automatically created for tasks extracted from ideas.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resources Tab */}
              {activeTab === 'resources' && task && (
                <LearningResourceList
                  taskId={taskId}
                  onResourcesChanged={fetchTask}
                />
              )}

              {/* Subtasks Tab */}
              {activeTab === 'subtasks' && task && (
                <SubtaskList
                  taskId={taskId}
                  onSubtasksChanged={fetchTask}
                  taskDescription={description}
                  onDescriptionChange={handleDescriptionChange}
                />
              )}

              {/* Time Tracking Tab */}
              {activeTab === 'time' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Actual Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={actualHours}
                        onChange={(e) => setActualHours(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Time Summary */}
                  {(estimatedHours || actualHours) && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-bold text-blue-900 mb-3">Time Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {estimatedHours && (
                          <div>
                            <div className="text-sm text-blue-600">Estimated</div>
                            <div className="text-2xl font-bold text-blue-900">{estimatedHours}h</div>
                          </div>
                        )}
                        {actualHours && (
                          <div>
                            <div className="text-sm text-blue-600">Actual</div>
                            <div className="text-2xl font-bold text-blue-900">{actualHours}h</div>
                          </div>
                        )}
                        {estimatedHours && actualHours && (
                          <div className="col-span-2">
                            <div className="text-sm text-blue-600">Variance</div>
                            <div className={`text-xl font-bold ${
                              parseFloat(actualHours) > parseFloat(estimatedHours)
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {(parseFloat(actualHours) - parseFloat(estimatedHours)).toFixed(1)}h
                              ({Math.round(((parseFloat(actualHours) - parseFloat(estimatedHours)) / parseFloat(estimatedHours)) * 100)}%)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && task && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-sm text-slate-600">Created</div>
                      <div className="text-lg font-semibold text-slate-800">
                        {new Date(task.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">by {task.created_by}</div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-sm text-slate-600">Last Updated</div>
                      <div className="text-lg font-semibold text-slate-800">
                        {new Date(task.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {task.completed_at && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg col-span-2">
                        <div className="text-sm text-green-600">Completed</div>
                        <div className="text-lg font-semibold text-green-800">
                          {new Date(task.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="font-bold text-slate-800 mb-2">Task Metadata</h4>
                    <pre className="text-xs text-slate-600 overflow-auto">
                      {JSON.stringify(task, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 bg-slate-50 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 font-semibold bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-6 py-2.5 text-white font-bold bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:from-blue-700 hover:to-sky-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
