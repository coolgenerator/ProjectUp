import React from 'react';
import { Task, STATUS_CONFIG, PRIORITY_CONFIG, TaskStatus } from '../../../types/task';
import { Milestone } from '../../../types/project/milestone';

interface TaskCardProps {
  task: Task;
  view?: 'board' | 'list' | 'timeline';
  onEdit?: (task: Task) => void;
  onUpdateStatus?: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  showDetails?: boolean;
  isDragging?: boolean;
  milestones?: Milestone[];
  dependencyCount?: number; // Number of dependencies (tasks this depends on)
  blockedByCount?: number;   // Number of incomplete dependencies blocking this task
  selectionMode?: boolean;   // Enable selection mode
  isSelected?: boolean;      // Whether this task is selected
  onSelect?: (taskId: string, selected: boolean) => void; // Selection callback
  projectMembers?: Array<{ user_id: number; username: string; name: string; avatar?: string }>; // Project members for avatar display
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  view = 'board',
  onEdit,
  onUpdateStatus,
  onDelete,
  onClick,
  showDetails = true,
  isDragging = false,
  milestones = [],
  dependencyCount = 0,
  blockedByCount = 0,
  selectionMode = false,
  isSelected = false,
  onSelect,
  projectMembers = []
}) => {
  // Default card color (blue to match dashboard)
  const cardColor = '#3b82f6';
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // Find milestone if task has milestone_id
  const milestone = task.milestone_id
    ? milestones.find(m => m.milestone_id === task.milestone_id)
    : null;

  const handleClick = (e: React.MouseEvent) => {
    // In selection mode, clicking the card toggles selection
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(task.id, !isSelected);
      return;
    }

    if (onClick && !isDragging) {
      e.stopPropagation();
      onClick(task);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(task.id, e.target.checked);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        isDragging
          ? 'opacity-50 rotate-2'
          : isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'hover:shadow-lg'
      } ${selectionMode ? 'cursor-pointer' : 'cursor-pointer'}`}
      onClick={handleClick}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: isSelected ? '#3b82f6' : priorityConfig.color,
        borderColor: isSelected ? '#3b82f6' : (task.priority <= 2 ? `${priorityConfig.color}30` : '#e2e8f0')
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Selection Checkbox */}
            {selectionMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
            )}
            <span className="text-xl flex-shrink-0">✓</span>
            <h3 className="font-semibold text-slate-800 truncate flex-1">{task.title}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                title="Edit task"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                title="Delete task"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {showDetails && task.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Status Badge - only show in list/timeline view, not in board view */}
          {view !== 'board' && (
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                color: statusConfig.color,
                backgroundColor: statusConfig.bgColor
              }}
            >
              {statusConfig.label}
            </span>
          )}

          {/* Milestone Badge */}
          {milestone && (
            <span
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1.5"
              title={`Milestone: ${milestone.title}`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 6l9-4 9 4v2l-9 4-9-4V6z"/>
                <path d="M3 12l9 4 9-4"/>
              </svg>
              {milestone.title}
            </span>
          )}

          {/* Assigned */}
          {task.assigned_to && task.assigned_to.length > 0 && (
            <div className="flex items-center gap-1.5">
              {(Array.isArray(task.assigned_to) ? task.assigned_to : [task.assigned_to]).map((username) => {
                const member = projectMembers.find(m => m.username === username);
                return (
                  <div
                    key={username}
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-gray-100 rounded-full"
                    title={member?.name || username}
                  >
                    {member?.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      {member?.name || username}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Priority Badge */}
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              task.priority === 1 ? 'bg-red-100 text-red-700' :
              task.priority === 2 ? 'bg-orange-100 text-orange-700' :
              task.priority === 3 ? 'bg-yellow-100 text-yellow-700' :
              task.priority === 4 ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}
          >
            P{task.priority} - {priorityConfig.label.split(' - ')[1]}
          </span>

          {/* Date Range */}
          {((task as any).start_date || task.due_date) && (() => {
            const startDate = (task as any).start_date;
            return (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOverdue
                    ? 'bg-red-100 text-red-700'
                    : daysUntilDue !== null && daysUntilDue <= 3
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                📅 {startDate && task.due_date ? (
                  <>
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </>
                ) : startDate ? (
                  `From ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                ) : task.due_date ? (
                  new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                ) : null}
                {isOverdue && ' (overdue)'}
              </span>
            );
          })()}

          {/* Dependency Badges */}
          {blockedByCount > 0 && (
            <span
              className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300 flex items-center gap-1"
              title={`Blocked by ${blockedByCount} incomplete ${blockedByCount === 1 ? 'dependency' : 'dependencies'}`}
            >
              ⚠️ {blockedByCount}
            </span>
          )}
          {dependencyCount > 0 && blockedByCount === 0 && (
            <span
              className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"
              title={`Has ${dependencyCount} ${dependencyCount === 1 ? 'dependency' : 'dependencies'} (all complete)`}
            >
              🔗 {dependencyCount}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {showDetails && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Progress</span>
              <span className="font-semibold">{task.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all bg-blue-500"
                style={{
                  width: `${task.progress}%`,
                  boxShadow: task.progress > 0 ? '0 0 4px rgba(59, 130, 246, 0.4)' : 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {showDetails && task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Resource/Subtask Count */}
        {showDetails && (
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
            {task.learning_resources && task.learning_resources.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {task.learning_resources.length} resources
              </span>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {task.subtasks.length} subtasks
              </span>
            )}
            {task.idea_node_id && (
              <span className="flex items-center gap-1" title="Linked to Idea Forest">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Linked
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
