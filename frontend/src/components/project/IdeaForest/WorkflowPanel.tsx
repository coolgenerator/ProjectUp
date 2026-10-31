/**
 * WorkflowPanel Component
 *
 * Displays available AI workflows for the current context (IdeaTree/TaskBoard).
 * Allows users to:
 * - Browse workflows by category
 * - Execute workflows with custom inputs
 * - View workflow results
 * - Access cross-referenced workflows between contexts
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Lightbulb as IdeaIcon,
  Task as TaskIcon,
  School as LearnIcon,
  Analytics as AnalysisIcon,
  IntegrationInstructions as IntegrationIcon,
} from '@mui/icons-material';
import { useIdeaTreeWorkflows, WorkflowDefinition, WorkflowCategory } from '../../../hooks/useWorkflowRegistry';

// ============================================================================
// Types
// ============================================================================

interface WorkflowPanelProps {
  projectId?: string;
  nodeId?: string;
  nodeTitle?: string;
  nodeDescription?: string;
  onWorkflowComplete?: (workflowId: string, result: any) => void;
  onClose?: () => void;
  variant?: 'sidebar' | 'modal' | 'floating';
}

interface WorkflowFormData {
  [key: string]: any;
}

// ============================================================================
// Category Icons
// ============================================================================

const categoryIcons: Record<string, React.ReactNode> = {
  planning: <IdeaIcon />,
  breakdown: <TaskIcon />,
  learning: <LearnIcon />,
  analysis: <AnalysisIcon />,
  integration: <IntegrationIcon />,
};

// ============================================================================
// WorkflowCard Component
// ============================================================================

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
  onExecute: (workflowId: string, inputs: WorkflowFormData) => void;
  executing: boolean;
  crossRef?: WorkflowDefinition;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onExecute,
  executing,
  crossRef,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<WorkflowFormData>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExecute = () => {
    onExecute(workflow.id, formData);
    setExpanded(false);
  };

  // Generate form fields from input schema
  const renderFormFields = () => {
    if (!workflow.input_schema) {
      return (
        <Typography variant="body2" color="text.secondary">
          No additional inputs required
        </Typography>
      );
    }

    const fields = Object.entries(workflow.input_schema);
    return fields.map(([fieldName, schema]: [string, any]) => {
      if (fieldName.startsWith('_')) return null; // Skip internal fields

      const label = fieldName
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (schema.type === 'boolean') {
        return (
          <Box key={fieldName} sx={{ mb: 2 }}>
            <Chip
              label={label}
              onClick={() => handleInputChange(fieldName, !formData[fieldName])}
              color={formData[fieldName] ? 'primary' : 'default'}
              variant={formData[fieldName] ? 'filled' : 'outlined'}
            />
          </Box>
        );
      }

      if (schema.type === 'integer' || schema.type === 'number') {
        return (
          <TextField
            key={fieldName}
            label={label}
            type="number"
            size="small"
            fullWidth
            value={formData[fieldName] ?? schema.default ?? ''}
            onChange={(e) => handleInputChange(fieldName, parseInt(e.target.value) || 0)}
            helperText={schema.description}
            sx={{ mb: 2 }}
          />
        );
      }

      if (schema.enum) {
        return (
          <Box key={fieldName} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {schema.enum.map((option: string) => (
                <Chip
                  key={option}
                  label={option}
                  onClick={() => handleInputChange(fieldName, option)}
                  color={formData[fieldName] === option ? 'primary' : 'default'}
                  variant={formData[fieldName] === option ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        );
      }

      return (
        <TextField
          key={fieldName}
          label={label}
          size="small"
          fullWidth
          multiline={schema.type === 'string' && fieldName.includes('description')}
          rows={schema.type === 'string' && fieldName.includes('description') ? 3 : 1}
          value={formData[fieldName] ?? schema.default ?? ''}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          helperText={schema.description}
          sx={{ mb: 2 }}
        />
      );
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 1,
        },
      }}
    >
      <ListItemButton onClick={() => setExpanded(!expanded)} sx={{ py: 1.5 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <AIIcon color="primary" fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={workflow.name}
          secondary={workflow.description}
          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }}
          secondaryTypographyProps={{ fontSize: '0.8rem', noWrap: true }}
        />
        {crossRef && (
          <Tooltip title={`Also available as "${crossRef.name}" in other contexts`}>
            <LinkIcon fontSize="small" color="action" sx={{ mr: 1 }} />
          </Tooltip>
        )}
        <ExpandMoreIcon
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </ListItemButton>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, pt: 1, bgcolor: 'action.hover' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Available in: {workflow.contexts.join(', ')}
            </Typography>
          </Box>

          {renderFormFields()}

          <Button
            variant="contained"
            size="small"
            startIcon={executing ? <CircularProgress size={16} /> : <PlayIcon />}
            onClick={handleExecute}
            disabled={executing}
            fullWidth
          >
            {executing ? 'Executing...' : 'Execute'}
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ============================================================================
// WorkflowResultsDialog
// ============================================================================

interface WorkflowResultsDialogProps {
  open: boolean;
  onClose: () => void;
  workflowName: string;
  result: any;
  error?: Error | null;
}

const WorkflowResultsDialog: React.FC<WorkflowResultsDialogProps> = ({
  open,
  onClose,
  workflowName,
  result,
  error,
}) => {
  const renderResult = () => {
    if (error) {
      return (
        <Alert severity="error" icon={<ErrorIcon />}>
          {error.message}
        </Alert>
      );
    }

    if (!result) return null;

    // Handle different result structures
    const data = result.result || result;

    if (data.tasks && Array.isArray(data.tasks)) {
      return (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Generated Tasks ({data.tasks.length})
          </Typography>
          <List dense>
            {data.tasks.map((task: any, index: number) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <TaskIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={task.title}
                  secondary={task.description}
                />
                {task.estimated_hours && (
                  <Chip
                    label={`${task.estimated_hours}h`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </ListItem>
            ))}
          </List>
          {data.summary && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {data.summary}
            </Alert>
          )}
        </Box>
      );
    }

    if (data.suggestions && Array.isArray(data.suggestions)) {
      return (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Suggestions ({data.suggestions.length})
          </Typography>
          <List dense>
            {data.suggestions.map((suggestion: any, index: number) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <IdeaIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={suggestion.title}
                  secondary={suggestion.description}
                />
                {suggestion.priority && (
                  <Chip
                    label={suggestion.priority}
                    size="small"
                    color={suggestion.priority === 'high' ? 'error' : 'default'}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }

    if (data.resources && Array.isArray(data.resources)) {
      return (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Resources ({data.resources.length})
          </Typography>
          <List dense>
            {data.resources.map((resource: any, index: number) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <LearnIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={resource.title}
                  secondary={resource.description}
                />
                <Chip label={resource.type} size="small" variant="outlined" />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }

    // Fallback: render as JSON
    return (
      <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
        <pre style={{ margin: 0, fontSize: '0.75rem' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </Paper>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {error ? (
            <ErrorIcon color="error" />
          ) : (
            <CheckIcon color="success" />
          )}
          {workflowName} - Results
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>{renderResult()}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// Main WorkflowPanel Component
// ============================================================================

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  projectId,
  nodeId,
  nodeTitle,
  nodeDescription,
  onWorkflowComplete,
  onClose,
  variant = 'sidebar',
}) => {
  const {
    workflows,
    categories,
    execute,
    executionState,
    discoveryLoading,
    error,
    getCrossReference,
  } = useIdeaTreeWorkflows(projectId);

  const [resultsOpen, setResultsOpen] = useState(false);
  const [lastWorkflowName, setLastWorkflowName] = useState('');

  // Group workflows by category
  const workflowsByCategory = useMemo(() => {
    const grouped: Record<string, WorkflowDefinition[]> = {};
    workflows.forEach((w) => {
      if (!grouped[w.category]) {
        grouped[w.category] = [];
      }
      grouped[w.category].push(w);
    });
    return grouped;
  }, [workflows]);

  const handleExecute = async (workflowId: string, inputs: WorkflowFormData) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    setLastWorkflowName(workflow?.name || workflowId);

    try {
      // Include node context if available
      const enrichedInputs = {
        ...inputs,
        node_id: nodeId,
        title: inputs.title || nodeTitle,
        description: inputs.description || nodeDescription,
      };

      const result = await execute(workflowId, enrichedInputs);
      setResultsOpen(true);

      if (onWorkflowComplete) {
        onWorkflowComplete(workflowId, result);
      }
    } catch (err) {
      setResultsOpen(true);
    }
  };

  if (discoveryLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading workflows...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load workflows: {error.message}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <AIIcon color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI Workflows
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Context info */}
      {nodeTitle && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            Context: {nodeTitle}
          </Typography>
        </Box>
      )}

      {/* Workflow categories */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {categories.map((category) => {
          const categoryWorkflows = workflowsByCategory[category.id] || [];
          if (categoryWorkflows.length === 0) return null;

          return (
            <Accordion
              key={category.id}
              defaultExpanded={category.id === 'planning'}
              disableGutters
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                bgcolor: 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 48,
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 1,
                  },
                }}
              >
                {categoryIcons[category.id] || <AIIcon />}
                <Typography variant="subtitle2">{category.name}</Typography>
                <Chip
                  label={categoryWorkflows.length}
                  size="small"
                  sx={{ ml: 'auto', mr: 1 }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {categoryWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onExecute={handleExecute}
                    executing={
                      executionState.executing &&
                      executionState.workflowId === workflow.id
                    }
                    crossRef={getCrossReference(workflow.id)}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Results dialog */}
      <WorkflowResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        workflowName={lastWorkflowName}
        result={executionState.result}
        error={executionState.error}
      />
    </Box>
  );
};

export default WorkflowPanel;
