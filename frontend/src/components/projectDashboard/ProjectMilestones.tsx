import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import IconPicker, { ICON_OPTIONS } from '../shared/IconPicker';
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
import { CSS } from '@dnd-kit/utilities';

interface Category {
    name: string;
    color: string;
}

interface Milestone {
    milestone_id?: number;
    project_id?: number;
    parent_id?: number | null;
    title: string;
    description?: string | null;
    due_date?: string | null;
    status?: string;
    priority?: number;
    category?: string | null;
    completed?: boolean;
    sort_order?: number;
    custom_attributes?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

interface ProjectMilestonesProps {
    projectId: string;
    isAdmin: boolean;
}

// 20 predefined colors for categories
const CATEGORY_COLORS = [
    { name: 'Red', value: '#EF4444', bg: 'bg-red-500' },
    { name: 'Orange', value: '#F97316', bg: 'bg-orange-500' },
    { name: 'Amber', value: '#F59E0B', bg: 'bg-amber-500' },
    { name: 'Yellow', value: '#EAB308', bg: 'bg-yellow-500' },
    { name: 'Lime', value: '#84CC16', bg: 'bg-lime-500' },
    { name: 'Green', value: '#22C55E', bg: 'bg-green-500' },
    { name: 'Emerald', value: '#10B981', bg: 'bg-emerald-500' },
    { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-500' },
    { name: 'Cyan', value: '#06B6D4', bg: 'bg-cyan-500' },
    { name: 'Sky', value: '#0EA5E9', bg: 'bg-sky-500' },
    { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-500' },
    { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-500' },
    { name: 'Violet', value: '#8B5CF6', bg: 'bg-violet-500' },
    { name: 'Purple', value: '#A855F7', bg: 'bg-purple-500' },
    { name: 'Fuchsia', value: '#D946EF', bg: 'bg-fuchsia-500' },
    { name: 'Pink', value: '#EC4899', bg: 'bg-pink-500' },
    { name: 'Rose', value: '#F43F5E', bg: 'bg-rose-500' },
    { name: 'Slate', value: '#64748B', bg: 'bg-slate-500' },
    { name: 'Gray', value: '#6B7280', bg: 'bg-gray-500' },
    { name: 'Zinc', value: '#71717A', bg: 'bg-zinc-500' },
];

interface TaskItemProps {
    task: Milestone;
    allMilestones: Milestone[];
    categories: Category[];
    isAdmin: boolean;
    expandedTasks: Set<number>;
    addingSubtaskTo: number | null;
    newSubtaskTitle: string;
    onToggleExpand: (taskId: number) => void;
    onToggleComplete: (task: Milestone) => void;
    onEdit: (task: Milestone) => void;
    onDelete: (taskId: number) => void;
    onStartAddSubtask: (taskId: number) => void;
    onCancelAddSubtask: () => void;
    onSubtaskTitleChange: (value: string) => void;
    onAddSubtask: (parentId: number) => void;
    getStatusColor: (status?: string) => string;
    getPriorityLabel: (priority?: number) => { label: string; color: string };
    depth?: number;
}

interface SortableMilestoneItemProps {
    milestone: Milestone;
    categories: Category[];
    isAdmin: boolean;
    isExpanded: boolean;
    tasks: Milestone[];
    allMilestones: Milestone[];
    isAddingTask: boolean;
    newTaskTitle: string;
    expandedTasks: Set<number>;
    addingSubtaskTo: number | null;
    newSubtaskTitle: string;
    onToggleExpand: () => void;
    onToggleComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStartAddTask: () => void;
    onCancelAddTask: () => void;
    onTaskTitleChange: (value: string) => void;
    onAddTask: () => void;
    onTaskToggleExpand: (taskId: number) => void;
    onTaskToggleComplete: (task: Milestone) => void;
    onTaskEdit: (task: Milestone) => void;
    onTaskDelete: (taskId: number) => void;
    onStartAddSubtask: (taskId: number) => void;
    onCancelAddSubtask: () => void;
    onSubtaskTitleChange: (value: string) => void;
    onAddSubtask: (parentId: number) => void;
    onStatusChange: (milestone: Milestone, newStatus: string) => void;
    onPriorityChange: (milestone: Milestone, newPriority: number) => void;
    getStatusColor: (status?: string) => string;
    getPriorityLabel: (priority?: number) => { label: string; color: string };
}

// Recursive task component for nested subtasks
const TaskItem: React.FC<TaskItemProps> = ({
    task,
    allMilestones,
    categories,
    isAdmin,
    expandedTasks,
    addingSubtaskTo,
    newSubtaskTitle,
    onToggleExpand,
    onToggleComplete,
    onEdit,
    onDelete,
    onStartAddSubtask,
    onCancelAddSubtask,
    onSubtaskTitleChange,
    onAddSubtask,
    getStatusColor,
    getPriorityLabel,
    depth = 0,
}) => {
    const subtasks = allMilestones.filter(m => m.parent_id === task.milestone_id);
    const isExpanded = expandedTasks.has(task.milestone_id!);
    const isAddingSubtask = addingSubtaskTo === task.milestone_id;
    const indentClass = depth > 0 ? 'ml-6' : 'ml-8';

    return (
        <div className={indentClass}>
            <div className="group/task flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-blue-50 hover:to-white border border-gray-200 hover:border-blue-300 transition-all">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleComplete(task)}
                    className="w-4 h-4 text-blue-600 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer flex-shrink-0"
                />
                <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                </span>
                {subtasks.length > 0 && (
                    <button
                        onClick={() => onToggleExpand(task.milestone_id!)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 transition-colors flex-shrink-0"
                    >
                        <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {subtasks.length}
                    </button>
                )}
                {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
                        <button
                            onClick={() => onStartAddSubtask(task.milestone_id!)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Add subtask"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onEdit(task)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(task.milestone_id!)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Add subtask form */}
            {isAddingSubtask && (
                <div className="mt-2 ml-6 flex gap-2 bg-green-50 p-2 rounded-lg border-2 border-green-200">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => onSubtaskTitleChange(e.target.value)}
                        placeholder="Enter subtask title..."
                        className="flex-1 px-3 py-1.5 text-sm border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onAddSubtask(task.milestone_id!);
                            } else if (e.key === 'Escape') {
                                onCancelAddSubtask();
                            }
                        }}
                    />
                    <button
                        onClick={() => onAddSubtask(task.milestone_id!)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Add
                    </button>
                    <button
                        onClick={onCancelAddSubtask}
                        className="px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-200"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Recursive subtasks */}
            {isExpanded && subtasks.length > 0 && (
                <div className="mt-2 space-y-2">
                    {subtasks.map((subtask) => (
                        <TaskItem
                            key={subtask.milestone_id}
                            task={subtask}
                            allMilestones={allMilestones}
                            categories={categories}
                            isAdmin={isAdmin}
                            expandedTasks={expandedTasks}
                            addingSubtaskTo={addingSubtaskTo}
                            newSubtaskTitle={newSubtaskTitle}
                            onToggleExpand={onToggleExpand}
                            onToggleComplete={onToggleComplete}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStartAddSubtask={onStartAddSubtask}
                            onCancelAddSubtask={onCancelAddSubtask}
                            onSubtaskTitleChange={onSubtaskTitleChange}
                            onAddSubtask={onAddSubtask}
                            getStatusColor={getStatusColor}
                            getPriorityLabel={getPriorityLabel}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SortableMilestoneItem: React.FC<SortableMilestoneItemProps> = ({
    milestone,
    categories,
    isAdmin,
    isExpanded,
    tasks,
    allMilestones,
    isAddingTask,
    newTaskTitle,
    expandedTasks,
    addingSubtaskTo,
    newSubtaskTitle,
    onToggleExpand,
    onToggleComplete,
    onEdit,
    onDelete,
    onStartAddTask,
    onCancelAddTask,
    onTaskTitleChange,
    onAddTask,
    onTaskToggleExpand,
    onTaskToggleComplete,
    onTaskEdit,
    onTaskDelete,
    onStartAddSubtask,
    onCancelAddSubtask,
    onSubtaskTitleChange,
    onAddSubtask,
    onStatusChange,
    onPriorityChange,
    getStatusColor,
    getPriorityLabel,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: milestone.milestone_id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative bg-white rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200">
            <div className="p-5">
                <div className="flex gap-4">
                    {/* Left side - Drag handle and checkbox */}
                    <div className="flex flex-col items-center gap-3 pt-1">
                        {isAdmin && (
                            <button
                                {...attributes}
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Drag to reorder"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </button>
                        )}
                        <input
                            type="checkbox"
                            checked={milestone.completed}
                            onChange={onToggleComplete}
                            className="w-5 h-5 text-blue-600 rounded-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all"
                        />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 flex items-center gap-3 flex-wrap">
                                {milestone.custom_attributes?.icon && milestone.custom_attributes.icon !== 'none' && (() => {
                                    if (milestone.custom_attributes.icon === 'custom' && milestone.custom_attributes.iconUrl) {
                                        return <img src={milestone.custom_attributes.iconUrl} alt="" className="w-5 h-5 object-cover rounded flex-shrink-0" />;
                                    }
                                    const iconData = ICON_OPTIONS.find(icon => icon.name === milestone.custom_attributes?.icon);
                                    return iconData?.svg ? (
                                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconData.svg }} />
                                    ) : null;
                                })()}
                                <h3 className={`text-lg font-semibold ${milestone.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {milestone.title}
                                </h3>
                                {milestone.category && (() => {
                                    const categoryObj = categories.find(c => c.name === milestone.category);
                                    return (
                                        <span
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: categoryObj?.color || '#6B7280' }}
                                        >
                                            {milestone.category}
                                        </span>
                                    );
                                })()}
                                {tasks.length > 0 && (
                                    <button
                                        onClick={onToggleExpand}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        <svg
                                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                    </button>
                                )}
                            </div>

                            {/* Action buttons */}
                            {isAdmin && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={onStartAddTask}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Add task"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={onEdit}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit milestone"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete milestone"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {milestone.description && (
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">{milestone.description}</p>
                        )}

                        {/* Meta information */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Status</span>
                                <select
                                    value={milestone.status || 'pending'}
                                    onChange={(e) => onStatusChange(milestone, e.target.value)}
                                    disabled={!isAdmin}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all appearance-none pr-8 bg-no-repeat bg-right ${getStatusColor(milestone.status)} ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md hover:scale-105'}`}
                                    style={{
                                        backgroundImage: !isAdmin ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='currentColor' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 0.5rem center',
                                        backgroundSize: '12px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Priority */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Priority</span>
                                <select
                                    value={milestone.priority || 0}
                                    onChange={(e) => onPriorityChange(milestone, parseInt(e.target.value))}
                                    disabled={!isAdmin}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all appearance-none pr-8 bg-no-repeat bg-right ${
                                        milestone.priority === 4 ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500 focus:border-red-400' :
                                        milestone.priority === 3 ? 'bg-orange-50 text-orange-700 border-orange-200 focus:ring-orange-500 focus:border-orange-400' :
                                        milestone.priority === 2 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500 focus:border-yellow-400' :
                                        milestone.priority === 1 ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500 focus:border-blue-400' :
                                        'bg-gray-50 text-gray-700 border-gray-200 focus:ring-gray-500 focus:border-gray-400'
                                    } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md hover:scale-105'}`}
                                    style={{
                                        backgroundImage: !isAdmin ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='currentColor' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 0.5rem center',
                                        backgroundSize: '12px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="0">None</option>
                                    <option value="1">🔵 Low</option>
                                    <option value="2">🟡 Medium</option>
                                    <option value="3">🟠 High</option>
                                    <option value="4">🔴 Critical</option>
                                </select>
                            </div>

                            {/* Due date */}
                            {milestone.due_date && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add task form */}
                {isAddingTask && (
                    <div className="mt-4 ml-9 flex gap-2 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => onTaskTitleChange(e.target.value)}
                            placeholder="Enter task title..."
                            className="flex-1 px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onAddTask();
                                } else if (e.key === 'Escape') {
                                    onCancelAddTask();
                                }
                            }}
                        />
                        <button
                            onClick={onAddTask}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Add
                        </button>
                        <button
                            onClick={onCancelAddTask}
                            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-200"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Tasks list */}
                {isExpanded && tasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {tasks.map((task) => (
                            <TaskItem
                                key={task.milestone_id}
                                task={task}
                                allMilestones={allMilestones}
                                categories={categories}
                                isAdmin={isAdmin}
                                expandedTasks={expandedTasks}
                                addingSubtaskTo={addingSubtaskTo}
                                newSubtaskTitle={newSubtaskTitle}
                                onToggleExpand={onTaskToggleExpand}
                                onToggleComplete={onTaskToggleComplete}
                                onEdit={onTaskEdit}
                                onDelete={onTaskDelete}
                                onStartAddSubtask={onStartAddSubtask}
                                onCancelAddSubtask={onCancelAddSubtask}
                                onSubtaskTitleChange={onSubtaskTitleChange}
                                onAddSubtask={onAddSubtask}
                                getStatusColor={getStatusColor}
                                getPriorityLabel={getPriorityLabel}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectMilestones: React.FC<ProjectMilestonesProps> = ({ projectId, isAdmin }) => {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editedCategoryName, setEditedCategoryName] = useState('');
    const [editedCategoryColor, setEditedCategoryColor] = useState('#3B82F6');
    const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
    const [addingTaskToMilestone, setAddingTaskToMilestone] = useState<number | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    const [addingSubtaskTo, setAddingSubtaskTo] = useState<number | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter and sort state
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('sort_order');
    const [showCompleted, setShowCompleted] = useState(true);
    const [viewMode, setViewMode] = useState<'all' | 'active'>('all');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [formData, setFormData] = useState<Partial<Milestone>>({
        title: '',
        description: '',
        due_date: '',
        status: 'pending',
        priority: 0,
        category: '',
        completed: false,
        sort_order: 0,
        custom_attributes: { icon: 'none' }
    });

    useEffect(() => {
        fetchMilestones();
    }, [projectId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false);
                setEditingCategory(null);
            }
        };

        if (showCategoryDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showCategoryDropdown]);

    const fetchMilestones = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones`);
            if (response.ok) {
                const data = await response.json();
                const milestonesList = data.milestones || [];
                setMilestones(milestonesList);

                // Extract unique categories with default colors
                const categorySet = new Set<string>();
                milestonesList.forEach((m: Milestone) => {
                    if (m.category) {
                        categorySet.add(m.category);
                    }
                });
                const uniqueCategoryNames = Array.from(categorySet);
                setCategories(uniqueCategoryNames.map((name, index) => ({
                    name,
                    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].value
                })));
            }
        } catch (error) {
            console.error('Error fetching milestones:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate title
        if (!formData.title || !formData.title.trim()) {
            alert('Please enter a milestone title');
            return;
        }

        try {
            const url = editingId
                ? `/project/${projectId}/milestones/${editingId}`
                : `/project/${projectId}/milestones`;

            const method = editingId ? 'PUT' : 'POST';

            // Prepare payload - convert empty strings to null for optional fields
            const payload = {
                ...formData,
                title: formData.title.trim(),
                due_date: formData.due_date || null,
                description: formData.description || null,
                category: formData.category || null,
            };

            const response = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                await fetchMilestones();
                resetForm();
            } else {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                alert(`Error: ${errorData.error || 'Failed to save milestone'}`);
            }
        } catch (error) {
            console.error('Error saving milestone:', error);
            alert('Error saving milestone');
        }
    };

    const handleDelete = async (milestoneId: number) => {
        if (!confirm('Are you sure you want to delete this milestone?')) return;

        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones/${milestoneId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchMilestones();
            }
        } catch (error) {
            console.error('Error deleting milestone:', error);
        }
    };

    const handleEdit = (milestone: Milestone) => {
        setEditingId(milestone.milestone_id || null);
        setFormData({
            title: milestone.title,
            description: milestone.description || '',
            due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
            status: milestone.status || 'pending',
            priority: milestone.priority || 0,
            category: milestone.category || '',
            completed: milestone.completed || false,
            sort_order: milestone.sort_order || 0,
            custom_attributes: milestone.custom_attributes || { icon: 'none' }
        });
        setIsModalOpen(true);
    };

    const toggleComplete = async (milestone: Milestone) => {
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones/${milestone.milestone_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...milestone,
                    completed: !milestone.completed
                }),
            });

            if (response.ok) {
                await fetchMilestones();
            }
        } catch (error) {
            console.error('Error toggling milestone:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            due_date: '',
            status: 'pending',
            priority: 0,
            category: '',
            completed: false,
            sort_order: 0,
            custom_attributes: { icon: 'none' }
        });
        setEditingId(null);
        setIsModalOpen(false);
        setIsAddingCategory(false);
        setNewCategoryName('');
    };

    const handleAddCategory = () => {
        if (newCategoryName.trim() && !categories.find(c => c.name === newCategoryName.trim())) {
            setCategories([...categories, { name: newCategoryName.trim(), color: newCategoryColor }]);
            setFormData({ ...formData, category: newCategoryName.trim() });
            setIsAddingCategory(false);
            setNewCategoryName('');
            setNewCategoryColor('#3B82F6');
        }
    };

    const handleEditCategory = (oldCategory: Category) => {
        setEditingCategory(oldCategory.name);
        setEditedCategoryName(oldCategory.name);
        setEditedCategoryColor(oldCategory.color);
    };

    const handleSaveEditedCategory = () => {
        if (editingCategory && editedCategoryName.trim()) {
            const updatedCategories = categories.map(cat =>
                cat.name === editingCategory ? { name: editedCategoryName.trim(), color: editedCategoryColor } : cat
            );
            setCategories(updatedCategories);
            if (formData.category === editingCategory) {
                setFormData({ ...formData, category: editedCategoryName.trim() });
            }
        }
        setEditingCategory(null);
        setEditedCategoryName('');
    };

    const handleDeleteCategory = (categoryName: string) => {
        if (confirm(`Delete category "${categoryName}"?`)) {
            setCategories(categories.filter(cat => cat.name !== categoryName));
            if (formData.category === categoryName) {
                setFormData({ ...formData, category: '' });
            }
        }
    };

    const handleSelectCategory = (categoryName: string) => {
        setFormData({ ...formData, category: categoryName });
        setShowCategoryDropdown(false);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const parentMilestones = milestones.filter(m => !m.parent_id);
            console.log('Parent milestones before reorder:', parentMilestones);
            console.log('All milestones in state:', milestones);

            const oldIndex = parentMilestones.findIndex(m => m.milestone_id === active.id);
            const newIndex = parentMilestones.findIndex(m => m.milestone_id === over.id);
            console.log('Reordering from index', oldIndex, 'to', newIndex);

            const reorderedParents = arrayMove(parentMilestones, oldIndex, newIndex);

            // Update sort_order for all affected milestones
            const updates = reorderedParents.map((milestone, index) => ({
                ...milestone,
                sort_order: index
            }));
            console.log('Updates to send:', updates);

            // Save to backend - send complete milestone data
            try {
                const promises = updates.map(milestone => {
                    console.log(`Milestone ${milestone.milestone_id} before creating payload:`, milestone);
                    const payload = {
                        title: milestone.title,
                        description: milestone.description || null,
                        due_date: milestone.due_date || null,
                        status: milestone.status || 'pending',
                        priority: milestone.priority || 0,
                        category: milestone.category || null,
                        completed: milestone.completed || false,
                        sort_order: milestone.sort_order,
                        parent_id: milestone.parent_id || null,
                    };
                    console.log(`Payload for milestone ${milestone.milestone_id}:`, payload);
                    return fetchWithAuth(`/api/project/${projectId}/milestones/${milestone.milestone_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                });

                await Promise.all(promises);
                console.log('All updates completed successfully');

                // Refetch to get the updated data from the server
                await fetchMilestones();
            } catch (error) {
                console.error('Error updating milestone order:', error);
                await fetchMilestones(); // Revert on error
            }
        }
    };

    const toggleMilestoneExpanded = (milestoneId: number) => {
        setExpandedMilestones(prev => {
            const newSet = new Set(prev);
            if (newSet.has(milestoneId)) {
                newSet.delete(milestoneId);
            } else {
                newSet.add(milestoneId);
            }
            return newSet;
        });
    };

    const handleAddTask = async (parentId: number) => {
        if (!newTaskTitle.trim()) return;

        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTaskTitle.trim(),
                    parent_id: parentId,
                    status: 'pending',
                    priority: 0,
                    completed: false,
                }),
            });

            if (response.ok) {
                await fetchMilestones();
                setNewTaskTitle('');
                setAddingTaskToMilestone(null);
                setExpandedMilestones(prev => new Set(prev).add(parentId));
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const toggleTaskExpanded = (taskId: number) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleAddSubtask = async (parentId: number) => {
        if (!newSubtaskTitle.trim()) return;

        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newSubtaskTitle.trim(),
                    parent_id: parentId,
                    status: 'pending',
                    priority: 0,
                    completed: false,
                }),
            });

            if (response.ok) {
                await fetchMilestones();
                setNewSubtaskTitle('');
                setAddingSubtaskTo(null);
                setExpandedTasks(prev => new Set(prev).add(parentId));
            }
        } catch (error) {
            console.error('Error adding subtask:', error);
        }
    };

    const handleStatusChange = async (milestone: Milestone, newStatus: string) => {
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones/${milestone.milestone_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...milestone,
                    status: newStatus,
                }),
            });

            if (response.ok) {
                await fetchMilestones();
            }
        } catch (error) {
            console.error('Error updating milestone status:', error);
        }
    };

    const handlePriorityChange = async (milestone: Milestone, newPriority: number) => {
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/milestones/${milestone.milestone_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...milestone,
                    priority: newPriority,
                }),
            });

            if (response.ok) {
                await fetchMilestones();
            }
        } catch (error) {
            console.error('Error updating milestone priority:', error);
        }
    };

    const getTasksForMilestone = (milestoneId: number): Milestone[] => {
        return milestones.filter(m => m.parent_id === milestoneId);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityLabel = (priority?: number) => {
        switch (priority) {
            case 4:
                return { label: 'Critical', color: 'text-red-600' };
            case 3:
                return { label: 'High', color: 'text-orange-600' };
            case 2:
                return { label: 'Medium', color: 'text-yellow-600' };
            case 1:
                return { label: 'Low', color: 'text-blue-600' };
            default:
                return { label: 'None', color: 'text-gray-600' };
        }
    };

    // Filter and sort milestones
    const getFilteredAndSortedMilestones = () => {
        let filtered = milestones.filter(m => !m.parent_id);

        // Apply filters
        if (!showCompleted) {
            filtered = filtered.filter(m => !m.completed);
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(m => m.status === filterStatus);
        }

        if (filterPriority !== 'all') {
            filtered = filtered.filter(m => m.priority === parseInt(filterPriority));
        }

        if (filterCategory !== 'all') {
            filtered = filtered.filter(m => m.category === filterCategory);
        }

        if (viewMode === 'active') {
            filtered = filtered.filter(m => m.status === 'in_progress' || m.status === 'pending');
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'sort_order':
                    return (a.sort_order || 0) - (b.sort_order || 0);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'due_date':
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                case 'priority':
                    return (b.priority || 0) - (a.priority || 0);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                default:
                    return (a.sort_order || 0) - (b.sort_order || 0);
            }
        });

        return sorted;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading milestones...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1800px] mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">Milestones</h2>
                            <p className="text-sm text-slate-600 mt-1">Track and manage project milestones and tasks</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Milestone
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Sort Controls */}
                {milestones.length > 0 && (
                    <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">View:</span>
                            <div className="inline-flex rounded border border-gray-200 p-0.5">
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                        viewMode === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setViewMode('active')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                        viewMode === 'active'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Active Only
                                </button>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-300"></div>

                        {/* Sort By */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="sort_order">Custom Order</option>
                                <option value="title">Title</option>
                                <option value="due_date">Due Date</option>
                                <option value="priority">Priority</option>
                                <option value="status">Status</option>
                            </select>
                        </div>

                        <div className="h-6 w-px bg-gray-300"></div>

                        {/* Filter by Status */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="text-sm px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Filter by Priority */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Priority:</span>
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="text-sm px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="all">All</option>
                                <option value="4">Critical</option>
                                <option value="3">High</option>
                                <option value="2">Medium</option>
                                <option value="1">Low</option>
                                <option value="0">None</option>
                            </select>
                        </div>

                        {/* Filter by Category */}
                        {categories.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Category:</span>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="text-sm px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                                >
                                    <option value="all">All</option>
                                    {categories.map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-300"></div>

                        {/* Show Completed Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showCompleted}
                                onChange={(e) => setShowCompleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Completed</span>
                        </label>

                        {/* Reset Filters */}
                        {(filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all' || !showCompleted || viewMode !== 'all' || sortBy !== 'sort_order') && (
                            <button
                                onClick={() => {
                                    setFilterStatus('all');
                                    setFilterPriority('all');
                                    setFilterCategory('all');
                                    setShowCompleted(true);
                                    setViewMode('all');
                                    setSortBy('sort_order');
                                }}
                                className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingId ? 'Edit Milestone' : 'Create New Milestone'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={formData.due_date || ''}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status || 'pending'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { value: 0, label: 'None', color: 'bg-gray-100 text-gray-700' },
                                        { value: 1, label: '🔵 Low', color: 'bg-blue-100 text-blue-700' },
                                        { value: 2, label: '🟡 Medium', color: 'bg-yellow-100 text-yellow-700' },
                                        { value: 3, label: '🟠 High', color: 'bg-orange-100 text-orange-700' },
                                        { value: 4, label: '🔴 Critical', color: 'bg-red-100 text-red-700' }
                                    ].map(priority => (
                                        <button
                                            key={priority.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: priority.value })}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                formData.priority === priority.value
                                                    ? priority.color + ' ring-2 ring-offset-1 ring-blue-500'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {priority.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <IconPicker
                                selectedIcon={formData.custom_attributes?.icon || 'none'}
                                selectedIconUrl={formData.custom_attributes?.iconUrl}
                                onSelect={(iconName, iconUrl) => setFormData({
                                    ...formData,
                                    custom_attributes: {
                                        ...formData.custom_attributes,
                                        icon: iconName,
                                        iconUrl: iconUrl
                                    }
                                })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
                                    >
                                        <span className={`flex items-center gap-2 ${formData.category ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {formData.category && (() => {
                                                const categoryObj = categories.find(c => c.name === formData.category);
                                                return categoryObj ? (
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: categoryObj.color }}
                                                    />
                                                ) : null;
                                            })()}
                                            {formData.category || 'Select a category...'}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showCategoryDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                            {categories.length > 0 && (
                                                <div className="py-1">
                                                    {categories.map((cat) => (
                                                        <div
                                                            key={cat.name}
                                                            className="group hover:bg-gray-50"
                                                        >
                                                            {editingCategory === cat.name ? (
                                                                <div className="px-3 py-2 space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editedCategoryName}
                                                                        onChange={(e) => setEditedCategoryName(e.target.value)}
                                                                        className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleSaveEditedCategory();
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingCategory(null);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {CATEGORY_COLORS.map(color => (
                                                                            <button
                                                                                key={color.value}
                                                                                type="button"
                                                                                onClick={() => setEditedCategoryColor(color.value)}
                                                                                className={`w-6 h-6 rounded-full border-2 ${editedCategoryColor === color.value ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200'}`}
                                                                                style={{ backgroundColor: color.value }}
                                                                                title={color.name}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleSaveEditedCategory}
                                                                            className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingCategory(null)}
                                                                            className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between px-3 py-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectCategory(cat.name)}
                                                                        className="flex-1 text-left flex items-center gap-2"
                                                                    >
                                                                        <span
                                                                            className="w-3 h-3 rounded-full"
                                                                            style={{ backgroundColor: cat.color }}
                                                                        />
                                                                        {formData.category === cat.name && (
                                                                            <span className="text-blue-600">✓</span>
                                                                        )}
                                                                        <span>{cat.name}</span>
                                                                    </button>
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleEditCategory(cat);
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                                            title="Edit category"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (confirm(`Delete category "${cat.name}"?`)) {
                                                                                    handleDeleteCategory(cat.name);
                                                                                }
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                                            title="Delete category"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="border-t border-gray-200 p-2">
                                                {!isAddingCategory ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingCategory(true)}
                                                        className="w-full px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium text-left flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Add new category
                                                    </button>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            placeholder="Category name..."
                                                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddCategory();
                                                                } else if (e.key === 'Escape') {
                                                                    setIsAddingCategory(false);
                                                                    setNewCategoryName('');
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex gap-2 flex-wrap">
                                                            {CATEGORY_COLORS.map(color => (
                                                                <button
                                                                    key={color.value}
                                                                    type="button"
                                                                    onClick={() => setNewCategoryColor(color.value)}
                                                                    className={`w-6 h-6 rounded-full border-2 ${newCategoryColor === color.value ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200'}`}
                                                                    style={{ backgroundColor: color.value }}
                                                                    title={color.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleAddCategory}
                                                                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsAddingCategory(false);
                                                                    setNewCategoryName('');
                                                                    setNewCategoryColor('#3B82F6');
                                                                }}
                                                                className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow-md"
                                >
                                    {editingId ? 'Update Milestone' : 'Create Milestone'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors border-2 border-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-4">
                    {milestones.length === 0 ? (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No milestones yet</h3>
                            <p className="text-gray-600 mb-4">
                                {isAdmin ? 'Get started by creating your first milestone to track progress' : 'No milestones have been created for this project'}
                            </p>
                            {isAdmin && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create First Milestone
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {(() => {
                                const parentMilestones = getFilteredAndSortedMilestones();

                                if (parentMilestones.length === 0) {
                                    return (
                                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No milestones match your filters</h3>
                                            <p className="text-gray-600 mb-4">
                                                Try adjusting your filters to see more results
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setFilterStatus('all');
                                                    setFilterPriority('all');
                                                    setFilterCategory('all');
                                                    setShowCompleted(true);
                                                    setViewMode('all');
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Clear all filters
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <SortableContext
                                        items={parentMilestones.map(m => m.milestone_id!)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {parentMilestones.map((milestone) => {
                                    const tasks = getTasksForMilestone(milestone.milestone_id!);
                                    return (
                                        <SortableMilestoneItem
                                            key={milestone.milestone_id}
                                            milestone={milestone}
                                            categories={categories}
                                            isAdmin={isAdmin}
                                            isExpanded={expandedMilestones.has(milestone.milestone_id!)}
                                            tasks={tasks}
                                            allMilestones={milestones}
                                            isAddingTask={addingTaskToMilestone === milestone.milestone_id}
                                            newTaskTitle={newTaskTitle}
                                            expandedTasks={expandedTasks}
                                            addingSubtaskTo={addingSubtaskTo}
                                            newSubtaskTitle={newSubtaskTitle}
                                            onToggleExpand={() => toggleMilestoneExpanded(milestone.milestone_id!)}
                                            onToggleComplete={() => toggleComplete(milestone)}
                                            onEdit={() => handleEdit(milestone)}
                                            onDelete={() => handleDelete(milestone.milestone_id!)}
                                            onStartAddTask={() => setAddingTaskToMilestone(milestone.milestone_id!)}
                                            onCancelAddTask={() => {
                                                setAddingTaskToMilestone(null);
                                                setNewTaskTitle('');
                                            }}
                                            onTaskTitleChange={setNewTaskTitle}
                                            onAddTask={() => handleAddTask(milestone.milestone_id!)}
                                            onTaskToggleExpand={toggleTaskExpanded}
                                            onTaskToggleComplete={toggleComplete}
                                            onTaskEdit={handleEdit}
                                            onTaskDelete={handleDelete}
                                            onStartAddSubtask={(taskId) => setAddingSubtaskTo(taskId)}
                                            onCancelAddSubtask={() => {
                                                setAddingSubtaskTo(null);
                                                setNewSubtaskTitle('');
                                            }}
                                            onSubtaskTitleChange={setNewSubtaskTitle}
                                            onAddSubtask={handleAddSubtask}
                                            onStatusChange={handleStatusChange}
                                            onPriorityChange={handlePriorityChange}
                                            getStatusColor={getStatusColor}
                                            getPriorityLabel={getPriorityLabel}
                                        />
                                    );
                                })}
                                    </SortableContext>
                                );
                            })()}
                        </>
                    )}
                </div>
            </DndContext>
            </div>
        </div>
    );
};

export default ProjectMilestones;
