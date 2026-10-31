import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HackathonRequirementsInput, { HackathonRequirements } from '../shared/HackathonRequirementsInput';
import { ProjectTopic } from '../shared/AITopicSuggestions';
import { TopicElaboration as TopicElaborationType } from '../shared/TopicElaboration';
import { ProjectDetails } from '../shared/AIProjectDetailsGenerator';
import TimelineSetup, { Timeline } from '../shared/TimelineSetup';
import TeamSetup, { TeamMember } from '../shared/TeamSetup';
import ReviewAndCreate from '../shared/ReviewAndCreate';
import { GeneratedBoard } from '../shared/AIBoardPreview';
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

// Hackathon-specific Topic Suggestions component
import HackathonTopicSuggestions from './HackathonTopicSuggestions';
import HackathonTopicElaboration from './HackathonTopicElaboration';
import HackathonProjectDetails from './HackathonProjectDetails';

type Step =
  | 'requirements'      // Hackathon requirements input
  | 'ai-topics'         // AI topic suggestions
  | 'ai-elaboration'    // Topic elaboration with time breakdown
  | 'ai-details'        // Project details generation
  | 'ai-plan'           // Full project plan generation
  | 'timeline'          // Timeline setup (hours-based)
  | 'team'              // Team setup
  | 'preview';          // Final review

interface HackathonProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

interface HackathonFlowState {
  currentStep: Step;
  hackathonRequirements: HackathonRequirements | null;
  selectedTopic: ProjectTopic | null;
  topicElaboration: TopicElaborationType | null;
  projectDetails: ProjectDetails | null;
  generatedBoard: GeneratedBoard | null;
  timeline: Timeline;
  teamMembers: TeamMember[];
}

/**
 * Hackathon Project Flow - AI-Guided Rapid Prototyping
 *
 * Optimized for extreme time pressure (24-48 hours)
 * Focus: Demo > Product, Speed > Quality
 *
 * Flow: Requirements → Topics → Elaboration → Details → Plan → Timeline → Team → Preview
 */
const HackathonProjectFlow: React.FC<HackathonProjectFlowProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('requirements');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for each step
  const [hackathonRequirements, setHackathonRequirements] = useState<HackathonRequirements | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ProjectTopic | null>(null);
  const [topicElaboration, setTopicElaboration] = useState<TopicElaborationType | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [timeline, setTimeline] = useState<Timeline>({
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    durationWeeks: 1, // Hackathons are typically days, not weeks
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = loadOnboardingData<HackathonFlowState>('hackathon');
    if (savedState) {
      setCurrentStep(savedState.currentStep);
      setHackathonRequirements(savedState.hackathonRequirements);
      setSelectedTopic(savedState.selectedTopic);
      setTopicElaboration(savedState.topicElaboration);
      setProjectDetails(savedState.projectDetails);
      setGeneratedBoard(savedState.generatedBoard);
      setTimeline(savedState.timeline);
      setTeamMembers(savedState.teamMembers);
    }

    // Also check URL for step parameter
    const { step } = getOnboardingParamsFromURL();
    if (step && savedState) {
      setCurrentStep(step as Step);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: HackathonFlowState = {
      currentStep,
      hackathonRequirements,
      selectedTopic,
      topicElaboration,
      projectDetails,
      generatedBoard,
      timeline,
      teamMembers,
    };
    saveOnboardingData('hackathon', currentStep, state);
  }, [
    currentStep,
    hackathonRequirements,
    selectedTopic,
    topicElaboration,
    projectDetails,
    generatedBoard,
    timeline,
    teamMembers,
  ]);

  // Update URL when step changes
  useEffect(() => {
    updateOnboardingURL('hackathon', currentStep);
  }, [currentStep]);

  const steps: { id: Step; label: string }[] = [
    { id: 'requirements', label: '黑客松信息' },
    { id: 'ai-topics', label: 'AI创意' },
    { id: 'ai-elaboration', label: '详细规划' },
    { id: 'ai-details', label: '项目详情' },
    { id: 'ai-plan', label: 'AI计划' },
    { id: 'timeline', label: '时间线' },
    { id: 'team', label: '团队' },
    { id: 'preview', label: '确认' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleGenerateFullPlan = async () => {
    if (!projectDetails || !topicElaboration || !selectedTopic) {
      toast.error('Missing project information');
      return;
    }

    setCurrentStep('ai-plan');

    try {
      // Generate full project board using existing endpoint
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/projects/board/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_scenario: 'hackathon',
            user_inputs: {
              name: projectDetails.selectedName,
              description: projectDetails.description,
              topics: projectDetails.tags,
              duration_hours: hackathonRequirements?.durationHours || 24,
              team_size: hackathonRequirements?.teamSize || 3,
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

      // Set timeline based on hackathon duration
      if (hackathonRequirements) {
        const durationDays = Math.ceil(hackathonRequirements.durationHours / 24);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        setTimeline({
          startDate: new Date().toISOString().split('T')[0],
          deadline: endDate.toISOString().split('T')[0],
          durationWeeks: Math.max(1, Math.ceil(durationDays / 7)),
        });
      }

      setCurrentStep('timeline');
    } catch (error) {
      console.error('Failed to generate project plan:', error);
      toast.error('Failed to generate project plan');
      setCurrentStep('ai-details');
    }
  };

  const handleSubmit = async (coverImageUrl: string) => {
    if (!projectDetails || !hackathonRequirements) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        project_scenario: 'hackathon',
        name: projectDetails.selectedName,
        description: projectDetails.description,
        topic: projectDetails.tags,
        location: 'Remote',
        start_date: timeline.startDate,
        deadline: timeline.deadline || undefined,
        duration_weeks: timeline.durationWeeks,
        cover_image_url: coverImageUrl,
        team_members: teamMembers.map((member) => ({
          user_id: member.userId,
          is_placeholder: member.isPlaceholder,
          placeholder_name: member.isPlaceholder ? member.name : undefined,
          placeholder_email: member.isPlaceholder ? member.email : undefined,
          role: member.role,
        })),
        hackathon_info: {
          hackathon_name: hackathonRequirements.hackathonName,
          hackathon_type: hackathonRequirements.hackathonType,
          duration_hours: hackathonRequirements.durationHours,
          theme: hackathonRequirements.theme,
          team_skills: hackathonRequirements.teamSkills,
        },
        onboarding_metadata: {
          flow_version: '2.0',
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
      toast.success('Hackathon project created successfully! 🚀');

      // Clear saved data after successful project creation
      clearOnboardingData('hackathon');

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
              <div className="flex flex-col items-center" style={{ flex: index === steps.length - 1 ? '0' : '1' }}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    index <= currentStepIndex
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`text-xs mt-1 text-center whitespace-nowrap ${
                    index <= currentStepIndex ? 'text-orange-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 mx-2 rounded transition-all`}
                  style={{
                    flex: '1',
                    background: index < currentStepIndex
                      ? 'linear-gradient(to right, #ea580c, #dc2626)'
                      : '#e5e7eb',
                  }}
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
            <HackathonRequirementsInput
              onComplete={(data) => {
                setHackathonRequirements(data);
                setCurrentStep('ai-topics');
              }}
              onBack={onBack}
            />
          )}

          {currentStep === 'ai-topics' && hackathonRequirements && (
            <HackathonTopicSuggestions
              hackathonRequirements={hackathonRequirements}
              onTopicSelected={(topic) => {
                if (topic === null) {
                  // User chose custom - skip AI steps
                  setCurrentStep('timeline');
                } else {
                  setSelectedTopic(topic);
                  setCurrentStep('ai-elaboration');
                }
              }}
              onBack={() => setCurrentStep('requirements')}
            />
          )}

          {currentStep === 'ai-elaboration' && selectedTopic && hackathonRequirements && (
            <HackathonTopicElaboration
              selectedTopic={selectedTopic}
              hackathonContext={hackathonRequirements}
              onComplete={(elaboration) => {
                setTopicElaboration(elaboration);
                setCurrentStep('ai-details');
              }}
              onBack={() => setCurrentStep('ai-topics')}
            />
          )}

          {currentStep === 'ai-details' && topicElaboration && selectedTopic && (
            <HackathonProjectDetails
              topicElaboration={topicElaboration}
              topicName={selectedTopic.name}
              onComplete={(details) => {
                setProjectDetails(details);
                handleGenerateFullPlan();
              }}
              onBack={() => setCurrentStep('ai-elaboration')}
            />
          )}

          {currentStep === 'ai-plan' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-24 h-24 border-8 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-6">正在生成黑客松冲刺计划...</h3>
              <p className="text-gray-600 mt-2">按小时分配任务，优化Demo效果</p>
              <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
                <p>⚡ 制定快速原型策略</p>
                <p>🎯 规划Demo演示流程</p>
                <p>⏰ 分配时间关键点</p>
                <p>🔥 识别技术风险点</p>
              </div>
            </div>
          )}

          {currentStep === 'timeline' && (
            <div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-orange-900">
                    <p className="font-medium">黑客松时间规划</p>
                    <p>建议时长：{hackathonRequirements?.durationHours || 24}小时 ({Math.ceil((hackathonRequirements?.durationHours || 24) / 24)}天)</p>
                  </div>
                </div>
              </div>
              <TimelineSetup data={timeline} onChange={setTimeline} />
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('ai-details')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← 返回
                </button>
                <button
                  onClick={() => setCurrentStep('team')}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700"
                >
                  下一步 →
                </button>
              </div>
            </div>
          )}

          {currentStep === 'team' && (
            <div>
              <TeamSetup members={teamMembers} onChange={setTeamMembers} />
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('timeline')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← 返回
                </button>
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700"
                >
                  下一步 →
                </button>
              </div>
            </div>
          )}

          {currentStep === 'preview' && projectDetails && hackathonRequirements && (
            <ReviewAndCreate
              projectDetails={{
                name: projectDetails.selectedName,
                description: projectDetails.description,
                tags: projectDetails.tags,
                scenario: 'hackathon',
                startDate: timeline.startDate,
                deadline: timeline.deadline,
                teamSize: teamMembers.length || hackathonRequirements.teamSize,
                requirements: hackathonRequirements.theme,
                objectives: topicElaboration?.objectives,
                milestones: topicElaboration?.milestones || (generatedBoard?.milestones || []),
              }}
              onEdit={(section) => {
                if (section === 'details') setCurrentStep('ai-details');
                if (section === 'requirements') setCurrentStep('requirements');
                if (section === 'timeline') setCurrentStep('timeline');
                if (section === 'team') setCurrentStep('team');
              }}
              onCreate={handleSubmit}
              onBack={() => setCurrentStep('team')}
              isCreating={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default HackathonProjectFlow;
