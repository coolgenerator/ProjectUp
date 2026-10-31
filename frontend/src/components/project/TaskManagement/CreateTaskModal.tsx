import React, { useState, useEffect } from 'react';
import {
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  STATUS_CONFIG
} from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { useProjectMilestones } from '../../../hooks/useProjectMilestones';
import DateRangePicker from '../../shared/DateRangePicker';

interface ProjectMember {
  user_id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projectId: string;
  userId: string;
  ideaNodeId?: string;
  ideaNodeData?: {
    title: string;
    description?: string;
    tags?: string[];
  };
  preSelectedSectionId?: number;
  preSelectedMilestoneId?: number;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  userId,
  ideaNodeId,
  ideaNodeData,
  preSelectedSectionId,
  preSelectedMilestoneId
}) => {
  const [title, setTitle] = useState(ideaNodeData?.title || '');
  const [description, setDescription] = useState(ideaNodeData?.description || '');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>(3);
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(ideaNodeData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [milestoneId, setMilestoneId] = useState<number | ''>(preSelectedMilestoneId || '');

  // Fetch milestones
  const { milestones, loading: loadingMilestones } = useProjectMilestones({
    projectId,
    autoFetch: isOpen
  });

  // Fetch project members when modal opens
  useEffect(() => {
    const fetchMembers = async () => {
      if (!isOpen || !projectId) return;

      setLoadingMembers(true);
      try {
        const response = await fetchWithAuth(`/api/project/${projectId}/members`);
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
  }, [isOpen, projectId]);

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const taskData: CreateTaskRequest = {
        project_id: projectId,
        title,
        description,
        status,
        priority,
        created_by: userId,
        tags: tags.length > 0 ? tags : undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        assigned_to: assignedTo, // Always send array, even if empty
        idea_node_id: ideaNodeId || undefined,
        milestone_id: milestoneId || undefined,
        section_id: preSelectedSectionId || undefined,
      };

      const response = await fetchWithAuth(`/api/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      console.log('Task created:', result);

      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-sky-50">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
            <span className="text-3xl">✅</span>
            <span>{ideaNodeId ? 'Convert Idea to Task' : 'Create New Task'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-all text-slate-600 hover:text-slate-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {ideaNodeId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <span className="font-semibold">💡 Converting from Idea Forest</span>
              <p className="mt-1">This task will be linked to your idea node for easy tracking.</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail... Tip: Use [ ] or [] syntax for checklist items, they can be imported as subtasks later!"
              rows={4}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              💡 Pro tip: Checklist items ([ ] syntax) will be auto-detected in the Subtasks tab
            </p>
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm font-medium"
              >
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {STATUS_CONFIG[statusOption].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg border-2 font-semibold transition-all shadow-sm text-sm ${
                      priority === p
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-md scale-105'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time and Assignment Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Hours */}
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
                placeholder="e.g., 4"
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={startDate}
              endDate={dueDate}
              onChange={(start, end) => {
                setStartDate(start || '');
                setDueDate(end || '');
              }}
              label="Due Date"
            />
          </div>

          {/* Milestone and Assignment Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Milestone */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Milestone <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              {loadingMilestones ? (
                <div className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-center">
                  Loading milestones...
                </div>
              ) : (
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm font-medium bg-white"
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
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Assign To <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              {loadingMembers ? (
                <div className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-center">
                  Loading team members...
                </div>
              ) : (
                <div className="border-2 border-slate-200 rounded-lg p-3">
                  {/* Selected Assignees Display - Horizontal Scrollable */}
                  {assignedTo.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {assignedTo.map((username) => {
                          const member = members.find(m => m.username === username);
                          if (!member) return null;

                          return (
                            <div
                              key={username}
                              className="flex items-center gap-2 pl-2 pr-1 py-1 bg-gray-100 rounded-full flex-shrink-0 hover:bg-gray-200 transition-colors"
                            >
                              {/* Avatar */}
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                              <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
                                {member.name}
                              </span>
                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => setAssignedTo(assignedTo.filter(u => u !== username))}
                                className="p-0.5 hover:bg-gray-300 rounded-full transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available Members to Add */}
                  {members.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {members
                        .filter(m => !assignedTo.includes(m.username))
                        .map((member) => (
                          <div
                            key={member.user_id}
                            onClick={() => setAssignedTo([...assignedTo, member.username])}
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            {/* Avatar */}
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-700">{member.name}</div>
                              <div className="text-xs text-slate-500">@{member.username} · {member.role}</div>
                            </div>
                          </div>
                        ))}
                      {members.filter(m => !assignedTo.includes(m.username)).length === 0 && (
                        <div className="text-sm text-slate-400 text-center py-2">
                          All members assigned
                        </div>
                      )}
                    </div>
                  )}

                  {members.length === 0 && (
                    <div className="text-slate-400 text-center py-2 text-sm">
                      No team members available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Tags <span className="text-xs font-normal text-slate-500">(Use tags to categorize your tasks)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1 shadow-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-500 hover:text-red-500 transition-colors"
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
              placeholder="Type a tag and press Enter (e.g., urgent, frontend, bug-fix)..."
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-200 bg-slate-50 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 font-semibold bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="px-6 py-2.5 text-white font-bold bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:from-blue-700 hover:to-sky-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Task</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;
