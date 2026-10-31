/**
 * Unified Project Flow - Template for all remaining project types
 *
 * This component provides a streamlined flow that can be configured
 * for different project types: competition, internship, opensource, portfolio, coursenote, examprep
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnifiedAITopicSuggestions, { ProjectTopic } from '../shared/UnifiedAITopicSuggestions';
import { TopicElaboration as TopicElaborationType } from '../shared/TopicElaboration';
import { ProjectDetails } from '../shared/AIProjectDetailsGenerator';
import TimelineSetup, { Timeline } from '../shared/TimelineSetup';
import TeamSetup, { TeamMember } from '../shared/TeamSetup';
import ProjectPreview from '../shared/ProjectPreview';
import { GeneratedBoard } from '../shared/AIBoardPreview';
import UnifiedProgressBar from '../shared/UnifiedProgressBar';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { elaborateTopic, generateProjectDetails } from '../../../api/onboardingAPI';
import {
  saveOnboardingData,
  loadOnboardingData,
  getOnboardingParamsFromURL,
  updateOnboardingURL,
  clearOnboardingData,
} from '../../../utils/onboardingStorage';
import { ProjectScenario } from '../ScenarioSelection';

type Step = 'requirements' | 'ai-topics' | 'ai-elaboration' | 'ai-details' | 'timeline' | 'team' | 'preview';

interface ProjectTypeConfig {
  type: string;
  displayName: string;
  color: string; // Tailwind color class prefix (e.g., 'blue', 'green')
  icon: React.ReactNode;
  defaultDurationWeeks: number;
  defaultTeamSize: number;
}

interface UnifiedProjectFlowProps {
  config: ProjectTypeConfig;
  requirementsComponent: React.ReactElement;
  requirementsData: any;
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

interface UnifiedFlowState {
  currentStep: Step;
  visitedSteps: Step[];
  selectedTopic: ProjectTopic | null;
  topicElaboration: TopicElaborationType | null;
  projectDetails: ProjectDetails | null;
  generatedBoard: GeneratedBoard | null;
  timeline: Timeline;
  teamMembers: TeamMember[];
}

/**
 * Unified Project Flow
 *
 * A flexible flow component that works with any project type.
 * Requires a requirements component and context mapping.
 */
const UnifiedProjectFlow: React.FC<UnifiedProjectFlowProps> = ({
  config: projectConfig,
  requirementsComponent,
  requirementsData,
  onBack,
  onComplete,
}) => {
  const initialStep = requirementsData ? 'ai-topics' : 'requirements';
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [visitedSteps, setVisitedSteps] = useState<Step[]>([initialStep]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [topicElaboration, setTopicElaboration] = useState<TopicElaborationType | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [timeline, setTimeline] = useState<Timeline>({
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    durationWeeks: projectConfig.defaultDurationWeeks,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Get the scenario from URL
  const { scenario } = getOnboardingParamsFromURL();

  // Load saved state from localStorage on mount
  useEffect(() => {
    if (!scenario) return;

    const savedState = loadOnboardingData<UnifiedFlowState>(scenario);
    if (savedState) {
      // Only restore step if we don't have requirementsData
      // If requirementsData exists, we should start at ai-topics
      if (!requirementsData) {
        setCurrentStep(savedState.currentStep);
      }
      setVisitedSteps(savedState.visitedSteps || [initialStep]);
      setSelectedTopic(savedState.selectedTopic);
      setTopicElaboration(savedState.topicElaboration);
      setProjectDetails(savedState.projectDetails);
      setGeneratedBoard(savedState.generatedBoard);
      setTimeline(savedState.timeline);
      setTeamMembers(savedState.teamMembers);
    }

    // Also check URL for step parameter
    const { step } = getOnboardingParamsFromURL();
    if (step && savedState && !requirementsData) {
      setCurrentStep(step as Step);
    }
  }, [scenario]);

  // Track visited steps whenever current step changes
  useEffect(() => {
    if (!visitedSteps.includes(currentStep)) {
      setVisitedSteps([...visitedSteps, currentStep]);
    }
  }, [currentStep]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!scenario) return;

    const state: UnifiedFlowState = {
      currentStep,
      visitedSteps,
      selectedTopic,
      topicElaboration,
      projectDetails,
      generatedBoard,
      timeline,
      teamMembers,
    };
    saveOnboardingData(scenario, currentStep, state);
  }, [
    scenario,
    currentStep,
    visitedSteps,
    selectedTopic,
    topicElaboration,
    projectDetails,
    generatedBoard,
    timeline,
    teamMembers,
  ]);

  // Update URL when step changes
  useEffect(() => {
    if (!scenario) return;
    updateOnboardingURL(scenario, currentStep);
  }, [scenario, currentStep]);

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      const { step } = getOnboardingParamsFromURL();
      if (step && step !== currentStep) {
        setCurrentStep(step as Step);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);

  const steps: { id: Step; label: string }[] = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'ai-topics', label: 'Topics' },
    { id: 'ai-elaboration', label: 'Plan' },
    { id: 'ai-details', label: 'Details' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'team', label: 'Team' },
    { id: 'preview', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleElaborateTopic = async (topic: ProjectTopic) => {
    if (!requirementsData) return;

    setSelectedTopic(topic);
    setIsProcessing(true);

    try {
      console.log('[handleElaborateTopic] Elaborating topic:', topic);
      const elaboration = await elaborateTopic(projectConfig.type, topic, requirementsData);
      console.log('[handleElaborateTopic] Elaboration result:', elaboration);
      setTopicElaboration(elaboration);

      // Auto-generate details
      console.log('[handleElaborateTopic] Generating project details...');
      const details = await generateProjectDetails(projectConfig.type, elaboration);
      console.log('[handleElaborateTopic] Details result:', details);

      setProjectDetails({
        selectedName: details.name_options?.[0]?.name || topic.name,
        description: details.description || '',
        tags: details.tags || [],
      });

      setCurrentStep('ai-details');
    } catch (error) {
      console.error('Failed to process topic:', error);
      toast.error('Failed to process topic. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectDetails) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        project_scenario: projectConfig.type,
        name: projectDetails.selectedName,
        description: projectDetails.description,
        topic: projectDetails.tags,
        location: 'Remote',
        start_date: timeline.startDate,
        deadline: timeline.deadline || undefined,
        duration_weeks: timeline.durationWeeks,
        team_members: teamMembers.map((member) => ({
          user_id: member.userId,
          is_placeholder: member.isPlaceholder,
          placeholder_name: member.isPlaceholder ? member.name : undefined,
          placeholder_email: member.isPlaceholder ? member.email : undefined,
          role: member.role,
        })),
        onboarding_metadata: {
          flow_version: '2.0',
          project_type: projectConfig.type,
          ai_guided: true,
          completion_time: new Date().toISOString(),
        },
        context: requirementsData, // Store full context
      };

      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/projects/onboarding/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const result = await response.json();
      toast.success(`${projectConfig.displayName} created successfully!`);

      // Clear saved data after successful project creation
      if (scenario) {
        clearOnboardingData(scenario);
      }

      onComplete(result.project.project_id, result.project.sid);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const colorClass = projectConfig.color;

  const handleStartOver = () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to start over? All progress will be lost.'
    );
    if (confirmed) {
      clearOnboardingData(projectConfig.type as ProjectScenario);
      window.location.reload();
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Start Over button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Create {projectConfig.displayName}</h1>
        <button
          onClick={handleStartOver}
          className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Start Over</span>
        </button>
      </div>

      {/* Progress Bar */}
      <UnifiedProgressBar
        steps={steps}
        currentStep={currentStep}
        visitedSteps={visitedSteps}
        onStepClick={setCurrentStep}
        color={colorClass as any}
      />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'requirements' && requirementsComponent}

          {currentStep === 'ai-topics' && requirementsData && (
            <UnifiedAITopicSuggestions
              projectType={projectConfig.type}
              context={requirementsData}
              onTopicSelected={(topic) => topic && handleElaborateTopic(topic)}
              onBack={() => setCurrentStep('requirements')}
            />
          )}

          {(currentStep === 'ai-elaboration' || isProcessing) && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`w-24 h-24 border-8 border-${colorClass}-200 border-t-${colorClass}-600 rounded-full animate-spin mb-6`}></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI is creating your project plan...</h3>
              <p className="text-gray-600">Please wait while we process your project</p>
            </div>
          )}

          {currentStep === 'ai-details' && projectDetails && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold mb-4">{projectDetails.selectedName}</h2>
                <p className="text-gray-600 mb-6">{projectDetails.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {projectDetails.tags.map((tag) => (
                    <span key={tag} className={`px-3 py-1 bg-${colorClass}-100 text-${colorClass}-700 rounded-full text-sm`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('ai-topics')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('timeline')}
                    className={`px-8 py-3 bg-${colorClass}-600 text-white rounded-lg hover:bg-${colorClass}-700`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'timeline' && (
            <TimelineSetup
              data={timeline}
              onChange={setTimeline}
              onComplete={() => setCurrentStep('team')}
              onBack={() => setCurrentStep('ai-details')}
            />
          )}

          {currentStep === 'team' && (
            <TeamSetup
              members={teamMembers}
              onChange={setTeamMembers}
              onComplete={() => setCurrentStep('preview')}
              onBack={() => setCurrentStep('timeline')}
            />
          )}

          {currentStep === 'preview' && projectDetails && (
            <ProjectPreview
              projectData={{
                name: projectDetails.selectedName,
                description: projectDetails.description,
                tags: projectDetails.tags,
                timeline,
                teamMembers,
                generatedBoard,
              }}
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep('team')}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UnifiedProjectFlow;
