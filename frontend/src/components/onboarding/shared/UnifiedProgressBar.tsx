import React from 'react';

export type StepId = string;

export interface Step {
  id: StepId;
  label: string;
}

interface UnifiedProgressBarProps {
  /**
   * Array of steps to display
   */
  steps: Step[];
  /**
   * Current active step ID
   */
  currentStep: StepId;
  /**
   * Array of step IDs that have been visited
   */
  visitedSteps: StepId[];
  /**
   * Callback when a step is clicked
   */
  onStepClick?: (stepId: StepId) => void;
  /**
   * Color theme for the progress bar
   */
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
}

/**
 * Unified Progress Bar Component
 *
 * A reusable, clickable progress bar that tracks visited steps
 * and allows navigation between them.
 *
 * Features:
 * - Visual indication of current, visited, and unvisited steps
 * - Clickable navigation to previously visited steps
 * - Smooth hover effects
 * - Customizable color themes
 * - Responsive design
 */
const UnifiedProgressBar: React.FC<UnifiedProgressBarProps> = ({
  steps,
  currentStep,
  visitedSteps,
  onStepClick,
  color = 'blue',
}) => {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const colorClasses = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700', ring: 'ring-blue-500' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', hover: 'hover:bg-purple-700', ring: 'ring-purple-500' },
    green: { bg: 'bg-green-600', text: 'text-green-600', hover: 'hover:bg-green-700', ring: 'ring-green-500' },
    orange: { bg: 'bg-orange-600', text: 'text-orange-600', hover: 'hover:bg-orange-700', ring: 'ring-orange-500' },
    pink: { bg: 'bg-pink-600', text: 'text-pink-600', hover: 'hover:bg-pink-700', ring: 'ring-pink-500' },
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', hover: 'hover:bg-indigo-700', ring: 'ring-indigo-500' },
  };

  const colors = colorClasses[color];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isVisited = visitedSteps.includes(step.id);
          const isClickable = isVisited && !isCurrent && onStepClick;
          const isCompleted = index < currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center" style={{ flex: index === steps.length - 1 ? '0' : '1' }}>
                {/* Step Circle */}
                <div
                  onClick={() => {
                    if (isClickable) {
                      onStepClick(step.id);
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isVisited
                      ? `${colors.bg} text-white`
                      : 'bg-gray-200 text-gray-600'
                  } ${
                    isCurrent ? `ring-4 ${colors.ring} ring-opacity-30` : ''
                  } ${
                    isClickable
                      ? `cursor-pointer ${colors.hover} hover:scale-110 shadow-md hover:shadow-lg`
                      : isCurrent
                      ? 'cursor-default'
                      : 'cursor-not-allowed'
                  }`}
                  title={isClickable ? `Go to ${step.label}` : isCurrent ? `Current: ${step.label}` : step.label}
                >
                  {index + 1}
                </div>

                {/* Step Label */}
                <span
                  onClick={() => {
                    if (isClickable) {
                      onStepClick(step.id);
                    }
                  }}
                  className={`text-xs mt-1 text-center whitespace-nowrap transition-colors ${
                    isVisited ? `${colors.text} font-medium` : 'text-gray-500'
                  } ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`h-1 mx-2 rounded transition-all ${isCompleted ? colors.bg : 'bg-gray-200'}`}
                  style={{ flex: '1' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default UnifiedProgressBar;
