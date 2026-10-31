import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { ProjectTopic } from './AITopicSuggestions';
import { CourseRequirements } from './CourseRequirementsInput';

export interface TopicElaboration {
  background: {
    problem: string;
    value: string;
    target_users: string;
  };
  objectives: {
    primary: string[];
    secondary: string[];
    learning: string[];
  };
  core_features: Array<{
    name: string;
    description: string;
    importance: string;
    implementation_notes: string;
  }>;
  enhanced_features: Array<{
    name: string;
    description: string;
    priority: string;
    value: string;
  }>;
  technical_architecture: {
    frontend: {
      stack: string[];
      rationale: string;
    };
    backend: {
      stack: string[];
      rationale: string;
    };
    database: {
      choice: string;
      rationale: string;
    };
    other_tools: string[];
    architecture_description: string;
  };
  milestones: Array<{
    phase: string;
    duration_weeks: number;
    goals: string[];
    deliverables: string[];
    tasks?: Array<{
      name: string;
      description: string;
      estimated_hours: number;
      start_date?: string;
      due_date?: string;
      assigned_to?: string;
      dependencies?: string[];
      priority: 'low' | 'medium' | 'high';
      subtasks?: Array<{
        name: string;
        estimated_hours: number;
        assigned_to?: string;
      }>;
    }>;
  }>;
  success_criteria: {
    functional: string[];
    code_quality: string[];
    user_experience: string[];
    grading: string[];
  };
  challenges_and_risks: Array<{
    challenge: string;
    category: string;
    mitigation: string;
  }>;
}

// Section configuration for different project types
export interface ElaborationConfig {
  sections: {
    background?: boolean;
    objectives?: boolean;
    core_features?: boolean;
    enhanced_features?: boolean;
    architecture?: boolean;
    milestones?: boolean;
    success_criteria?: boolean;
    challenges?: boolean;
  };
  mode: 'quick' | 'standard' | 'detailed';
}

// Preset configurations for different project types
export const ELABORATION_PRESETS: Record<string, ElaborationConfig> = {
  course: {
    mode: 'quick',
    sections: {
      background: true,
      core_features: true,
      milestones: true,
      // Skip: objectives, enhanced_features, architecture, success_criteria, challenges
    }
  },
  hackathon: {
    mode: 'quick',
    sections: {
      background: true,
      core_features: true,
      milestones: true,
    }
  },
  capstone: {
    mode: 'standard',
    sections: {
      background: true,
      objectives: true,
      core_features: true,
      architecture: true,
      milestones: true,
      success_criteria: true,
      challenges: true,
      // Skip: enhanced_features (optional extras not needed for academic)
    }
  },
  research: {
    mode: 'quick',
    sections: {
      // Research projects have different structure - just show milestones for now
      milestones: true,
    }
  },
  industry: {
    mode: 'detailed',
    sections: {
      background: true,
      objectives: true,
      core_features: true,
      enhanced_features: true,
      architecture: true,
      milestones: true,
      success_criteria: true,
      challenges: true,
    }
  },
  default: {
    mode: 'standard',
    sections: {
      background: true,
      core_features: true,
      milestones: true,
      challenges: true,
    }
  }
};

interface TopicElaborationProps {
  selectedTopic: ProjectTopic;
  courseContext: CourseRequirements;
  onComplete: (elaboration: TopicElaboration) => void;
  onBack: () => void;
  cachedElaboration?: TopicElaboration;
  projectType?: string; // 'course', 'hackathon', 'capstone', etc.
  config?: ElaborationConfig; // Custom config (overrides preset)
  onElaborationLoaded?: (elaboration: TopicElaboration) => void; // Callback when elaboration is loaded
  teamMembers?: Array<{ name: string; role: string }>; // Optional team member info for task assignment
}

/**
 * Topic Elaboration - Step 3 of AI-Guided Project Creation
 *
 * Unified component that adapts to different project types:
 * - Course/Hackathon: Quick mode (background, features, milestones)
 * - Capstone/Research: Standard mode (adds objectives, architecture, criteria)
 * - Industry: Detailed mode (all sections including enhanced features)
 */
const TopicElaboration: React.FC<TopicElaborationProps> = ({
  selectedTopic,
  courseContext,
  onComplete,
  onBack,
  cachedElaboration,
  projectType = 'course',
  config,
  onElaborationLoaded,
  teamMembers,
}) => {
  // Get configuration (custom config or preset based on project type)
  const elaborationConfig = config || ELABORATION_PRESETS[projectType] || ELABORATION_PRESETS.default;

  const [elaboration, setElaboration] = useState<TopicElaboration | null>(cachedElaboration || null);
  const [isLoading, setIsLoading] = useState(!cachedElaboration);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Auto-expand visible sections by default
  const getDefaultExpandedSections = () => {
    const sections: string[] = [];
    if (elaborationConfig.sections.background) sections.push('background');
    if (elaborationConfig.sections.core_features) sections.push('core_features');
    if (elaborationConfig.sections.milestones) sections.push('milestones');
    return new Set(sections);
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(getDefaultExpandedSections());

  // AI Refinement states
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineSectionName, setRefineSectionName] = useState<string>('');
  const [refineRequest, setRefineRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    // Only load if we don't have cached data
    if (!cachedElaboration) {
      loadElaboration();
    } else {
      // If we have cached data, notify parent immediately
      if (onElaborationLoaded) {
        onElaborationLoaded(cachedElaboration);
      }
    }
  }, [cachedElaboration]);

  const loadElaboration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { elaborateTopic } = await import('../../../api/onboardingAPI');

      // Build context - just pass courseContext as-is since it already has the right structure
      const context: any = { ...courseContext };

      // Add team member information if available
      if (teamMembers && teamMembers.length > 0) {
        context.team_members = teamMembers.map(m => `${m.name} (${m.role})`).join(', ');
      }

      // Add start date and deadline if available (with safety check for constraints)
      if (courseContext.constraints) {
        if (courseContext.constraints.startDate) {
          context.start_date = courseContext.constraints.startDate;
        }
        if (courseContext.constraints.deadline) {
          context.deadline = courseContext.constraints.deadline;
        }
      }

      const data = await elaborateTopic(projectType, selectedTopic, context);

      setElaboration(data);

      // Notify parent that elaboration has been loaded
      if (onElaborationLoaded) {
        onElaborationLoaded(data);
      }
    } catch (error) {
      console.error('Failed to load elaboration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load elaboration');
      toast.error('Failed to elaborate on topic');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleRegenerate = () => {
    // Clear elaboration and regenerate
    setElaboration(null);
    loadElaboration();
    toast.success('Regenerating elaboration...');
  };

  const handleOpenRefineDialog = (sectionName: string) => {
    setRefineSectionName(sectionName);
    setRefineRequest('');
    setShowRefineDialog(true);
  };

  const handleApplyRefinement = async () => {
    if (!elaboration || !refineRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsRefining(true);
    setShowRefineDialog(false);

    try {
      // Build modification request based on section
      const modificationRequest = `For the ${refineSectionName} section: ${refineRequest}. Keep all other sections (background, features, architecture, milestones, success criteria, risks) exactly the same. Only update the ${refineSectionName} section as requested.`;

      // Use refine endpoint (we'll need to add elaboration refinement to backend)
      const response = await fetch(`${config.AI_AGENT_URL}/onboarding/course/refine-elaboration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: courseContext.courseName,
          school: courseContext.school,
          course_code: courseContext.courseCode,
          requirements: courseContext.requirements,
          constraints: courseContext.constraints,
          selected_topic: selectedTopic,
          base_elaboration: elaboration,
          section: refineSectionName,
          modification_request: modificationRequest,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refine elaboration');
      }

      const refinedElaboration = await response.json();
      setElaboration(refinedElaboration);
      toast.success(`${refineSectionName} section updated with AI!`);
      setRefineRequest('');

      // Notify parent of the updated elaboration
      if (onElaborationLoaded) {
        onElaborationLoaded(refinedElaboration);
      }
    } catch (error) {
      console.error('Failed to refine elaboration:', error);
      toast.error('Failed to refine. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI is Elaborating Your Project...</h3>
        <p className="text-gray-600 mt-2">Creating detailed implementation plan</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>📋 Defining features and requirements</p>
          <p>🏗️ Planning architecture</p>
          <p>🎯 Setting milestones and deliverables</p>
        </div>
      </div>
    );
  }

  if (error || !elaboration) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Elaborate Topic</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← Go Back
            </button>
            <button onClick={loadElaboration} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-8 text-white mb-6">
        <h2 className="text-3xl font-bold mb-2">{selectedTopic.name}</h2>
        <p className="text-indigo-100 text-lg">{selectedTopic.tagline}</p>
        <div className="flex items-center space-x-4 mt-4 text-sm">
          <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
            {selectedTopic.difficulty.charAt(0).toUpperCase() + selectedTopic.difficulty.slice(1)}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ~{selectedTopic.estimated_weeks} weeks
          </span>
        </div>
      </div>

      {/* Elaboration Sections */}
      <div className="space-y-4">
        {/* Background */}
        {elaborationConfig.sections.background && elaboration.background && (
        <CollapsibleSection
          title="Project Background"
          icon="📖"
          isExpanded={expandedSections.has('background')}
          onToggle={() => toggleSection('background')}
          onRefine={() => handleOpenRefineDialog('background')}
          isRefining={isRefining && refineSectionName === 'background'}
        >
          <div className="space-y-4">
            {elaboration.background.problem && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Problem Statement</h4>
                <p className="text-gray-700">{elaboration.background.problem}</p>
              </div>
            )}
            {elaboration.background.value && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Value Proposition</h4>
                <p className="text-gray-700">{elaboration.background.value}</p>
              </div>
            )}
            {elaboration.background.target_users && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Target Users</h4>
                <p className="text-gray-700">{elaboration.background.target_users}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
        )}

        {/* Objectives */}
        {elaborationConfig.sections.objectives && elaboration.objectives && (
        <CollapsibleSection
          title="Project Objectives"
          icon="🎯"
          isExpanded={expandedSections.has('objectives')}
          onToggle={() => toggleSection('objectives')}
          onRefine={() => handleOpenRefineDialog('objectives')}
          isRefining={isRefining && refineSectionName === 'objectives'}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {elaboration.objectives.primary && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Primary Goals</h4>
                <ul className="space-y-1">
                  {elaboration.objectives.primary.map((goal, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start">
                      <span className="text-indigo-600 mr-2">✓</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {elaboration.objectives.secondary && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Secondary Goals</h4>
                <ul className="space-y-1">
                  {elaboration.objectives.secondary.map((goal, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start">
                      <span className="text-purple-600 mr-2">○</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {elaboration.objectives.learning && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Learning Objectives</h4>
                <ul className="space-y-1">
                  {elaboration.objectives.learning.map((goal, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start">
                      <span className="text-blue-600 mr-2">📚</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
        )}

        {/* Core Features */}
        {elaborationConfig.sections.core_features && elaboration.core_features && (
        <CollapsibleSection
          title="Core Features (MVP)"
          icon="⭐"
          isExpanded={expandedSections.has('core_features')}
          onToggle={() => toggleSection('core_features')}
          onRefine={() => handleOpenRefineDialog('core_features')}
          isRefining={isRefining && refineSectionName === 'core_features'}
        >
          <div className="space-y-4">
            {elaboration.core_features.map((feature, i) => (
              <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{feature.name}</h4>
                <p className="text-sm text-gray-700 mb-2">{feature.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Why Important:</span>
                    <p className="text-gray-600 mt-1">{feature.importance}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Implementation Notes:</span>
                    <p className="text-gray-600 mt-1">{feature.implementation_notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        )}

        {/* Enhanced Features */}
        {elaborationConfig.sections.enhanced_features && elaboration.enhanced_features && (
        <CollapsibleSection
          title="Enhanced Features (Optional)"
          icon="✨"
          isExpanded={expandedSections.has('enhanced_features')}
          onToggle={() => toggleSection('enhanced_features')}
          onRefine={() => handleOpenRefineDialog('enhanced_features')}
          isRefining={isRefining && refineSectionName === 'enhanced_features'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {elaboration.enhanced_features.map((feature, i) => (
              <div key={i} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      feature.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : feature.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {feature.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{feature.description}</p>
                <p className="text-xs text-purple-800">
                  <span className="font-medium">Value:</span> {feature.value}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        )}

        {/* Technical Architecture */}
        {elaborationConfig.sections.architecture && elaboration.architecture && (
        <CollapsibleSection
          title="Technical Architecture"
          icon="🏗️"
          isExpanded={expandedSections.has('architecture')}
          onToggle={() => toggleSection('architecture')}
          onRefine={() => handleOpenRefineDialog('architecture')}
          isRefining={isRefining && refineSectionName === 'architecture'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Frontend</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {elaboration.technical_architecture.frontend.stack.map((tech) => (
                    <span key={tech} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{elaboration.technical_architecture.frontend.rationale}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Backend</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {elaboration.technical_architecture.backend.stack.map((tech) => (
                    <span key={tech} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{elaboration.technical_architecture.backend.rationale}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Database: {elaboration.technical_architecture.database.choice}
              </h4>
              <p className="text-sm text-gray-700">{elaboration.technical_architecture.database.rationale}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Other Tools & Services</h4>
              <div className="flex flex-wrap gap-2">
                {elaboration.technical_architecture.other_tools.map((tool) => (
                  <span key={tool} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Architecture Overview</h4>
              <p className="text-sm text-gray-700">{elaboration.technical_architecture.architecture_description}</p>
            </div>
          </div>
        </CollapsibleSection>
        )}

        {/* Milestones */}
        {elaborationConfig.sections.milestones && elaboration.milestones && (
        <CollapsibleSection
          title="Project Milestones"
          icon="🎯"
          isExpanded={expandedSections.has('milestones')}
          onToggle={() => toggleSection('milestones')}
          onRefine={() => handleOpenRefineDialog('milestones')}
          isRefining={isRefining && refineSectionName === 'milestones'}
        >
          <div className="space-y-4">
            {elaboration.milestones.map((milestone, i) => (
              <div key={i} className="bg-indigo-50 border-l-4 border-indigo-600 p-5 rounded-r-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 text-lg">{milestone.phase}</h4>
                  <span className="text-sm text-indigo-600 font-medium bg-indigo-100 px-3 py-1 rounded-full">{milestone.duration_weeks} weeks</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Goals:</p>
                    <ul className="space-y-1">
                      {milestone.goals.map((goal, j) => (
                        <li key={j} className="text-sm text-gray-600 flex items-start">
                          <span className="text-indigo-600 mr-1">•</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Deliverables:</p>
                    <ul className="space-y-1">
                      {milestone.deliverables.map((deliverable, j) => (
                        <li key={j} className="text-sm text-gray-600 flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tasks Section */}
                {milestone.tasks && milestone.tasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-indigo-200">
                    <p className="text-sm font-semibold text-gray-800 mb-3">📋 Tasks:</p>
                    <div className="space-y-3">
                      {milestone.tasks.map((task, taskIdx) => (
                        <div key={taskIdx} className="bg-white border border-indigo-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="font-medium text-gray-900">{task.name}</h5>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-xs text-gray-500">{task.estimated_hours}h</p>
                              {task.assigned_to && (
                                <p className="text-xs text-indigo-600 font-medium mt-1">👤 {task.assigned_to}</p>
                              )}
                            </div>
                          </div>

                          {/* Task Dates */}
                          {(task.start_date || task.due_date) && (
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                              {task.start_date && <span>📅 Start: {new Date(task.start_date).toLocaleDateString()}</span>}
                              {task.due_date && <span>⏰ Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                            </div>
                          )}

                          {/* Dependencies */}
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex items-center space-x-2 text-xs mb-2">
                              <span className="text-gray-600 font-medium">🔗 Depends on:</span>
                              <div className="flex flex-wrap gap-1">
                                {task.dependencies.map((dep, depIdx) => (
                                  <span key={depIdx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Subtasks */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-1">Subtasks:</p>
                              <ul className="space-y-1">
                                {task.subtasks.map((subtask, subIdx) => (
                                  <li key={subIdx} className="text-xs text-gray-600 flex items-center justify-between">
                                    <span className="flex items-center">
                                      <span className="text-gray-400 mr-1">▪</span>
                                      {subtask.name}
                                    </span>
                                    <span className="text-gray-500 ml-2">
                                      {subtask.estimated_hours}h
                                      {subtask.assigned_to && <span className="text-indigo-600 ml-1">• {subtask.assigned_to}</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
        )}

        {/* Success Criteria */}
        {elaborationConfig.sections.success_criteria && elaboration.success_criteria && (
        <CollapsibleSection
          title="Success Criteria"
          icon="✅"
          isExpanded={expandedSections.has('success')}
          onToggle={() => toggleSection('success')}
          onRefine={() => handleOpenRefineDialog('success')}
          isRefining={isRefining && refineSectionName === 'success'}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Functional</h4>
              <ul className="space-y-1">
                {elaboration.success_criteria.functional.map((criterion, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Code Quality</h4>
              <ul className="space-y-1">
                {elaboration.success_criteria.code_quality.map((criterion, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">User Experience</h4>
              <ul className="space-y-1">
                {elaboration.success_criteria.user_experience.map((criterion, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-purple-600 mr-2">✓</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Grading</h4>
              <ul className="space-y-1">
                {elaboration.success_criteria.grading.map((criterion, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>
        )}

        {/* Challenges & Risks */}
        {elaborationConfig.sections.challenges && elaboration.challenges && (
        <CollapsibleSection
          title="Challenges & Risk Mitigation"
          icon="⚠️"
          isExpanded={expandedSections.has('challenges')}
          onToggle={() => toggleSection('challenges')}
          onRefine={() => handleOpenRefineDialog('challenges')}
          isRefining={isRefining && refineSectionName === 'challenges'}
        >
          <div className="space-y-3">
            {elaboration.challenges_and_risks.map((item, i) => (
              <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{item.challenge}</h4>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    {item.category}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Mitigation Strategy:</span>
                  <p className="text-gray-600 mt-1">{item.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        )}
      </div>

      {/* Regenerate Options */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-2 flex-1">
            <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div className="text-sm text-indigo-800">
              <p className="font-medium">Want a different elaboration?</p>
              <p className="text-xs mt-1">Generate a new detailed plan or go back to select a different topic</p>
            </div>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
          >
            🔄 Regenerate Elaboration
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Topics
        </button>
        <button
          onClick={() => onComplete(elaboration)}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
        >
          Looks Good, Continue →
        </button>
      </div>

      {/* AI Refinement Dialog */}
      {showRefineDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full"
          >
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">
                  Refine {refineSectionName.replace('_', ' ')} with AI
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Describe how you'd like to refine this section. The AI will update only this section based on your
                request.
              </p>
              <textarea
                value={refineRequest}
                onChange={(e) => setRefineRequest(e.target.value)}
                placeholder={
                  refineSectionName === 'background'
                    ? 'e.g., "Focus more on sustainability aspects" or "Target mobile users specifically"'
                    : refineSectionName === 'objectives'
                    ? 'e.g., "Add more learning objectives about testing" or "Focus on practical skills"'
                    : refineSectionName === 'core_features'
                    ? 'e.g., "Add real-time collaboration feature" or "Simplify the authentication"'
                    : refineSectionName === 'enhanced_features'
                    ? 'e.g., "Add more AI-powered features" or "Focus on mobile-first features"'
                    : refineSectionName === 'architecture'
                    ? 'e.g., "Use microservices instead" or "Add Redis for caching"'
                    : refineSectionName === 'milestones'
                    ? 'e.g., "Shorten Phase 1 to 2 weeks" or "Add testing milestones"'
                    : refineSectionName === 'success'
                    ? 'e.g., "Add performance benchmarks" or "Focus more on user satisfaction metrics"'
                    : 'e.g., "Add more technical challenges" or "Focus on team collaboration risks"'
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                autoFocus
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefineDialog(false);
                    setRefineRequest('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyRefinement}
                  disabled={!refineRequest.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                >
                  Refine with AI
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  onRefine,
  isRefining,
  children,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onToggle}
          className="flex items-center space-x-3 flex-1 hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {onRefine && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefine();
            }}
            disabled={isRefining}
            className="ml-3 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-1"
          >
            {isRefining ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Refining...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                <span>Refine with AI</span>
              </>
            )}
          </button>
        )}
      </div>
      {isExpanded && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gray-50 border-t border-gray-200">
          {children}
        </motion.div>
      )}
    </div>
  );
};

export default TopicElaboration;
