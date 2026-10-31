import React from 'react';

interface OnboardingProgressBarProps {
  /**
   * The color theme for the progress bar (e.g., 'blue', 'purple', 'green')
   * This should match the project type's color
   */
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
  /**
   * Total number of steps in the flow
   * Default is 7 (Requirements, Topics, Elaboration, Details, Timeline, Team, Review)
   */
  totalSteps?: number;
  /**
   * Custom labels for the steps
   * If not provided, uses default labels
   */
  stepLabels?: string[];
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  color = 'blue',
  totalSteps = 7,
  stepLabels = ['Requirements', 'Topics', 'Elaboration', 'Details', 'Timeline', 'Team', 'Review'],
}) => {
  const colorClasses = {
    blue: 'bg-blue-600 text-blue-600',
    purple: 'bg-purple-600 text-purple-600',
    green: 'bg-green-600 text-green-600',
    orange: 'bg-orange-600 text-orange-600',
    pink: 'bg-pink-600 text-pink-600',
    indigo: 'bg-indigo-600 text-indigo-600',
  };

  const activeColor = colorClasses[color].split(' ')[0];
  const textColor = colorClasses[color].split(' ')[1];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {/* Step 1 - Current (Requirements) */}
        <div className="flex flex-col items-center" style={{ flex: 1 }}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold ${activeColor} text-white`}>
            1
          </div>
          <span className={`text-xs mt-1 text-center whitespace-nowrap ${textColor} font-medium`}>
            {stepLabels[0]}
          </span>
        </div>

        {totalSteps > 1 && <div className="h-1 mx-2 rounded bg-gray-200" style={{ flex: 1 }} />}

        {/* Remaining steps */}
        {stepLabels.slice(1).map((label, index) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center" style={{ flex: index === stepLabels.length - 2 ? 0 : 1 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-200 text-gray-600">
                {index + 2}
              </div>
              <span className="text-xs mt-1 text-center whitespace-nowrap text-gray-500">
                {label}
              </span>
            </div>
            {index < stepLabels.length - 2 && <div className="h-1 mx-2 rounded bg-gray-200" style={{ flex: 1 }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default OnboardingProgressBar;
