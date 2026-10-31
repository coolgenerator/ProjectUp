import { useState, useEffect } from 'react';
import fetchWithAuth from './fetchWithAuth';
import { Task } from '../types/task';

interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

interface DependencyMap {
  [taskId: string]: {
    dependsOn: string[];        // Task IDs this task depends on
    blocks: string[];           // Task IDs that this task blocks
    dependencyCount: number;    // Total number of dependencies
    blockedByCount: number;     // Number of incomplete dependencies
  };
}

export const useTaskDependencies = (projectId: string, tasks: Task[]) => {
  const [dependencyMap, setDependencyMap] = useState<DependencyMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuth(`/api/tasks/project/${projectId}/dependencies`);

        if (!response.ok) {
          throw new Error('Failed to fetch dependencies');
        }

        const data = await response.json();
        const dependencies: TaskDependency[] = data.dependencies || [];

        // Create a task map for quick status lookup
        const taskMap = new Map<string, Task>();
        tasks.forEach(task => {
          taskMap.set(task.id, task);
        });

        // Build dependency map
        const map: DependencyMap = {};

        // Initialize all tasks in the map
        tasks.forEach(task => {
          map[task.id] = {
            dependsOn: [],
            blocks: [],
            dependencyCount: 0,
            blockedByCount: 0
          };
        });

        // Populate dependencies
        dependencies.forEach(dep => {
          // Add to dependsOn for the task
          if (map[dep.task_id]) {
            map[dep.task_id].dependsOn.push(dep.depends_on_task_id);
            map[dep.task_id].dependencyCount++;

            // Check if the dependency is incomplete (not done)
            const dependsOnTask = taskMap.get(dep.depends_on_task_id);
            if (dependsOnTask && dependsOnTask.status !== 'done') {
              map[dep.task_id].blockedByCount++;
            }
          }

          // Add to blocks for the dependency
          if (map[dep.depends_on_task_id]) {
            map[dep.depends_on_task_id].blocks.push(dep.task_id);
          }
        });

        setDependencyMap(map);
      } catch (err) {
        console.error('Error fetching dependencies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dependencies');
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [projectId, tasks]);

  const getDependencyInfo = (taskId: string) => {
    return dependencyMap[taskId] || {
      dependsOn: [],
      blocks: [],
      dependencyCount: 0,
      blockedByCount: 0
    };
  };

  return {
    dependencyMap,
    loading,
    error,
    getDependencyInfo
  };
};
