import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  ChangeHistory,
  MoreHoriz,
  CalendarToday,
} from '@mui/icons-material';
import { WorkItem } from '../../../types/workItem';
import { MILESTONE_STATUS_CONFIG } from '../../../types/project/milestone';

interface MilestoneCardProps {
  workItem: WorkItem;
  onClick: (workItem: WorkItem) => void;
  view?: 'list' | 'board';
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  workItem,
  onClick,
  view = 'list',
}) => {
  if (!workItem.originalMilestone) return null;

  const milestone = workItem.originalMilestone;
  const statusConfig = MILESTONE_STATUS_CONFIG[milestone.status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box
      onClick={() => onClick(workItem)}
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '2px solid',
        borderColor: milestone.completed ? '#10b981' : '#3b82f6',
        bgcolor: milestone.completed ? '#f0fdf4' : '#faf5ff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: milestone.completed ? '#059669' : '#7c3aed',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.15)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
        {/* Diamond Icon */}
        <Box
          sx={{
            mt: 0.25,
            color: milestone.completed ? '#10b981' : '#3b82f6',
          }}
        >
          <ChangeHistory
            sx={{
              fontSize: '1.25rem',
              transform: 'rotate(45deg)',
            }}
          />
        </Box>

        {/* Title */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: milestone.completed ? 'text.secondary' : 'text.primary',
              textDecoration: milestone.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
              mb: 0.5,
            }}
          >
            {milestone.title}
          </Typography>

          {/* Description */}
          {milestone.description && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8125rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1,
              }}
            >
              {milestone.description}
            </Typography>
          )}
        </Box>

        {/* More Options */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu open
          }}
          sx={{
            p: 0.5,
            opacity: 0.6,
            '&:hover': {
              opacity: 1,
              bgcolor: 'action.hover',
            },
          }}
        >
          <MoreHoriz fontSize="small" />
        </IconButton>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Status Badge */}
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            bgcolor: statusConfig.bgColor,
            color: statusConfig.color,
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 22,
            '& .MuiChip-label': {
              px: 1,
            },
          }}
        />

        {/* Due Date */}
        {milestone.due_date && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
            }}
          >
            <CalendarToday sx={{ fontSize: '0.875rem' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {formatDate(milestone.due_date)}
            </Typography>
          </Box>
        )}

        {/* Milestone Badge */}
        <Chip
          label="MILESTONE"
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: milestone.completed ? '#10b981' : '#3b82f6',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.6875rem',
            height: 20,
            letterSpacing: '0.5px',
            '& .MuiChip-label': {
              px: 0.75,
            },
          }}
        />
      </Box>

      {/* Progress Bar (if not completed) */}
      {!milestone.completed && workItem.progress !== undefined && workItem.progress > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Progress
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}
            >
              {workItem.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={workItem.progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: '#3b82f6',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default MilestoneCard;
