import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CreateAIProposalDialog from './CreateAIProposalDialog';
import { Sparkles } from 'lucide-react';

interface ProjectProposalsProps {
    projectId: string;
    isAdmin: boolean;
}

interface Proposal {
    id: number;
    title: string;
    description: string;
    plan_type: string;
    content: {
        sections?: Section[];      // For AI-generated structured proposals
        markdown?: string;          // For custom proposals (simple, RAG-friendly)
    };
    source: string;
    status: string;
    tags?: string[];
    category?: string;
    created_at: string;
    updated_at: string;
}

interface Section {
    id: string;
    type: string;
    title: string;
    content: string;
    metadata?: any;
    subsections?: Section[];
}

// Predefined categories
const PROPOSAL_CATEGORIES = [
    'Proposal',
    'Grant Proposal',
    'Research Proposal',
    'Business Proposal',
    'Project Proposal',
    'Partnership Proposal',
    'Funding Request',
];

const ProjectProposals: React.FC<ProjectProposalsProps> = ({ projectId, isAdmin }) => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [newTag, setNewTag] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        fetchProposals();
    }, [projectId]);

    const fetchProposals = async () => {
        try {
            const response = await fetchWithAuth(`/api/projects/${projectId}/plans`);
            if (response.ok) {
                const data = await response.json();
                setProposals(data.plans || []);
                if (data.plans && data.plans.length > 0) {
                    setSelectedProposal(data.plans[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load proposals:', error);
        } finally {
            setLoading(false);
        }
    };

    const createNewProposal = async () => {
        const newProposal = {
            title: 'New Proposal',
            description: 'Proposal description',
            plan_type: 'proposal',
            content: {
                markdown: '' // Use simple markdown format for custom proposals
            },
            source: 'manual',
            tags: [],
            category: 'Proposal',
        };

        try {
            const response = await fetchWithAuth(`/api/projects/${projectId}/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProposal),
            });

            if (response.ok) {
                const data = await response.json();
                setProposals([...proposals, data.plan]);
                setSelectedProposal(data.plan);
                setIsEditing(true);
            }
        } catch (error) {
            console.error('Failed to create proposal:', error);
        }
    };

    const updateProposal = async (updatedProposal: Partial<Proposal>) => {
        if (!selectedProposal) return;

        try {
            const response = await fetchWithAuth(`/api/projects/${projectId}/plans/${selectedProposal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProposal),
            });

            if (response.ok) {
                fetchProposals();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to update proposal:', error);
        }
    };

    const deleteProposal = async (proposalId: number) => {
        if (!confirm('Are you sure you want to delete this proposal?')) return;

        try {
            const response = await fetchWithAuth(`/api/projects/${projectId}/plans/${proposalId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setProposals(proposals.filter(p => p.id !== proposalId));
                if (selectedProposal?.id === proposalId) {
                    setSelectedProposal(proposals[0] || null);
                }
            }
        } catch (error) {
            console.error('Failed to delete proposal:', error);
        }
    };

    // Get all unique tags from proposals
    const getAllTags = (): string[] => {
        const tags = proposals.flatMap(p => p.tags || []);
        return Array.from(new Set(tags));
    };

    // Get all unique categories (preset + custom from existing proposals)
    const getAllCategories = (): string[] => {
        const customCategories = proposals
            .map(p => p.category)
            .filter((cat): cat is string => !!cat && !PROPOSAL_CATEGORIES.includes(cat));
        const uniqueCustom = Array.from(new Set(customCategories));
        return [...PROPOSAL_CATEGORIES, ...uniqueCustom];
    };

    // Filter proposals by selected tags and category
    const getFilteredProposals = (): Proposal[] => {
        return proposals.filter(proposal => {
            // Filter by category
            if (selectedCategory !== 'all' && proposal.category !== selectedCategory) {
                return false;
            }
            // Filter by tags (if any tags selected, proposal must have at least one matching tag)
            if (selectedTags.length > 0) {
                const proposalTags = proposal.tags || [];
                const hasMatchingTag = selectedTags.some(tag => proposalTags.includes(tag));
                if (!hasMatchingTag) return false;
            }
            return true;
        });
    };

    const filteredProposals = getFilteredProposals();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1800px] mx-auto">
                {proposals.length === 0 ? (
                    <div className="bg-white rounded shadow-sm border border-slate-200 p-12">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No proposals yet</h3>
                            <p className="text-gray-600 mb-4">
                                {isAdmin ? 'Get started by creating your first proposal' : 'No proposals have been created for this project'}
                            </p>
                            {isAdmin && (
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setShowAIDialog(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Create with AI
                                    </button>
                                    <button
                                        onClick={createNewProposal}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Manually
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                <div className="bg-white rounded shadow-sm border border-slate-200 p-6 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
                    {/* Action Buttons */}
                    {isAdmin && (
                        <div className="flex gap-3 mb-4 flex-shrink-0">
                            <button
                                onClick={() => setShowAIDialog(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                Create with AI
                            </button>
                            <button
                                onClick={createNewProposal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Manually
                            </button>
                        </div>
                    )}

                    <div className="flex space-x-4 flex-1 relative overflow-hidden">
                        {/* Collapsed Sidebar Toggle Button */}
                        {isSidebarCollapsed && (
                            <button
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-blue-600 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-700 transition-colors"
                                title="Show proposals list"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Proposals List Sidebar */}
                        {!isSidebarCollapsed && (
                            <div className="w-80 flex-shrink-0 bg-gradient-to-b from-slate-50 to-slate-100 rounded border border-slate-200 p-4 overflow-y-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-800">Proposals ({filteredProposals.length}/{proposals.length})</h3>
                                    <button
                                        onClick={() => setIsSidebarCollapsed(true)}
                                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                                        title="Hide proposals list"
                                    >
                                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                </div>

                        {/* Category Filter */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-slate-700">Category</label>
                                {isAdmin && !showCategoryInput && (
                                    <button
                                        onClick={() => setShowCategoryInput(true)}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                        title="Add custom category"
                                    >
                                        + Add
                                    </button>
                                )}
                            </div>

                            {showCategoryInput ? (
                                <div className="flex gap-1 mb-2">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newCategory.trim()) {
                                                e.preventDefault();
                                                setSelectedCategory(newCategory.trim());
                                                setNewCategory('');
                                                setShowCategoryInput(false);
                                            } else if (e.key === 'Escape') {
                                                setNewCategory('');
                                                setShowCategoryInput(false);
                                            }
                                        }}
                                        placeholder="New category name"
                                        className="flex-1 text-xs px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setNewCategory('');
                                            setShowCategoryInput(false);
                                        }}
                                        className="px-2 text-xs text-slate-600 hover:text-slate-800"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : null}

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                            >
                                <option value="all">All Categories</option>
                                {getAllCategories().map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            {showCategoryInput && (
                                <p className="text-xs text-slate-500 mt-1">Press Enter to add, Esc to cancel</p>
                            )}
                        </div>

                        {/* Tags Filter */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-700 mb-2 block">Tags</label>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {getAllTags().map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            if (selectedTags.includes(tag)) {
                                                setSelectedTags(selectedTags.filter(t => t !== tag));
                                            } else {
                                                setSelectedTags([...selectedTags, tag]);
                                            }
                                        }}
                                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                            selectedTags.includes(tag)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            {selectedTags.length > 0 && (
                                <button
                                    onClick={() => setSelectedTags([])}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Clear tags
                                </button>
                            )}
                        </div>

                        <div className="border-t border-slate-300 pt-4 mt-4">
                            <div className="space-y-3">
                                {filteredProposals.map((proposal) => (
                                <div
                                    key={proposal.id}
                                    onClick={() => setSelectedProposal(proposal)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                                        selectedProposal?.id === proposal.id
                                            ? 'bg-white border-2 border-blue-400 shadow-md'
                                            : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="font-semibold text-slate-900 text-sm flex-1 line-clamp-2">{proposal.title}</h4>
                                        {(proposal.source === 'ai-generated' || proposal.source === 'ai-template') && (
                                            <span className="text-base flex-shrink-0">🤖</span>
                                        )}
                                    </div>

                                    {proposal.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{proposal.description}</p>
                                    )}

                                    {/* Category Badge */}
                                    {proposal.category && (
                                        <div className="mb-2">
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                                                📁 {proposal.category}
                                            </span>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {proposal.tags && proposal.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {proposal.tags.slice(0, 3).map((tag, idx) => (
                                                <span key={idx} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {proposal.tags.length > 3 && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                                                    +{proposal.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                            proposal.status === 'active' ? 'bg-green-100 text-green-700' :
                                            proposal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {proposal.status === 'active' ? '✓ Active' :
                                             proposal.status === 'draft' ? '✏️ Draft' :
                                             proposal.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                        )}

                {/* Proposal Content */}
                    {selectedProposal && (
                        <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1'} bg-white rounded border border-slate-200 overflow-hidden flex flex-col`}>
                            {/* Compact Proposal Header */}
                            <div className="px-4 py-2 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50">
                                <div className="flex items-center gap-3 flex-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={selectedProposal.title}
                                            onChange={(e) => setSelectedProposal({...selectedProposal, title: e.target.value})}
                                            className="text-lg font-bold text-slate-900 border-b-2 border-blue-300 px-2 py-1 bg-transparent flex-1"
                                            placeholder="Proposal title"
                                        />
                                    ) : (
                                        <h3 className="text-lg font-bold text-slate-900">{selectedProposal.title}</h3>
                                    )}

                                    {isEditing && (
                                        <button
                                            onClick={() => setShowMetadata(!showMetadata)}
                                            className="px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                                            title="Toggle metadata"
                                        >
                                            {showMetadata ? '▼ Hide Details' : '▶ Show Details'}
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {isEditing && selectedProposal.content.markdown !== undefined && (
                                        <button
                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                            className="p-2 hover:bg-slate-200 rounded transition-colors"
                                            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                                        >
                                            {isFullscreen ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            )}
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        onClick={() => updateProposal(selectedProposal)}
                                                        className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsEditing(false);
                                                            setIsFullscreen(false);
                                                            setShowMetadata(false);
                                                            fetchProposals();
                                                        }}
                                                        className="px-4 py-1.5 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setIsEditing(true)}
                                                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProposal(selectedProposal.id)}
                                                        className="px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Metadata Section */}
                            {isEditing && showMetadata && (
                                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                                    <div className="space-y-3">
                                        {/* Description */}
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                                            <textarea
                                                value={selectedProposal.description}
                                                onChange={(e) => setSelectedProposal({...selectedProposal, description: e.target.value})}
                                                className="w-full text-sm border border-slate-300 rounded px-2 py-1 min-h-[60px]"
                                                placeholder="Proposal description (supports markdown)"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            {/* Category */}
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                                                <select
                                                    value={selectedProposal.category || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__custom__') {
                                                            setShowCategoryInput(true);
                                                        } else {
                                                            setSelectedProposal({...selectedProposal, category: e.target.value || undefined});
                                                        }
                                                    }}
                                                    className="w-full text-sm px-2 py-1 border border-slate-300 rounded"
                                                >
                                                    <option value="">None</option>
                                                    {getAllCategories().map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                    <option value="__custom__">+ Add Custom...</option>
                                                </select>
                                                {showCategoryInput && (
                                                    <input
                                                        type="text"
                                                        value={newCategory}
                                                        onChange={(e) => setNewCategory(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newCategory.trim()) {
                                                                e.preventDefault();
                                                                setSelectedProposal({...selectedProposal, category: newCategory.trim()});
                                                                setNewCategory('');
                                                                setShowCategoryInput(false);
                                                            } else if (e.key === 'Escape') {
                                                                setNewCategory('');
                                                                setShowCategoryInput(false);
                                                            }
                                                        }}
                                                        placeholder="Enter custom category (press Enter)"
                                                        className="w-full text-sm px-2 py-1 mt-1 border border-blue-300 rounded"
                                                        autoFocus
                                                    />
                                                )}
                                            </div>

                                            {/* Tags */}
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-slate-600 block mb-1">Tags</label>
                                                <div className="flex gap-1 flex-wrap mb-1">
                                                    {(selectedProposal.tags || []).map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"
                                                        >
                                                            {tag}
                                                            <button
                                                                onClick={() => {
                                                                    const newTags = selectedProposal.tags?.filter(t => t !== tag) || [];
                                                                    setSelectedProposal({...selectedProposal, tags: newTags});
                                                                }}
                                                                className="hover:text-blue-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && newTag.trim()) {
                                                            e.preventDefault();
                                                            const tags = selectedProposal.tags || [];
                                                            if (!tags.includes(newTag.trim())) {
                                                                setSelectedProposal({...selectedProposal, tags: [...tags, newTag.trim()]});
                                                            }
                                                            setNewTag('');
                                                        }
                                                    }}
                                                    placeholder="Add tag (press Enter)"
                                                    className="w-full text-sm px-2 py-1 border border-slate-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Non-editing view metadata */}
                            {!isEditing && (
                                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                                    {/* Only show description for custom plans (markdown-based) to avoid duplication with AI-generated structured content */}
                                    {selectedProposal.content.markdown !== undefined && selectedProposal.description && (
                                        <div className="text-sm text-slate-600 mb-2">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedProposal.description}</ReactMarkdown>
                                        </div>
                                    )}
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedProposal.category && (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                                                📁 {selectedProposal.category}
                                            </span>
                                        )}
                                        {(selectedProposal.tags || []).map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Plan Content Sections */}
                            <div className="flex-1 overflow-auto">
                                <PlanContentRenderer
                                    content={selectedProposal.content}
                                    isEditing={isEditing}
                                    onChange={(newContent) => setSelectedProposal({...selectedProposal, content: newContent})}
                                    planTitle={selectedProposal.title}
                                />
                            </div>
                        </div>
                    )}
                    </div>
                </div>
                )}

                {/* AI Proposal Dialog */}
                {showAIDialog && (
                    <CreateAIProposalDialog
                        projectId={projectId}
                        onClose={() => setShowAIDialog(false)}
                        onSuccess={() => {
                            setShowAIDialog(false);
                            fetchProposals();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// Preprocess markdown to support simpler checklist syntax
const preprocessMarkdown = (markdown: string): string => {
    return markdown
        // Convert standalone [] or [X] at start of line to proper GFM task list format
        .replace(/^(\s*)\[\s*\]/gm, '$1- [ ]')
        .replace(/^(\s*)\[X\]/gmi, '$1- [x]')
        // Also handle them after list markers that are already there
        .replace(/^(\s*[-*+]\s+)\[\s*\]/gm, '$1[ ]')
        .replace(/^(\s*[-*+]\s+)\[X\]/gmi, '$1[x]');
};

// Component to render different section types
const PlanContentRenderer: React.FC<{
    content: { sections?: Section[]; markdown?: string };
    isEditing: boolean;
    onChange: (content: any) => void;
    planTitle?: string;
}> = ({ content, isEditing, onChange, planTitle }) => {

    // If content has markdown (custom plans), use simple markdown editor
    // Also default to markdown for custom plans that don't have sections
    if (content.markdown !== undefined || (!content.sections && content.markdown === undefined)) {
        // Initialize markdown if it doesn't exist
        const markdownContent = content.markdown !== undefined ? content.markdown : '';

        if (markdownContent !== content.markdown) {
            // Initialize the content with markdown
            onChange({ markdown: markdownContent });
        }

        // Preprocess markdown for rendering
        const processedMarkdown = preprocessMarkdown(markdownContent);
        return (
            <div className="h-full flex flex-col">
                {isEditing ? (
                    <>
                        {/* Markdown Formatting Toolbar */}
                        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-1 flex-wrap">
                                    <div className="text-xs text-slate-500 font-semibold mr-2">MARKDOWN SYNTAX:</div>
                                    <div className="text-xs text-slate-600 space-x-3">
                                        <code className="bg-slate-200 px-1 rounded"># Heading</code>
                                        <code className="bg-slate-200 px-1 rounded">**bold**</code>
                                        <code className="bg-slate-200 px-1 rounded">*italic*</code>
                                        <code className="bg-slate-200 px-1 rounded">- list</code>
                                        <code className="bg-slate-200 px-1 rounded">[] task</code>
                                        <code className="bg-slate-200 px-1 rounded">`code`</code>
                                        <code className="bg-slate-200 px-1 rounded">$math$</code>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    <span className="font-semibold">✨ Live Preview:</span> See formatted output on the right
                                </div>
                            </div>
                        </div>

                        {/* Split-pane editor with live preview */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Markdown Editor */}
                            <div className="flex-1 overflow-auto border-r border-slate-200">
                                <textarea
                                    value={markdownContent}
                                    onChange={(e) => onChange({ markdown: e.target.value })}
                                    className="w-full h-full p-6 font-mono text-sm resize-none focus:outline-none border-none bg-white"
                                    style={{ minHeight: '500px' }}
                                    placeholder="# Start writing your proposal here...

Use markdown for formatting:
- **Bold** and *italic* text
- Lists with - or 1.
- [ ] Checklists
- > Quotes
- `code` blocks"
                                />
                            </div>

                            {/* Live Preview */}
                            <div className="flex-1 overflow-auto bg-slate-50 p-6">
                                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-li:my-1 prose-p:leading-relaxed prose-code:bg-blue-50 prose-code:text-blue-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:shadow-lg prose-pre:p-4 prose-pre:overflow-x-auto [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_li.task-list-item]:list-none [&_li.task-list-item]:ml-0">
                                    {!markdownContent || markdownContent.trim() === '' ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <p className="text-lg">Preview</p>
                                            <p className="text-sm mt-2">Your formatted content will appear here</p>
                                        </div>
                                    ) : (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                // Style task list checkboxes
                                                input: ({node, ...props}) => (
                                                    <input {...props} className="mr-2 align-middle" />
                                                ),
                                                // Ensure proper line breaks
                                                p: ({node, ...props}) => (
                                                    <p className="mb-4" {...props} />
                                                ),
                                                // Better code block styling
                                                code: ({node, inline, className, children, ...props}: any) => {
                                                    if (inline) {
                                                        return (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                    return (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                            }}
                                        >
                                            {processedMarkdown}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="prose prose-slate max-w-none p-6 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-li:my-1 prose-p:leading-relaxed prose-code:bg-blue-50 prose-code:text-blue-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:shadow-lg prose-pre:p-4 prose-pre:overflow-x-auto [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_li.task-list-item]:list-none [&_li.task-list-item]:ml-0">
                        {!markdownContent || markdownContent.trim() === '' ? (
                            <div className="text-center py-12 text-slate-400">
                                <p className="text-lg">This proposal is empty</p>
                                <p className="text-sm mt-2">Click Edit to start adding content</p>
                            </div>
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    // Style task list checkboxes
                                    input: ({node, ...props}) => (
                                        <input {...props} className="mr-2 align-middle" />
                                    ),
                                    // Ensure proper line breaks
                                    p: ({node, ...props}) => (
                                        <p className="mb-4" {...props} />
                                    ),
                                }}
                            >
                                {processedMarkdown}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Otherwise render as structured sections (AI-generated)
    const sections = content.sections || [];

    const renderSection = (section: Section, index: number) => {
        switch (section.type) {
            case 'roadmap-step':
                return (
                    <div key={section.id} className="mb-6 bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-5 border border-blue-200">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                                {section.metadata?.stepNumber || index + 1}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
                            {section.metadata?.timeEstimate && (
                                <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                                    {section.metadata.timeEstimate}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>

                        {section.metadata?.resources && section.metadata.resources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Resources:</h4>
                                <div className="space-y-2">
                                    {section.metadata.resources.map((res: any, i: number) => (
                                        <a
                                            key={i}
                                            href={res.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                                        >
                                            <span>🔗</span>
                                            <span>{res.title}</span>
                                            <span className="text-xs text-slate-500">({res.type})</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'category-breakdown':
                return (
                    <div key={section.id} className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{section.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {section.metadata?.categories?.map((cat: any, i: number) => (
                                <div key={i} className="bg-gradient-to-br from-blue-50 to-sky-50 p-5 rounded-lg border border-blue-200">
                                    <div className="text-3xl font-bold text-blue-600 mb-1">{cat.percentage}%</div>
                                    <div className="text-slate-700 font-medium">{cat.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'skills-list':
                return (
                    <div key={section.id} className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{section.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.metadata?.skills?.map((skill: any, i: number) => (
                                <div key={i} className="bg-slate-50 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-900">{skill.name}</h4>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                            {skill.level}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{skill.description}</p>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full"
                                                style={{ width: `${skill.relevanceScore * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-600">
                                            {Math.round(skill.relevanceScore * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'goals-list':
                return (
                    <div key={section.id} className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{section.title}</h3>
                        <div className="space-y-3">
                            {section.metadata?.goals?.map((goal: any, i: number) => (
                                <div key={i} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                                    <h4 className="font-bold text-purple-900 mb-1">{goal.goal}</h4>
                                    <p className="text-sm text-slate-700">{goal.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'text':
            default:
                // Skip showing section title if it's the first section and matches the plan title (avoid duplication)
                const showSectionTitle = !(index === 0 && planTitle && section.title === planTitle);

                return (
                    <div key={section.id} className="mb-6">
                        {showSectionTitle && (
                            <h3 className="text-lg font-bold text-slate-900 mb-3">{section.title}</h3>
                        )}
                        {isEditing ? (
                            <textarea
                                value={section.content}
                                onChange={(e) => {
                                    const newSections = [...(content.sections || [])];
                                    newSections[index] = {...section, content: e.target.value};
                                    onChange({sections: newSections});
                                }}
                                className="w-full min-h-[100px] p-3 border-2 border-blue-300 rounded-lg"
                            />
                        ) : (
                            <div className="prose prose-slate max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {section.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="p-6 space-y-6">
            {sections.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p className="text-lg">This proposal has no content sections</p>
                    <p className="text-sm mt-2">AI-generated proposals will appear here with structured sections</p>
                </div>
            ) : (
                sections.map((section, index) => renderSection(section, index))
            )}
        </div>
    );
};

export default ProjectProposals;
