import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks } from 'lucide-react';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import { TaskStats } from '../../types/task';
import { Milestone } from '../../types/project/milestone';
import { Badge, Card, ProgressBar, Skeleton, cx } from '../ui';

interface ProjectDashboardProps {
  projectId: string;
}

interface MilestoneStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

const EMPTY_TASKS: TaskStats = { total: 0, todo: 0, in_progress: 0, done: 0, blocked: 0, completion_rate: 0 };
const EMPTY_MILESTONES: MilestoneStats = { total: 0, completed: 0, inProgress: 0, pending: 0 };

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone }) => (
  <div className="min-w-0">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className={cx('mt-1 text-2xl font-semibold tabular-nums', tone || 'text-gray-900')}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
  </div>
);

// ProjectDashboard summarizes task and milestone progress on the overview tab.
const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskStats>(EMPTY_TASKS);
  const [milestones, setMilestones] = useState<MilestoneStats>(EMPTY_MILESTONES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [taskResponse, milestoneResponse] = await Promise.all([
          fetchWithAuth(`/api/tasks/project/${projectId}/stats`),
          fetchWithAuth(`/api/projects/${projectId}/milestones`),
        ]);
        if (cancelled) return;
        if (taskResponse.ok) {
          const data = await taskResponse.json();
          setTasks(data.stats || EMPTY_TASKS);
        }
        if (milestoneResponse.ok) {
          const data = await milestoneResponse.json();
          const list: Milestone[] = data.milestones || [];
          setMilestones({
            total: list.length,
            completed: list.filter(m => m.completed).length,
            inProgress: list.filter(m => m.status === 'in_progress').length,
            pending: list.filter(m => m.status === 'pending').length,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <Card className="mt-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <ListChecks className="h-5 w-5 text-indigo-600" aria-hidden />
        {t('match.overview.taskProgress')}
      </h2>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
          <Skeleton className="h-2" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <Stat label={t('match.overview.totalTasks')} value={tasks.total} hint={t('match.overview.completedN', { n: tasks.done })} />
            <Stat label={t('match.overview.completionRate')} value={`${Math.round(tasks.completion_rate)}%`} hint={t('match.overview.inProgressN', { n: tasks.in_progress })} tone="text-emerald-600" />
            <Stat label={t('match.overview.milestones')} value={milestones.total} hint={t('match.overview.completedN', { n: milestones.completed })} />
            <Stat label={t('match.overview.blocked')} value={tasks.blocked} hint={t('match.overview.needsAttention')} tone={tasks.blocked > 0 ? 'text-red-600' : undefined} />
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('match.overview.overallProgress')}</span>
              <span className="font-medium tabular-nums text-gray-900">{t('match.overview.doneOfTotal', { done: tasks.done, total: tasks.total })}</span>
            </div>
            <ProgressBar value={tasks.done} max={tasks.total} />
            {tasks.total === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t('match.overview.noTasks')}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{t('match.overview.pending')} {tasks.todo}</Badge>
                <Badge tone="blue">{t('match.overview.inProgress')} {tasks.in_progress}</Badge>
                <Badge tone="green">{t('match.overview.completed')} {tasks.done}</Badge>
                {tasks.blocked > 0 && <Badge tone="red">{t('match.overview.blocked')} {tasks.blocked}</Badge>}
              </div>
            )}
          </div>

          {milestones.total > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5 text-sm">
              <span className="mr-1 text-gray-600">{t('match.overview.milestones')}</span>
              <Badge tone="green">{t('match.overview.completed')} {milestones.completed}</Badge>
              <Badge tone="blue">{t('match.overview.inProgress')} {milestones.inProgress}</Badge>
              <Badge>{t('match.overview.pending')} {milestones.pending}</Badge>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ProjectDashboard;
