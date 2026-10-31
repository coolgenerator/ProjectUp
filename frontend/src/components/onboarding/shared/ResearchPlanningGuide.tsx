import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, Calendar, CheckCircle, AlertCircle, Edit2, Save, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProjectTopic } from './AITopicSuggestions';

interface Subtask {
  name: string;
  estimated_hours: number;
  assigned_to?: string;
}

interface Task {
  name: string;
  description: string;
  estimated_hours: number;
  start_date?: string;
  due_date?: string;
  assigned_to?: string;
  dependencies?: string[];
  priority: string;
  subtasks?: Subtask[];
}

interface Milestone {
  name: string;
  description?: string;
  tasks: Task[];
}

interface Phase {
  phase: string;
  weeks: string;
  objectives: string;
  milestones: Milestone[];
  deliverables?: string[];
}

interface ResearchPlan {
  research_question: string;
  background: {
    literature_gap: string;
    why_it_matters: string;
    related_work: string[];
  };
  methodology: {
    approach: string;
    data_requirements: string;
    tools_and_technologies: string[];
  };
  evaluation: {
    success_metrics: string[];
    baselines: string[];
  };
  timeline: Phase[];
  risks_and_mitigation: Array<{
    risk: string;
    mitigation: string;
  }>;
}

interface ResearchPlanningGuideProps {
  selectedTopic: ProjectTopic;
  researchContext: any;
  onComplete: (plan: ResearchPlan, fullElaboration?: any) => void;
  onBack: () => void;
  cachedPlan?: ResearchPlan;
}

// Team member type from context
interface TeamMemberInfo {
  name: string;
  role: string;
  email?: string;
  is_placeholder?: boolean;
  avatarUrl?: string;
}

const ResearchPlanningGuide: React.FC<ResearchPlanningGuideProps> = ({
  selectedTopic,
  researchContext,
  onComplete,
  onBack,
  cachedPlan,
}) => {
  const [plan, setPlan] = useState<ResearchPlan | null>(cachedPlan || null);
  const [fullElaboration, setFullElaboration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!cachedPlan);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Extract team members from context
  const teamMembers: TeamMemberInfo[] = researchContext?.team_members || [];

  // Helper to get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper to find team member by name
  const findTeamMember = (name: string): TeamMemberInfo | undefined => {
    return teamMembers.find(m => m.name === name);
  };

  // Render assignee with avatar
  const renderAssignee = (assigneeName: string | undefined, size: 'sm' | 'xs' = 'sm') => {
    if (!assigneeName) return null;
    const member = findTeamMember(assigneeName);
    const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-5 h-5 text-[10px]';
    const hasAvatar = member?.avatarUrl && member.avatarUrl.trim() !== '';

    return (
      <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
        <span className={`relative ${sizeClasses} rounded-full ${!hasAvatar ? 'bg-gradient-to-br from-blue-500 to-purple-600' : ''} text-white flex items-center justify-center font-medium overflow-hidden`}>
          {/* Always render initials as fallback (hidden when avatar loads) */}
          <span className="fallback-initials" style={{ display: hasAvatar ? 'none' : 'block' }}>
            {getInitials(assigneeName)}
          </span>
          {hasAvatar && (
            <img
              src={member.avatarUrl}
              alt={assigneeName}
              className="absolute inset-0 w-full h-full rounded-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                  const fallback = parent.querySelector('.fallback-initials') as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }
              }}
            />
          )}
        </span>
        {assigneeName}
      </span>
    );
  };

  useEffect(() => {
    if (!cachedPlan) {
      generateResearchPlan();
    }
  }, [cachedPlan]);

  const generateResearchPlan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { elaborateTopic } = await import('../../../api/onboardingAPI');

      const data = await elaborateTopic('research', selectedTopic, researchContext);

      console.log('Backend response for research elaboration:', data);
      console.log('Data keys:', Object.keys(data));

      // Backend wraps the plan in a project_plan object
      const plan = data.project_plan || data;
      console.log('Plan keys:', Object.keys(plan));

      // Transform the backend response to match our structure
      // Backend returns keys with capitalized names and spaces, not snake_case
      const researchPlan: ResearchPlan = {
        research_question: plan['Research Questions and Hypotheses']?.primary_question || selectedTopic.name,
        background: {
          literature_gap: plan['Research Background and Literature Review']?.gap_analysis || '',
          why_it_matters: plan['Research Background and Literature Review']?.field_overview || '',
          related_work: plan['Research Background and Literature Review']?.related_work
            ? (typeof plan['Research Background and Literature Review'].related_work === 'string'
              ? [plan['Research Background and Literature Review'].related_work]
              : plan['Research Background and Literature Review'].related_work)
            : [],
        },
        methodology: {
          approach: plan['Research Methodology']?.research_design || '',
          data_requirements: plan['Research Methodology']?.data_collection || '',
          tools_and_technologies: (() => {
            const tools = plan['Technical Implementation']?.tools || [];
            const technologies = plan['Technical Implementation']?.technologies || [];

            console.log('Raw tools:', tools, 'Type:', typeof tools, 'IsArray:', Array.isArray(tools));
            console.log('Raw technologies:', technologies, 'Type:', typeof technologies, 'IsArray:', Array.isArray(technologies));

            // Handle both string and array formats
            const parseToArray = (input: any): string[] => {
              if (Array.isArray(input)) return input;
              if (typeof input === 'string') {
                // Split by comma and clean up each item
                return input.split(',').map(item => item.trim()).filter(Boolean);
              }
              return [];
            };

            const toolsArray = parseToArray(tools);
            const techArray = parseToArray(technologies);

            const result = [...toolsArray, ...techArray].filter(Boolean);
            console.log('Combined tools_and_technologies:', result);
            console.log('First item:', result[0], 'Type:', typeof result[0]);

            return result;
          })(),
        },
        evaluation: {
          success_metrics: (() => {
            const quality = plan['Success Criteria']?.research_quality;
            if (Array.isArray(quality)) return quality;
            if (typeof quality === 'string') return [quality];
            return [];
          })(),
          baselines: (() => {
            const readiness = plan['Success Criteria']?.publication_readiness;
            if (Array.isArray(readiness)) return readiness;
            if (typeof readiness === 'string') return [readiness];
            return [];
          })(),
        },
        timeline: (() => {
          const researchTimeline = plan['Research Timeline'];
          console.log('Research Timeline object:', researchTimeline);
          console.log('Research Timeline keys:', researchTimeline ? Object.keys(researchTimeline) : 'undefined');

          if (!researchTimeline) return [];

          // Helper to transform task data
          const transformTask = (t: any): Task => ({
            name: t.name || '',
            description: t.description || '',
            estimated_hours: t.estimated_hours || 0,
            assigned_to: t.assigned_to,
            priority: t.priority || 'medium',
            dependencies: t.dependencies || [],
            subtasks: t.subtasks || [],
          });

          // Helper to transform milestone data
          const transformMilestones = (milestones: any[], phaseTasks?: any[]): Milestone[] => {
            if (!milestones || !Array.isArray(milestones)) return [];

            // Check if milestones already have tasks inside them (new format)
            const hasNestedTasks = milestones.some(m => typeof m === 'object' && m.tasks && m.tasks.length > 0);

            if (hasNestedTasks) {
              // New format: milestones are objects with tasks inside
              return milestones.map((m: any) => ({
                name: m.name || 'Unknown',
                description: m.description || '',
                tasks: (m.tasks || []).map(transformTask),
              }));
            }

            // Old format: milestones are strings, tasks are at phase level
            // Distribute tasks among milestones
            const transformedMilestones: Milestone[] = milestones.map((m: any) => {
              if (typeof m === 'object' && m.name) {
                return {
                  name: m.name,
                  description: m.description || '',
                  tasks: [],
                };
              }
              if (typeof m === 'string') {
                return {
                  name: m,
                  description: '',
                  tasks: [],
                };
              }
              return { name: 'Unknown', description: '', tasks: [] };
            });

            // If we have phase-level tasks, distribute them among milestones
            if (phaseTasks && phaseTasks.length > 0 && transformedMilestones.length > 0) {
              const tasksPerMilestone = Math.ceil(phaseTasks.length / transformedMilestones.length);
              phaseTasks.forEach((task: any, idx: number) => {
                const milestoneIdx = Math.min(Math.floor(idx / tasksPerMilestone), transformedMilestones.length - 1);
                transformedMilestones[milestoneIdx].tasks.push(transformTask(task));
              });
            }

            return transformedMilestones;
          };

          // Check if backend returns { phases: Array } format
          if (researchTimeline.phases && Array.isArray(researchTimeline.phases)) {
            console.log('Processing phases array format with', researchTimeline.phases.length, 'phases');
            return researchTimeline.phases.map((phase: any, index: number) => {
              console.log(`Processing phase ${index + 1}:`, phase);
              console.log(`Phase ${index + 1} has ${phase.tasks?.length || 0} phase-level tasks`);

              // Pass phase-level tasks to be distributed among milestones if needed
              const milestones = transformMilestones(phase.milestones, phase.tasks);
              console.log(`Phase ${index + 1} milestones after transform:`, milestones);

              return {
                phase: phase.name || `Phase ${index + 1}`,
                weeks: phase.duration || '1 month',
                deliverables: phase.deliverables || [],
                milestones: milestones,
                objectives: phase.objectives || '',
              };
            });
          }

          // Fallback: Backend returns timeline as object with keys "Phase 1", "Phase 2", etc.
          const phaseKeys = Object.keys(researchTimeline);
          console.log('Converting timeline object to array with keys:', phaseKeys);

          return phaseKeys.map((phaseKey) => {
            const phase = researchTimeline[phaseKey];
            console.log(`Processing ${phaseKey}:`, phase);

            return {
              phase: phaseKey,
              weeks: phase.duration || '1 month',
              deliverables: phase.deliverables || [],
              milestones: transformMilestones(phase.milestones, phase.tasks),
              objectives: phase.objectives || '',
            };
          });
        })(),
        risks_and_mitigation: (() => {
          const risks: string[] = [];
          const strategies = plan['Risk Management']?.mitigation_strategies || [];

          // Collect all risks from different categories
          if (plan['Risk Management']?.methodology_risks) {
            const mr = plan['Risk Management'].methodology_risks;
            risks.push(typeof mr === 'string' ? mr : JSON.stringify(mr));
          }
          if (plan['Risk Management']?.data_risks) {
            const dr = plan['Risk Management'].data_risks;
            risks.push(typeof dr === 'string' ? dr : JSON.stringify(dr));
          }
          if (plan['Risk Management']?.timeline_risks) {
            const tr = plan['Risk Management'].timeline_risks;
            risks.push(typeof tr === 'string' ? tr : JSON.stringify(tr));
          }

          return risks.map((risk: string, index: number) => ({
            risk,
            mitigation: strategies[index] || 'To be determined',
          }));
        })(),
      };

      console.log('Transformed researchPlan:', researchPlan);
      console.log('Research question:', researchPlan.research_question);
      console.log('Background:', researchPlan.background);
      console.log('Methodology:', researchPlan.methodology);
      console.log('Timeline phases:', researchPlan.timeline);
      console.log('Number of phases:', researchPlan.timeline.length);
      if (researchPlan.timeline.length > 0) {
        console.log('First phase:', researchPlan.timeline[0]);
        console.log('First phase tasks:', researchPlan.timeline[0].tasks);
        console.log('First phase milestones:', researchPlan.timeline[0].milestones);
        console.log('First phase deliverables:', researchPlan.timeline[0].deliverables);
      }

      // Store both the display plan and full elaboration data
      setPlan(researchPlan);
      setFullElaboration(plan); // Store the full backend response for project creation
    } catch (error) {
      console.error('Failed to generate research plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate plan');
      toast.error('Failed to generate research plan');
    } finally {
      setIsLoading(false);
    }
  };

  // Timeline editing helpers
  const updateMilestoneTask = (
    phaseIndex: number,
    milestoneIndex: number,
    taskIndex: number,
    updates: Partial<Task>
  ) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const task = newPlan.timeline[phaseIndex].milestones[milestoneIndex].tasks[taskIndex];
    newPlan.timeline[phaseIndex].milestones[milestoneIndex].tasks[taskIndex] = {
      ...task,
      ...updates,
    };
    setPlan(newPlan);
  };

  const removeMilestoneTask = (phaseIndex: number, milestoneIndex: number, taskIndex: number) => {
    if (!plan) return;
    const newPlan = { ...plan };
    newPlan.timeline[phaseIndex].milestones[milestoneIndex].tasks.splice(taskIndex, 1);
    setPlan(newPlan);
  };

  const addMilestoneTask = (phaseIndex: number, milestoneIndex: number) => {
    if (!plan) return;
    const newPlan = { ...plan };
    newPlan.timeline[phaseIndex].milestones[milestoneIndex].tasks.push({
      name: 'New Task',
      description: 'Task description',
      estimated_hours: 20,
      priority: 'medium',
      subtasks: [],
    });
    setPlan(newPlan);
  };

  // Section editing helpers
  const updateResearchQuestion = (value: string) => {
    if (!plan) return;
    setPlan({ ...plan, research_question: value });
  };

  const updateBackground = (field: keyof ResearchPlan['background'], value: string | string[]) => {
    if (!plan) return;
    setPlan({
      ...plan,
      background: { ...plan.background, [field]: value },
    });
  };

  const updateMethodology = (field: keyof ResearchPlan['methodology'], value: string | string[]) => {
    if (!plan) return;
    setPlan({
      ...plan,
      methodology: { ...plan.methodology, [field]: value },
    });
  };

  const updateEvaluation = (field: keyof ResearchPlan['evaluation'], value: string[]) => {
    if (!plan) return;
    setPlan({
      ...plan,
      evaluation: { ...plan.evaluation, [field]: value },
    });
  };

  const toggleEditSection = (section: string) => {
    if (editingSection === section) {
      setEditingSection(null);
      toast.success('Changes saved!');
    } else {
      setEditingSection(section);
    }
  };

  // Editable section header component
  const SectionHeader: React.FC<{
    title: string;
    icon: React.ReactNode;
    section: string;
  }> = ({ title, icon, section }) => (
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-lg font-bold text-gray-900 flex items-center">
        {icon}
        {title}
      </h4>
      <button
        onClick={() => toggleEditSection(section)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          editingSection === section
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
        }`}
      >
        {editingSection === section ? (
          <>
            <Save className="w-4 h-4" />
            Save
          </>
        ) : (
          <>
            <Edit2 className="w-4 h-4" />
            Edit
          </>
        )}
      </button>
    </div>
  );

  const handleContinue = () => {
    if (plan) {
      onComplete(plan, fullElaboration);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900">Generating Your Research Plan...</h3>
        <p className="text-gray-600 mt-2">Creating a customized research roadmap</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Generate Plan</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← Go Back
            </button>
            <button
              onClick={generateResearchPlan}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl p-8 text-white mb-6">
        <h2 className="text-3xl font-bold mb-2">{selectedTopic.name}</h2>
        <p className="text-purple-100">{selectedTopic.tagline}</p>
      </div>


      {/* AI-Generated Research Plan */}
      {plan && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Customized Research Plan</h3>

          {/* Research Question */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader
              title="Research Question"
              icon={<Target className="w-5 h-5 mr-2 text-purple-600" />}
              section="research_question"
            />
            {editingSection === 'research_question' ? (
              <textarea
                value={plan.research_question}
                onChange={(e) => updateResearchQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Enter your research question..."
              />
            ) : (
              <p className="text-gray-700">{plan.research_question}</p>
            )}
          </div>

          {/* Background */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader
              title="Background & Related Work"
              icon={<BookOpen className="w-5 h-5 mr-2 text-purple-600" />}
              section="background"
            />
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Why It Matters</h5>
                {editingSection === 'background' ? (
                  <textarea
                    value={plan.background.why_it_matters}
                    onChange={(e) => updateBackground('why_it_matters', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-700">{plan.background.why_it_matters}</p>
                )}
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Literature Gap</h5>
                {editingSection === 'background' ? (
                  <textarea
                    value={plan.background.literature_gap}
                    onChange={(e) => updateBackground('literature_gap', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-700">{plan.background.literature_gap}</p>
                )}
              </div>
              {(plan.background.related_work.length > 0 || editingSection === 'background') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-gray-900">Related Work</h5>
                    {editingSection === 'background' && (
                      <button
                        onClick={() => updateBackground('related_work', [...plan.background.related_work, ''])}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.background.related_work.map((work, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        {editingSection === 'background' ? (
                          <>
                            <input
                              type="text"
                              value={work}
                              onChange={(e) => {
                                const newWork = [...plan.background.related_work];
                                newWork[i] = e.target.value;
                                updateBackground('related_work', newWork);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={() => {
                                const newWork = plan.background.related_work.filter((_, idx) => idx !== i);
                                updateBackground('related_work', newWork);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-purple-600">•</span>
                            {work}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader
              title="Methodology"
              icon={<Target className="w-5 h-5 mr-2 text-purple-600" />}
              section="methodology"
            />
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Approach</h5>
                {editingSection === 'methodology' ? (
                  <textarea
                    value={plan.methodology.approach}
                    onChange={(e) => updateMethodology('approach', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-700">{plan.methodology.approach}</p>
                )}
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Data Requirements</h5>
                {editingSection === 'methodology' ? (
                  <textarea
                    value={plan.methodology.data_requirements}
                    onChange={(e) => updateMethodology('data_requirements', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-700">{plan.methodology.data_requirements}</p>
                )}
              </div>
              {(plan.methodology.tools_and_technologies.length > 0 || editingSection === 'methodology') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-gray-900">Tools & Technologies</h5>
                    {editingSection === 'methodology' && (
                      <button
                        onClick={() => updateMethodology('tools_and_technologies', [...plan.methodology.tools_and_technologies, ''])}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  {editingSection === 'methodology' ? (
                    <div className="flex flex-wrap gap-2">
                      {plan.methodology.tools_and_technologies.map((tool, i) => (
                        <div key={i} className="flex items-center gap-1 bg-purple-50 rounded-full pl-3 pr-1 py-1">
                          <input
                            type="text"
                            value={tool}
                            onChange={(e) => {
                              const newTools = [...plan.methodology.tools_and_technologies];
                              newTools[i] = e.target.value;
                              updateMethodology('tools_and_technologies', newTools);
                            }}
                            className="bg-transparent border-none text-sm text-purple-800 w-32 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const newTools = plan.methodology.tools_and_technologies.filter((_, idx) => idx !== i);
                              updateMethodology('tools_and_technologies', newTools);
                            }}
                            className="text-purple-600 hover:text-red-600 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {plan.methodology.tools_and_technologies.map((tool, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Evaluation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader
              title="Evaluation & Success Metrics"
              icon={<CheckCircle className="w-5 h-5 mr-2 text-purple-600" />}
              section="evaluation"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">Success Metrics</h5>
                  {editingSection === 'evaluation' && (
                    <button
                      onClick={() => updateEvaluation('success_metrics', [...plan.evaluation.success_metrics, ''])}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.evaluation.success_metrics.map((metric, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      {editingSection === 'evaluation' ? (
                        <>
                          <input
                            type="text"
                            value={metric}
                            onChange={(e) => {
                              const newMetrics = [...plan.evaluation.success_metrics];
                              newMetrics[i] = e.target.value;
                              updateEvaluation('success_metrics', newMetrics);
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => {
                              const newMetrics = plan.evaluation.success_metrics.filter((_, idx) => idx !== i);
                              updateEvaluation('success_metrics', newMetrics);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-green-600">✓</span>
                          {metric}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">Baselines</h5>
                  {editingSection === 'evaluation' && (
                    <button
                      onClick={() => updateEvaluation('baselines', [...plan.evaluation.baselines, ''])}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.evaluation.baselines.map((baseline, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      {editingSection === 'evaluation' ? (
                        <>
                          <input
                            type="text"
                            value={baseline}
                            onChange={(e) => {
                              const newBaselines = [...plan.evaluation.baselines];
                              newBaselines[i] = e.target.value;
                              updateEvaluation('baselines', newBaselines);
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => {
                              const newBaselines = plan.evaluation.baselines.filter((_, idx) => idx !== i);
                              updateEvaluation('baselines', newBaselines);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-600">•</span>
                          {baseline}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Timeline - Milestone/Task View */}
          {plan.timeline.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Research Timeline & Milestones
                </h4>
                <button
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    if (isEditMode) {
                      toast.success('Changes saved!');
                    } else {
                      toast('Edit mode enabled', { icon: '✏️' });
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEditMode
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Edit Plan
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-6">
                {plan.timeline.map((phase, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Phase Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-gray-900 flex items-center">
                          <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                            {i + 1}
                          </span>
                          {phase.phase}
                        </h5>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-purple-600 font-medium">📅 {phase.weeks}</span>
                          <span className="text-xs text-gray-500">
                            {phase.milestones?.reduce((acc, m) => acc + (m.tasks?.length || 0), 0) || 0} tasks
                          </span>
                        </div>
                      </div>
                      {phase.objectives && (
                        <p className="text-sm text-gray-700 mt-2 ml-8">{phase.objectives}</p>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Deliverables */}
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-2">📦 Deliverables</p>
                          <ul className="space-y-1">
                            {phase.deliverables.map((deliverable, j) => (
                              <li key={j} className="text-sm text-green-800 flex items-center gap-2">
                                <span className="text-green-600">→</span>
                                <span>{deliverable}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Milestones with Tasks */}
                      {phase.milestones && phase.milestones.length > 0 && (
                        <div className="space-y-4">
                          {phase.milestones.map((milestone, mIdx) => (
                            <div key={mIdx} className="border border-blue-200 rounded-lg overflow-hidden">
                              {/* Milestone Header */}
                              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 text-lg">🎯</span>
                                  <div className="flex-1">
                                    <h6 className="font-semibold text-blue-900">{milestone.name}</h6>
                                    {milestone.description && (
                                      <p className="text-sm text-blue-700 mt-1">{milestone.description}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    {milestone.tasks?.length || 0} tasks
                                  </span>
                                </div>
                              </div>

                              {/* Tasks under this Milestone */}
                              {(milestone.tasks && milestone.tasks.length > 0 || isEditMode) && (
                                <div className="p-3 space-y-2 bg-white">
                                  {milestone.tasks?.map((task, tIdx) => (
                                    <div key={tIdx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
                                      {isEditMode ? (
                                        /* Editable Task View */
                                        <div className="space-y-3">
                                          <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-2">
                                              <input
                                                type="text"
                                                value={task.name}
                                                onChange={(e) => updateMilestoneTask(i, mIdx, tIdx, { name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                placeholder="Task name"
                                              />
                                              <textarea
                                                value={task.description}
                                                onChange={(e) => updateMilestoneTask(i, mIdx, tIdx, { description: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                                rows={2}
                                                placeholder="Task description"
                                              />
                                              <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-gray-500">Hours:</span>
                                                  <input
                                                    type="number"
                                                    value={task.estimated_hours}
                                                    onChange={(e) => updateMilestoneTask(i, mIdx, tIdx, { estimated_hours: parseInt(e.target.value) || 0 })}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    min="0"
                                                  />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-gray-500">Assignee:</span>
                                                  <select
                                                    value={task.assigned_to || ''}
                                                    onChange={(e) => updateMilestoneTask(i, mIdx, tIdx, { assigned_to: e.target.value || undefined })}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                  >
                                                    <option value="">Unassigned</option>
                                                    {teamMembers.map((member, idx) => (
                                                      <option key={idx} value={member.name}>{member.name}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-gray-500">Priority:</span>
                                                  <select
                                                    value={task.priority}
                                                    onChange={(e) => updateMilestoneTask(i, mIdx, tIdx, { priority: e.target.value })}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                  >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                  </select>
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => removeMilestoneTask(i, mIdx, tIdx)}
                                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                              title="Remove task"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Read-only Task View */
                                        <div className="flex items-start gap-3">
                                          <input type="checkbox" className="mt-1" disabled />
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900">{task.name}</p>
                                            {task.description && (
                                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                            )}

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                                ⏱️ {task.estimated_hours}h
                                              </span>
                                              {renderAssignee(task.assigned_to)}
                                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                                {task.priority?.toUpperCase() || 'MEDIUM'}
                                              </span>
                                            </div>

                                            {/* Subtasks */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                              <div className="mt-3 ml-4 space-y-1 border-l-2 border-purple-200 pl-3">
                                                <p className="text-xs font-semibold text-gray-500">Subtasks:</p>
                                                {task.subtasks.map((subtask, sIdx) => (
                                                  <div key={sIdx} className="flex items-center gap-2 text-sm text-gray-600">
                                                    <input type="checkbox" className="mt-0.5" disabled />
                                                    <span className="flex-1">{subtask.name}</span>
                                                    <span className="text-xs text-gray-400">({subtask.estimated_hours}h)</span>
                                                    {renderAssignee(subtask.assigned_to, 'xs')}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {/* Add Task Button in Edit Mode */}
                                  {isEditMode && (
                                    <button
                                      onClick={() => addMilestoneTask(i, mIdx)}
                                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add Task
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {plan.risks_and_mitigation.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                Risks & Mitigation Strategies
              </h4>
              <div className="space-y-3">
                {plan.risks_and_mitigation.map((item, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-1">⚠️ {item.risk}</p>
                    <p className="text-sm text-gray-700"><strong>Mitigation:</strong> {item.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={generateResearchPlan}
            className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition-colors"
          >
            Regenerate Plan
          </button>
          <button
            onClick={handleContinue}
            disabled={!plan}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Continue to Project Details →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchPlanningGuide;
