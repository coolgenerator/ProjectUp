import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import './TimelineView.css';
import { Box, Paper, Typography, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { Task } from '../../../types/task';
import { WorkItem } from '../../../types/workItem';
import fetchWithAuth from '../../../hooks/fetchWithAuth';

interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

interface TimelineViewProps {
  tasks: Task[];
  workItems?: WorkItem[];
  onTaskClick?: (task: Task) => void;
  projectId?: string;
}

interface DragState {
  isDragging: boolean;
  sourceTaskId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tasks,
  workItems = [],
  onTaskClick,
  projectId,
}) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>(ViewMode.Day);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceTaskId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [selectedDependencyId, setSelectedDependencyId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    sourceTaskId: string | null;
    targetTaskId: string | null;
    sourceTask: GanttTask | null;
    targetTask: GanttTask | null;
  }>({
    open: false,
    sourceTaskId: null,
    targetTaskId: null,
    sourceTask: null,
    targetTask: null,
  });

  // Clear drag state when switching away from Day view
  useEffect(() => {
    if (viewMode !== ViewMode.Day && dragState.isDragging) {
      setDragState({
        isDragging: false,
        sourceTaskId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    }
  }, [viewMode, dragState.isDragging]);

  // Handle keyboard events for deleting selected dependency
  // Moved after ganttTasks definition to avoid initialization error
  const [displayRange, setDisplayRange] = useState<{ start: Date; end: Date } | null>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const hasAutoScrolledRef = useRef(false);

  // Fetch dependencies
  useEffect(() => {
    if (!projectId) {
      console.warn('⚠️ No projectId provided to TimelineView');
      return;
    }

    const fetchDependencies = async () => {
      try {
        console.log(`🔄 Fetching dependencies for project: ${projectId}`);
        const response = await fetchWithAuth(`/api/tasks/project/${projectId}/dependencies`);
        console.log(`📡 Dependencies API response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('📦 Dependencies API response:', data);
          setDependencies(data.dependencies || []);
          console.log(`✅ Loaded ${data.dependencies?.length || 0} dependencies`);
        } else {
          const errorText = await response.text();
          console.error('❌ Dependencies API error:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Failed to fetch dependencies:', error);
      }
    };

    fetchDependencies();
  }, [projectId]);

  // Remove dependency
  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      console.log('Removing dependency:', dependencyId);

      const response = await fetchWithAuth(`/api/tasks/dependencies/${dependencyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDependencies(dependencies.filter(dep => dep.id !== dependencyId));
        setSelectedDependencyId(null);
        console.log(`✅ Dependency removed (ID: ${dependencyId})`);
      } else {
        const errorData = await response.json();
        console.error('Failed to remove dependency:', errorData);
        alert(`Failed to remove dependency: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to remove dependency:', error);
      alert('Failed to remove dependency. Please try again.');
    }
  };

  // Check and initiate dependency creation
  const handleAddDependency = async (sourceTaskId: string, targetTaskId: string) => {
    console.log('Creating dependency:', sourceTaskId, '→', targetTaskId);

    // Check if source task has a later start date than target task
    const sourceTask = ganttTasks.find(t => t.id === sourceTaskId);
    const targetTask = ganttTasks.find(t => t.id === targetTaskId);

    if (sourceTask && targetTask) {
      const sourceStartDate = new Date(sourceTask.start);
      const targetStartDate = new Date(targetTask.start);

      // If source task starts after target task, show warning dialog
      if (sourceStartDate > targetStartDate) {
        setConfirmDialog({
          open: true,
          sourceTaskId,
          targetTaskId,
          sourceTask,
          targetTask,
        });
        return;
      }
    }

    // No conflict, create directly
    await createDependency(sourceTaskId, targetTaskId);
  };

  // Add dependency (actual creation)
  const createDependency = async (sourceTaskId: string, targetTaskId: string) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${targetTaskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depends_on_task_id: sourceTaskId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Create dependency response:', data);

        // Show success feedback (use ganttTasks without placeholders for display)
        const sourceTask = ganttTasks.find(t => t.id === sourceTaskId);
        const targetTask = ganttTasks.find(t => t.id === targetTaskId);
        console.log(`✅ Dependency created: "${sourceTask?.name}" → "${targetTask?.name}"`);

        // Reload dependencies to refresh the display
        if (projectId) {
          console.log('🔄 Reloading dependencies after creation...');
          const refreshResponse = await fetchWithAuth(`/api/tasks/project/${projectId}/dependencies`);
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('📦 Refreshed dependencies:', refreshData);
            setDependencies(refreshData.dependencies || []);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to add dependency:', errorData);

        // Show user-friendly error messages
        if (errorData.error?.includes('circular dependency')) {
          alert('Cannot create dependency: This would create a circular dependency (a task depending on itself directly or indirectly).');
        } else if (errorData.error?.includes('already exists')) {
          alert('This dependency already exists.');
        } else {
          alert(`Failed to create dependency: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to add dependency:', error);
      alert('Failed to create dependency. Please try again.');
    }
  };

  // Convert tasks to Gantt tasks (without placeholders to avoid circular dependency)
  const ganttTasks = useMemo((): GanttTask[] => {
    const itemsToConvert = workItems.length > 0
      ? workItems.filter(item => item.type === 'task' && item.originalTask).map(item => item.originalTask!)
      : tasks;

    // Debug: Log dependencies array
    console.log(`🔗 Total dependencies loaded: ${dependencies.length}`);
    if (dependencies.length > 0) {
      console.log('Dependencies:', dependencies.filter(d => d).map(d => ({
        from: d.depends_on_task_id,
        to: d.task_id,
      })));
    }

    const filteredTasks = itemsToConvert.filter(task => task.start_date || task.due_date);
    console.log(`📋 Tasks with dates: ${filteredTasks.length}`, filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
    })));

    return filteredTasks
      .map((task) => {
        const start = task.start_date
          ? new Date(task.start_date)
          : task.due_date
            ? new Date(task.due_date)
            : new Date();

        const end = task.due_date
          ? new Date(task.due_date)
          : task.start_date
            ? new Date(new Date(task.start_date).getTime() + 24 * 60 * 60 * 1000)
            : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

        // Find dependencies for this task
        const taskDependencies = dependencies
          .filter(dep => dep && dep.task_id === task.id)
          .map(dep => dep.depends_on_task_id);

        // Debug: Log tasks with dependencies
        if (taskDependencies.length > 0) {
          console.log(`📎 Task "${task.title}" depends on:`, taskDependencies);
        }

        // Check if task is on weekend
        const dayOfWeek = start.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

        return {
          id: task.id,
          name: task.title,
          start,
          end,
          progress: task.progress || 0,
          type: 'task' as const,
          // Use task ID as project to ensure each task gets its own row
          project: task.id,
          dependencies: taskDependencies,
          styles: {
            backgroundColor:
              task.status === 'done' ? '#10b981' :
              task.status === 'in_progress' ? '#3b82f6' :
              task.status === 'blocked' ? '#ef4444' :
              '#6b7280',
            backgroundSelectedColor:
              task.status === 'done' ? '#059669' :
              task.status === 'in_progress' ? '#2563eb' :
              task.status === 'blocked' ? '#dc2626' :
              '#4b5563',
          },
          // Store weekend info for later use
          isWeekend,
        } as GanttTask & { isWeekend?: boolean };
      });
  }, [tasks, workItems, dependencies]);

  // Add placeholders separately to avoid circular dependency
  const ganttTasksWithPlaceholders = useMemo((): GanttTask[] => {
    if (!displayRange || ganttTasks.length === 0) {
      return ganttTasks;
    }

    const placeholderStart: GanttTask = {
      id: '__placeholder_start__',
      name: '',
      start: displayRange.start,
      end: new Date(displayRange.start.getTime() + 1000),
      progress: 0,
      type: 'task' as const,
      project: '__invisible__',
      dependencies: [],
      styles: {
        backgroundColor: 'transparent',
        backgroundSelectedColor: 'transparent',
        progressColor: 'transparent',
        progressSelectedColor: 'transparent',
      },
      isDisabled: true,
    };

    const placeholderEnd: GanttTask = {
      id: '__placeholder_end__',
      name: '',
      start: new Date(displayRange.end.getTime() - 1000),
      end: displayRange.end,
      progress: 0,
      type: 'task' as const,
      project: '__invisible__',
      dependencies: [],
      styles: {
        backgroundColor: 'transparent',
        backgroundSelectedColor: 'transparent',
        progressColor: 'transparent',
        progressSelectedColor: 'transparent',
      },
      isDisabled: true,
    };

    return [placeholderStart, ...ganttTasks, placeholderEnd];
  }, [ganttTasks, displayRange]);

  // Handle keyboard events for deleting selected dependency
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log(`⌨️ Key pressed: ${e.key}, selectedDependencyId: ${selectedDependencyId}`);

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDependencyId !== null) {
        // Prevent default backspace navigation
        e.preventDefault();

        // Find the dependency to show which one is being deleted
        const dep = dependencies.find(d => d.id === selectedDependencyId);
        if (dep) {
          const sourceTask = ganttTasks.find(t => t.id === dep.depends_on_task_id);
          const targetTask = ganttTasks.find(t => t.id === dep.task_id);
          console.log(`🗑️ Deleting dependency: "${sourceTask?.name}" → "${targetTask?.name}"`);
        }

        handleRemoveDependency(selectedDependencyId);
      }

      // Deselect on Escape
      if (e.key === 'Escape' && selectedDependencyId !== null) {
        setSelectedDependencyId(null);
      }
    };

    console.log(`🔄 Keyboard handler registered with selectedDependencyId: ${selectedDependencyId}`);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDependencyId, dependencies, ganttTasks]);

  // Calculate extended date range for infinite scrolling (only based on real tasks)
  useEffect(() => {
    if (ganttTasks.length === 0) return;

    let minDate = ganttTasks[0].start;
    let maxDate = ganttTasks[0].end;

    ganttTasks.forEach(task => {
      if (task.start < minDate) minDate = task.start;
      if (task.end > maxDate) maxDate = task.end;
    });

    // Extend range for better scrolling experience
    const extendDays = viewMode === ViewMode.Day ? 30 : viewMode === ViewMode.Week ? 60 : 90;
    const extendedStart = new Date(minDate);
    extendedStart.setDate(extendedStart.getDate() - extendDays);

    const extendedEnd = new Date(maxDate);
    extendedEnd.setDate(extendedEnd.getDate() + extendDays);

    setDisplayRange({ start: extendedStart, end: extendedEnd });
  }, [ganttTasks, viewMode]);

  // Add data-task-id attributes to all task bars for reliable task identification
  // This runs in all view modes to ensure attributes are always present
  useEffect(() => {
    if (!ganttContainerRef.current) return;

    const container = ganttContainerRef.current;

    const addDataTaskIdAttributes = () => {
      // The gantt-task-react library creates multiple SVG elements
      // We need to search through ALL of them to find the task bars
      const allSvgs = container.querySelectorAll('svg');
      if (allSvgs.length === 0) {
        console.log('⚠️ No SVG elements found yet');
        return false;
      }

      // Use the same approach as drag handle creation: find rects first, then get parent g elements
      // This matches the gantt-task-react library's structure more accurately
      const svgRects = container.querySelectorAll('svg g[class*="bar"] rect:first-child, svg rect[class*="barBackground"]');

      if (svgRects.length === 0) {
        // Try alternative: find any rect elements and get their parent g
        const allRects = container.querySelectorAll('svg rect');
        const rectWithParentG = Array.from(allRects).filter(rect => {
          const parentG = rect.closest('g');
          return parentG && parentG.classList.length > 0;
        });
        console.log(`📊 Found ${allRects.length} total rects, ${rectWithParentG.length} with parent <g>`);
      }

      const taskBars: Element[] = [];

      // Get unique parent g elements for each rect
      svgRects.forEach(rect => {
        const parentG = (rect as Element).closest('g');
        if (parentG && !taskBars.includes(parentG)) {
          taskBars.push(parentG);
        }
      });

      if (taskBars.length > 0) {
        console.log(`✅ Found ${taskBars.length} task bars from ${svgRects.length} rect elements`);
      }

      if (taskBars.length === 0) {
        // Debug: Only log once per second to avoid spam
        const now = Date.now();
        const lastLog = (window as any).__lastTaskBarLog || 0;
        if (now - lastLog > 1000) {
          console.log(`⚠️ No task bars found. Searched ${allSvgs.length} SVG elements.`);

          // Show structure of each SVG
          allSvgs.forEach((svg, svgIndex) => {
            const allGroups = svg.querySelectorAll('g');
            console.log(`  SVG ${svgIndex}: ${allGroups.length} <g> elements`);
            if (allGroups.length > 0 && allGroups.length < 20) {
              allGroups.forEach((g, i) => {
                const className = g.getAttribute('class') || '(no class)';
                const hasRect = g.querySelector('rect') !== null;
                if (hasRect) {
                  console.log(`    Group ${i}: class="${className}", hasRect=true`);
                }
              });
            }
          });
          (window as any).__lastTaskBarLog = now;
        }
        return false;
      }

      let attributesAdded = 0;
      taskBars.forEach((barWrapper, index) => {
        if (index >= ganttTasksWithPlaceholders.length) return;

        const task = ganttTasksWithPlaceholders[index];

        // Skip placeholders
        if (task.id.startsWith('__placeholder_')) return;

        // Add data-task-id to the bar wrapper group
        barWrapper.setAttribute('data-task-id', task.id);
        attributesAdded++;

        // Add to all rects in this group
        const allRects = barWrapper.querySelectorAll('rect');
        allRects.forEach(rect => {
          rect.setAttribute('data-task-id', task.id);
        });
      });

      if (attributesAdded > 0) {
        console.log(`🏷️ Added data-task-id attributes to ${attributesAdded} task bars`);
      }
      return attributesAdded > 0;
    };

    // Try immediately, and retry periodically to handle async rendering
    const success = addDataTaskIdAttributes();

    // Set up interval to keep adding attributes (gantt library may re-render)
    const intervalId = setInterval(addDataTaskIdAttributes, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [ganttTasksWithPlaceholders, viewMode]);

  // Add weekend shading, today marker, and darker shadows for weekend tasks
  useEffect(() => {
    if (!ganttContainerRef.current) return;

    const container = ganttContainerRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remove existing weekend overlays and shadows
    const existingWeekends = svg.querySelectorAll('.weekend-highlight');
    existingWeekends.forEach(el => el.remove());

    const existingToday = svg.querySelectorAll('.today-marker');
    existingToday.forEach(el => el.remove());

    const existingShadows = svg.querySelectorAll('.weekend-task-shadow');
    existingShadows.forEach(el => el.remove());

    if (viewMode === ViewMode.Day) {
      // Get the calendar grid
      const gridRows = svg.querySelectorAll('g[class*="gridRow"]');
      if (gridRows.length === 0) return;

      // Find the calendar header to get column positions
      const headerCells = svg.querySelectorAll('text[class*="calendarBottomText"]');
      if (headerCells.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      headerCells.forEach((cell, index) => {
        const textContent = cell.textContent || '';
        // Check if it's a weekend (Saturday or Sunday in various formats)
        const isSaturday = textContent.includes('Sat') || textContent.includes('星期六') || textContent.includes('週六');
        const isSunday = textContent.includes('Sun') || textContent.includes('星期日') || textContent.includes('週日');
        const isWeekend = isSaturday || isSunday;

        if (isWeekend) {
          const cellRect = (cell as SVGTextElement).getBBox();
          const parent = cell.parentElement;
          if (!parent) return;

          // Find the column width
          let columnWidth = 60; // Default day view column width
          if (index < headerCells.length - 1) {
            const nextCell = headerCells[index + 1] as SVGTextElement;
            const nextRect = nextCell.getBBox();
            columnWidth = nextRect.x - cellRect.x;
          }

          // Create weekend overlay
          const weekendRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          weekendRect.setAttribute('class', 'weekend-highlight');
          weekendRect.setAttribute('x', String(cellRect.x - columnWidth / 2));
          weekendRect.setAttribute('y', '0');
          weekendRect.setAttribute('width', String(columnWidth));
          weekendRect.setAttribute('height', String(svg.viewBox.baseVal.height || 1000));

          // Insert at the beginning so it's behind other elements
          svg.insertBefore(weekendRect, svg.firstChild);
        }
      });

      // Add today marker
      const svgRect = svg.getBoundingClientRect();
      const firstTask = ganttTasksWithPlaceholders[0];
      if (firstTask) {
        const taskStart = new Date(firstTask.start);
        const daysDiff = Math.floor((today.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0) {
          const columnWidth = 60;
          const todayX = daysDiff * columnWidth + columnWidth / 2;

          const todayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          todayLine.setAttribute('class', 'today-marker');
          todayLine.setAttribute('x1', String(todayX));
          todayLine.setAttribute('y1', '0');
          todayLine.setAttribute('x2', String(todayX));
          todayLine.setAttribute('y2', String(svg.viewBox.baseVal.height || 1000));

          svg.appendChild(todayLine);
        }
      }

      // Add darker shadows for weekend tasks in day view
      // Try multiple selectors to find task bars
      let taskBars = svg.querySelectorAll('g[class*="barWrapper"]');
      if (taskBars.length === 0) {
        taskBars = svg.querySelectorAll('g[class*="bar"]');
      }
      if (taskBars.length === 0) {
        taskBars = svg.querySelectorAll('g.bar, g._bar');
      }

      taskBars.forEach((barWrapper, index) => {
        if (index >= ganttTasksWithPlaceholders.length) return;

        const task = ganttTasksWithPlaceholders[index] as GanttTask & { isWeekend?: boolean };

        // Skip placeholders
        if (task.id.startsWith('__placeholder_')) return;

        // If task is on weekend, add a darker shadow overlay
        if (task.isWeekend) {
          const taskRect = barWrapper.querySelector('rect');
          if (!taskRect) return;

          try {
            const bbox = taskRect.getBBox();

            // Create a semi-transparent dark overlay for weekend tasks
            const shadowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shadowRect.setAttribute('class', 'weekend-task-shadow');
            shadowRect.setAttribute('x', String(bbox.x));
            shadowRect.setAttribute('y', String(bbox.y));
            shadowRect.setAttribute('width', String(bbox.width));
            shadowRect.setAttribute('height', String(bbox.height));
            shadowRect.setAttribute('fill', 'rgba(0, 0, 0, 0.25)'); // Darker shadow for weekends
            shadowRect.setAttribute('pointer-events', 'none');
            shadowRect.setAttribute('rx', String(taskRect.getAttribute('rx') || '4'));

            // Add the shadow as a sibling to the task rect
            barWrapper.appendChild(shadowRect);
          } catch (err) {
            console.warn('Failed to add weekend shadow:', err);
          }
        }
      });
    }
  }, [ganttTasksWithPlaceholders, viewMode]);

  // Draw custom dependency arrows matching the drag arrow style
  useEffect(() => {
    if (!ganttContainerRef.current || dependencies.length === 0) return;

    const container = ganttContainerRef.current;
    const allSvgs = container.querySelectorAll('svg');
    if (allSvgs.length === 0) return;

    // Find the SVG that contains task bars
    let taskSvg: SVGSVGElement | null = null;
    for (const svg of Array.from(allSvgs)) {
      const taskBars = svg.querySelectorAll('g[class*="bar"] rect:first-child');
      if (taskBars.length > 0) {
        taskSvg = svg as SVGSVGElement;
        break;
      }
    }

    if (!taskSvg) return;

    // Remove existing custom arrows
    const existingArrows = taskSvg.querySelectorAll('.custom-dependency-arrow');
    existingArrows.forEach(el => el.remove());

    // Create a group for all arrows
    const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    arrowGroup.setAttribute('class', 'custom-dependency-arrows');

    // Create arrowhead marker
    const defs = taskSvg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!taskSvg.querySelector('defs')) {
      taskSvg.insertBefore(defs, taskSvg.firstChild);
    }

    // Remove existing markers if they exist
    const existingMarkers = defs.querySelectorAll('[id^="dependency-arrowhead"]');
    existingMarkers.forEach(m => m.remove());

    // Create three markers for different states: normal, hover, selected
    const markerStates = [
      { id: 'dependency-arrowhead-normal', fill: '#d97706' },
      { id: 'dependency-arrowhead-hover', fill: '#ea580c' },
      { id: 'dependency-arrowhead-selected', fill: '#ea580c' } // Same as hover
    ];

    markerStates.forEach(state => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', state.id);
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('orient', 'auto');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 5, 0 10');
      polygon.setAttribute('fill', state.fill);

      marker.appendChild(polygon);
      defs.appendChild(marker);
    });

    // Get all task bar positions
    const taskPositions = new Map<string, DOMRect>();
    const svgRects = container.querySelectorAll('svg g[class*="bar"] rect:first-child');
    svgRects.forEach((rect, index) => {
      if (index >= ganttTasksWithPlaceholders.length) return;
      const task = ganttTasksWithPlaceholders[index];
      if (task && !task.id.startsWith('__placeholder_')) {
        const bbox = (rect as SVGRectElement).getBBox();
        const rectElement = rect as SVGRectElement;
        taskPositions.set(task.id, bbox);
      }
    });

    // Draw arrows for each dependency
    let arrowsDrawn = 0;
    dependencies.filter(dep => dep).forEach(dep => {
      const sourcePos = taskPositions.get(dep.depends_on_task_id);
      const targetPos = taskPositions.get(dep.task_id);

      if (!sourcePos || !targetPos) {
        console.warn(`⚠️ Could not find position for dependency: ${dep.depends_on_task_id} → ${dep.task_id}`);
        return;
      }

      arrowsDrawn++;

      // Get task names for confirmation dialog
      const sourceTask = ganttTasks.find(t => t.id === dep.depends_on_task_id);
      const targetTask = ganttTasks.find(t => t.id === dep.task_id);

      // Start from right edge of source task
      const startX = sourcePos.x + sourcePos.width;
      const startY = sourcePos.y + sourcePos.height / 2;

      // End at left edge of target task
      const endX = targetPos.x;
      const endY = targetPos.y + targetPos.height / 2;

      // Create a group for this dependency (for hover effects)
      const depGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const isSelected = dep.id === selectedDependencyId;
      depGroup.setAttribute('class', `dependency-group${isSelected ? ' selected' : ''}`);
      depGroup.style.cursor = 'pointer';

      // Create background shadow path
      const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = `M ${startX} ${startY} C ${startX + Math.abs(endX - startX) * 0.5} ${startY}, ${endX - Math.abs(endX - startX) * 0.5} ${endY}, ${endX} ${endY}`;

      shadowPath.setAttribute('d', pathData);
      shadowPath.setAttribute('stroke', '#000');
      shadowPath.setAttribute('stroke-width', '4');
      shadowPath.setAttribute('fill', 'none');
      shadowPath.setAttribute('opacity', '0.15');
      shadowPath.setAttribute('class', 'custom-dependency-arrow dependency-shadow');
      depGroup.appendChild(shadowPath);

      // Create main path
      const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainPath.setAttribute('d', pathData);
      mainPath.setAttribute('stroke', '#d97706');
      mainPath.setAttribute('stroke-width', '2.5');
      mainPath.setAttribute('fill', 'none');
      mainPath.setAttribute('marker-end', 'url(#dependency-arrowhead-normal)');
      mainPath.setAttribute('stroke-linecap', 'round');
      mainPath.setAttribute('class', 'custom-dependency-arrow dependency-main');
      depGroup.appendChild(mainPath);

      // Create invisible wider path for easier clicking
      const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      clickPath.setAttribute('d', pathData);
      clickPath.setAttribute('stroke', 'transparent');
      clickPath.setAttribute('stroke-width', '20');
      clickPath.setAttribute('fill', 'none');
      clickPath.style.cursor = 'pointer';
      depGroup.appendChild(clickPath);

      // Create start circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(startX));
      circle.setAttribute('cy', String(startY));
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#d97706');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('class', 'custom-dependency-arrow dependency-circle');
      depGroup.appendChild(circle);

      // Set initial style based on selection state - only change color, not size
      if (isSelected) {
        mainPath.setAttribute('stroke', '#ea580c'); // Darker orange for selected (same as hover)
        mainPath.setAttribute('marker-end', 'url(#dependency-arrowhead-selected)');
        shadowPath.setAttribute('opacity', '0.25');
        circle.setAttribute('fill', '#ea580c');
      }

      // Add hover effects - only change color, not size
      depGroup.addEventListener('mouseenter', () => {
        if (!isSelected) {
          mainPath.setAttribute('stroke', '#ea580c'); // Darker orange on hover
          mainPath.setAttribute('marker-end', 'url(#dependency-arrowhead-hover)');
          shadowPath.setAttribute('opacity', '0.2');
        }
      });

      depGroup.addEventListener('mouseleave', () => {
        if (!isSelected) {
          mainPath.setAttribute('stroke', '#d97706'); // Original orange
          mainPath.setAttribute('marker-end', 'url(#dependency-arrowhead-normal)');
          shadowPath.setAttribute('opacity', '0.15');
        }
      });

      // Add click handler to select
      depGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🖱️ Clicked dependency, setting selectedId to: ${dep.id}`);
        setSelectedDependencyId(dep.id);
        console.log(`✅ Selected dependency (ID: ${dep.id}): "${sourceTask?.name}" → "${targetTask?.name}" (Press Delete to remove)`);
      });

      arrowGroup.appendChild(depGroup);
    });

    // Insert arrow group before task bars so arrows appear behind tasks
    const firstTaskBar = taskSvg.querySelector('g[class*="bar"]');
    if (firstTaskBar && firstTaskBar.parentNode) {
      firstTaskBar.parentNode.insertBefore(arrowGroup, firstTaskBar);
    } else {
      taskSvg.appendChild(arrowGroup);
    }

    console.log(`🎨 Drew ${arrowsDrawn} custom dependency arrows (${dependencies.length} total dependencies)`);

    // Add click handler to deselect when clicking outside arrows
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.dependency-group') && selectedDependencyId !== null) {
        setSelectedDependencyId(null);
        console.log('⭕ Deselected dependency');
      }
    };

    container.addEventListener('click', handleClickOutside);
    return () => {
      container.removeEventListener('click', handleClickOutside);
    };
  }, [dependencies, ganttTasksWithPlaceholders, viewMode, selectedDependencyId]);

  // Reset auto-scroll flag when view mode changes
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [viewMode]);

  // Auto-scroll to today on initial load
  useEffect(() => {
    if (!ganttContainerRef.current || !displayRange || hasAutoScrolledRef.current) return;

    const container = ganttContainerRef.current;

    // Wait for Gantt to render, then scroll to today
    const scrollToToday = () => {
      const allDivs = Array.from(container.querySelectorAll('div')) as HTMLDivElement[];
      let scrollableDiv: HTMLDivElement | null = null;

      for (const div of allDivs) {
        const hasHorizontalScroll = div.scrollWidth > div.clientWidth;
        const hasOverflow = window.getComputedStyle(div).overflowX !== 'hidden';

        if (hasHorizontalScroll && hasOverflow) {
          scrollableDiv = div;
          break;
        }
      }

      if (!scrollableDiv || !displayRange) return;

      // Calculate position of today based on view mode
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(displayRange.start);
      startDate.setHours(0, 0, 0, 0);

      let todayPosition = 0;

      if (viewMode === ViewMode.Day) {
        // Day view: each column is a day
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        todayPosition = daysDiff * 60;
      } else if (viewMode === ViewMode.Week) {
        // Week view: each column is a week
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeksDiff = daysDiff / 7;
        todayPosition = weeksDiff * 250;
      } else if (viewMode === ViewMode.Month) {
        // Month view: each column is a month
        const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 +
                          (today.getMonth() - startDate.getMonth());
        todayPosition = monthsDiff * 300;
      }

      if (todayPosition >= 0) {
        // Scroll to today's position, centered in view
        const scrollLeft = todayPosition - scrollableDiv.clientWidth / 2;
        scrollableDiv.scrollLeft = Math.max(0, scrollLeft);

        hasAutoScrolledRef.current = true;
        console.log(`📍 Scrolled timeline to today (${today.toLocaleDateString()}) at position ${todayPosition}px`);
      }
    };

    // Delay to ensure Gantt has rendered
    const timeoutId = setTimeout(scrollToToday, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [displayRange, viewMode, ganttTasksWithPlaceholders.length]); // Re-run when tasks load

  // Infinite scrolling: extend date range when scrolling near edges
  useEffect(() => {
    if (!ganttContainerRef.current || !displayRange) return;

    const container = ganttContainerRef.current;

    // Wait for Gantt to render, then find scrollable element
    const setupScrollListener = () => {
      // The gantt-task-react library renders the chart in a wrapper div
      // We need to find all potentially scrollable elements
      const allDivs = Array.from(container.querySelectorAll('div')) as HTMLDivElement[];

      // Find the div with horizontal scroll (gantt chart container)
      let scrollableDiv: HTMLDivElement | null = null;
      for (const div of allDivs) {
        const hasHorizontalScroll = div.scrollWidth > div.clientWidth;
        const hasOverflow = window.getComputedStyle(div).overflowX !== 'hidden';

        if (hasHorizontalScroll && hasOverflow) {
          scrollableDiv = div;
          console.log('📊 Found scrollable gantt container:', {
            scrollWidth: div.scrollWidth,
            clientWidth: div.clientWidth,
            overflowX: window.getComputedStyle(div).overflowX
          });
          break;
        }
      }

      if (!scrollableDiv) {
        console.warn('⚠️ No scrollable container found, using gantt-container');
        scrollableDiv = container;
      }

      scrollContainerRef.current = scrollableDiv;

      const handleScroll = (e: Event) => {
        if (!scrollContainerRef.current || isLoadingMoreRef.current) return;

        const scrollElement = scrollContainerRef.current;
        const scrollLeft = scrollElement.scrollLeft;
        const scrollWidth = scrollElement.scrollWidth;
        const clientWidth = scrollElement.clientWidth;

        // Calculate how close we are to the edges (in pixels)
        const distanceFromLeft = scrollLeft;
        const distanceFromRight = scrollWidth - scrollLeft - clientWidth;

        // More aggressive threshold: load more when within 30% of the edge
        const threshold = clientWidth * 0.3;

        // Extend left (past dates)
        if (distanceFromLeft < threshold) {
          isLoadingMoreRef.current = true;

          const extendDays = viewMode === ViewMode.Day ? 30 : viewMode === ViewMode.Week ? 60 : 90;
          const newStart = new Date(displayRange.start);
          newStart.setDate(newStart.getDate() - extendDays);

          console.log(`⬅️ Extending timeline backward by ${extendDays} days (from ${displayRange.start.toLocaleDateString()} to ${newStart.toLocaleDateString()})`);

          // Calculate scroll offset to maintain position
          const oldScrollLeft = scrollLeft;
          const oldScrollWidth = scrollWidth;

          setDisplayRange({ start: newStart, end: displayRange.end });

          // After DOM update, restore scroll position accounting for new content
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (scrollContainerRef.current) {
                const newScrollWidth = scrollContainerRef.current.scrollWidth;
                const addedWidth = newScrollWidth - oldScrollWidth;
                if (addedWidth > 0) {
                  scrollContainerRef.current.scrollLeft = oldScrollLeft + addedWidth;
                  console.log(`✅ Extended by ${addedWidth}px, adjusted scroll position`);
                }
              }
              isLoadingMoreRef.current = false;
            });
          });
        }

        // Extend right (future dates)
        if (distanceFromRight < threshold) {
          isLoadingMoreRef.current = true;

          const extendDays = viewMode === ViewMode.Day ? 30 : viewMode === ViewMode.Week ? 60 : 90;
          const newEnd = new Date(displayRange.end);
          newEnd.setDate(newEnd.getDate() + extendDays);

          console.log(`➡️ Extending timeline forward by ${extendDays} days (from ${displayRange.end.toLocaleDateString()} to ${newEnd.toLocaleDateString()})`);

          setDisplayRange({ start: displayRange.start, end: newEnd });

          // Reset loading flag after render
          requestAnimationFrame(() => {
            isLoadingMoreRef.current = false;
          });
        }
      };

      scrollableDiv.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        scrollableDiv?.removeEventListener('scroll', handleScroll);
      };
    };

    // Wait for gantt to render (it renders asynchronously)
    const timeoutId = setTimeout(setupScrollListener, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [displayRange, viewMode]);

  // Add drag handles to task bars by rendering overlays on all bars
  // Only enable in Day view
  useEffect(() => {
    if (!ganttContainerRef.current) return;

    // Only enable drag handles in Day view
    if (viewMode !== ViewMode.Day) return;

    const container = ganttContainerRef.current;

    // Add dragging class to container when dragging
    if (dragState.isDragging) {
      container.classList.add('dragging');
    } else {
      container.classList.remove('dragging');
    }

    // Find all SVG rect elements (gantt bars are usually SVG rects)
    const checkAndAddHandles = () => {
      // Try multiple selectors to find task bars in different gantt library versions
      const svgRects = container.querySelectorAll('svg g[class*="bar"] rect:first-child, svg rect[class*="barBackground"]');

      if (svgRects.length > 0 && svgRects.length !== ganttTasksWithPlaceholders.length) {
        console.log(`Found ${svgRects.length} task bars for ${ganttTasksWithPlaceholders.length} tasks`);
      }

      svgRects.forEach((rect, index) => {
        if (index >= ganttTasksWithPlaceholders.length) return;

        // Skip placeholder tasks
        const task = ganttTasksWithPlaceholders[index];
        if (task && (task.id === '__placeholder_start__' || task.id === '__placeholder_end__')) {
          return;
        }

        const rectElement = rect as SVGRectElement;
        const parentG = rectElement.closest('g');
        if (!parentG) return;

        const existingHandle = parentG.querySelector('.drag-handle-overlay');
        if (existingHandle) return;

        // Create a drag handle overlay
        try {
          const bbox = rectElement.getBBox();

          // Always add handles, even for short tasks (width > 15px)
          if (bbox.width > 15) {
            // Create a thin drag handle on the right edge
            const handleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            handleRect.setAttribute('class', 'drag-handle-overlay');

            // Make handles visible but not too wide - 4px
            const handleWidth = 4;

            // Position handle at the right edge of the task bar
            // Use SVG coordinates directly for more reliable positioning
            const handleX = bbox.x + bbox.width - handleWidth;

            // Set handle attributes
            handleRect.setAttribute('x', String(handleX));
            handleRect.setAttribute('y', String(bbox.y));
            handleRect.setAttribute('width', String(handleWidth));
            handleRect.setAttribute('height', String(bbox.height));
            handleRect.setAttribute('fill', 'rgba(139, 92, 246, 0.7)');
            handleRect.setAttribute('stroke', 'rgba(139, 92, 246, 1)');
            handleRect.setAttribute('stroke-width', '0.5');
            handleRect.setAttribute('rx', '1.5');
            handleRect.style.cursor = 'crosshair';
            handleRect.style.transition = 'opacity 0.2s ease, width 0.2s ease, fill 0.2s ease';
            handleRect.style.pointerEvents = 'all';
            handleRect.style.opacity = '0.3'; // Slightly visible by default

            // Store task ID and index on the handle for easy lookup
            handleRect.setAttribute('data-task-id', task.id);
            handleRect.setAttribute('data-task-index', String(index));

            // Also add task ID to the parent group for easier detection on mouseup
            parentG.setAttribute('data-task-id', task.id);

            // Add task ID to the task rect itself
            rectElement.setAttribute('data-task-id', task.id);

            // Add hover effect on handle itself
            handleRect.addEventListener('mouseenter', () => {
              handleRect.setAttribute('fill', 'rgba(139, 92, 246, 1)');
              handleRect.setAttribute('width', '6');
              handleRect.style.opacity = '1';
            });
            handleRect.addEventListener('mouseleave', () => {
              // Check if parent is still hovered
              const isParentHovered = parentG.matches(':hover');
              if (isParentHovered) {
                handleRect.setAttribute('fill', 'rgba(139, 92, 246, 0.8)');
                handleRect.setAttribute('width', String(handleWidth));
                handleRect.style.opacity = '1';
              } else {
                handleRect.setAttribute('fill', 'rgba(139, 92, 246, 0.7)');
                handleRect.setAttribute('width', String(handleWidth));
                handleRect.style.opacity = '0.3';
              }
            });

            parentG.appendChild(handleRect);

            // Add hover listeners to the parent group to show/hide handle
            parentG.addEventListener('mouseenter', () => {
              handleRect.style.opacity = '1';
              handleRect.setAttribute('fill', 'rgba(139, 92, 246, 0.8)');
            });
            parentG.addEventListener('mouseleave', () => {
              handleRect.style.opacity = '0.3';
              handleRect.setAttribute('fill', 'rgba(139, 92, 246, 0.7)');
            });

            // Debug: Log when handle is added (only first time)
            if (index === 0) {
              const currentViewMode = viewMode;
              console.log(`✨ Drag handles added to timeline tasks (${currentViewMode} view). Hover over a task and drag from the purple edge to create dependencies.`);

              // Log handle position for debugging - use setTimeout to get position after DOM update
              setTimeout(() => {
                const handleScreenRect = handleRect.getBoundingClientRect();
                const taskBarScreenRect = rectElement.getBoundingClientRect();
                console.log('First handle position:', {
                  svgCoords: {
                    x: handleX,
                    y: bbox.y,
                    width: handleWidth,
                    height: bbox.height,
                  },
                  handleScreenCoords: {
                    left: handleScreenRect.left,
                    top: handleScreenRect.top,
                    right: handleScreenRect.right,
                    bottom: handleScreenRect.bottom,
                    width: handleScreenRect.width,
                    height: handleScreenRect.height,
                    centerX: handleScreenRect.left + handleScreenRect.width / 2,
                    centerY: handleScreenRect.top + handleScreenRect.height / 2,
                  },
                  taskBarScreenCoords: {
                    left: taskBarScreenRect.left,
                    top: taskBarScreenRect.top,
                    right: taskBarScreenRect.right,
                    bottom: taskBarScreenRect.bottom,
                  },
                  taskBarBBox: {
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height,
                  },
                  viewMode: currentViewMode
                });
              }, 100);
            }
          }
        } catch (err) {
          console.warn('Failed to add drag handle:', err);
        }
      });
    };

    // Check for bars periodically (gantt library renders asynchronously)
    const intervalId = setInterval(checkAndAddHandles, 100);
    checkAndAddHandles(); // Initial check

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as SVGElement;

      console.log('🖱️ Mouse down detected:', {
        targetTagName: target.tagName,
        targetClasses: target.classList ? Array.from(target.classList) : [],
        hasDragHandleClass: target.classList.contains('drag-handle-overlay'),
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        screenX: e.screenX,
        screenY: e.screenY,
      });

      // Check if clicking on a drag handle
      if (target.classList.contains('drag-handle-overlay')) {
        e.preventDefault();
        e.stopPropagation();

        // Get task ID directly from data attribute
        const taskId = target.getAttribute('data-task-id');

        if (taskId) {

          console.log('✅ Drag started from drag handle:', {
            taskId,
            mousePosition: {
              clientX: e.clientX,
              clientY: e.clientY,
            },
          });

          // Start from the mouse click position (where user clicked on the handle)
          setDragState({
            isDragging: true,
            sourceTaskId: taskId,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
          });
        }
        return;
      }

      // Fallback: check if near right edge of any task bar
      if (target.tagName === 'rect' && !target.classList.contains('drag-handle-overlay')) {
        const rect = (target as SVGRectElement).getBoundingClientRect();
        const isRightEdge = e.clientX > rect.right - 20;

        if (isRightEdge) {
          e.preventDefault();
          e.stopPropagation();

          // Find which task bar this is
          const allBars = Array.from(container.querySelectorAll('svg g[class*="bar"] rect:first-child, svg rect[class*="barBackground"]'));
          const taskIndex = allBars.indexOf(target);

          if (taskIndex >= 0 && taskIndex < ganttTasksWithPlaceholders.length) {
            const taskId = ganttTasksWithPlaceholders[taskIndex].id;

            // Use the task bar's actual screen bounding box
            setDragState({
              isDragging: true,
              sourceTaskId: taskId,
              startX: rect.right,
              startY: rect.top + rect.height / 2,
              currentX: e.clientX,
              currentY: e.clientY,
            });
          }
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      clearInterval(intervalId);
      container.removeEventListener('mousedown', handleMouseDown, true);
      container.classList.remove('dragging');

      // Clean up drag handles
      const handles = container.querySelectorAll('.drag-handle-overlay');
      handles.forEach(h => h.remove());
    };
  }, [ganttTasksWithPlaceholders, viewMode]); // MEMORY FIX: Removed dragState.isDragging to prevent constant re-creation during drag

  // Handle mouse move and up for dragging
  // Only active in Day view
  useEffect(() => {
    if (!dragState.isDragging || viewMode !== ViewMode.Day) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse is still over the gantt container
      const targetElement = document.elementFromPoint(e.clientX, e.clientY) as Element;
      const isOverGantt = ganttContainerRef.current?.contains(targetElement);

      // If mouse left the gantt container, clear drag preview
      if (!isOverGantt) {
        setDragState({
          isDragging: false,
          sourceTaskId: null,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
        });
        console.log('🚫 Mouse left gantt container - clearing drag preview');
        return;
      }

      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!ganttContainerRef.current || !dragState.sourceTaskId) {
        setDragState({
          isDragging: false,
          sourceTaskId: null,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
        });
        return;
      }

      // Find if we're over a task bar
      const targetElement = document.elementFromPoint(e.clientX, e.clientY) as Element;

      console.log('🎯 Mouse up - detecting target:', {
        mousePosition: { x: e.clientX, y: e.clientY },
        targetElement: targetElement ? {
          tagName: targetElement.tagName,
          classList: targetElement.classList ? Array.from(targetElement.classList) : [],
          id: targetElement.id,
          dataTaskId: targetElement.getAttribute('data-task-id'),
        } : null,
      });

      // Try multiple approaches to find the target task
      let targetTaskId: string | null = null;

      // Approach 1: Check if we're over a drag handle
      if (targetElement?.classList.contains('drag-handle-overlay')) {
        const taskId = targetElement.getAttribute('data-task-id');

        console.log('🔍 Approach 1 (drag handle):', {
          taskId,
          hasAttribute: targetElement.hasAttribute('data-task-id'),
        });

        if (taskId && !taskId.startsWith('__placeholder_')) {
          targetTaskId = taskId;
          console.log('✅ Approach 1 (drag handle) found target:', targetTaskId);
        }
      }

      // Approach 2: Check if we're over any task bar element
      if (!targetTaskId) {
        const barElement = targetElement?.closest('g[class*="bar"]');
        if (barElement) {
          // Try to get task ID directly from the bar element
          const taskId = barElement.getAttribute('data-task-id');

          console.log('🔍 Approach 2 (bar element):', {
            found: !!barElement,
            taskId,
            hasAttribute: barElement.hasAttribute('data-task-id'),
            barElementClasses: barElement.classList ? Array.from(barElement.classList) : [],
          });

          if (taskId && !taskId.startsWith('__placeholder_')) {
            targetTaskId = taskId;
            console.log('✅ Approach 2 (bar element) found target:', targetTaskId);
          }
        }
      }

      // Approach 3: Check all task bar rects
      if (!targetTaskId && targetElement?.tagName === 'rect') {
        // Check if the rect itself has task ID
        const taskId = targetElement.getAttribute('data-task-id');

        console.log('🔍 Approach 3 (rect):', {
          isRect: targetElement.tagName === 'rect',
          taskId,
          hasAttribute: targetElement.hasAttribute('data-task-id'),
        });

        if (taskId && !taskId.startsWith('__placeholder_')) {
          targetTaskId = taskId;
          console.log('✅ Approach 3 (rect) found target:', targetTaskId);
        } else {
          // Try to find parent bar group
          const barElement = targetElement?.closest('g[class*="bar"]');
          if (barElement) {
            const barTaskId = barElement.getAttribute('data-task-id');
            console.log('🔍 Approach 3 (rect via parent):', {
              found: !!barElement,
              barTaskId,
              hasAttribute: barElement.hasAttribute('data-task-id'),
            });
            if (barTaskId && !barTaskId.startsWith('__placeholder_')) {
              targetTaskId = barTaskId;
              console.log('✅ Approach 3 (rect via parent) found target:', targetTaskId);
            }
          }
        }
      }

      // If we found a valid target task, create the dependency
      if (targetTaskId && targetTaskId !== dragState.sourceTaskId) {
        console.log('🔗 Creating dependency:', {
          from: dragState.sourceTaskId,
          to: targetTaskId,
        });
        handleAddDependency(dragState.sourceTaskId, targetTaskId);
      } else {
        console.log('❌ No valid target found or same task:', {
          targetTaskId,
          sourceTaskId: dragState.sourceTaskId,
          isSameTask: targetTaskId === dragState.sourceTaskId,
        });
      }

      setDragState({
        isDragging: false,
        sourceTaskId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, dragState.sourceTaskId, ganttTasksWithPlaceholders, dependencies]);

  if (ganttTasks.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 8,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="h3" sx={{ fontSize: '3.5rem', mb: 2 }}>
          📅
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
          No tasks with dates
        </Typography>
        <Typography color="text.secondary">
          Add start or due dates to your tasks to see them in the timeline view.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box>
        {/* View Mode Selector */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            View:
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value={ViewMode.Day}>Day</ToggleButton>
            <ToggleButton value={ViewMode.Week}>Week</ToggleButton>
            <ToggleButton value={ViewMode.Month}>Month</ToggleButton>
          </ToggleButtonGroup>
          {viewMode === ViewMode.Day && (
            <Typography variant="body2" sx={{ ml: 'auto', color: 'text.secondary', fontStyle: 'italic' }}>
              💡 Drag from task edge to create • Click arrow to select • Delete key to remove
            </Typography>
          )}
        </Paper>

        {/* Gantt Chart with Overlay */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <div ref={ganttContainerRef} className="gantt-container" style={{ position: 'relative' }}>
            <Gantt
              tasks={ganttTasksWithPlaceholders}
              viewMode={viewMode}
              onDoubleClick={(task) => {
                // Skip placeholder tasks
                if (task.id.startsWith('__placeholder_')) return;

                const originalTask = tasks.find(t => t.id === task.id);
                if (originalTask && onTaskClick) {
                  onTaskClick(originalTask);
                }
              }}
              listCellWidth=""
              columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 60}
              {...(displayRange ? {
                viewDate: displayRange.start,
              } : {})}
              locale="en-US"
              todayColor="rgba(59, 130, 246, 0.1)"
              barCornerRadius={4}
              barFill={60}
              fontSize="13px"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif"
              arrowColor="transparent"
            />
          </div>
        </Paper>
      </Box>

      {/* SVG overlay for dragging arrow - rendered as portal to body */}
      {dragState.isDragging && createPortal(
        <svg
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#d97706" />
            </marker>
          </defs>
          {/* Background curve for depth */}
          <path
            d={`M ${dragState.startX} ${dragState.startY} C ${dragState.startX + Math.abs(dragState.currentX - dragState.startX) * 0.5} ${dragState.startY}, ${dragState.currentX - Math.abs(dragState.currentX - dragState.startX) * 0.5} ${dragState.currentY}, ${dragState.currentX} ${dragState.currentY}`}
            stroke="#000"
            strokeWidth="4"
            fill="none"
            opacity="0.15"
          />
          {/* Main curve */}
          <path
            d={`M ${dragState.startX} ${dragState.startY} C ${dragState.startX + Math.abs(dragState.currentX - dragState.startX) * 0.5} ${dragState.startY}, ${dragState.currentX - Math.abs(dragState.currentX - dragState.startX) * 0.5} ${dragState.currentY}, ${dragState.currentX} ${dragState.currentY}`}
            stroke="#d97706"
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrowhead)"
            strokeLinecap="round"
          />
          {/* Start circle */}
          <circle
            cx={dragState.startX}
            cy={dragState.startY}
            r="4"
            fill="#d97706"
            stroke="white"
            strokeWidth="2"
          />
        </svg>,
        document.body
      )}

      {/* Date Conflict Warning Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, sourceTaskId: null, targetTaskId: null, sourceTask: null, targetTask: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f97316' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 24, height: 24 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Warning: Unusual Dependency Order
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The task you're creating a dependency for starts <strong>before</strong> the task it depends on:
          </DialogContentText>

          {confirmDialog.targetTask && confirmDialog.sourceTask && (
            <Box sx={{ bgcolor: '#fef3c7', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>"{confirmDialog.targetTask.name}"</strong>
                <br />
                <span style={{ color: '#78716c' }}>
                  Starts: {new Date(confirmDialog.targetTask.start).toLocaleDateString()}
                </span>
              </Typography>

              <Typography variant="body2" sx={{ textAlign: 'center', color: '#78716c', my: 1 }}>
                ↓ depends on ↓
              </Typography>

              <Typography variant="body2">
                <strong>"{confirmDialog.sourceTask.name}"</strong>
                <br />
                <span style={{ color: '#78716c' }}>
                  Starts: {new Date(confirmDialog.sourceTask.start).toLocaleDateString()}
                </span>
              </Typography>
            </Box>
          )}

          <DialogContentText>
            This may indicate a scheduling conflict. The dependent task typically should start after the task it depends on.
          </DialogContentText>

          <DialogContentText sx={{ mt: 2, fontWeight: 500 }}>
            Do you want to create this dependency anyway?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDialog({ open: false, sourceTaskId: null, targetTaskId: null, sourceTask: null, targetTask: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (confirmDialog.sourceTaskId && confirmDialog.targetTaskId) {
                await createDependency(confirmDialog.sourceTaskId, confirmDialog.targetTaskId);
              }
              setConfirmDialog({ open: false, sourceTaskId: null, targetTaskId: null, sourceTask: null, targetTask: null });
            }}
            variant="contained"
            color="warning"
            autoFocus
          >
            Create Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimelineView;
