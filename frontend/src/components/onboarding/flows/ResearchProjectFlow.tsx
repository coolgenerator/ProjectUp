import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import ResearchRequirementsInput, { ResearchRequirements } from '../shared/ResearchRequirementsInput';
import TeamSetup, { TeamMember } from '../shared/TeamSetup';
import AITopicSuggestions, { ProjectTopic } from '../shared/AITopicSuggestions';
import ResearchPlanningGuide from '../shared/ResearchPlanningGuide';
import AIProjectDetailsGenerator, { ProjectDetails } from '../shared/AIProjectDetailsGenerator';
import ReviewAndCreate from '../shared/ReviewAndCreate';
import { GeneratedBoard } from '../shared/AIBoardPreview';
import ConfirmDialog from '../../common/ConfirmDialog';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import {
  saveOnboardingData,
  loadOnboardingData,
  getOnboardingParamsFromURL,
  updateOnboardingURL,
  clearOnboardingData,
} from '../../../utils/onboardingStorage';

type Step =
  | 'requirements'      // Research question & constraints
  | 'team'              // Team setup (moved early - who's working on this)
  | 'ai-topics'         // AI topic suggestions (research directions)
  | 'research-plan'     // Research planning guide + AI-generated plan
  | 'ai-details'        // Project details generation
  | 'preview';          // Final review

interface ResearchProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

interface ResearchFlowState {
  currentStep: Step;
  visitedSteps: Step[];
  researchRequirements: ResearchRequirements | null;
  generatedTopics: ProjectTopic[];
  analysisSummary: string;
  selectedTopic: ProjectTopic | null;
  researchPlan: any | null;
  projectDetails: ProjectDetails | null;
  generatedBoard: GeneratedBoard | null;
  teamMembers: TeamMember[];
}

/**
 * Research Project Flow - Aligned with Research Methodology
 *
 * Flow: Requirements → Team → Research Direction → Details → Preview
 *
 * Based on proper research process:
 * 1. Define research question clearly
 * 2. Assemble team (advisor, collaborators)
 * 3. Literature review & research direction
 * 4. Generate project details
 * 5. Review & create
 */
const ResearchProjectFlow: React.FC<ResearchProjectFlowProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('requirements');
  const [visitedSteps, setVisitedSteps] = useState<Step[]>(['requirements']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);

  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State for each step
  const [researchRequirements, setResearchRequirements] = useState<ResearchRequirements | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<ProjectTopic[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [researchPlan, setResearchPlan] = useState<any | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);

  // Initialize team members with current user as admin by default
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (!currentUser) return [];

    const displayName = currentUser.preferred_name || currentUser.first_name || currentUser.username || 'Me';
    const fullName = currentUser.last_name
      ? `${displayName} ${currentUser.last_name}`
      : displayName;

    return [{
      id: `user-${currentUser.id}`,
      userId: currentUser.id,
      isPlaceholder: false,
      name: fullName,
      email: currentUser.email,
      role: 'admin',
      avatarUrl: typeof currentUser.avatar === 'string' ? currentUser.avatar : undefined,
    }];
  });

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = loadOnboardingData<ResearchFlowState>('research');
    if (savedState) {
      // Check if this is a fresh start (no meaningful data saved)
      const hasMeaningfulData =
        savedState.selectedTopic ||
        savedState.researchPlan ||
        savedState.projectDetails ||
        (savedState.generatedTopics && savedState.generatedTopics.length > 0);

      if (hasMeaningfulData) {
        // Resume from saved state
        setCurrentStep(savedState.currentStep);
        setVisitedSteps(savedState.visitedSteps || ['requirements']);
        setResearchRequirements(savedState.researchRequirements);
        setGeneratedTopics(savedState.generatedTopics || []);
        setAnalysisSummary(savedState.analysisSummary || '');
        setSelectedTopic(savedState.selectedTopic);
        setResearchPlan(savedState.researchPlan);
        setProjectDetails(savedState.projectDetails);
        setGeneratedBoard(savedState.generatedBoard);

        // Only load saved team members if they exist and are not empty
        if (savedState.teamMembers && savedState.teamMembers.length > 0) {
          setTeamMembers(savedState.teamMembers);
        }
      } else {
        // Fresh start - only restore requirements if they exist
        if (savedState.researchRequirements) {
          setResearchRequirements(savedState.researchRequirements);
        }
        // Reset visitedSteps to just the current step
        setVisitedSteps(['requirements']);
      }
    }

    // Also check URL for step parameter
    const { step } = getOnboardingParamsFromURL();
    if (step && savedState) {
      setCurrentStep(step as Step);
    }
  }, []);

  // Track visited steps and update URL whenever current step changes
  useEffect(() => {
    setVisitedSteps((prev) => {
      if (!prev.includes(currentStep)) {
        return [...prev, currentStep];
      }
      return prev;
    });

    // Update URL to reflect current step
    updateOnboardingURL('research', currentStep);
  }, [currentStep]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: ResearchFlowState = {
      currentStep,
      visitedSteps,
      researchRequirements,
      generatedTopics,
      analysisSummary,
      selectedTopic,
      researchPlan,
      projectDetails,
      generatedBoard,
      teamMembers,
    };
    saveOnboardingData('research', currentStep, state);
  }, [
    currentStep,
    visitedSteps,
    researchRequirements,
    generatedTopics,
    analysisSummary,
    selectedTopic,
    researchPlan,
    projectDetails,
    generatedBoard,
    teamMembers,
  ]);

  // Research-specific step configuration
  const steps = [
    { id: 'requirements' as Step, label: 'Research Question', number: 1 },
    { id: 'team' as Step, label: 'Research Team', number: 2 },
    { id: 'ai-topics' as Step, label: 'Research Direction', number: 3 },
    { id: 'research-plan' as Step, label: 'Research Plan', number: 4 },
    { id: 'ai-details' as Step, label: 'Project Details', number: 5 },
    { id: 'preview' as Step, label: 'Review & Create', number: 6 },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const handleSubmit = async (coverImageUrl: string) => {
    if (!researchRequirements) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        project_scenario: 'research',
        name: projectDetails?.selectedName || `${researchRequirements.researchArea} Research`,
        description: projectDetails?.description || researchRequirements.researchQuestions,
        topic: projectDetails?.tags || [],
        location: researchRequirements.institution || 'Remote',
        start_date: new Date().toISOString().split('T')[0],
        duration_weeks: Math.ceil(researchRequirements.durationMonths * 4.33),
        cover_image_url: coverImageUrl,
        team_members: teamMembers.map((member) => ({
          user_id: member.userId,
          is_placeholder: member.isPlaceholder,
          placeholder_name: member.isPlaceholder ? member.name : undefined,
          placeholder_email: member.isPlaceholder ? member.email : undefined,
          role: member.role,
        })),
        research_info: {
          research_area: researchRequirements.researchArea,
          institution: researchRequirements.institution,
          advisor_name: researchRequirements.advisorName,
          research_type: researchRequirements.researchType,
          research_questions: researchRequirements.researchQuestions,
          proposal_status: researchRequirements.proposalStatus,
          funding_available: researchRequirements.constraints.fundingAvailable,
          requires_ethics_approval: researchRequirements.constraints.requiresEthicsApproval,
        },
        onboarding_metadata: {
          flow_version: '2.0-research',
          has_ai_board: !!generatedBoard,
          ai_guided: true,
          completion_time: new Date().toISOString(),
        },
      };

      // Include AI-generated board if available
      if (generatedBoard) {
        payload.ai_board = generatedBoard;
      }

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
      toast.success('Research project created successfully!');

      // Clear saved data after successful project creation
      clearOnboardingData('research');

      onComplete(result.project.project_id, result.project.sid);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    // Clear all saved onboarding data for this flow
    clearOnboardingData('research');
    // Reset all state
    setCurrentStep('requirements');
    setVisitedSteps(['requirements']);
    setResearchRequirements(null);
    setGeneratedTopics([]);
    setAnalysisSummary('');
    setSelectedTopic(null);
    setResearchPlan(null);
    setProjectDetails(null);
    setGeneratedBoard(null);
    // Reset team to just the current user
    if (currentUser) {
      const displayName = currentUser.preferred_name || currentUser.first_name || currentUser.username || 'Me';
      const fullName = currentUser.last_name
        ? `${displayName} ${currentUser.last_name}`
        : displayName;
      setTeamMembers([{
        id: `user-${currentUser.id}`,
        userId: currentUser.id,
        isPlaceholder: false,
        name: fullName,
        email: currentUser.email,
        role: 'admin',
        avatarUrl: typeof currentUser.avatar === 'string' ? currentUser.avatar : undefined,
      }]);
    } else {
      setTeamMembers([]);
    }
    // Close the confirmation dialog
    setShowStartOverConfirm(false);
    // Navigate back to scenario selection
    onBack();
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isVisited = visitedSteps.includes(step.id);
            // All previous steps OR visited steps should be clickable (not current)
            const isClickable = (isCompleted || isVisited) && !isCurrent;
            // Show as active (purple) if completed, current, or visited
            const isActive = isCompleted || isCurrent || isVisited;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center" style={{ flex: index === steps.length - 1 ? '0' : '1' }}>
                  <div
                    onClick={() => {
                      if (isClickable) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    } ${
                      isClickable
                        ? 'cursor-pointer hover:bg-purple-700 hover:scale-110'
                        : 'cursor-default'
                    }`}
                  >
                    {step.number}
                  </div>
                  <span className="text-xs mt-2 text-center max-w-[80px]">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 mb-6">
                    <div
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Start Over Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowStartOverConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Start Over
          </button>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'requirements' && (
            <ResearchRequirementsInput
              onComplete={(requirements) => {
                setResearchRequirements(requirements);
                setCurrentStep('team');
              }}
              onBack={onBack}
            />
          )}

          {currentStep === 'team' && researchRequirements && (
            <TeamSetup
              members={teamMembers}
              onChange={setTeamMembers}
              onComplete={() => setCurrentStep('ai-topics')}
              onBack={() => setCurrentStep('requirements')}
              projectScenario="research"
              defaultTeamSize={researchRequirements.constraints.teamSize}
              helperText="Add your research advisor, collaborators, and team members who will work on this research project."
            />
          )}

          {currentStep === 'ai-topics' && researchRequirements && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <AITopicSuggestions
                projectType="research"
                context={{
                  research_area: researchRequirements.researchArea,
                  institution: researchRequirements.institution || 'Independent Research',
                  advisor_name: researchRequirements.advisorName || 'Not specified',
                  research_type: researchRequirements.researchType,
                  research_questions: researchRequirements.researchQuestions,
                  proposal_status: researchRequirements.proposalStatus,
                  duration_months: researchRequirements.durationMonths,
                  team_size: researchRequirements.constraints.teamSize,
                  funding_available: researchRequirements.constraints.fundingAvailable,
                  requires_ethics_approval: researchRequirements.constraints.requiresEthicsApproval,
                  required_methods: researchRequirements.constraints.requiredMethods.join(', '),
                }}
                onTopicSelected={(topic, topics, summary) => {
                  setSelectedTopic(topic);
                  setGeneratedTopics(topics);
                  setAnalysisSummary(summary || '');
                  setCurrentStep('research-plan');
                }}
                onBack={() => setCurrentStep('team')}
              />
            </div>
          )}

          {currentStep === 'research-plan' && selectedTopic && researchRequirements && (
            <ResearchPlanningGuide
              selectedTopic={selectedTopic}
              researchContext={{
                research_area: researchRequirements.researchArea,
                institution: researchRequirements.institution || '',
                advisor_name: researchRequirements.advisorName || 'Not specified',
                research_type: researchRequirements.researchType,
                research_questions: researchRequirements.researchQuestions,
                proposal_status: researchRequirements.proposalStatus,
                duration_months: researchRequirements.durationMonths,
                team_size: researchRequirements.constraints.teamSize,
                funding_available: researchRequirements.constraints.fundingAvailable,
                requires_ethics_approval: researchRequirements.constraints.requiresEthicsApproval,
                required_methods: researchRequirements.constraints.requiredMethods.join(', '),
                team_members: teamMembers.map(member => ({
                  name: member.name,
                  role: member.role,
                  email: member.email,
                  is_placeholder: member.isPlaceholder,
                  avatarUrl: member.avatarUrl,
                })),
              }}
              onComplete={(plan, fullElaboration) => {
                setResearchPlan(fullElaboration || plan);
                setCurrentStep('ai-details');
              }}
              onBack={() => setCurrentStep('ai-topics')}
              cachedPlan={researchPlan || undefined}
            />
          )}

          {currentStep === 'ai-details' && selectedTopic && (
            <AIProjectDetailsGenerator
              topicName={selectedTopic.name}
              topicDescription={selectedTopic.description || selectedTopic.tagline}
              projectType="research"
              onComplete={(details, board) => {
                setProjectDetails(details);
                setGeneratedBoard(board);
                setCurrentStep('preview');
              }}
              onBack={() => setCurrentStep('ai-topics')}
            />
          )}

          {currentStep === 'preview' && projectDetails && researchRequirements && (
            <div className="mt-6">
              <ReviewAndCreate
                projectDetails={{
                  name: projectDetails.selectedName,
                  description: projectDetails.description,
                  tags: projectDetails.tags,
                  scenario: 'research',
                  startDate: new Date().toISOString().split('T')[0],
                  deadline: undefined,
                  teamSize: teamMembers.length,
                  requirements: researchRequirements.researchQuestions,
                  objectives: researchPlan?.objectives,
                  milestones: researchPlan?.milestones,
                }}
                onCreate={handleSubmit}
                onBack={() => setCurrentStep('ai-details')}
                isCreating={isSubmitting}
                onEdit={(section) => {
                  if (section === 'details') setCurrentStep('ai-details');
                  else if (section === 'team') setCurrentStep('team');
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Start Over Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showStartOverConfirm}
        onClose={() => setShowStartOverConfirm(false)}
        onConfirm={handleStartOver}
        title="Start Over?"
        message="Are you sure you want to start over? All your progress in this project creation flow will be lost, including any AI-generated content and your selections."
        confirmText="Yes, Start Over"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
};

export default ResearchProjectFlow;
