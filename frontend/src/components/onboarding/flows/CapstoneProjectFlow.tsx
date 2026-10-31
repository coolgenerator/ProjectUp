import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CapstoneRequirementsInput, { CapstoneRequirements } from '../shared/CapstoneRequirementsInput';
import UnifiedAITopicSuggestions, { ProjectTopic } from '../shared/UnifiedAITopicSuggestions';
import { TopicElaboration as TopicElaborationType } from '../shared/TopicElaboration';
import { ProjectDetails } from '../shared/AIProjectDetailsGenerator';
import TimelineSetup, { Timeline } from '../shared/TimelineSetup';
import TeamSetup, { TeamMember } from '../shared/TeamSetup';
import ProjectPreview from '../shared/ProjectPreview';
import { GeneratedBoard } from '../shared/AIBoardPreview';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { elaborateTopic, generateProjectDetails } from '../../../api/onboardingAPI';

type Step =
  | 'requirements'
  | 'ai-topics'
  | 'ai-elaboration'
  | 'ai-details'
  | 'ai-plan'
  | 'timeline'
  | 'team'
  | 'preview';

interface CapstoneProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

/**
 * Capstone Project Flow V2 - AI-Guided Progressive Creation
 *
 * For graduation/final year capstone projects with academic rigor
 */
const CapstoneProjectFlow: React.FC<CapstoneProjectFlowProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('requirements');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isElaborating, setIsElaborating] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

  // State for each step
  const [capstoneRequirements, setCapstoneRequirements] = useState<CapstoneRequirements | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [topicElaboration, setTopicElaboration] = useState<TopicElaborationType | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [timeline, setTimeline] = useState<Timeline>({
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    durationWeeks: 24, // 6 months default
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const steps: { id: Step; label: string }[] = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'ai-topics', label: 'AI Topics' },
    { id: 'ai-elaboration', label: 'Elaboration' },
    { id: 'ai-details', label: 'Details' },
    { id: 'ai-plan', label: 'AI Plan' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'team', label: 'Team' },
    { id: 'preview', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleElaborateTopic = async (topic: ProjectTopic) => {
    if (!capstoneRequirements) return;

    setSelectedTopic(topic);
    setIsElaborating(true);

    try {
      const elaboration = await elaborateTopic('capstone', topic, {
        major: capstoneRequirements.major,
        school: capstoneRequirements.school,
        advisor_name: capstoneRequirements.advisorName,
        research_area: capstoneRequirements.researchArea,
        duration_months: capstoneRequirements.durationMonths,
        defense_requirements: capstoneRequirements.defenseRequirements,
        constraints: capstoneRequirements.constraints,
      });

      setTopicElaboration(elaboration);
      setCurrentStep('ai-elaboration');
    } catch (error) {
      console.error('Failed to elaborate topic:', error);
      toast.error('Failed to elaborate topic');
    } finally {
      setIsElaborating(false);
    }
  };

  const handleGenerateDetails = async () => {
    if (!topicElaboration || !selectedTopic) return;

    setIsGeneratingDetails(true);
    setCurrentStep('ai-details');

    try {
      const details = await generateProjectDetails('capstone', topicElaboration);

      setProjectDetails({
        selectedName: details.name_options[0]?.name || selectedTopic.name,
        description: details.description,
        tags: details.tags,
      });

      // Move to plan generation
      await handleGenerateFullPlan();
    } catch (error) {
      console.error('Failed to generate details:', error);
      toast.error('Failed to generate project details');
      setCurrentStep('ai-elaboration');
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleGenerateFullPlan = async () => {
    if (!projectDetails || !topicElaboration || !selectedTopic || !capstoneRequirements) {
      toast.error('Missing project information');
      return;
    }

    setCurrentStep('ai-plan');

    try {
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/projects/board/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_scenario: 'capstone',
            user_inputs: {
              name: projectDetails.selectedName,
              description: projectDetails.description,
              topics: projectDetails.tags,
              duration_weeks: Math.ceil(capstoneRequirements.durationMonths * 4.33),
              team_size: capstoneRequirements.constraints.teamSize,
            },
            guided_answers: [
              {
                question_id: 'elaboration',
                answer: topicElaboration,
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate project plan');
      }

      const data = await response.json();
      setGeneratedBoard(data.board);

      // Pre-fill timeline
      if (capstoneRequirements.durationMonths) {
        setTimeline({
          ...timeline,
          durationWeeks: Math.ceil(capstoneRequirements.durationMonths * 4.33),
        });
      }

      setCurrentStep('timeline');
    } catch (error) {
      console.error('Failed to generate project plan:', error);
      toast.error('Failed to generate project plan');
      setCurrentStep('ai-details');
    }
  };

  const handleSubmit = async () => {
    if (!projectDetails || !capstoneRequirements) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        project_scenario: 'capstone',
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
        capstone_info: {
          major: capstoneRequirements.major,
          school: capstoneRequirements.school,
          advisor_name: capstoneRequirements.advisorName,
          research_area: capstoneRequirements.researchArea,
        },
        onboarding_metadata: {
          flow_version: '2.0',
          has_ai_board: !!generatedBoard,
          ai_guided: true,
          completion_time: new Date().toISOString(),
        },
      };

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
      toast.success('Capstone project created successfully!');
      onComplete(result.project.project_id, result.project.sid);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index < currentStepIndex
                      ? 'bg-purple-600 text-white'
                      : index === currentStepIndex
                      ? 'bg-purple-600 text-white ring-4 ring-purple-200'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    index <= currentStepIndex ? 'text-purple-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
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
            <CapstoneRequirementsInput
              onComplete={(data) => {
                setCapstoneRequirements(data);
                setCurrentStep('ai-topics');
              }}
              onBack={onBack}
            />
          )}

          {currentStep === 'ai-topics' && capstoneRequirements && (
            <UnifiedAITopicSuggestions
              projectType="capstone"
              context={{
                major: capstoneRequirements.major,
                school: capstoneRequirements.school,
                research_area: capstoneRequirements.researchArea,
                duration_months: capstoneRequirements.durationMonths,
                defense_requirements: capstoneRequirements.defenseRequirements,
                constraints: capstoneRequirements.constraints,
              }}
              onTopicSelected={(topic) => topic && handleElaborateTopic(topic)}
              onBack={() => setCurrentStep('requirements')}
            />
          )}

          {currentStep === 'ai-elaboration' && topicElaboration && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold mb-4">Topic Elaboration Complete</h2>
                <p className="text-gray-600 mb-6">
                  AI has generated a detailed plan for your capstone project. Click continue to generate project details.
                </p>
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('ai-topics')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleGenerateDetails}
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {(currentStep === 'ai-details' || currentStep === 'ai-plan') && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 border-8 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentStep === 'ai-details' ? 'Generating Project Details...' : 'Creating Project Plan...'}
              </h3>
              <p className="text-gray-600">Please wait while AI processes your project</p>
            </div>
          )}

          {currentStep === 'timeline' && (
            <TimelineSetup
              timeline={timeline}
              onChange={setTimeline}
              onComplete={() => setCurrentStep('team')}
              onBack={() => setCurrentStep('ai-topics')}
            />
          )}

          {currentStep === 'team' && (
            <TeamSetup
              teamMembers={teamMembers}
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

export default CapstoneProjectFlow;
