import React from 'react';

export interface Timeline {
  startDate: string;
  deadline: string;
  durationWeeks: number;
}

interface TimelineSetupProps {
  data: Timeline;
  onChange: (data: Timeline) => void;
  onComplete?: () => void;
  onBack?: () => void;
  showDuration?: boolean;
  showDeadline?: boolean;
}

const TimelineSetup: React.FC<TimelineSetupProps> = ({
  data,
  onChange,
  onComplete,
  onBack,
  showDuration = true,
  showDeadline = true,
}) => {
  const handleChange = (field: keyof Timeline, value: any) => {
    const updated = { ...data, [field]: value };

    // Auto-calculate duration when dates change
    if ((field === 'startDate' || field === 'deadline') && updated.startDate && updated.deadline) {
      const start = new Date(updated.startDate);
      const end = new Date(updated.deadline);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      updated.durationWeeks = diffWeeks;
    }

    onChange(updated);
  };

  // Calculate suggested deadline based on duration
  const calculateDeadline = (weeks: number) => {
    if (data.startDate) {
      const start = new Date(data.startDate);
      const deadline = new Date(start);
      deadline.setDate(deadline.getDate() + weeks * 7);
      return deadline.toISOString().split('T')[0];
    }
    return '';
  };

  const handleDurationChange = (weeks: number) => {
    const suggestedDeadline = calculateDeadline(weeks);
    onChange({
      ...data,
      durationWeeks: weeks,
      deadline: suggestedDeadline || data.deadline,
    });
  };

  const today = new Date().toISOString().split('T')[0];
  const isDeadlineBeforeStart = data.deadline && data.startDate && data.deadline < data.startDate;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Timeline</h3>
        <p className="text-gray-600">
          Set the start date and duration for your project
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            When does the project begin?
          </p>
        </div>

        {/* Deadline */}
        {showDeadline && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline
            </label>
            <input
              type="date"
              value={data.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              min={data.startDate || today}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDeadlineBeforeStart ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {isDeadlineBeforeStart && (
              <p className="text-xs text-red-600 mt-1">
                Deadline must be after start date
              </p>
            )}
            {!isDeadlineBeforeStart && (
              <p className="text-xs text-gray-500 mt-1">
                When should the project be completed?
              </p>
            )}
          </div>
        )}
      </div>

      {/* Duration Slider */}
      {showDuration && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Duration: {data.durationWeeks} week{data.durationWeeks !== 1 ? 's' : ''}
          </label>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="52"
              value={data.durationWeeks}
              onChange={(e) => handleDurationChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                  (data.durationWeeks / 52) * 100
                }%, #E5E7EB ${(data.durationWeeks / 52) * 100}%, #E5E7EB 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 week</span>
              <span>1 year</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Estimated time to complete the project
          </p>
        </div>
      )}

      {/* Duration Presets */}
      {showDuration && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Presets:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: '2 weeks', weeks: 2 },
              { label: '1 month', weeks: 4 },
              { label: '1 quarter', weeks: 12 },
              { label: '6 months', weeks: 24 },
            ].map((preset) => (
              <button
                key={preset.weeks}
                onClick={() => handleDurationChange(preset.weeks)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  data.durationWeeks === preset.weeks
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Preview */}
      {data.startDate && data.deadline && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h4 className="font-semibold text-blue-900">Timeline Summary</h4>
          </div>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex justify-between">
              <span>Start:</span>
              <span className="font-medium">
                {new Date(data.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>End:</span>
              <span className="font-medium">
                {new Date(data.deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">
                {data.durationWeeks} week{data.durationWeeks !== 1 ? 's' : ''} (~
                {Math.round(data.durationWeeks / 4)} month
                {Math.round(data.durationWeeks / 4) !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {(onBack || onComplete) && (
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              ← Back
            </button>
          )}
          {!onBack && <div />}
          {onComplete && (
            <button
              onClick={onComplete}
              disabled={!data.startDate || isDeadlineBeforeStart}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                data.startDate && !isDeadlineBeforeStart
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineSetup;
