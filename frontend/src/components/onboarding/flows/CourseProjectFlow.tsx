import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import CourseRequirementsInput, { CourseRequirements } from '../shared/CourseRequirementsInput';
import AITopicSuggestions, { ProjectTopic } from '../shared/AITopicSuggestions';
import TopicElaboration, { TopicElaboration as TopicElaborationType } from '../shared/TopicElaboration';
import AIProjectDetailsGenerator, { ProjectDetails } from '../shared/AIProjectDetailsGenerator';
import TeamSetup, { TeamMember } from '../shared/TeamSetup';
import ReviewAndCreate from '../shared/ReviewAndCreate';
import { GeneratedBoard } from '../shared/AIBoardPreview';
import UnifiedProgressBar from '../shared/UnifiedProgressBar';
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
  | 'requirements'      // Course requirements input (includes timeline)
  | 'team'              // Team setup
  | 'ai-topics'         // AI topic suggestions
  | 'ai-elaboration'    // Topic elaboration
  | 'ai-details'        // Project details generation
  | 'preview';          // Final review

interface CourseProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

interface CourseFlowState {
  currentStep: Step;
  visitedSteps: Step[];
  courseRequirements: CourseRequirements | null;
  generatedTopics: ProjectTopic[];
  analysisSummary: string;
  selectedTopic: ProjectTopic | null;
  topicElaboration: TopicElaborationType | null;
  projectDetails: ProjectDetails | null;
  generatedBoard: GeneratedBoard | null;
  teamMembers: TeamMember[];
}

/**
 * Course Project Flow - AI-Guided Progressive Creation
 *
 * Flow that starts from course requirements and uses AI to guide
 * the entire project creation process step by step.
 *
 * Flow: Requirements (with Timeline) → Team → Topics → Elaboration → Details → Preview
 */
const CourseProjectFlow: React.FC<CourseProjectFlowProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('requirements');
  const [visitedSteps, setVisitedSteps] = useState<Step[]>(['requirements']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State for each step
  const [courseRequirements, setCourseRequirements] = useState<CourseRequirements | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<ProjectTopic[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [topicElaboration, setTopicElaboration] = useState<TopicElaborationType | null>(null);
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
    const savedState = loadOnboardingData<CourseFlowState>('course');
    if (savedState) {
      setCurrentStep(savedState.currentStep);
      setVisitedSteps(savedState.visitedSteps || ['requirements']);
      setCourseRequirements(savedState.courseRequirements);
      setGeneratedTopics(savedState.generatedTopics || []);
      setAnalysisSummary(savedState.analysisSummary || '');
      setSelectedTopic(savedState.selectedTopic);
      setTopicElaboration(savedState.topicElaboration);
      setProjectDetails(savedState.projectDetails);
      setGeneratedBoard(savedState.generatedBoard);

      // Only load saved team members if they exist and are not empty
      // Otherwise keep the default initialization with current user
      if (savedState.teamMembers && savedState.teamMembers.length > 0) {
        setTeamMembers(savedState.teamMembers);
      }
    }

    // Also check URL for step parameter
    const { step } = getOnboardingParamsFromURL();
    if (step && savedState) {
      setCurrentStep(step as Step);
    }
  }, []);

  // Track visited steps whenever current step changes
  useEffect(() => {
    if (!visitedSteps.includes(currentStep)) {
      setVisitedSteps([...visitedSteps, currentStep]);
    }
  }, [currentStep]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: CourseFlowState = {
      currentStep,
      visitedSteps,
      courseRequirements,
      generatedTopics,
      analysisSummary,
      selectedTopic,
      topicElaboration,
      projectDetails,
      generatedBoard,
      teamMembers,
    };
    saveOnboardingData('course', currentStep, state);
  }, [
    currentStep,
    visitedSteps,
    courseRequirements,
    generatedTopics,
    analysisSummary,
    selectedTopic,
    topicElaboration,
    projectDetails,
    generatedBoard,
    teamMembers,
  ]);

  // Update URL when step changes
  useEffect(() => {
    updateOnboardingURL('course', currentStep);
  }, [currentStep]);

  const steps: { id: Step; label: string }[] = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'team', label: 'Team' },
    { id: 'ai-topics', label: 'Topics' },
    { id: 'ai-elaboration', label: 'Elaboration' },
    { id: 'ai-details', label: 'Details' },
    { id: 'preview', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleSubmit = async (coverImageUrl: string) => {
    if (!courseRequirements) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        project_scenario: 'course',
        name: projectDetails?.selectedName || courseRequirements.courseName,
        description: projectDetails?.description || courseRequirements.requirements,
        topic: projectDetails?.tags || [],
        location: 'Remote',
        start_date: courseRequirements.constraints.startDate,
        deadline: courseRequirements.constraints.deadline || undefined,
        duration_weeks: courseRequirements.constraints.durationWeeks,
        cover_image_url: coverImageUrl,
        team_members: teamMembers.map((member) => ({
          user_id: member.userId,
          is_placeholder: member.isPlaceholder,
          placeholder_name: member.isPlaceholder ? member.name : undefined,
          placeholder_email: member.isPlaceholder ? member.email : undefined,
          role: member.role,
        })),
        course_info: {
          course_name: courseRequirements.courseName,
          school: courseRequirements.school,
          class: courseRequirements.courseCode,
        },
        onboarding_metadata: {
          flow_version: '2.0',
          ai_guided: true,
          completion_time: new Date().toISOString(),
        },
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
      toast.success('Project created successfully!');

      // Clear saved data after successful project creation
      clearOnboardingData('course');

      onComplete(result.project.project_id, result.project.sid);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to start over? All progress will be lost.'
    );
    if (confirmed) {
      clearOnboardingData('course');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Start Over button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Create Course Project</h1>
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
        color="blue"
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
          {currentStep === 'requirements' && (
            <CourseRequirementsInput
              onComplete={(data) => {
                setCourseRequirements(data);
                setCurrentStep('team');
              }}
              onBack={onBack}
              cachedRequirements={courseRequirements || undefined}
            />
          )}

          {currentStep === 'team' && (
            <div>
              <TeamSetup members={teamMembers} onChange={setTeamMembers} />
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('requirements')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep('ai-topics')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {currentStep === 'ai-topics' && courseRequirements && (
            <AITopicSuggestions
              projectType="course"
              context={courseRequirements}
              cachedTopics={generatedTopics.length > 0 ? generatedTopics : undefined}
              cachedAnalysisSummary={analysisSummary || undefined}
              cachedSelectedTopicId={selectedTopic?.topic_id || null}
              onTopicsGenerated={(topics, summary) => {
                setGeneratedTopics(topics);
                setAnalysisSummary(summary);
              }}
              onTopicSelected={(topic, topics, summary) => {
                // Save topics and summary if provided
                if (topics) setGeneratedTopics(topics);
                if (summary) setAnalysisSummary(summary);

                if (topic === null) {
                  // User chose custom - skip AI elaboration and details, go directly to preview
                  setCurrentStep('preview');
                } else {
                  setSelectedTopic(topic);
                  setCurrentStep('ai-elaboration');
                }
              }}
              onBack={() => setCurrentStep('team')}
            />
          )}

          {currentStep === 'ai-elaboration' && selectedTopic && courseRequirements && (
            <TopicElaboration
              selectedTopic={selectedTopic}
              courseContext={courseRequirements}
              cachedElaboration={topicElaboration || undefined}
              projectType="course"
              teamMembers={teamMembers.map(m => ({ name: m.name, role: m.role }))}
              onElaborationLoaded={(elaboration) => {
                // Save elaboration immediately when loaded (from cache or API)
                setTopicElaboration(elaboration);
              }}
              onComplete={(elaboration) => {
                setTopicElaboration(elaboration);
                setCurrentStep('ai-details');
              }}
              onBack={() => setCurrentStep('ai-topics')}
            />
          )}

          {currentStep === 'ai-details' && topicElaboration && selectedTopic && (
            <AIProjectDetailsGenerator
              topicElaboration={topicElaboration}
              topicName={selectedTopic.name}
              cachedDetails={projectDetails || undefined}
              onComplete={(details) => {
                setProjectDetails(details);
                setCurrentStep('preview');
              }}
              onBack={() => setCurrentStep('ai-elaboration')}
            />
          )}

          {currentStep === 'preview' && courseRequirements && (
            <div>
              <ReviewAndCreate
                projectDetails={{
                  name: projectDetails?.selectedName || courseRequirements.courseName,
                  description: projectDetails?.description || courseRequirements.requirements,
                  tags: projectDetails?.tags || [],
                  scenario: 'course',
                  startDate: courseRequirements.constraints.startDate,
                  deadline: courseRequirements.constraints.deadline,
                  teamSize: teamMembers.length || courseRequirements.constraints.teamSize,
                  requirements: courseRequirements.requirements,
                  objectives: topicElaboration?.objectives,
                  milestones: topicElaboration?.milestones || [],
                }}
                onEdit={(section) => {
                  if (section === 'details') setCurrentStep('ai-details');
                  if (section === 'requirements') setCurrentStep('requirements');
                  if (section === 'timeline') setCurrentStep('requirements');
                  if (section === 'team') setCurrentStep('team');
                }}
                onCreate={handleSubmit}
                onBack={() => {
                  // If user went through AI flow, go back to AI topics
                  // If user chose custom, also go back to AI topics to allow changing selection
                  setCurrentStep('ai-topics');
                }}
                isCreating={isSubmitting}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CourseProjectFlow;
