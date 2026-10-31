import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Chip,
  Avatar,
  Divider,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  Checkbox,
  LinearProgress,
  Tooltip,
  Stack,
  Collapse,
} from '@mui/material';
import {
  Close,
  ThumbUp,
  Link as LinkIcon,
  OpenInFull,
  MoreHoriz,
  ExpandMore,
  ExpandLess,
  Add,
  Flag,
  CalendarToday,
  Person,
} from '@mui/icons-material';
import { Task, TaskStatus, TaskPriority, Section } from '../../../types/task';
import { Milestone, MilestoneStatus, MILESTONE_STATUS_CONFIG, MILESTONE_PRIORITY_CONFIG } from '../../../types/project/milestone';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../../types/task';
import { WorkItem } from '../../../types/workItem';
import { DatePicker } from '../../shared/DatePicker';
import {
  ColoredSelect,
  createStatusOptions,
  createPriorityOptions,
  createSectionOptions,
  createMilestoneOptions,
} from './ColoredSelect';
import SubtaskList from './SubtaskList';
import DependencySelector from './DependencySelector';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { TaskDependency } from '../../../types/task';

interface AssigneeFieldProps {
  assignees: string[];
  projectMembers: Array<{ user_id: number; username: string; name: string; avatar?: string }>;
  onUpdate: (assignees: string[]) => void;
}

const AssigneeField: React.FC<AssigneeFieldProps> = ({ assignees, projectMembers, onUpdate }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Get member details by username
  const getMemberDetails = (username: string) => {
    return projectMembers.find(m => m.username === username);
  };

  // Remove assignee
  const removeAssignee = (username: string) => {
    const newAssignees = assignees.filter(u => u !== username);
    onUpdate(newAssignees);
  };

  // Add assignee
  const addAssignee = (username: string) => {
    const newAssignees = [...assignees, username];
    onUpdate(newAssignees);
    setIsDropdownOpen(false);
  };

  // Get available members (not already assigned)
  const availableMembers = projectMembers.filter(m => !assignees.includes(m.username));

  return (
    <div className="flex items-start gap-6">
      <div className="w-32 flex-shrink-0 pt-2">
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Assignee
        </Typography>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Show assigned members */}
          {assignees.map((username) => {
            const member = getMemberDetails(username);
            return (
              <div
                key={username}
                className="flex items-center gap-2 pl-2.5 pr-1 py-1.5 bg-gray-100 rounded-full group hover:bg-gray-200 transition-colors"
              >
                {/* Avatar */}
                {member?.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                {/* Name */}
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {member?.name || username}
                </span>
                {/* Remove button */}
                <button
                  onClick={() => removeAssignee(username)}
                  className="p-0.5 hover:bg-gray-300 rounded-full transition-colors"
                  title="Remove assignee"
                >
                  <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Add button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center flex-shrink-0 transition-colors"
              title="Add assignee"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[280px] max-h-[320px] overflow-auto">
                <div className="p-2">
                  {availableMembers.length > 0 ? (
                    <div className="space-y-1">
                      {availableMembers.map((member) => (
                        <div
                          key={member.user_id}
                          onClick={() => addAssignee(member.username)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
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
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">@{member.username}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      All members assigned
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Show "Unassigned" text when no assignees */}
          {assignees.length === 0 && !isDropdownOpen && (
            <span className="text-sm text-gray-400 italic">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskDetailDrawerProps {
  open: boolean;
  workItem: WorkItem | null;
  onClose: () => void;
  onUpdate: (itemId: string, updates: Partial<Task> | Partial<Milestone>) => void;
  onDelete: (itemId: string) => void;
  onConvert?: (itemId: string, targetType: 'task' | 'milestone') => void;
  sections?: Section[];
  milestones?: Milestone[];
  projectMembers?: Array<{ user_id: number; username: string; name: string }>;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  open,
  workItem,
  onClose,
  onUpdate,
  onDelete,
  onConvert,
  sections = [],
  milestones = [],
  projectMembers = [],
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localCategory, setLocalCategory] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [dependencyTasks, setDependencyTasks] = useState<Map<string, Task>>(new Map());

  useEffect(() => {
    if (workItem) {
      setLocalTitle(workItem.title);
      setLocalDescription(workItem.description || '');
      // Set local category from milestone if it's a milestone
      if (workItem.type === 'milestone' && workItem.originalMilestone) {
        setLocalCategory(workItem.originalMilestone.category || '');
      }

      // Fetch dependencies for tasks
      if (workItem.type === 'task' && workItem.originalTask) {
        fetchDependencies(workItem.originalTask.id);
      }
    }
  }, [workItem]);

  const fetchDependencies = async (taskId: string) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/dependencies`);
      if (response.ok) {
        const data = await response.json();
        setDependencies(data.dependencies || []);

        // Fetch task details for each dependency
        if (data.dependencies && data.dependencies.length > 0) {
          const taskMap = new Map<string, Task>();
          for (const dep of data.dependencies) {
            try {
              const taskResponse = await fetchWithAuth(`/api/tasks/${dep.depends_on_task_id}`);
              if (taskResponse.ok) {
                const taskData = await taskResponse.json();
                taskMap.set(dep.depends_on_task_id, taskData.task);
              }
            } catch (err) {
              console.error('Error fetching dependency task:', err);
            }
          }
          setDependencyTasks(taskMap);
        }
      }
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const handleDeleteDependency = async (dependencyId: number) => {
    if (!task) return;

    if (!window.confirm('Are you sure you want to remove this dependency?')) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/dependencies/${dependencyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDependencies(task.id);
      }
    } catch (error) {
      console.error('Error deleting dependency:', error);
    }
  };

  if (!workItem) return null;

  const isMilestone = workItem.type === 'milestone';
  const task = workItem.originalTask;
  const milestone = workItem.originalMilestone;

  const handleTitleSave = () => {
    if (localTitle.trim() && localTitle !== workItem.title) {
      onUpdate(workItem.id, { title: localTitle.trim() });
    } else {
      setLocalTitle(workItem.title);
    }
    setEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    if (localDescription !== (workItem.description || '')) {
      onUpdate(workItem.id, { description: localDescription });
    }
    setEditingDescription(false);
  };

  const handleCategorySave = () => {
    if (isMilestone && milestone) {
      const currentCategory = milestone.category || '';
      if (localCategory !== currentCategory) {
        onUpdate(workItem.id, { category: localCategory || undefined });
      }
    }
  };

  const handleStatusChange = (status: TaskStatus | MilestoneStatus) => {
    onUpdate(workItem.id, { status });
  };

  const handlePriorityChange = (priority: number) => {
    onUpdate(workItem.id, { priority });
  };

  const handleAssigneeChange = (assignees: string[]) => {
    if (!isMilestone) {
      onUpdate(workItem.id, { assigned_to: assignees }); // Always send array, even if empty
    }
  };

  const handleStartDateChange = (startDate: string) => {
    onUpdate(workItem.id, { start_date: startDate || undefined });
  };

  const handleDueDateChange = (dueDate: string) => {
    onUpdate(workItem.id, { due_date: dueDate || undefined });
  };

  const handleSectionChange = (sectionId: number | null) => {
    if (!isMilestone && task) {
      onUpdate(workItem.id, { section_id: sectionId || undefined });
    }
  };

  const handleMilestoneChange = (milestoneId: number | null) => {
    if (!isMilestone && task) {
      onUpdate(workItem.id, { milestone_id: milestoneId || undefined });
    }
  };

  const handleCompletedToggle = () => {
    if (isMilestone && milestone) {
      onUpdate(workItem.id, { completed: !milestone.completed });
    }
  };

  const statusConfig = isMilestone && milestone
    ? MILESTONE_STATUS_CONFIG[milestone.status]
    : task ? STATUS_CONFIG[task.status] : null;

  const priorityConfig = isMilestone && milestone
    ? MILESTONE_PRIORITY_CONFIG[milestone.priority]
    : task ? PRIORITY_CONFIG[task.priority] : null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '90%', md: '50%', lg: '45%' },
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          {/* Title */}
          <Box sx={{ flex: 1 }}>
            {editingTitle ? (
              <TextField
                fullWidth
                multiline
                autoFocus
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTitleSave();
                  }
                  if (e.key === 'Escape') {
                    setLocalTitle(workItem.title);
                    setEditingTitle(false);
                  }
                }}
                variant="standard"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    p: 0,
                  },
                }}
              />
            ) : (
              <Typography
                variant="h5"
                onClick={() => setEditingTitle(true)}
                sx={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  cursor: 'pointer',
                  '&:hover': {
                    color: 'primary.main',
                  },
                  textDecoration:
                    (task && task.status === 'done') || (milestone && milestone.completed)
                      ? 'line-through'
                      : 'none',
                  color:
                    (task && task.status === 'done') || (milestone && milestone.completed)
                      ? 'text.secondary'
                      : 'text.primary',
                }}
              >
                {workItem.title}
              </Typography>
            )}
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Copy link">
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <MoreHoriz fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Priority Badge & Type Badge */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Milestone Badge */}
          {isMilestone && (
            <Chip
              label="MILESTONE"
              size="small"
              sx={{
                bgcolor: milestone?.completed ? '#10b981' : '#3b82f6',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.6875rem',
                height: 22,
                letterSpacing: '0.5px',
              }}
            />
          )}

          {/* Priority Badge */}
          {priorityConfig && ((task && task.priority <= 2) || (milestone && milestone.priority >= 3)) && (
            <Chip
              icon={<Flag fontSize="small" />}
              label={priorityConfig.label}
              size="small"
              sx={{
                bgcolor: isMilestone
                  ? (milestone?.priority === 4 ? '#fee2e2' : '#fed7aa')
                  : (task?.priority === 1 ? 'error.light' : 'warning.light'),
                color: isMilestone
                  ? (milestone?.priority === 4 ? '#dc2626' : '#ea580c')
                  : (task?.priority === 1 ? 'error.dark' : 'warning.dark'),
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        {/* Main Fields Section */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', mb: 0.5 }}>
          <Stack spacing={2.5}>
            {/* Assignee Field (Tasks only) */}
            {!isMilestone && task && (
              <AssigneeField
                assignees={task.assigned_to || []}
                projectMembers={projectMembers}
                onUpdate={handleAssigneeChange}
              />
            )}

            {/* Due Date Field */}
            <div className="flex items-center gap-6">
              <div className="w-32 flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">Due Date</span>
              </div>
              <div className="flex-1">
                <DatePicker
                  value={workItem.due_date?.split('T')[0]}
                  onChange={(date) => {
                    handleDueDateChange(date || '');
                  }}
                  startDate={
                    isMilestone
                      ? (milestone as any)?.start_date?.split('T')[0]
                      : task?.start_date?.split('T')[0]
                  }
                  endDate={workItem.due_date?.split('T')[0]}
                  onRangeChange={(startDate, endDate) => {
                    if (startDate) handleStartDateChange(startDate);
                    if (endDate) handleDueDateChange(endDate);
                  }}
                  placeholder="Select date or range"
                />
              </div>
            </div>

            {/* Status Field */}
            <div className="flex items-center gap-6">
              <div className="w-32 flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">Status</span>
              </div>
              <ColoredSelect
                value={workItem.status}
                onChange={(value) => handleStatusChange(value as TaskStatus | MilestoneStatus)}
                options={createStatusOptions(isMilestone)}
                type="status"
              />
            </div>

            {/* Priority Field */}
            <div className="flex items-center gap-6">
              <div className="w-32 flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">Priority</span>
              </div>
              <ColoredSelect
                value={isMilestone && milestone ? milestone.priority : task ? task.priority : 3}
                onChange={(value) => handlePriorityChange(Number(value))}
                options={createPriorityOptions(isMilestone)}
                type="priority"
              />
            </div>

            {/* Category Field (Milestones only) */}
            {isMilestone && milestone && (
              <div className="flex items-center gap-6">
                <div className="w-32 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">Category</span>
                </div>
                <input
                  type="text"
                  value={localCategory}
                  onChange={(e) => setLocalCategory(e.target.value)}
                  onBlur={handleCategorySave}
                  placeholder="e.g., Feature, Release, etc."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Section Field (Tasks only) */}
            {!isMilestone && task && (
              <div className="flex items-center gap-6">
                <div className="w-32 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">Section</span>
                </div>
                <ColoredSelect
                  value={task.section_id || 0}
                  onChange={(value) => handleSectionChange(Number(value) || null)}
                  options={createSectionOptions(sections)}
                  type="section"
                  placeholder="No Section"
                />
              </div>
            )}

            {/* Milestone Field (Tasks only) */}
            {!isMilestone && task && (
              <div className="flex items-center gap-6">
                <div className="w-32 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">Milestone</span>
                </div>
                <ColoredSelect
                  value={task.milestone_id || 0}
                  onChange={(value) => handleMilestoneChange(Number(value) || null)}
                  options={createMilestoneOptions(milestones)}
                  type="milestone"
                  placeholder="No Milestone"
                />
              </div>
            )}

            {/* Progress (Tasks only) */}
            {!isMilestone && task && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 120, flexShrink: 0 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Progress
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                    {task.progress}%
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Description Section */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 1.5 }}>
            Description
          </Typography>
          {editingDescription ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              autoFocus
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              placeholder="Add a description..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
          ) : (
            <Typography
              variant="body2"
              onClick={() => setEditingDescription(true)}
              sx={{
                color: workItem.description ? 'text.primary' : 'text.secondary',
                cursor: 'pointer',
                minHeight: 60,
                p: 1.5,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {workItem.description || 'Add a description...'}
            </Typography>
          )}
        </Box>

        {/* Subtasks Section (Tasks only) */}
        {!isMilestone && task && (
          <div className="bg-white mb-0.5">
            <div
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <button className="p-0">
                {showSubtasks ? (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <span className="text-sm font-medium">Subtasks</span>
              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {task.subtasks?.length || 0}
              </span>
            </div>
            {showSubtasks && (
              <div className="px-6 pb-4">
                <SubtaskList
                  key={refreshKey}
                  taskId={task.id}
                  taskDescription={task.description}
                  onSubtasksChanged={() => {
                    setRefreshKey(prev => prev + 1);
                    // Trigger parent refresh if needed
                  }}
                  onDescriptionChange={(newDescription) => {
                    onUpdate(workItem.id, { description: newDescription });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Dependencies Section (Tasks only) */}
        {!isMilestone && task && (
          <div className="bg-white mb-0.5">
            <div
              onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <button className="p-0">
                {showDependencies ? (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <span className="text-sm font-medium">Dependencies</span>
              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {dependencies.length}
              </span>
            </div>
            {showDependencies && (
              <div className="px-6 pb-4">
                {/* Existing Dependencies */}
                {dependencies.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {dependencies.map((dep) => {
                      const depTask = dependencyTasks.get(dep.depends_on_task_id);
                      return (
                        <div
                          key={dep.id}
                          className="flex items-center gap-2 p-2.5 border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {depTask ? depTask.title : `Task ${dep.depends_on_task_id.slice(0, 8)}`}
                            </div>
                            {depTask && (
                              <div className="text-xs text-gray-500">
                                Status: {depTask.status}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteDependency(dep.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200 transition-all flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No dependencies message */}
                {dependencies.length === 0 && !showAddDependency && (
                  <p className="text-sm text-gray-500 mb-3">No dependencies yet</p>
                )}

                {/* Add Dependency Form */}
                {showAddDependency ? (
                  <div className="space-y-2">
                    <DependencySelector
                      projectId={String(task.project_id)}
                      currentTaskId={task.id}
                      onDependencyAdded={() => {
                        fetchDependencies(task.id);
                        setShowAddDependency(false);
                      }}
                    />
                    <button
                      onClick={() => setShowAddDependency(false)}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddDependency(true);
                    }}
                    className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add dependency
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            const itemType = isMilestone ? 'milestone' : 'task';
            if (window.confirm(`Are you sure you want to delete this ${itemType}?`)) {
              onDelete(workItem.id);
              onClose();
            }
          }}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
          }}
        >
          Delete {isMilestone ? 'milestone' : 'task'}
        </Button>

        {/* Convert Button */}
        {onConvert && (
          <Button
            variant="outlined"
            onClick={() => {
              const targetType = isMilestone ? 'task' : 'milestone';
              const confirmMsg = isMilestone
                ? 'Convert this milestone to a task? This will remove milestone-specific data like category.'
                : 'Convert this task to a milestone? This will remove task-specific data like assignee, section, and subtasks.';

              if (window.confirm(confirmMsg)) {
                onConvert(workItem.id, targetType);
                onClose();
              }
            }}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              borderColor: isMilestone ? '#3b82f6' : '#3b82f6',
              color: isMilestone ? '#3b82f6' : '#3b82f6',
              '&:hover': {
                borderColor: isMilestone ? '#7c3aed' : '#2563eb',
                bgcolor: isMilestone ? 'rgba(139, 92, 246, 0.04)' : 'rgba(59, 130, 246, 0.04)',
              },
            }}
          >
            Convert to {isMilestone ? 'Task' : 'Milestone'}
          </Button>
        )}

        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Created {new Date(workItem.created_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default TaskDetailDrawer;
