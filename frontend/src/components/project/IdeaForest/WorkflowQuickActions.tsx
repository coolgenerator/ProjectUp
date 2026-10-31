/**
 * WorkflowQuickActions Component
 *
 * Quick action buttons for common workflows on IdeaTree nodes.
 * Appears as a floating menu or inline actions.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
  Popover,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Lightbulb as ExpandIcon,
  Task as TaskIcon,
  School as LearnIcon,
  Analytics as AnalyzeIcon,
  MoreVert as MoreIcon,
  KeyboardArrowDown as ArrowIcon,
} from '@mui/icons-material';
import { useIdeaTreeWorkflows } from '../../../hooks/useWorkflowRegistry';

// ============================================================================
// Types
// ============================================================================

interface WorkflowQuickActionsProps {
  projectId?: string;
  nodeId: string;
  nodeTitle: string;
  nodeDescription?: string;
  onResult?: (workflowId: string, result: any) => void;
  variant?: 'buttons' | 'menu' | 'dropdown';
  size?: 'small' | 'medium';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  workflowId: string;
  description: string;
}

// ============================================================================
// Quick Actions Configuration
// ============================================================================

const quickActions: QuickAction[] = [
  {
    id: 'expand',
    label: 'Expand Idea',
    icon: <ExpandIcon />,
    workflowId: 'expand_idea',
    description: 'Break down this idea into sub-components',
  },
  {
    id: 'tasks',
    label: 'Generate Tasks',
    icon: <TaskIcon />,
    workflowId: 'generate_tasks',
    description: 'Create actionable tasks from this idea',
  },
  {
    id: 'resources',
    label: 'Find Resources',
    icon: <LearnIcon />,
    workflowId: 'find_resources',
    description: 'Find learning materials and documentation',
  },
  {
    id: 'analyze',
    label: 'Analyze Feasibility',
    icon: <AnalyzeIcon />,
    workflowId: 'analyze_feasibility',
    description: 'Assess the feasibility of this idea',
  },
];

// ============================================================================
// Component
// ============================================================================

export const WorkflowQuickActions: React.FC<WorkflowQuickActionsProps> = ({
  projectId,
  nodeId,
  nodeTitle,
  nodeDescription,
  onResult,
  variant = 'buttons',
  size = 'small',
}) => {
  const { execute, executionState } = useIdeaTreeWorkflows(projectId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExecute = async (action: QuickAction) => {
    setExecutingAction(action.id);
    handleClose();

    try {
      const result = await execute(action.workflowId, {
        node_id: nodeId,
        title: nodeTitle,
        description: nodeDescription || '',
        topic: nodeTitle,
      });

      if (onResult) {
        onResult(action.workflowId, result);
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  const isExecuting = (actionId: string) =>
    executingAction === actionId || executionState.executing;

  // ─────────────────────────────────────────────────────────────────────────
  // Button Group Variant
  // ─────────────────────────────────────────────────────────────────────────

  if (variant === 'buttons') {
    return (
      <ButtonGroup size={size} variant="outlined">
        {quickActions.slice(0, 3).map((action) => (
          <Tooltip key={action.id} title={action.description}>
            <Button
              onClick={() => handleExecute(action)}
              disabled={isExecuting(action.id)}
              startIcon={
                isExecuting(action.id) ? (
                  <CircularProgress size={16} />
                ) : (
                  action.icon
                )
              }
            >
              {action.label}
            </Button>
          </Tooltip>
        ))}
        <Button onClick={handleClick}>
          <MoreIcon />
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
          {quickActions.slice(3).map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => handleExecute(action)}
              disabled={isExecuting(action.id)}
            >
              <ListItemIcon>
                {isExecuting(action.id) ? (
                  <CircularProgress size={20} />
                ) : (
                  action.icon
                )}
              </ListItemIcon>
              <ListItemText primary={action.label} secondary={action.description} />
            </MenuItem>
          ))}
        </Menu>
      </ButtonGroup>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dropdown Variant
  // ─────────────────────────────────────────────────────────────────────────

  if (variant === 'dropdown') {
    return (
      <>
        <Button
          size={size}
          variant="outlined"
          onClick={handleClick}
          startIcon={<AIIcon />}
          endIcon={<ArrowIcon />}
        >
          AI Actions
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 280 },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Quick Actions for "{nodeTitle}"
            </Typography>
          </Box>
          <Divider />
          {quickActions.map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => handleExecute(action)}
              disabled={isExecuting(action.id)}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                {isExecuting(action.id) ? (
                  <CircularProgress size={20} />
                ) : (
                  action.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={action.label}
                secondary={action.description}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Menu Variant (icon button trigger)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Tooltip title="AI Workflows">
        <Button
          size={size}
          onClick={handleClick}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <AIIcon />
        </Button>
      </Tooltip>
      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Paper sx={{ p: 1, minWidth: 220 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 1, pb: 1, display: 'block' }}
          >
            AI Workflows
          </Typography>
          {quickActions.map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => handleExecute(action)}
              disabled={isExecuting(action.id)}
              dense
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isExecuting(action.id) ? (
                  <CircularProgress size={18} />
                ) : (
                  action.icon
                )}
              </ListItemIcon>
              <ListItemText primary={action.label} />
            </MenuItem>
          ))}
        </Paper>
      </Popover>
    </>
  );
};

export default WorkflowQuickActions;
