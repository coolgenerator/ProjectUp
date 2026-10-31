import { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types/task';
import { WorkItem } from '../../../types/workItem';
import DatePicker from '../../shared/DatePicker';

interface EditableCellProps {
  value: string | string[] | number | undefined; // Can be single value, array for assignee, or number for priority
  type: 'text' | 'assignee' | 'date' | 'status' | 'priority';
  workItem: WorkItem;
  onUpdate: (updates: Partial<Task>) => void;
  projectMembers?: Array<{ user_id: number; username: string; name: string; avatar?: string }>;
  isCompleted?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  workItem,
  onUpdate,
  projectMembers = [],
  isCompleted = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(
    type === 'assignee' ? (Array.isArray(value) ? value : value ? [value] : []) : (value || '')
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current && (type === 'text' || type === 'date')) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  useEffect(() => {
    setLocalValue(
      type === 'assignee' ? (Array.isArray(value) ? value : value ? [value] : []) : (value || '')
    );
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing && (type === 'assignee' || type === 'status' || type === 'date' || type === 'priority')) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, type]);

  const handleSave = () => {
    if (type === 'assignee') {
      // For assignee, always update since it's managed through checkboxes
      const assigneeArray = Array.isArray(localValue) ? localValue.map(String) : [];
      onUpdate({ assigned_to: assigneeArray }); // Always send array, even if empty
    } else if (localValue !== value) {
      switch (type) {
        case 'text':
          onUpdate({ title: localValue as string });
          break;
        case 'date':
          onUpdate({ due_date: (localValue as string) || undefined });
          break;
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setLocalValue(value || '');
      setIsEditing(false);
    }
  };

  // Helper to get assignee details
  const getAssigneeDetails = (username?: string) => {
    if (!username) return null;
    const member = projectMembers.find(m => m.username === username);
    if (!member) return { name: username, avatar: undefined };

    return { name: member.name, avatar: member.avatar };
  };

  // Helper to toggle assignee selection
  const toggleAssignee = (username: string) => {
    const currentAssignees = Array.isArray(localValue) ? localValue.map(String) : [];
    const newAssignees = currentAssignees.includes(username)
      ? currentAssignees.filter(u => u !== username)
      : [...currentAssignees, username];
    setLocalValue(newAssignees);

    // Auto-save when toggling
    onUpdate({ assigned_to: newAssignees }); // Always send array, even if empty
  };

  // Only allow editing for tasks, not milestones (for assignee)
  const canEdit = type !== 'assignee' || workItem.type === 'task';

  if (!canEdit) {
    return <div />;
  }

  // Text editing
  if (type === 'text' && isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue as string}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full text-sm px-0 py-0 border-none outline-none focus:ring-0 bg-transparent"
      />
    );
  }

  // Assignee dropdown (only show available members)
  if (type === 'assignee' && isEditing) {
    const selectedAssignees = Array.isArray(localValue) ? localValue.map(String) : [];
    const availableMembers = projectMembers.filter(m => !selectedAssignees.includes(m.username));

    return (
      <div ref={dropdownRef} className="relative">
        <div className="absolute top-0 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[280px] max-h-[320px] overflow-auto">
          <div className="p-2">
            {/* Only show available members to add */}
            {availableMembers.length > 0 ? (
              <div className="space-y-1">
                {availableMembers.map((member) => (
                  <div
                    key={member.user_id}
                    onClick={() => {
                      const newAssignees = [...selectedAssignees, member.username];
                      setLocalValue(newAssignees);
                      onUpdate({ assigned_to: newAssignees });
                      setIsEditing(false);
                    }}
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
      </div>
    );
  }

  // Date editing
  if (type === 'date' && isEditing) {
    const dateValue = typeof localValue === 'string' ? localValue : '';
    const startDateValue = workItem.type === 'task'
      ? workItem.originalTask?.start_date
      : workItem.type === 'milestone'
        ? (workItem.originalMilestone as any)?.start_date
        : undefined;

    return (
      <div ref={dropdownRef} className="relative">
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-2xl border border-gray-200">
          <DatePicker
            value={dateValue || undefined}
            onChange={(date) => {
              // Single date selection (due_date only)
              setLocalValue(date || '');
              onUpdate({ due_date: date || undefined });
              setIsEditing(false);
            }}
            startDate={startDateValue}
            endDate={dateValue || undefined}
            onRangeChange={(startDate, endDate) => {
              // Range selection (start_date and due_date)
              if (startDate && endDate) {
                onUpdate({
                  start_date: startDate || undefined,
                  due_date: endDate || undefined
                });
                setIsEditing(false);
              }
            }}
            placeholder="Select date"
            inline={true}
          />
        </div>
      </div>
    );
  }

  // Status dropdown
  if (type === 'status' && isEditing) {
    const statusOptions = [
      { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
      { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
      { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-700' },
      { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
      { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
    ];
    const statusValue = typeof localValue === 'string' ? localValue : '';

    return (
      <div ref={dropdownRef} className="relative">
        <div className="absolute top-0 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px]">
          <div className="p-1">
            {statusOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  setLocalValue(option.value);
                  onUpdate({ status: option.value as TaskStatus });
                  setIsEditing(false);
                }}
                className={`px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors ${
                  statusValue === option.value ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${option.color}`}>
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Priority dropdown
  if (type === 'priority' && isEditing) {
    const priorityOptions = [
      { value: 1, label: 'P1', fullLabel: 'P1 - Urgent', color: 'bg-red-100 text-red-700' },
      { value: 2, label: 'P2', fullLabel: 'P2 - High', color: 'bg-orange-100 text-orange-700' },
      { value: 3, label: 'P3', fullLabel: 'P3 - Medium', color: 'bg-yellow-100 text-yellow-700' },
      { value: 4, label: 'P4', fullLabel: 'P4 - Low', color: 'bg-blue-100 text-blue-700' },
      { value: 5, label: 'P5', fullLabel: 'P5 - Backlog', color: 'bg-gray-100 text-gray-600' },
    ];
    const priorityValue = typeof localValue === 'number' ? localValue : 3;

    return (
      <div ref={dropdownRef} className="relative">
        <div className="absolute top-0 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px]">
          <div className="p-1">
            {priorityOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  setLocalValue(option.value);
                  onUpdate({ priority: option.value as TaskPriority });
                  setIsEditing(false);
                }}
                className={`px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors ${
                  priorityValue === option.value ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${option.color}`}>
                  {option.fullLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  if (type === 'assignee') {
    const selectedAssignees = Array.isArray(value) ? value.map(String) : [];

    return (
      <div className="w-full">
        {/* Horizontal scrollable container for assigned members */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pb-1">
          {selectedAssignees.map((username) => {
            const details = getAssigneeDetails(username);
            return (
              <div
                key={username}
                className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-full flex-shrink-0 group transition-colors ${
                  isCompleted ? 'bg-gray-100 opacity-60' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {/* Avatar */}
                {details?.avatar ? (
                  <img
                    src={details.avatar}
                    alt={details.name}
                    className={`w-6 h-6 rounded-full object-cover flex-shrink-0 ${isCompleted ? 'grayscale' : ''}`}
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-sky-600'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                {/* Name */}
                <span className={`text-xs font-medium max-w-[100px] truncate ${
                  isCompleted ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {details?.name || username}
                </span>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const currentAssignees = selectedAssignees.map(String);
                    const newAssignees = currentAssignees.filter(u => u !== username);
                    setLocalValue(newAssignees);
                    onUpdate({ assigned_to: newAssignees }); // Always send array, even if empty
                  }}
                  className="p-0.5 hover:bg-gray-300 rounded-full transition-colors"
                  title="Remove assignee"
                >
                  <svg className={`w-3.5 h-3.5 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Add button in dashed circle */}
          {!isCompleted && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
              title="Add assignee"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Priority display mode
  if (type === 'priority') {
    const priorityValue = typeof value === 'number' ? value : 3;
    const getPriorityColor = (priority: number) => {
      switch (priority) {
        case 1: return 'bg-red-100 text-red-700';
        case 2: return 'bg-orange-100 text-orange-700';
        case 3: return 'bg-yellow-100 text-yellow-700';
        case 4: return 'bg-blue-100 text-blue-700';
        default: return 'bg-gray-100 text-gray-600';
      }
    };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="cursor-pointer"
      >
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isCompleted ? 'bg-gray-100 text-gray-400' : getPriorityColor(priorityValue)}`}>
          P{priorityValue}
        </span>
      </div>
    );
  }

  // Other types display mode
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="cursor-pointer min-h-[24px] flex items-center px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
    >
      {type === 'status' ? (
        (() => {
          const statusValue = typeof value === 'string' ? value : '';
          const statusConfig = {
            todo: { label: 'To Do', color: isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-700' },
            in_progress: { label: 'In Progress', color: isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700' },
            review: { label: 'Review', color: isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-yellow-100 text-yellow-700' },
            blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
            done: { label: 'Done', color: 'bg-green-100 text-green-700' },
          };

          const currentStatus = statusConfig[statusValue as keyof typeof statusConfig] || statusConfig.todo;

          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          );
        })()
      ) : type === 'date' ? (
        (() => {
          const dueDate = typeof value === 'string' ? value : '';
          const startDate = workItem.type === 'task' ? workItem.originalTask?.start_date : undefined;
          const textColor = isCompleted ? 'text-gray-400' : 'text-gray-600';

          if (startDate && dueDate) {
            // Show date range
            return (
              <div className="flex items-center gap-1.5">
                <span className={`text-sm ${textColor}`}>
                  {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <svg className={`w-3 h-3 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className={`text-sm ${textColor}`}>
                  {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          } else if (dueDate) {
            // Show single date
            return (
              <span className={`text-sm ${textColor}`}>
                {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            );
          } else {
            // No date set
            return (
              <span className="text-sm text-gray-400 italic">No date</span>
            );
          }
        })()
      ) : type === 'text' && typeof value === 'string' && value ? (
        <span
          className={`text-sm ${
            isCompleted
              ? 'text-gray-400'
              : 'text-gray-900'
          }`}
        >
          {value}
        </span>
      ) : (
        <span className="text-sm text-gray-400 italic">Click to edit</span>
      )}
    </div>
  );
};

export default EditableCell;
