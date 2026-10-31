import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ScenarioSelection, { ProjectScenario } from './ScenarioSelection';
import CourseProjectFlow from './flows/CourseProjectFlow';
import ResearchProjectFlow from './flows/ResearchProjectFlow';
import CapstoneProjectFlow from './flows/CapstoneProjectFlow';
import CompetitionProjectFlow from './flows/CompetitionProjectFlow';
import ProductProjectFlow from './flows/ProductProjectFlow';
import HackathonProjectFlow from './flows/HackathonProjectFlow';
import OpenSourceProjectFlow from './flows/OpenSourceProjectFlow';
import PortfolioProjectFlow from './flows/PortfolioProjectFlow';
import InternshipProjectFlow from './flows/InternshipProjectFlow';
import IndustryProjectFlow from './flows/IndustryProjectFlow';
import FreelanceProjectFlow from './flows/FreelanceProjectFlow';
import BlankProjectFlow from './flows/BlankProjectFlow';
import {
  getOnboardingParamsFromURL,
  updateOnboardingURL,
  clearAllOnboardingData,
} from '../../utils/onboardingStorage';

interface OnboardingWizardProps {
  onClose?: () => void;
  onComplete?: (projectId: number, projectSid: string) => void;
  asModal?: boolean; // If true, renders as modal; if false/undefined, renders as page
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onClose,
  onComplete,
  asModal = false,
}) => {
  const location = useLocation();

  // Track if we're currently updating the scenario to prevent sync loops
  const isUpdatingScenario = useRef(false);

  // Track previous URL to detect actual URL changes
  const prevUrlRef = useRef(location.search);

  // Initialize scenario from URL to avoid race condition
  const [scenario, setScenario] = useState<ProjectScenario | null>(() => {
    const { scenario: urlScenario } = getOnboardingParamsFromURL();
    console.log('[OnboardingWizard] Initial scenario from URL:', urlScenario);
    return urlScenario;
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Sync scenario state with URL changes (for programmatic navigation)
  useEffect(() => {
    const { scenario: urlScenario } = getOnboardingParamsFromURL();
    const currentUrl = location.search;

    console.log('[OnboardingWizard] 🔄 Sync effect triggered');
    console.log('[OnboardingWizard]   - URL scenario:', urlScenario);
    console.log('[OnboardingWizard]   - State scenario:', scenario);
    console.log('[OnboardingWizard]   - Current URL:', currentUrl);
    console.log('[OnboardingWizard]   - Previous URL:', prevUrlRef.current);
    console.log('[OnboardingWizard]   - isUpdatingScenario flag:', isUpdatingScenario.current);

    // Check if URL actually changed
    const urlChanged = currentUrl !== prevUrlRef.current;
    console.log('[OnboardingWizard]   - URL changed?:', urlChanged);

    // Update previous URL ref
    prevUrlRef.current = currentUrl;

    // Skip if we're currently updating to prevent sync loops
    if (isUpdatingScenario.current) {
      console.log('[OnboardingWizard] ⏭️ Skipping sync - scenario update in progress');
      isUpdatingScenario.current = false;
      return;
    }

    // Only sync if URL actually changed AND doesn't match state
    if (urlChanged && urlScenario !== scenario) {
      console.log('[OnboardingWizard] ⚠️ URL CHANGED - Syncing state from URL:', urlScenario);
      isUpdatingScenario.current = true;
      setScenario(urlScenario);
    } else if (!urlChanged && urlScenario !== scenario) {
      console.log('[OnboardingWizard] ℹ️ State changed (not URL) - will update URL in next effect');
    } else {
      console.log('[OnboardingWizard] ✓ URL and state match, no sync needed');
    }
  }, [location.search, scenario]); // Re-run when URL OR state changes

  // Update URL when scenario changes (but not on initial mount)
  useEffect(() => {
    console.log('[OnboardingWizard] 🌐 Update URL effect triggered');
    console.log('[OnboardingWizard]   - Scenario:', scenario);
    console.log('[OnboardingWizard]   - isInitialized:', isInitialized);
    console.log('[OnboardingWizard]   - isUpdatingScenario flag:', isUpdatingScenario.current);

    if (!isInitialized) {
      console.log('[OnboardingWizard] ⏭️ Not initialized yet, skipping URL update');
      return;
    }

    if (isUpdatingScenario.current) {
      console.log('[OnboardingWizard] ⏭️ Skipping URL update - currently syncing from URL');
      isUpdatingScenario.current = false;
      return;
    }

    console.log('[OnboardingWizard] ✅ Updating URL for scenario:', scenario);
    updateOnboardingURL(scenario);
  }, [scenario, isInitialized]);

  // Handle browser back/forward button for scenario navigation
  useEffect(() => {
    const handlePopState = () => {
      const { scenario: urlScenario } = getOnboardingParamsFromURL();
      console.log('[OnboardingWizard] 🔙 PopState event - URL scenario:', urlScenario, 'State scenario:', scenario);
      if (urlScenario !== scenario) {
        console.log('[OnboardingWizard] PopState - Setting flag and updating scenario to:', urlScenario);
        isUpdatingScenario.current = true;
        setScenario(urlScenario);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scenario]);

  const handleScenarioSelect = (selectedScenario: ProjectScenario) => {
    console.log('[OnboardingWizard] 🎯 handleScenarioSelect called with:', selectedScenario);
    setScenario(selectedScenario);
  };

  const handleBack = () => {
    console.log('[OnboardingWizard] 🔙 handleBack called - setting scenario to null');
    setScenario(null);
  };

  // Log whenever scenario state changes
  useEffect(() => {
    console.log('[OnboardingWizard] ★ Scenario state changed to:', scenario);
    console.log('[OnboardingWizard] ★ Will render:', scenario ? `${scenario} flow` : 'scenario selection');
  }, [scenario]);

  const handleProjectCreated = (projectId: number, projectSid: string) => {
    // Clear all saved onboarding data after successful creation
    clearAllOnboardingData();

    if (onComplete) {
      onComplete(projectId, projectSid);
    }
    if (onClose) {
      onClose();
    }
  };

  // Page-based rendering (default)
  const pageContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {!scenario ? (
          <motion.div
            key="scenario-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ScenarioSelection onSelect={handleScenarioSelect} />
          </motion.div>
        ) : (
          <motion.div
            key={`flow-${scenario}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
          >
            {scenario === 'course' && (
              <CourseProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'research' && (
              <ResearchProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'capstone' && (
              <CapstoneProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'competition' && (
              <CompetitionProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'product' && (
              <ProductProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'hackathon' && (
              <HackathonProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'opensource' && (
              <OpenSourceProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'personal' && (
              <PortfolioProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'internship' && (
              <InternshipProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'industry' && (
              <IndustryProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'freelance' && (
              <FreelanceProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'startup' && (
              <ProductProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
            {scenario === 'blank' && (
              <BlankProjectFlow
                onBack={handleBack}
                onComplete={handleProjectCreated}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Modal-based rendering (legacy support)
  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Create New Project</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {scenario
                      ? `Setting up your ${scenario} project`
                      : 'Choose your project type'}
                  </p>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {!scenario ? (
                  <motion.div
                    key="scenario-selection"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <ScenarioSelection onSelect={handleScenarioSelect} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`flow-${scenario}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {scenario === 'course' && (
                      <CourseProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'research' && (
                      <ResearchProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'capstone' && (
                      <CapstoneProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'competition' && (
                      <CompetitionProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'product' && (
                      <ProductProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'hackathon' && (
                      <HackathonProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'opensource' && (
                      <OpenSourceProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'personal' && (
                      <PortfolioProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'internship' && (
                      <InternshipProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'industry' && (
                      <IndustryProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'freelance' && (
                      <FreelanceProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'startup' && (
                      <ProductProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                    {scenario === 'blank' && (
                      <BlankProjectFlow
                        onBack={handleBack}
                        onComplete={handleProjectCreated}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Return page content by default
  return pageContent;
};

export default OnboardingWizard;
