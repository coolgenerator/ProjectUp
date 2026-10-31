import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimeRemaining } from '../../../utils/onboardingStorage';
import { ProjectScenario } from '../ScenarioSelection';

interface AutoSaveIndicatorProps {
  scenario: ProjectScenario;
  lastSaved?: Date;
}

/**
 * Auto-Save Indicator Component
 *
 * Shows users when their data was last saved and how long until it expires.
 * Provides peace of mind that their work is being preserved.
 */
const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ scenario, lastSaved }) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Update time remaining every minute
    const updateTimeRemaining = () => {
      const remaining = getTimeRemaining(scenario);
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [scenario]);

  useEffect(() => {
    if (lastSaved) {
      // Show indicator briefly when data is saved
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  const formatTimeRemaining = (hours: number): string => {
    if (hours >= 1) {
      return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'}`;
    } else if (hours > 0) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    return 'expiring soon';
  };

  return (
    <AnimatePresence>
      {showIndicator && lastSaved && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-900">Progress Saved</span>
              {timeRemaining !== null && (
                <span className="text-xs text-green-700">
                  Expires in {formatTimeRemaining(timeRemaining)}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AutoSaveIndicator;
