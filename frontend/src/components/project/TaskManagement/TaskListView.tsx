import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import SectionHeader from './SectionHeader';
import EditableCell from './EditableCell';
import { Task, TaskStatus, TaskPriority, Section } from '../../../types/task';
import { WorkItem } from '../../../types/workItem';
import { Milestone } from '../../../types/project/milestone';
import fetchWithAuth from '../../../hooks/fetchWithAuth';

interface TaskListViewProps {
  tasks: Task[]; // Filtered tasks for display
  allTasks?: Task[]; // All unfiltered tasks for milestone progress calculation
  workItems?: WorkItem[];
  sections?: Section[];
  sectionFilter?: number | 'all'; // Filter for which section to display
  showMilestones?: boolean;
  onToggleMilestones?: () => void;
  onTaskClick: (task: Task) => void;
  onWorkItemClick?: (workItem: WorkItem) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTask?: (itemId: string, updates: Partial<Task>) => void;
  onSectionRename?: (sectionId: number, newName: string) => void;
  onSectionDelete?: (sectionId: number) => void;
  onSectionColorChange?: (sectionId: number, color: string) => void;
  onCreateSection?: (name: string) => void;
  onReorderTasks?: (sectionId: number | null, itemIds: string[]) => void;
  onAddTask?: (sectionId?: number, milestoneId?: number) => void;
  onAddMilestone?: (sectionId?: number) => void;
  onRefreshData?: () => Promise<void>;
  loading?: boolean;
  milestones?: Milestone[];
  projectMembers?: Array<{ user_id: number; username: string; name: string }>;
  projectId?: string;
}

type ColumnType = 'assignee' | 'dueDate' | 'status' | 'priority';

// SectionDropZone component to make sections droppable
const SectionDropZone: React.FC<{ sectionId: number | null; children: React.ReactNode }> = ({ sectionId, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
    data: { type: 'section', sectionId }
  });

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-blue-50' : ''}>
      {children}
    </div>
  );
};

// SortableRow component for drag and drop
interface SortableRowProps {
  item: WorkItem | Task;
  visibleColumns: ColumnType[];
  onUpdateTask?: (itemId: string, updates: Partial<Task>) => void;
  onTaskClick?: (task: Task) => void;
  onWorkItemClick?: (workItem: WorkItem) => void;
  projectMembers: Array<{ user_id: number; username: string; name: string }>;
  milestones?: Milestone[];
  allTasks?: Task[];
}

const MILESTONE_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Gray', value: '#6B7280' },
];

// Helper to get column width based on type
const getColumnWidth = (col: ColumnType): string => {
  switch (col) {
    case 'status': return '120px';
    case 'priority': return '85px';
    case 'dueDate': return '140px';
    case 'assignee': return '180px';
    default: return '140px';
  }
};

const SortableRow: React.FC<SortableRowProps> = ({
  item,
  visibleColumns,
  onUpdateTask,
  onTaskClick,
  onWorkItemClick,
  projectMembers,
  milestones = [],
  allTasks = [],
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

  const workItem = 'type' in item ? item : {
    id: item.id,
    type: 'task' as const,
    title: item.title,
    status: item.status,
    priority: item.priority,
    due_date: item.due_date,
    section_id: item.section_id,
    section_order: item.section_order,
    milestone_id: item.milestone_id,
    created_at: item.created_at,
    updated_at: item.updated_at,
    originalTask: item,
  };

  const isMilestone = workItem.type === 'milestone';
  const isCompleted = workItem.type === 'task' && (workItem.status === 'done' || workItem.status === 'blocked');
  const milestoneColor = isMilestone && workItem.originalMilestone?.color ? workItem.originalMilestone.color : '#3b82f6';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workItem.id,
    // Milestones are now draggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Find milestone name if task is assigned to a milestone
  const assignedMilestone = workItem.milestone_id
    ? milestones.find(m => m.milestone_id === workItem.milestone_id)
    : null;

  // Calculate milestone progress if this is a milestone
  const milestoneProgress = isMilestone && workItem.originalMilestone
    ? (() => {
        const milestoneId = workItem.originalMilestone.milestone_id;
        const milestoneTasks = allTasks.filter(t => t.milestone_id === milestoneId);
        const completedTasks = milestoneTasks.filter(t => t.status === 'done');
        const totalTasks = milestoneTasks.length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
        return {
          completed: completedTasks.length,
          total: totalTasks,
          percentage,
        };
      })()
    : null;

  const getBgColor = (color: string, opacity: number) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div
      ref={setNodeRef}
      className={`group grid items-center gap-4 pr-4 py-2.5 border-b transition-colors ${
        isMilestone
          ? 'hover:opacity-90'
          : workItem.milestone_id
            ? 'border-l-4 border-b-gray-100 hover:bg-gray-50'
            : 'border-b-gray-100 hover:bg-gray-50'
      }`}
      style={{
        ...style,
        paddingLeft: '1rem',
        gridTemplateColumns: `32px ${isMilestone ? '' : '24px '}1fr ${visibleColumns.map(col => getColumnWidth(col)).join(' ')} 32px`,
        ...(isMilestone && {
          backgroundColor: getBgColor(milestoneColor, 0.1),
          borderColor: getBgColor(milestoneColor, 0.3),
        }),
        ...(isMilestone && isDragging && {
          backgroundColor: getBgColor(milestoneColor, 0.2),
        }),
        ...(!isMilestone && workItem.milestone_id && assignedMilestone && {
          borderLeftColor: assignedMilestone.color || '#3b82f6',
        }),
      }}
    >
      {/* Drag handle - for both tasks and milestones */}
      <div className="flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Checkbox for tasks only */}
      {!isMilestone && (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={workItem.status === 'done' || workItem.status === 'blocked'}
            onChange={(e) => {
              e.stopPropagation();
              const newStatus: TaskStatus = e.target.checked ? 'done' : 'todo';
              onUpdateTask?.(workItem.id, { status: newStatus });
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Task name */}
      <div
        onClick={() => {
          if (workItem.type === 'milestone') {
            onWorkItemClick?.(workItem);
          } else if (workItem.originalTask) {
            onTaskClick?.(workItem.originalTask);
          }
        }}
        className={`flex items-center gap-2 min-w-0 cursor-pointer ${isCompleted ? 'line-through text-gray-400' : ''}`}
      >
        {/* Simple milestone icon */}
        {workItem.type === 'milestone' && workItem.originalMilestone && (
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill={workItem.originalMilestone.completed ? '#10B981' : milestoneColor}
            viewBox="0 0 20 20"
          >
            <path d="M3 6l9-4 9 4v2l-9 4-9-4V6z"/>
            <path d="M3 12l9 4 9-4"/>
            <path d="M3 16l9 4 9-4"/>
          </svg>
        )}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <EditableCell
            value={workItem.title}
            type="text"
            workItem={workItem}
            onUpdate={(updates) => onUpdateTask?.(workItem.id, updates)}
            projectMembers={projectMembers}
            isCompleted={isCompleted}
          />

          {/* Show progress for milestones */}
          {isMilestone && milestoneProgress && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Progress text */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: milestoneColor }}>
                  {milestoneProgress.completed}/{milestoneProgress.total} tasks
                </span>
                <span className="text-xs font-semibold" style={{ color: milestoneColor }}>
                  {milestoneProgress.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: getBgColor(milestoneColor, 0.2) }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${milestoneProgress.percentage}%`, backgroundColor: milestoneColor }}
                />
              </div>
            </div>
          )}

          {/* Show milestone badge for tasks assigned to a milestone */}
          {workItem.type === 'task' && assignedMilestone && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${isCompleted ? 'line-through' : ''}`}
              style={{
                backgroundColor: isCompleted ? '#E5E7EB' : getBgColor(assignedMilestone.color || '#3b82f6', 0.15),
                color: isCompleted ? '#9CA3AF' : (assignedMilestone.color || '#3b82f6')
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 17l8 5 8-5M2 12l8 5 8-5"/>
              </svg>
              {assignedMilestone.title}
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Columns */}
      {visibleColumns.map((col) => {
        // Skip status and priority columns for milestones
        if (isMilestone && (col === 'status' || col === 'priority')) {
          return null;
        }

        return (
          <div key={col} className={`flex items-center ${isCompleted && col !== 'status' ? 'line-through' : ''}`}>
            {col === 'assignee' && (
              <EditableCell
                value={workItem.assigned_to}
                type="assignee"
                workItem={workItem}
                onUpdate={(updates) => onUpdateTask?.(workItem.id, updates)}
                projectMembers={projectMembers}
                isCompleted={isCompleted}
              />
            )}
            {col === 'dueDate' && (
              <EditableCell
                value={workItem.due_date}
                type="date"
                workItem={workItem}
                onUpdate={(updates) => onUpdateTask?.(workItem.id, updates)}
                projectMembers={projectMembers}
                isCompleted={isCompleted}
              />
            )}
            {col === 'status' && workItem.type === 'task' && workItem.originalTask && (
              <EditableCell
                value={workItem.originalTask.status}
                type="status"
                workItem={workItem}
                onUpdate={(updates) => onUpdateTask?.(workItem.id, updates)}
                projectMembers={projectMembers}
                isCompleted={isCompleted}
              />
            )}
            {col === 'priority' && workItem.type === 'task' && workItem.originalTask && (
              <EditableCell
                value={workItem.originalTask.priority}
                type="priority"
                workItem={workItem}
                onUpdate={(updates) => onUpdateTask?.(workItem.id, updates)}
                projectMembers={projectMembers}
                isCompleted={isCompleted}
              />
            )}
          </div>
        );
      })}

      {/* More options / Color picker for milestones */}
      <div className="flex items-center justify-center relative">
        {isMilestone ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setColorPickerAnchor(e.currentTarget);
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
              title="Change milestone color"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>

            {/* Color picker popover */}
            {showColorPicker && colorPickerAnchor && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowColorPicker(false)}
                />
                <div
                  className="fixed p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-20"
                  style={{
                    top: `${colorPickerAnchor.getBoundingClientRect().bottom + 8}px`,
                    right: `${window.innerWidth - colorPickerAnchor.getBoundingClientRect().right}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Milestone color
                  </div>
                  <div className="grid grid-cols-5 gap-2 w-48">
                    {MILESTONE_COLORS.map((color) => (
                      <div
                        key={color.value}
                        title={color.name}
                        onClick={() => {
                          onUpdateTask?.(workItem.id, { color: color.value } as any);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded cursor-pointer border-2 transition-all hover:scale-110 hover:shadow-md ${
                          milestoneColor === color.value ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <button
            onClick={() => {
              if (workItem.originalTask) {
                onTaskClick?.(workItem.originalTask);
              }
            }}
            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  allTasks,
  workItems = [],
  sections = [],
  sectionFilter = 'all',
  showMilestones = true,
  onToggleMilestones,
  onTaskClick,
  onWorkItemClick,
  onEditTask,
  onDeleteTask,
  onUpdateStatus,
  onUpdateTask,
  onSectionRename,
  onSectionDelete,
  onSectionColorChange,
  onCreateSection,
  onReorderTasks,
  onAddTask,
  onAddMilestone,
  onRefreshData,
  loading = false,
  milestones = [],
  projectMembers = [],
  projectId,
}) => {
  // Use allTasks for milestone progress calculation, fallback to tasks if not provided
  const tasksForProgress = allTasks || tasks;

  // Filter sections based on sectionFilter
  const filteredSections = sectionFilter === 'all'
    ? sections
    : sections.filter(section => section.id === sectionFilter);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<ColumnType[]>(['status', 'priority', 'assignee', 'dueDate']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by section (tasks are already filtered and sorted from parent)
  const groupedTasks = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const sectionId = task.section_id?.toString() || '0';
      if (!grouped[sectionId]) {
        grouped[sectionId] = [];
      }
      grouped[sectionId].push(task);
    });
    return grouped;
  }, [tasks]);

  // Group work items by section, with tasks grouped under their milestones
  // IMPORTANT: Preserves the sort order from parent component
  const groupedWorkItems = useMemo(() => {
    const grouped: Record<string, WorkItem[]> = {};

    // First, group by section
    const bySectionTemp: Record<string, WorkItem[]> = {};
    workItems.forEach(item => {
      const sectionId = item.section_id?.toString() || '0';
      if (!bySectionTemp[sectionId]) {
        bySectionTemp[sectionId] = [];
      }
      bySectionTemp[sectionId].push(item);
    });

    // For each section, reorganize to show tasks under their milestones
    Object.keys(bySectionTemp).forEach(sectionId => {
      const items = bySectionTemp[sectionId];
      const orderedItems: WorkItem[] = [];

      // Separate milestones and tasks (preserve order from workItems)
      const milestonesInSection = items.filter(item => item.type === 'milestone');
      const tasksInSection = items.filter(item => item.type === 'task');

      // If there are no milestones (meaning milestones are hidden), just show all tasks in their current order
      if (milestonesInSection.length === 0) {
        // Tasks are already sorted by the parent component, just keep that order
        orderedItems.push(...tasksInSection);
      } else {
        // When milestones are shown, we need to group tasks under milestones
        // but still preserve the sort order within each milestone group

        // Sort milestones by section_order for consistent display
        const sortedMilestones = [...milestonesInSection].sort((a, b) => {
          if (a.section_order !== undefined && b.section_order !== undefined) {
            return a.section_order - b.section_order;
          }
          return 0;
        });

        // For each milestone, add milestone then its tasks (in their sorted order)
        sortedMilestones.forEach(milestone => {
          orderedItems.push(milestone);

          // Get tasks for this milestone, preserving their order from tasksInSection
          const milestoneTasks = tasksInSection.filter(task =>
            task.originalTask?.milestone_id === milestone.originalMilestone?.milestone_id
          );
          // Tasks are already in sorted order from parent, just add them
          orderedItems.push(...milestoneTasks);
        });

        // Add tasks with no milestone at the end (preserving their sorted order)
        const tasksWithoutMilestone = tasksInSection.filter(task => !task.originalTask?.milestone_id);
        orderedItems.push(...tasksWithoutMilestone);
      }

      grouped[sectionId] = orderedItems;
    });

    return grouped;
  }, [workItems]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Check if dropping on a section drop zone
    const isDroppedOnSection = typeof over.id === 'string' && over.id.startsWith('section-drop-');
    const droppedSectionId: number | null = isDroppedOnSection
      ? ((over.data?.current?.sectionId as number | null | undefined) ?? null)
      : null;

    // Find active item - properly handle union type
    const allItems: (WorkItem | Task)[] = workItems.length > 0 ? workItems : tasks;
    const activeItem = allItems.find((item) => item.id === active.id);

    if (!activeItem) return;

    // Type guard: check if item is a WorkItem
    const isWorkItem = (item: WorkItem | Task): item is WorkItem => {
      return 'type' in item;
    };

    // Handle milestone dragging: move milestone and all its tasks together
    if (isWorkItem(activeItem) && activeItem.type === 'milestone') {
      const activeMilestoneId = activeItem.originalMilestone?.milestone_id;
      const sourceSectionId = activeItem.section_id;

      // Find all tasks belonging to this milestone
      const milestoneTasks = workItems.filter(item =>
        item.type === 'task' && item.originalTask?.milestone_id === activeMilestoneId
      );

      let destSectionId: number | null = null;

      // Determine destination section
      if (isDroppedOnSection) {
        // Dropped on a section drop zone - this is allowed
        destSectionId = droppedSectionId;
      } else {
        // Dropped on another item
        const overItem = allItems.find((item) => item.id === over.id);
        if (!overItem) return;

        // STRICT RULE: Milestones can ONLY be dropped on other milestones, not on tasks
        // This prevents milestones from being inserted between tasks of another milestone
        if (!isWorkItem(overItem) || overItem.type !== 'milestone') {
          console.log('[Drag] Prevented: Cannot drop milestone between tasks');
          return; // Reject drop on tasks
        }

        destSectionId = overItem.section_id ?? null;
      }

      // If moving to a different section, update section_id for milestone and all its tasks
      if (sourceSectionId !== destSectionId) {
        if (onUpdateTask && projectId) {
          try {
            // Collect all update promises (milestone + all tasks)
            const updatePromises: Promise<any>[] = [];

            // Add milestone update
            if (activeItem.originalMilestone) {
              const milestoneId = activeItem.originalMilestone.milestone_id;
              const milestoneUpdatePromise = fetchWithAuth(`/api/project/${projectId}/milestones/${milestoneId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section_id: destSectionId })
              });
              updatePromises.push(milestoneUpdatePromise);
            }

            // Add task updates - use the actual task ID from originalTask
            for (const taskWorkItem of milestoneTasks) {
              if (taskWorkItem.originalTask) {
                const taskUpdatePromise = fetchWithAuth(`/api/tasks/${taskWorkItem.originalTask.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ section_id: destSectionId })
                });
                updatePromises.push(taskUpdatePromise);
              }
            }

            // Wait for all updates to complete
            await Promise.all(updatePromises);

            // Refresh data once after all updates
            if (onRefreshData) {
              await onRefreshData();
            }
          } catch (error) {
            console.error('Error moving milestone with tasks:', error);
          }
        }
      } else if (!isDroppedOnSection) {
        // Reordering within same section (dropped on another milestone)
        const destItems = workItems.filter(item =>
          item.section_id === destSectionId && item.type === 'milestone'
        );
        const oldIndex = destItems.findIndex(item => item.id === active.id);
        const newIndex = destItems.findIndex(item => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(destItems as WorkItem[], oldIndex, newIndex);
          const itemIds = newOrder.map(item => item.id);
          onReorderTasks?.(destSectionId ?? null, itemIds);
        }
      }
      return;
    }

    // For non-milestone items, find the over item
    const overItem = allItems.find((item) => item.id === over.id);
    if (!overItem) return;

    const destSectionId: number | null = overItem.section_id ?? null;

    // If dropping a task onto a milestone, assign the task to that milestone
    if (isWorkItem(activeItem) && activeItem.type === 'task' &&
        isWorkItem(overItem) && overItem.type === 'milestone') {
      const milestoneId = overItem.originalMilestone?.milestone_id;
      if (milestoneId && activeItem.originalTask) {
        onUpdateTask?.(activeItem.id, { milestone_id: milestoneId });
      }
      return;
    }

    // If dropping a task on another task
    if (isWorkItem(activeItem) && activeItem.type === 'task' &&
        isWorkItem(overItem) && overItem.type === 'task') {
      const activeMilestoneId = activeItem.originalTask?.milestone_id;
      const overMilestoneId = overItem.originalTask?.milestone_id;

      // STRICT RULE: Tasks cannot be dropped between tasks of a different milestone
      // Each milestone block (milestone + its tasks) is treated as indivisible
      if (activeMilestoneId !== overMilestoneId) {
        // Only allow if both tasks have no milestone (they're both loose tasks)
        if (activeMilestoneId || overMilestoneId) {
          console.log('[Drag] Prevented: Cannot insert task between tasks of a different milestone');
          return; // Reject drop - milestone blocks must stay together
        }
      }

      // Reorder tasks within the same milestone or among loose tasks
      const sectionId: number | null = destSectionId ?? null;
      const sectionItems = workItems.length > 0
        ? groupedWorkItems[sectionId?.toString() || '0'] || []
        : groupedTasks[sectionId?.toString() || '0'] || [];

      const oldIndex = sectionItems.findIndex((item) => item.id === active.id);
      const newIndex = sectionItems.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sectionItems as any[], oldIndex, newIndex);
        const itemIds = newOrder.map((item: any) => item.id);
        onReorderTasks?.(sectionId, itemIds);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Determine what items to display
  const displayItems = workItems.length > 0 ? workItems : tasks;
  const hasItems = displayItems.length > 0;

  return (
    <div className="flex flex-col gap-0">
      {/* Task List */}
      {!hasItems ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
          <p className="text-sm text-gray-500">
            {tasks.length === 0
              ? 'Create your first task to get started!'
              : 'Try adjusting your filters to see more tasks.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Table Header */}
          <div
            className="sticky top-0 z-10 grid items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200"
            style={{
              gridTemplateColumns: `32px 1fr ${visibleColumns.map(col => getColumnWidth(col)).join(' ')} 32px`,
            }}
          >
            <div /> {/* Drag handle column */}
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Task name</div>
            {visibleColumns.map((col) => (
              <div key={col} className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {col === 'assignee' ? 'Assignee' : col === 'dueDate' ? 'Due date' : col === 'status' ? 'Status' : 'Priority'}
              </div>
            ))}
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${showColumnSelector ? 'bg-gray-200' : ''}`}
              >
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 3a1 1 0 011 1v3h3a1 1 0 110 2H9v3a1 1 0 11-2 0V9H4a1 1 0 110-2h3V4a1 1 0 011-1z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add Column Dropdown */}
          {showColumnSelector && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowColumnSelector(false)}
              />
              <div className="absolute right-4 top-32 z-30 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Select type
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'assignee' as ColumnType, icon: '👤', label: 'Person' },
                      { type: 'status' as ColumnType, icon: '⚡', label: 'Status' },
                      { type: 'dueDate' as ColumnType, icon: '📅', label: 'Date' },
                      { type: 'priority' as ColumnType, icon: '🎯', label: 'Priority' },
                    ].map(({ type, icon, label }) => (
                      <button
                        key={type}
                        onClick={() => {
                          if (!visibleColumns.includes(type)) {
                            setVisibleColumns([...visibleColumns, type]);
                          }
                          setShowColumnSelector(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm text-gray-700">{label}</span>
                      </button>
                    ))}
                  </div>

                  {visibleColumns.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Current columns
                      </div>
                      <div className="flex flex-col gap-1">
                        {visibleColumns.map((col) => (
                          <div
                            key={col}
                            className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-sm text-gray-700">
                              {col === 'assignee' ? 'Assignee' : col === 'dueDate' ? 'Due date' : col === 'status' ? 'Status' : 'Priority'}
                            </span>
                            <button
                              onClick={() => setVisibleColumns(visibleColumns.filter((c) => c !== col))}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Render sections - Single DndContext for cross-section dragging */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <SortableContext
                items={[
                  ...(workItems.length > 0 ? workItems : tasks as any[]).map((item: any) => item.id)
                ]}
                strategy={verticalListSortingStrategy}
              >
                {filteredSections.map(section => {
                  const sectionItems = workItems.length > 0
                    ? groupedWorkItems[section.id.toString()] || []
                    : groupedTasks[section.id.toString()] || [];

                  const isCollapsed = collapsedSections.has(section.id);

                  return (
                    <div key={section.id} className="border-b border-gray-200 last:border-b-0">
                      <SectionHeader
                        section={section}
                        taskCount={sectionItems.length}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => {
                          const newCollapsed = new Set(collapsedSections);
                          if (isCollapsed) {
                            newCollapsed.delete(section.id);
                          } else {
                            newCollapsed.add(section.id);
                          }
                          setCollapsedSections(newCollapsed);
                        }}
                        onRename={(newName) => onSectionRename?.(section.id, newName)}
                        onDelete={() => onSectionDelete?.(section.id)}
                        onColorChange={(color) => onSectionColorChange?.(section.id, color)}
                      />
                      {!isCollapsed && (
                        <SectionDropZone sectionId={section.id}>
                          {sectionItems.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                              No tasks in this section yet
                            </div>
                          ) : workItems.length > 0 ? (
                            <>
                              {(() => {
                                const workItemsInSection = sectionItems as WorkItem[];
                                return workItemsInSection.map((item, index) => {
                                  const isMilestone = item.type === 'milestone';
                                  const isTask = item.type === 'task';
                                  const taskMilestoneId = isTask ? item.originalTask?.milestone_id : undefined;

                                  // Check if this is the last task of a milestone
                                  const nextItem = workItemsInSection[index + 1];
                                  const isLastTaskOfMilestone = isTask && taskMilestoneId && (
                                    !nextItem || // Last item in section
                                    nextItem.type === 'milestone' || // Next is a milestone
                                    (nextItem.type === 'task' && nextItem.originalTask?.milestone_id !== taskMilestoneId) // Next task belongs to different milestone
                                  );

                                  return (
                                    <React.Fragment key={item.id}>
                                      <SortableRow
                                        item={item}
                                        visibleColumns={visibleColumns}
                                        onUpdateTask={onUpdateTask}
                                        onTaskClick={onTaskClick}
                                        onWorkItemClick={onWorkItemClick}
                                        projectMembers={projectMembers}
                                        milestones={milestones}
                                        allTasks={tasksForProgress}
                                      />
                                      {/* Add Task button after the last task of each milestone */}
                                      {isLastTaskOfMilestone && (
                                        <div className="flex items-center gap-2 px-4 py-2 pl-14 bg-blue-50 border-l-4 border-l-blue-400">
                                          <button
                                            onClick={() => onAddTask?.(section.id, taskMilestoneId)}
                                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add task to milestone
                                          </button>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                });
                              })()}
                            </>
                          ) : (
                            (sectionItems as Task[]).map((task) => (
                              <SortableRow
                                key={task.id}
                                item={task}
                                visibleColumns={visibleColumns}
                                onUpdateTask={onUpdateTask}
                                onTaskClick={onTaskClick}
                                projectMembers={projectMembers}
                                milestones={milestones}
                                allTasks={tasksForProgress}
                              />
                            ))
                          )}

                          {/* Quick add buttons at bottom of section */}
                          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200">
                            <button
                              onClick={() => onAddTask?.(section.id)}
                              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add task
                            </button>
                            <button
                              onClick={() => onAddMilestone?.(section.id)}
                              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add milestone
                            </button>
                          </div>
                        </SectionDropZone>
                      )}
                    </div>
                  );
                })}

                {/* No Section tasks */}
                {(() => {
                  const noSectionItems = workItems.length > 0
                    ? groupedWorkItems['0'] || []
                    : groupedTasks['0'] || [];

                  if (noSectionItems.length === 0) return null;

                  return (
                    <div className="border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">No Section</span>
                          <span className="text-xs text-gray-500">{noSectionItems.length}</span>
                        </div>
                      </div>
                      <SectionDropZone sectionId={null}>
                        {workItems.length > 0 ? (
                          <>
                            {(() => {
                              const workItemsNoSection = noSectionItems as WorkItem[];
                              return workItemsNoSection.map((item) => (
                                <SortableRow
                                  key={item.id}
                                  item={item}
                                  visibleColumns={visibleColumns}
                                  onUpdateTask={onUpdateTask}
                                  onTaskClick={onTaskClick}
                                  onWorkItemClick={onWorkItemClick}
                                  projectMembers={projectMembers}
                                  milestones={milestones}
                                  allTasks={tasksForProgress}
                                />
                              ));
                            })()}
                          </>
                        ) : (
                          <>
                            {(() => {
                              const tasksNoSection = noSectionItems as Task[];
                              return tasksNoSection.map((task) => (
                                <SortableRow
                                  key={task.id}
                                  item={task}
                                  visibleColumns={visibleColumns}
                                  onUpdateTask={onUpdateTask}
                                  onTaskClick={onTaskClick}
                                  projectMembers={projectMembers}
                                  milestones={milestones}
                                  allTasks={tasksForProgress}
                                />
                              ));
                            })()}
                          </>
                        )}
                      </SectionDropZone>
                    </div>
                  );
                })()}
              </SortableContext>
            </div>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default TaskListView;
