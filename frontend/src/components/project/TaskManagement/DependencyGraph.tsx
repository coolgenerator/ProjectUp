import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Task } from '../../../types/task';
import fetchWithAuth from '../../../hooks/fetchWithAuth';

interface DependencyGraphProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
}

interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'done':
      return { bg: '#10b981', border: '#059669', text: '#ffffff' };
    case 'in_progress':
      return { bg: '#f59e0b', border: '#d97706', text: '#ffffff' };
    case 'review':
      return { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' };
    case 'blocked':
      return { bg: '#ef4444', border: '#dc2626', text: '#ffffff' };
    default:
      return { bg: '#64748b', border: '#475569', text: '#ffffff' };
  }
};

const DependencyGraph: React.FC<DependencyGraphProps> = ({ projectId, onTaskClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all tasks for the project
        const tasksResponse = await fetchWithAuth(`/api/tasks/project/${projectId}`);
        if (!tasksResponse.ok) throw new Error('Failed to fetch tasks');

        const tasksData = await tasksResponse.json();
        const tasksList: Task[] = tasksData.tasks || [];

        // Create task map
        const taskMap = new Map<string, Task>();
        tasksList.forEach(task => {
          taskMap.set(task.id, task);
        });
        setTasks(taskMap);

        // Fetch dependencies
        const depsResponse = await fetchWithAuth(`/api/tasks/project/${projectId}/dependencies`);
        if (!depsResponse.ok) throw new Error('Failed to fetch dependencies');

        const depsData = await depsResponse.json();
        const dependencies: TaskDependency[] = depsData.dependencies || [];

        // Find tasks involved in dependencies
        const involvedTasks = new Set<string>();
        dependencies.forEach(dep => {
          involvedTasks.add(dep.task_id);
          involvedTasks.add(dep.depends_on_task_id);
        });

        // Build nodes for tasks with dependencies
        const graphNodes: Node[] = Array.from(involvedTasks).map((taskId, index) => {
          const task = taskMap.get(taskId);
          const colors = getStatusColor(task?.status);

          // Calculate position using a simple layout algorithm
          const row = Math.floor(index / 4);
          const col = index % 4;

          return {
            id: taskId,
            type: 'default',
            position: { x: col * 300 + 50, y: row * 150 + 50 },
            data: {
              label: (
                <div className="px-3 py-2 min-w-[180px]">
                  <div className="font-semibold text-sm mb-1 truncate">
                    {task?.title || 'Unknown Task'}
                  </div>
                  <div className="text-xs opacity-80">
                    {task?.status || 'unknown'} • {task?.progress || 0}%
                  </div>
                </div>
              )
            },
            style: {
              background: colors.bg,
              color: colors.text,
              border: `2px solid ${colors.border}`,
              borderRadius: '8px',
              padding: 0,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minWidth: '200px'
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left
          };
        });

        // Build edges for dependencies
        const graphEdges: Edge[] = dependencies.map((dep, index) => ({
          id: `e-${dep.id}-${index}`,
          source: dep.depends_on_task_id,
          target: dep.task_id,
          type: 'smoothstep',
          animated: taskMap.get(dep.depends_on_task_id)?.status !== 'done',
          style: {
            stroke: taskMap.get(dep.depends_on_task_id)?.status === 'done' ? '#10b981' : '#f59e0b',
            strokeWidth: 2
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: taskMap.get(dep.depends_on_task_id)?.status === 'done' ? '#10b981' : '#f59e0b'
          },
          label: taskMap.get(dep.depends_on_task_id)?.status === 'done' ? '✓' : '⏳',
          labelStyle: {
            fontSize: '14px',
            fontWeight: 'bold'
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.9
          }
        }));

        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (error) {
        console.error('Error fetching dependency graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onTaskClick) {
        onTaskClick(node.id);
      }
    },
    [onTaskClick]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-slate-600">Loading dependency graph...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg border-2 border-slate-200">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Dependencies Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Tasks with dependencies will appear here as a visual graph showing the relationships
            between them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-white rounded-lg border-2 border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg border-2 border-slate-200 shadow-lg p-3 text-xs">
        <h4 className="font-bold text-slate-800 mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span>To Do</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Done</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
            <div className="w-8 h-0.5 bg-green-500"></div>
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-amber-500"></div>
            <span>Incomplete</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraph;
