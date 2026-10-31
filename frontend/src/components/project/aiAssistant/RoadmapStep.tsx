import React, { useState, useEffect } from 'react';
import {
    EnhancedRoadmap,
    ProjectIdea,
    RoadmapSection,
    RoadmapMilestone,
    RoadmapTask,
    ProjectProposal
} from '../../../types/projectAssistant';
import { toast } from 'react-hot-toast';
import ProjectPreview, { ProjectPreviewDetails } from './ProjectPreview';
import config from '../../../config';
import NodeMarkdown from '../../common/NodeMarkdown';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

const { AI_AGENT_URL } = config;

interface RoadmapDisplayProps {
    enhancedRoadmap: EnhancedRoadmap | null;
    isLoading: boolean;
    onPrevious: () => void;
    loadingState?: {
        loadingStage: string;
        loadingProgress: number;
        loadingMessages: string[];
    };
    selectedIdea?: ProjectIdea;
}

const RoadmapDisplay: React.FC<RoadmapDisplayProps> = ({
    enhancedRoadmap,
    isLoading,
    onPrevious,
    loadingState,
    selectedIdea
}) => {
    const [currentView, setCurrentView] = useState<'roadmap' | 'proposals'>('roadmap');
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0])); // First section expanded by default
    const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [selectedProposal, setSelectedProposal] = useState<number>(0);
    const [isShowingPreview, setIsShowingPreview] = useState(false);
    const [creationSuccess, setCreationSuccess] = useState<boolean | null>(null);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [createdProjectSid, setCreatedProjectSid] = useState<string | null>(null);
    const [projectDetails, setProjectDetails] = useState<ProjectPreviewDetails>({
        title: selectedIdea?.title || '',
        description: selectedIdea?.description || '',
        projectType: 'Personal',
        location: 'Remote',
        startTime: new Date().toISOString().split('T')[0],
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cover: '',
        communicationApp: '',
        topic: selectedIdea?.keyTechnologies || []
    });

    // Local editable roadmap state
    const [localRoadmap, setLocalRoadmap] = useState<EnhancedRoadmap | null>(enhancedRoadmap);

    // Editing state for different levels
    const [editingSection, setEditingSection] = useState<number | null>(null);
    const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
    const [editingProposal, setEditingProposal] = useState<number | null>(null);

    // Regeneration state
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [regenerateInstructions, setRegenerateInstructions] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showProposalRegenerateModal, setShowProposalRegenerateModal] = useState(false);
    const [proposalRegenerateInstructions, setProposalRegenerateInstructions] = useState('');

    // Get Redux auth state for debugging
    const reduxToken = useSelector((state: RootState) => state.auth.token);
    const reduxUser = useSelector((state: RootState) => state.auth.user);

    // Sync local roadmap with prop changes
    useEffect(() => {
        if (enhancedRoadmap) {
            setLocalRoadmap(enhancedRoadmap);
        }
    }, [enhancedRoadmap]);

    // Debug logging
    useEffect(() => {
        console.log('🎯 RoadmapStep - enhancedRoadmap:', enhancedRoadmap);
        console.log('🎯 RoadmapStep - isLoading:', isLoading);
        console.log('🎯 RoadmapStep - has success?:', enhancedRoadmap?.success);
        console.log('🎯 RoadmapStep - sections count:', enhancedRoadmap?.sections?.length);
    }, [enhancedRoadmap, isLoading]);

    // Scroll to top when view changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentView, isShowingPreview, creationSuccess]);

    const toggleSection = (index: number) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSections(newExpanded);
    };

    const toggleMilestone = (id: string) => {
        const newExpanded = new Set(expandedMilestones);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedMilestones(newExpanded);
    };

    const toggleTask = (id: string) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedTasks(newExpanded);
    };

    const getPriorityColor = (priority: number): string => {
        // P1 = Urgent (highest), P5 = Backlog (lowest)
        if (priority === 1) return 'bg-red-100 text-red-800 border-red-200';
        if (priority === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
        if (priority === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (priority === 4) return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-gray-100 text-gray-800 border-gray-200'; // P5
    };

    const getPriorityLabel = (priority: number): string => {
        // P1 = Urgent (highest), P5 = Backlog (lowest)
        if (priority === 1) return 'Urgent';
        if (priority === 2) return 'High';
        if (priority === 3) return 'Medium';
        if (priority === 4) return 'Low';
        return 'Backlog'; // P5
    };

    // Update functions for editing
    const updateSection = (sectionIndex: number, updates: Partial<RoadmapSection>) => {
        if (!localRoadmap) return;
        const newSections = [...localRoadmap.sections];
        newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates };
        setLocalRoadmap({ ...localRoadmap, sections: newSections });
        toast.success('Section updated!');
    };

    const updateMilestone = (sectionIndex: number, milestoneIndex: number, updates: Partial<RoadmapMilestone>) => {
        if (!localRoadmap) return;
        const newSections = [...localRoadmap.sections];
        newSections[sectionIndex].milestones[milestoneIndex] = {
            ...newSections[sectionIndex].milestones[milestoneIndex],
            ...updates
        };
        setLocalRoadmap({ ...localRoadmap, sections: newSections });
        toast.success('Milestone updated!');
    };

    const updateTask = (sectionIndex: number, milestoneIndex: number, taskIndex: number, updates: Partial<RoadmapTask>) => {
        if (!localRoadmap) return;
        const newSections = [...localRoadmap.sections];
        newSections[sectionIndex].milestones[milestoneIndex].tasks[taskIndex] = {
            ...newSections[sectionIndex].milestones[milestoneIndex].tasks[taskIndex],
            ...updates
        };
        setLocalRoadmap({ ...localRoadmap, sections: newSections });
        toast.success('Task updated!');
    };

    const updateSubtask = (sectionIndex: number, milestoneIndex: number, taskIndex: number, subtaskIndex: number, updates: Partial<any>) => {
        if (!localRoadmap) return;
        const newSections = [...localRoadmap.sections];
        const subtasks = [...newSections[sectionIndex].milestones[milestoneIndex].tasks[taskIndex].subtasks];
        subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], ...updates };
        newSections[sectionIndex].milestones[milestoneIndex].tasks[taskIndex].subtasks = subtasks;
        setLocalRoadmap({ ...localRoadmap, sections: newSections });
        toast.success('Subtask updated!');
    };

    const updateProposal = (proposalIndex: number, updates: Partial<ProjectProposal>) => {
        if (!localRoadmap) return;
        const newProposals = [...(localRoadmap.proposals || [])];
        newProposals[proposalIndex] = { ...newProposals[proposalIndex], ...updates };
        setLocalRoadmap({ ...localRoadmap, proposals: newProposals });
        toast.success('Proposal updated!');
    };

    // Regenerate entire roadmap with user instructions
    const handleRegenerateRoadmap = async () => {
        if (!selectedIdea) return;

        setIsRegenerating(true);
        setShowRegenerateModal(false);

        try {
            // Parse estimated time
            let durationWeeks = 12;
            const timeMatch = selectedIdea.estimatedTime.match(/(\d+)/);
            if (timeMatch) {
                durationWeeks = parseInt(timeMatch[1]);
            }

            const response = await fetch(`${AI_AGENT_URL}/ai-api/project-roadmap/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: `temp_${Date.now()}`,
                    project_title: selectedIdea.title,
                    project_description: selectedIdea.description + (regenerateInstructions ? `\n\nAdditional requirements: ${regenerateInstructions}` : ''),
                    difficulty_level: selectedIdea.difficulty.toLowerCase(),
                    duration_weeks: durationWeeks,
                    team_size: 1,
                    key_features: selectedIdea.keyFeatures || [],
                    tech_stack: selectedIdea.keyTechnologies || [],
                    project_type: 'Personal Project',
                    generate_proposals: true,
                    generate_dependencies: true
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to regenerate roadmap: ${response.statusText}`);
            }

            const roadmapData: EnhancedRoadmap = await response.json();

            if (!roadmapData.success) {
                throw new Error(roadmapData.error_message || 'Failed to regenerate roadmap');
            }

            setLocalRoadmap(roadmapData);
            toast.success('Roadmap regenerated successfully!');
            setRegenerateInstructions('');
        } catch (error) {
            console.error('Error regenerating roadmap:', error);
            toast.error('Failed to regenerate roadmap. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Regenerate proposals only
    const handleRegenerateProposals = async () => {
        if (!selectedIdea || !localRoadmap) return;

        setIsRegenerating(true);
        setShowProposalRegenerateModal(false);

        try {
            // For now, regenerate the whole roadmap - in future, you can add a proposals-only endpoint
            let durationWeeks = 12;
            const timeMatch = selectedIdea.estimatedTime.match(/(\d+)/);
            if (timeMatch) {
                durationWeeks = parseInt(timeMatch[1]);
            }

            const response = await fetch(`${AI_AGENT_URL}/ai-api/project-roadmap/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: `temp_${Date.now()}`,
                    project_title: selectedIdea.title,
                    project_description: selectedIdea.description + (proposalRegenerateInstructions ? `\n\nProposal requirements: ${proposalRegenerateInstructions}` : ''),
                    difficulty_level: selectedIdea.difficulty.toLowerCase(),
                    duration_weeks: durationWeeks,
                    team_size: 1,
                    key_features: selectedIdea.keyFeatures || [],
                    tech_stack: selectedIdea.keyTechnologies || [],
                    project_type: 'Personal Project',
                    generate_proposals: true,
                    generate_dependencies: false
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to regenerate proposals: ${response.statusText}`);
            }

            const roadmapData: EnhancedRoadmap = await response.json();

            if (!roadmapData.success || !roadmapData.proposals) {
                throw new Error('Failed to generate proposals');
            }

            // Only update proposals, keep existing roadmap
            setLocalRoadmap({ ...localRoadmap, proposals: roadmapData.proposals });
            toast.success('Proposals regenerated successfully!');
            setProposalRegenerateInstructions('');
        } catch (error) {
            console.error('Error regenerating proposals:', error);
            toast.error('Failed to regenerate proposals. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-6">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${loadingState?.loadingProgress || 0}%` }}
                    ></div>
                </div>
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {loadingState?.loadingStage || "Generating Your Project Roadmap"}
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                    We're creating a comprehensive roadmap with tasks, dependencies, and strategic proposals. This might take a minute...
                </p>
                {loadingState?.loadingMessages && loadingState.loadingMessages.length > 0 && (
                    <div className="mt-4 w-full max-w-md">
                        <div className="text-xs text-gray-500 mb-1">Progress:</div>
                        <ul className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                            {loadingState.loadingMessages.map((message, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span> {message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (!enhancedRoadmap || !enhancedRoadmap.success) {
        return (
            <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
                <p className="text-gray-600 mb-4">
                    {enhancedRoadmap?.error_message || "No roadmap data available. Please generate a roadmap first."}
                </p>
                <button
                    onClick={onPrevious}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const renderRoadmap = () => {
        if (!localRoadmap || !localRoadmap.sections || localRoadmap.sections.length === 0) {
            return (
                <div className="p-6 text-center">
                    <p className="text-gray-500">No sections available in the roadmap.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6" data-tour="roadmap-section">
                {/* Regenerate Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setShowRegenerateModal(true)}
                        disabled={isRegenerating}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isRegenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate Roadmap
                            </>
                        )}
                    </button>
                </div>

                {/* Roadmap Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">{localRoadmap.sections.length}</div>
                        <div className="text-sm text-gray-600">Sections</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{localRoadmap.total_milestones}</div>
                        <div className="text-sm text-gray-600">Milestones</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600">{localRoadmap.total_tasks}</div>
                        <div className="text-sm text-gray-600">Tasks</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-orange-600">{Math.round(localRoadmap.total_estimated_hours)}h</div>
                        <div className="text-sm text-gray-600">Estimated Time</div>
                    </div>
                </div>

                {/* Sections */}
                {localRoadmap.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Section Header */}
                        <div
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors"
                            style={section.color ? { background: `linear-gradient(to right, ${section.color}15, ${section.color}30)` } : undefined}
                        >
                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSection(sectionIndex)}>
                                <div
                                    className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                                    style={{ backgroundColor: section.color || '#3B82F6' }}
                                >
                                    {sectionIndex + 1}
                                </div>
                                <div>
                                    {editingSection === sectionIndex ? (
                                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={section.name}
                                                onChange={(e) => updateSection(sectionIndex, { name: e.target.value })}
                                                className="text-lg font-bold text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                value={section.description}
                                                onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
                                                className="text-sm text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
                                            <p className="text-sm text-gray-600">{section.description}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSection(editingSection === sectionIndex ? null : sectionIndex);
                                    }}
                                    className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                                    title={editingSection === sectionIndex ? "Done editing" : "Edit section"}
                                >
                                    {editingSection === sectionIndex ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    )}
                                </button>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                                    {section.milestones.length} milestones
                                </span>
                                <svg
                                    onClick={() => toggleSection(sectionIndex)}
                                    className={`w-5 h-5 text-gray-600 transition-transform cursor-pointer ${expandedSections.has(sectionIndex) ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Milestones */}
                        {expandedSections.has(sectionIndex) && (
                            <div className="p-4 space-y-4 bg-gray-50">
                                {section.milestones.map((milestone, milestoneIndex) => {
                                    const milestoneId = `${sectionIndex}-${milestoneIndex}`;
                                    return (
                                        <div key={milestoneIndex} className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                                            {/* Milestone Header */}
                                            <div className="flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors">
                                                <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleMilestone(milestoneId)}>
                                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    <div className="flex-1">
                                                        {editingMilestone === milestoneId ? (
                                                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="text"
                                                                    value={milestone.title}
                                                                    onChange={(e) => updateMilestone(sectionIndex, milestoneIndex, { title: e.target.value })}
                                                                    className="font-semibold text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                                                                    autoFocus
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={milestone.description}
                                                                    onChange={(e) => updateMilestone(sectionIndex, milestoneIndex, { description: e.target.value })}
                                                                    className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        value={milestone.priority}
                                                                        onChange={(e) => updateMilestone(sectionIndex, milestoneIndex, { priority: Number(e.target.value) })}
                                                                        className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    >
                                                                        <option value="1">P1 - Urgent</option>
                                                                        <option value="2">P2 - High</option>
                                                                        <option value="3">P3 - Medium</option>
                                                                        <option value="4">P4 - Low</option>
                                                                        <option value="5">P5 - Backlog</option>
                                                                    </select>
                                                                    <input
                                                                        type="number"
                                                                        value={milestone.estimated_hours}
                                                                        onChange={(e) => updateMilestone(sectionIndex, milestoneIndex, { estimated_hours: Number(e.target.value) })}
                                                                        placeholder="Hours"
                                                                        className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                                                                <p className="text-xs text-gray-600">{milestone.description}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingMilestone(editingMilestone === milestoneId ? null : milestoneId);
                                                        }}
                                                        className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                                                        title={editingMilestone === milestoneId ? "Done editing" : "Edit milestone"}
                                                    >
                                                        {editingMilestone === milestoneId ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(milestone.priority)}`}>
                                                        {getPriorityLabel(milestone.priority)}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                                                        {milestone.tasks.length} tasks • {Math.round(milestone.estimated_hours)}h
                                                    </span>
                                                    <svg
                                                        onClick={() => toggleMilestone(milestoneId)}
                                                        className={`w-4 h-4 text-gray-600 transition-transform cursor-pointer ${expandedMilestones.has(milestoneId) ? 'rotate-180' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Tasks */}
                                            {expandedMilestones.has(milestoneId) && (
                                                <div className="p-3 space-y-2">
                                                    {milestone.tasks.map((task, taskIndex) => {
                                                        const taskId = `${milestoneId}-${taskIndex}`;
                                                        return (
                                                            <div key={taskIndex} className="border border-gray-200 rounded-md overflow-hidden">
                                                                {/* Task Header */}
                                                                <div className="flex items-start justify-between p-2 bg-white hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-start gap-2 flex-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                        <div className="flex-1 cursor-pointer" onClick={() => toggleTask(taskId)}>
                                                                            {editingTask === taskId ? (
                                                                                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={task.title}
                                                                                        onChange={(e) => updateTask(sectionIndex, milestoneIndex, taskIndex, { title: e.target.value })}
                                                                                        className="font-medium text-gray-900 text-sm bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                                        autoFocus
                                                                                    />
                                                                                    <textarea
                                                                                        value={task.description}
                                                                                        onChange={(e) => updateTask(sectionIndex, milestoneIndex, taskIndex, { description: e.target.value })}
                                                                                        className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                                        rows={2}
                                                                                    />
                                                                                    <div className="flex gap-2">
                                                                                        <select
                                                                                            value={task.priority}
                                                                                            onChange={(e) => updateTask(sectionIndex, milestoneIndex, taskIndex, { priority: Number(e.target.value) })}
                                                                                            className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                        >
                                                                                            <option value="1">P1</option>
                                                                                            <option value="2">P2</option>
                                                                                            <option value="3">P3</option>
                                                                                            <option value="4">P4</option>
                                                                                            <option value="5">P5</option>
                                                                                        </select>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={task.estimated_hours}
                                                                                            onChange={(e) => updateTask(sectionIndex, milestoneIndex, taskIndex, { estimated_hours: Number(e.target.value) })}
                                                                                            placeholder="Hours"
                                                                                            className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <h5 className="font-medium text-gray-900 text-sm">{task.title}</h5>
                                                                                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                                                                    {task.dependencies.length > 0 && (
                                                                                        <div className="flex items-center gap-1 mt-1">
                                                                                            <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                                            </svg>
                                                                                            <span className="text-xs text-orange-600">
                                                                                                Depends on: {task.dependencies.join(', ')}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {task.tags.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                                            {task.tags.map((tag, idx) => (
                                                                                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                                                                    {tag}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTask(editingTask === taskId ? null : taskId);
                                                                            }}
                                                                            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                                                                            title={editingTask === taskId ? "Done editing" : "Edit task"}
                                                                        >
                                                                            {editingTask === taskId ? (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                        <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                                                                            P{task.priority}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200 whitespace-nowrap">
                                                                            {task.estimated_hours}h
                                                                        </span>
                                                                        {task.subtasks.length > 0 && (
                                                                            <span className="text-xs text-gray-500">
                                                                                {task.subtasks.length} subtasks
                                                                            </span>
                                                                        )}
                                                                        {task.subtasks.length > 0 && (
                                                                            <svg
                                                                                onClick={() => toggleTask(taskId)}
                                                                                className={`w-3 h-3 text-gray-600 transition-transform cursor-pointer ${expandedTasks.has(taskId) ? 'rotate-180' : ''}`}
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Subtasks */}
                                                                {expandedTasks.has(taskId) && task.subtasks.length > 0 && (
                                                                    <div className="bg-gray-50 p-2 border-t border-gray-200">
                                                                        <div className="space-y-1">
                                                                            {task.subtasks.map((subtask, subtaskIndex) => {
                                                                                const subtaskId = `${taskId}-${subtaskIndex}`;
                                                                                return (
                                                                                    <div key={subtaskIndex} className="flex items-start gap-2 text-xs group hover:bg-gray-100 p-1 rounded">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="mt-0.5 h-3 w-3 text-blue-600 rounded border-gray-300"
                                                                                        />
                                                                                        <div className="flex-1">
                                                                                            {editingSubtask === subtaskId ? (
                                                                                                <div className="space-y-1">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={subtask.title}
                                                                                                        onChange={(e) => updateSubtask(sectionIndex, milestoneIndex, taskIndex, subtaskIndex, { title: e.target.value })}
                                                                                                        className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                                                        autoFocus
                                                                                                    />
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={subtask.description || ''}
                                                                                                        onChange={(e) => updateSubtask(sectionIndex, milestoneIndex, taskIndex, subtaskIndex, { description: e.target.value })}
                                                                                                        placeholder="Description (optional)"
                                                                                                        className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                                                    />
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        value={subtask.estimated_hours || ''}
                                                                                                        onChange={(e) => updateSubtask(sectionIndex, milestoneIndex, taskIndex, subtaskIndex, { estimated_hours: Number(e.target.value) })}
                                                                                                        placeholder="Hours"
                                                                                                        className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                                                                                                    />
                                                                                                </div>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <span className="text-gray-700">{subtask.title}</span>
                                                                                                    {subtask.description && (
                                                                                                        <p className="text-gray-500 mt-0.5">{subtask.description}</p>
                                                                                                    )}
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setEditingSubtask(editingSubtask === subtaskId ? null : subtaskId);
                                                                                                }}
                                                                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 transition-all p-0.5"
                                                                                                title={editingSubtask === subtaskId ? "Done editing" : "Edit subtask"}
                                                                                            >
                                                                                                {editingSubtask === subtaskId ? (
                                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                                    </svg>
                                                                                                ) : (
                                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                                    </svg>
                                                                                                )}
                                                                                            </button>
                                                                                            {subtask.estimated_hours && (
                                                                                                <span className="text-gray-400">{subtask.estimated_hours}h</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderProposals = () => {
        if (!localRoadmap || !localRoadmap.proposals || localRoadmap.proposals.length === 0) {
            return (
                <div className="p-6 text-center">
                    <p className="text-gray-500">No implementation plan available for this project.</p>
                </div>
            );
        }

        const currentProposal = localRoadmap.proposals[0]; // Always use first (only) proposal

        // Combine all sections into a single markdown document
        const combinedMarkdown = (() => {
            let content = '';

            // Add approach
            if (currentProposal.approach) {
                content += currentProposal.approach + '\n\n---\n\n';
            }

            // Add benefits
            if (currentProposal.benefits && currentProposal.benefits.length > 0) {
                content += '# Benefits\n\n';
                const benefitsMarkdown = currentProposal.benefits.map((benefit, index) => `${index + 1}. ${benefit}`).join('\n\n');
                content += benefitsMarkdown + '\n\n---\n\n';
            }

            // Add challenges
            if (currentProposal.challenges_with_mitigation && currentProposal.challenges_with_mitigation.length > 0) {
                content += '# Challenges & Mitigation\n\n';
                const challengesMarkdown = currentProposal.challenges_with_mitigation.map((item, index) =>
                    `### Challenge ${index + 1}\n\n${item.challenge}\n\n**Mitigation Strategy:**\n\n${item.mitigation}`
                ).join('\n\n');
                content += challengesMarkdown + '\n\n---\n\n';
            }

            // Add success metrics
            if (currentProposal.success_metrics && currentProposal.success_metrics.length > 0) {
                content += '# Success Metrics\n\n';
                const metricsMarkdown = currentProposal.success_metrics.map((metric, index) => `${index + 1}. ${metric}`).join('\n\n');
                content += metricsMarkdown + '\n\n---\n\n';
            }

            // Add decision framework
            if (currentProposal.decision_framework) {
                content += '# Decision Framework\n\n';
                content += `## Best Suited For\n\n${currentProposal.decision_framework.best_for}\n\n`;
                content += `## Choose This If\n\n${currentProposal.decision_framework.choose_if}\n\n`;
                content += `## Avoid This If\n\n${currentProposal.decision_framework.avoid_if}\n\n---\n\n`;
            }

            // Add alternatives
            if (currentProposal.alternatives_considered) {
                content += currentProposal.alternatives_considered + '\n\n---\n\n';
            }

            // Add resources
            if (currentProposal.resources_needed && currentProposal.resources_needed.length > 0) {
                content += '# Resources Needed\n\n';
                const resourcesMarkdown = currentProposal.resources_needed.map((resource, index) => `${index + 1}. ${resource}`).join('\n\n');
                content += resourcesMarkdown + '\n\n---\n\n';
            }

            // Add timeline
            if (currentProposal.timeline) {
                content += currentProposal.timeline;
            }

            return content;
        })();

        return (
            <div className="space-y-6" data-tour="proposal-section">
                {/* Header with title and regenerate button */}
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">{currentProposal.title}</h3>
                        <p className="text-gray-600 mt-1">{currentProposal.description}</p>
                    </div>
                    <button
                        onClick={() => setShowProposalRegenerateModal(true)}
                        disabled={isRegenerating}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isRegenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                            </>
                        )}
                    </button>
                </div>

                {/* Combined Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-8">
                    <NodeMarkdown content={combinedMarkdown} className="prose prose-lg max-w-none" />
                </div>
            </div>
        );
    };
    const navigateToProject = () => {
        // Use SID if available, otherwise fall back to numeric ID
        const projectIdentifier = createdProjectSid || createdProjectId;
        console.log('🔗 Navigating to project - SID:', createdProjectSid, 'ID:', createdProjectId, 'Using:', projectIdentifier);
        if (projectIdentifier) {
            window.scrollTo({ top: 0, behavior: 'auto' });
            window.location.href = `/project/${projectIdentifier}/dashboard`;
        }
    };

    const renderCreateProjectSection = () => {
        if (creationSuccess === true && createdProjectId) {
            return (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Project created successfully!</h3>
                    <p className="text-gray-600 mb-6">Your project roadmap has been saved. You can now start working on it!</p>
                    <button
                        onClick={navigateToProject}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Go to Project Dashboard
                    </button>
                </div>
            );
        }

        if (creationSuccess === false) {
            return (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Failed to create project</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">There was an error creating your project. Please try again.</p>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-6">
            {isShowingPreview && (
                <ProjectPreview
                    isShowingPreview={isShowingPreview}
                    setIsShowingPreview={setIsShowingPreview}
                    projectDetails={projectDetails}
                    selectedIdea={selectedIdea}
                    onSuccess={async (projectId, projectSid) => {
                        console.log('✅ Project created - ID:', projectId, 'SID:', projectSid);
                        setCreatedProjectId(String(projectId));
                        setCreatedProjectSid(projectSid || null);

                        // Store AI-generated roadmap and proposals
                        console.log('🔍 Checking localRoadmap:', localRoadmap);
                        console.log('🔍 localRoadmap.success:', localRoadmap?.success);
                        console.log('🔍 localRoadmap.sections:', localRoadmap?.sections?.length);
                        console.log('🔍 localRoadmap.proposals:', localRoadmap?.proposals?.length);

                        if (localRoadmap && localRoadmap.success) {
                            try {
                                const sid = projectSid || String(projectId); // Use projectSid if available, fallback to projectId

                                // Sanitize roadmap data - ensure all subtasks are arrays of objects
                                const sanitizedRoadmap = {
                                    ...localRoadmap,
                                    sections: localRoadmap.sections.map(section => ({
                                        ...section,
                                        milestones: section.milestones.map(milestone => ({
                                            ...milestone,
                                            tasks: milestone.tasks.map(task => ({
                                                ...task,
                                                // Convert subtasks from strings to objects if needed
                                                subtasks: Array.isArray(task.subtasks)
                                                    ? task.subtasks.map((subtask: any) => {
                                                        // If subtask is a string, convert to object
                                                        if (typeof subtask === 'string') {
                                                            return {
                                                                title: subtask,
                                                                description: '',
                                                                estimated_hours: null
                                                            };
                                                        }
                                                        // If already an object, ensure it has required fields
                                                        return {
                                                            title: subtask.title || '',
                                                            description: subtask.description || '',
                                                            estimated_hours: subtask.estimated_hours || null
                                                        };
                                                    })
                                                    : [],
                                                // Ensure other array fields are arrays too
                                                dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
                                                tags: Array.isArray(task.tags) ? task.tags : [],
                                                assigned_to: Array.isArray(task.assigned_to) ? task.assigned_to : []
                                            }))
                                        }))
                                    }))
                                };

                                console.log('📤 Sending roadmap to:', `/api/projects/${sid}/roadmap/store-ai-generated`);
                                console.log('📤 Sanitized roadmap data:', JSON.stringify(sanitizedRoadmap).substring(0, 200));

                                // Debug: Check subtasks structure
                                if (sanitizedRoadmap.sections?.[0]?.milestones?.[0]?.tasks?.[0]) {
                                    const firstTask = sanitizedRoadmap.sections[0].milestones[0].tasks[0];
                                    console.log('🔍 First task:', firstTask);
                                    console.log('🔍 First task subtasks type:', typeof firstTask.subtasks);
                                    console.log('🔍 First task subtasks value:', firstTask.subtasks);
                                    console.log('🔍 Is array?:', Array.isArray(firstTask.subtasks));
                                }

                                const response = await fetchWithAuth(`/api/projects/${sid}/roadmap/store-ai-generated`, {
                                    method: 'POST',
                                    body: JSON.stringify(sanitizedRoadmap)
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('❌ Backend error response:', errorText);
                                    throw new Error(`Failed to store roadmap: ${response.status} ${errorText}`);
                                }

                                const result = await response.json();
                                console.log('✅ Roadmap stored:', result);
                                toast.success(`Project created with ${result.tasks_created} tasks and ${result.proposals_created} proposals!`);
                            } catch (error) {
                                console.error('❌ Error storing roadmap:', error);
                                if (error instanceof Error) {
                                    console.error('❌ Error message:', error.message);
                                    console.error('❌ Error stack:', error.stack);
                                }
                                toast.error('Project created but roadmap storage failed. You can manually add tasks later.');
                            }
                        } else {
                            console.log('⚠️ No roadmap data to store - localRoadmap:', localRoadmap);
                            if (!localRoadmap) {
                                console.log('⚠️ localRoadmap is null or undefined');
                            } else if (!localRoadmap.success) {
                                console.log('⚠️ localRoadmap.success is false');
                            }
                            toast.success('Project created successfully!');
                        }

                        setCreationSuccess(true);
                    }}
                    createPostOption={false}
                    setProjectDetails={setProjectDetails}
                />
            )}

            <div className="pb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Project Roadmap</h2>
                <p className="text-gray-600">
                    Comprehensive project plan with {localRoadmap?.total_tasks || 0} tasks across {localRoadmap?.total_milestones || 0} milestones,
                    plus strategic proposals for implementation.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`px-6 py-3 font-medium transition-colors ${
                        currentView === 'roadmap'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCurrentView('roadmap')}
                >
                    Roadmap
                </button>
                <button
                    data-tab="proposals"
                    className={`px-6 py-3 font-medium transition-colors ${
                        currentView === 'proposals'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCurrentView('proposals')}
                >
                    Implementation Plan
                </button>
            </div>

            {/* Content */}
            {currentView === 'roadmap' && renderRoadmap()}
            {currentView === 'proposals' && renderProposals()}

            {renderCreateProjectSection()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={onPrevious}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    ← Previous Step
                </button>

                <div className="flex justify-end">
                    {!creationSuccess && !isShowingPreview && (
                        <button
                            data-tour="continue-to-setup-button"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setTimeout(() => {
                                    setIsShowingPreview(true);
                                }, 300);
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Continue to Project Setup
                        </button>
                    )}
                </div>
            </div>

            {/* Regenerate Roadmap Modal */}
            {showRegenerateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Regenerate Roadmap</h3>
                            <button
                                onClick={() => setShowRegenerateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Add special requirements or adjustments for the new roadmap. The AI will regenerate the entire roadmap based on your instructions.
                        </p>
                        <textarea
                            value={regenerateInstructions}
                            onChange={(e) => setRegenerateInstructions(e.target.value)}
                            placeholder="E.g., Make it more detailed, add more testing tasks, focus on backend development, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowRegenerateModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRegenerateRoadmap}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Regenerate Implementation Plan Modal */}
            {showProposalRegenerateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Regenerate Implementation Plan</h3>
                            <button
                                onClick={() => setShowProposalRegenerateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Add special requirements or focus areas for the implementation plan. The AI will regenerate a comprehensive strategic analysis with more details.
                        </p>
                        <textarea
                            value={proposalRegenerateInstructions}
                            onChange={(e) => setProposalRegenerateInstructions(e.target.value)}
                            placeholder="E.g., Focus on agile methodology, include more security considerations, add microservices architecture details, expand on DevOps practices, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowProposalRegenerateModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRegenerateProposals}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Regenerate Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadmapDisplay;
