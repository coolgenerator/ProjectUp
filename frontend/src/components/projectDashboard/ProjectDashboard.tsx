import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, LinearProgress, Chip, Avatar, AvatarGroup } from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Assignment,
  TrendingUp,
  People,
  Folder,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import { TaskStats } from '../../types/task';
import { Milestone } from '../../types/project/milestone';

interface ProjectDashboardProps {
  projectId: string;
}

interface DashboardStats {
  tasks: TaskStats;
  milestones: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  meetings: {
    upcoming: number;
    past: number;
  };
  resources: {
    total: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'task' | 'milestone' | 'meeting' | 'resource';
  title: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    tasks: {
      total: 0,
      todo: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      completion_rate: 0,
    },
    milestones: {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
    },
    meetings: {
      upcoming: 0,
      past: 0,
    },
    resources: {
      total: 0,
    },
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchDashboardData();
    }
  }, [projectId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch task stats
      const taskStatsResponse = await fetchWithAuth(`/api/tasks/project/${projectId}/stats`);
      let taskStats = stats.tasks;
      if (taskStatsResponse.ok) {
        const data = await taskStatsResponse.json();
        taskStats = data.stats || stats.tasks;
      }

      // Fetch milestones
      const milestonesResponse = await fetchWithAuth(`/api/projects/${projectId}/milestones`);
      let milestoneStats = stats.milestones;
      if (milestonesResponse.ok) {
        const data = await milestonesResponse.json();
        const milestones: Milestone[] = data.milestones || [];
        milestoneStats = {
          total: milestones.length,
          completed: milestones.filter(m => m.completed).length,
          inProgress: milestones.filter(m => m.status === 'in_progress').length,
          pending: milestones.filter(m => m.status === 'pending').length,
        };
      }

      setStats({
        ...stats,
        tasks: taskStats,
        milestones: milestoneStats,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 4 }}>
      {loading ? (
        <Box sx={{ width: '100%', mt: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <>
          {/* Stats Grid */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Total Tasks */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t("match.overview.totalTasks")}
                value={stats.tasks.total}
                subtitle={t("match.overview.completedN", { n: stats.tasks.done })}
                icon={<Assignment fontSize="large" />}
                color="#3b82f6"
              />
            </Grid>

            {/* Task Completion Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t("match.overview.completionRate")}
                value={`${Math.round(stats.tasks.completion_rate)}%`}
                subtitle={t("match.overview.inProgressN", { n: stats.tasks.in_progress })}
                icon={<TrendingUp fontSize="large" />}
                color="#10b981"
              />
            </Grid>

            {/* Milestones */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t("match.overview.milestones")}
                value={stats.milestones.total}
                subtitle={t("match.overview.completedN", { n: stats.milestones.completed })}
                icon={<CheckCircle fontSize="large" />}
                color="#8b5cf6"
              />
            </Grid>

            {/* Blocked Tasks */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t("match.overview.blocked")}
                value={stats.tasks.blocked}
                subtitle={t("match.overview.needsAttention")}
                icon={<Schedule fontSize="large" />}
                color="#ef4444"
              />
            </Grid>
          </Grid>

          {/* Task Progress Breakdown */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              {t("match.overview.taskProgress")}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("match.overview.overallProgress")}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.tasks.done} / {stats.tasks.total} tasks
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats.tasks.completion_rate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#10b981',
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`To Do: ${stats.tasks.todo}`}
                    size="small"
                    sx={{ bgcolor: '#f3f4f6', color: '#6b7280' }}
                  />
                  <Chip
                    label={`In Progress: ${stats.tasks.in_progress}`}
                    size="small"
                    sx={{ bgcolor: '#dbeafe', color: '#3b82f6' }}
                  />
                  <Chip
                    label={`Done: ${stats.tasks.done}`}
                    size="small"
                    sx={{ bgcolor: '#d1fae5', color: '#10b981' }}
                  />
                  {stats.tasks.blocked > 0 && (
                    <Chip
                      label={`Blocked: ${stats.tasks.blocked}`}
                      size="small"
                      sx={{ bgcolor: '#fee2e2', color: '#ef4444' }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Milestones Progress */}
          {stats.milestones.total > 0 && (
            <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {t("match.overview.milestones")}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 600, color: '#10b981', mb: 1 }}>
                      {stats.milestones.completed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("match.overview.completed")}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 600, color: '#3b82f6', mb: 1 }}>
                      {stats.milestones.inProgress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("match.overview.inProgress")}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 600, color: '#6b7280', mb: 1 }}>
                      {stats.milestones.pending}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("match.overview.pending")}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Quick Actions Grid */}
          <Grid container spacing={3}>
            {/* Resources */}
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Folder sx={{ mr: 1, color: '#06b6d4' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {t("match.overview.resources")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("match.overview.resourcesHint")}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t("match.overview.resourcesN", { n: stats.resources.total })}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </>
      )}
    </Box>
  );
};

export default ProjectDashboard;
