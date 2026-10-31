/**
 * ReasoningSteps Component
 * Displays chain-of-thought reasoning steps from the ReAct engine
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Icon,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Lightbulb as ThoughtIcon,
  Build as ToolIcon,
  Visibility as ObservationIcon,
  Psychology as ReflectionIcon,
  Psychology,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';

export interface ReasoningStep {
  iteration: number;
  thought?: string;
  action?: string;
  observation?: string;
  reflection?: string;
  tool?: string;
  args?: any;
  result?: string;
}

interface ReasoningStepsProps {
  steps: ReasoningStep[];
  currentStep?: number;
  isStreaming?: boolean;
}

const ReasoningSteps: React.FC<ReasoningStepsProps> = ({
  steps,
  currentStep,
  isStreaming = false
}) => {
  const [expandedStep, setExpandedStep] = useState<number | false>(false);

  const handleStepToggle = (stepNumber: number) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedStep(isExpanded ? stepNumber : false);
  };

  const getPhaseIcon = (phase: 'thought' | 'tool' | 'observation' | 'reflection') => {
    switch (phase) {
      case 'thought':
        return <ThoughtIcon fontSize="small" />;
      case 'tool':
        return <ToolIcon fontSize="small" />;
      case 'observation':
        return <ObservationIcon fontSize="small" />;
      case 'reflection':
        return <ReflectionIcon fontSize="small" />;
    }
  };

  const getPhaseColor = (phase: 'thought' | 'tool' | 'observation' | 'reflection') => {
    switch (phase) {
      case 'thought':
        return 'primary';
      case 'tool':
        return 'secondary';
      case 'observation':
        return 'info';
      case 'reflection':
        return 'success';
    }
  };

  if (steps.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Psychology sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight="600">
            Chain-of-Thought Reasoning
          </Typography>
          {isStreaming && (
            <Chip
              label="Thinking..."
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 'auto' }}
            />
          )}
        </Stack>

        {isStreaming && currentStep && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Step {currentStep}
            </Typography>
          </Box>
        )}

        <Stack spacing={1}>
          {steps.map((step, index) => (
            <Accordion
              key={index}
              expanded={expandedStep === index}
              onChange={handleStepToggle(index)}
              elevation={0}
              sx={{
                bgcolor: 'background.paper',
                '&:before': { display: 'none' },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px !important',
                '&.Mui-expanded': {
                  margin: '0 !important',
                  mb: 1
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: '48px',
                  '&.Mui-expanded': {
                    minHeight: '48px'
                  }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', pr: 1 }}>
                  <Chip
                    label={`Step ${step.iteration}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {step.action && (
                    <Chip
                      icon={<ToolIcon fontSize="small" />}
                      label={step.action}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {index === steps.length - 1 && !isStreaming && (
                    <CompleteIcon fontSize="small" sx={{ color: 'success.main', ml: 'auto' }} />
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Stack spacing={2}>
                  {/* Thought */}
                  {step.thought && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getPhaseIcon('thought')}
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          THOUGHT
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ pl: 3 }}>
                        {step.thought}
                      </Typography>
                    </Box>
                  )}

                  {/* Action/Tool Call */}
                  {step.action && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getPhaseIcon('tool')}
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          ACTION
                        </Typography>
                      </Stack>
                      <Box sx={{ pl: 3 }}>
                        <Chip
                          label={step.action}
                          size="small"
                          color="secondary"
                          sx={{ fontFamily: 'monospace' }}
                        />
                        {step.args && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            {JSON.stringify(step.args).substring(0, 100)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Observation */}
                  {step.observation && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getPhaseIcon('observation')}
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          OBSERVATION
                        </Typography>
                      </Stack>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          ml: 3,
                          bgcolor: 'grey.50',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {step.observation}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {/* Result (alternative to observation) */}
                  {step.result && !step.observation && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getPhaseIcon('observation')}
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          RESULT
                        </Typography>
                      </Stack>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          ml: 3,
                          bgcolor: 'grey.50',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {step.result}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {/* Reflection */}
                  {step.reflection && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getPhaseIcon('reflection')}
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          REFLECTION
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          pl: 3,
                          fontStyle: 'italic',
                          color: 'success.dark'
                        }}
                      >
                        {step.reflection}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        {steps.length === 0 && isStreaming && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Initializing reasoning engine...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ReasoningSteps;
