import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import fetchWithAuth from '../../hooks/fetchWithAuth';

interface CreateAIProposalDialogProps {
    projectId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const PROPOSAL_TEMPLATES = [
    {
        id: 'full-proposal',
        name: 'Full Proposal',
        description: 'Comprehensive proposal with all sections',
        sections: [
            'Executive Summary',
            'Problem Statement',
            'Project Description',
            'Goals and Objectives',
            'Timeline',
            'Budget',
            'Team/Qualifications',
            'Evaluation Plan',
            'Sustainability'
        ]
    },
    {
        id: 'quick-proposal',
        name: 'Quick Proposal',
        description: 'Essential sections for fast approval',
        sections: [
            'Executive Summary',
            'Problem Statement',
            'Project Description',
            'Goals and Objectives',
            'Timeline'
        ]
    },
    {
        id: 'research-proposal',
        name: 'Research Proposal',
        description: 'Academic or research-focused proposal',
        sections: [
            'Executive Summary',
            'Problem Statement',
            'Project Description',
            'Goals and Objectives',
            'Timeline',
            'Evaluation Plan'
        ]
    },
    {
        id: 'grant-proposal',
        name: 'Grant Proposal',
        description: 'Funding-focused with budget details',
        sections: [
            'Executive Summary',
            'Problem Statement',
            'Project Description',
            'Goals and Objectives',
            'Budget',
            'Team/Qualifications',
            'Evaluation Plan',
            'Sustainability'
        ]
    }
];

const CreateAIProposalDialog: React.FC<CreateAIProposalDialogProps> = ({
    projectId,
    onClose,
    onSuccess,
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState(PROPOSAL_TEMPLATES[0]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!title.trim()) {
            setError('Please enter a proposal title');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Generate AI proposal content based on template
            const sectionsContent = selectedTemplate.sections.map(sectionTitle => {
                return {
                    title: sectionTitle,
                    placeholder: getSectionPlaceholder(sectionTitle)
                };
            });

            // Create markdown content with all sections
            const markdownContent = sectionsContent.map(section => {
                return `## ${section.title}\n\n${section.placeholder}\n`;
            }).join('\n');

            // Create the proposal
            const response = await fetchWithAuth(`/api/projects/${projectId}/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || `${selectedTemplate.name} generated for ${title}`,
                    plan_type: 'proposal',
                    content: {
                        markdown: markdownContent
                    },
                    source: 'ai-template',
                    category: 'Proposal',
                    tags: [selectedTemplate.id, 'ai-generated']
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create proposal');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate proposal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                {/* Header */}
                <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold">Create AI Proposal</h2>
                            <p className="text-sm text-purple-100">Generate a professional proposal with AI assistance</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Proposal Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                            Proposal Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            placeholder="e.g., AI-Powered Project Management Platform"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                            Brief Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                            placeholder="Provide context about your proposal..."
                        />
                    </div>

                    {/* Template Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Select Proposal Template *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PROPOSAL_TEMPLATES.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        selectedTemplate.id === template.id
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            checked={selectedTemplate.id === template.id}
                                            onChange={() => setSelectedTemplate(template)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                            <div className="mt-2 text-xs text-gray-500">
                                                {template.sections.length} sections
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Template Sections Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Included Sections:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedTemplate.sections.map((section, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {section}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1 text-sm text-blue-800">
                                <p className="font-medium mb-1">How it works:</p>
                                <p>The AI will create a structured proposal with placeholders for each section. You can then edit and customize the content to match your specific needs.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !title.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Proposal
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper function to get section placeholder content
function getSectionPlaceholder(sectionTitle: string): string {
    const placeholders: Record<string, string> = {
        'Executive Summary': `A brief overview (1-2 paragraphs) that captures the essence of your project:
- What you're doing
- Why it matters
- What you're asking for

This should hook the reader immediately and provide a clear snapshot of the entire proposal.`,

        'Problem Statement': `Clearly define the problem or opportunity you're addressing:
- What specific problem exists?
- Who does it affect and how?
- What evidence or data supports this problem?
- Why is solving this problem important now?`,

        'Project Description': `Detail what you're actually proposing to do:
- Your approach and methodology
- Key activities and deliverables
- How your solution addresses the problem
- Timeline for implementation
- Expected outcomes`,

        'Goals and Objectives': `Distinguish between broad goals and specific objectives:

**Goals** (What you hope to achieve):
- [Goal 1]
- [Goal 2]

**Objectives** (Concrete, measurable outcomes - use SMART criteria):
- [Specific, Measurable, Achievable, Relevant, Time-bound objective 1]
- [Specific, Measurable, Achievable, Relevant, Time-bound objective 2]`,

        'Timeline': `Break down the project into phases with clear milestones:

**Phase 1: [Name]** (Duration)
- Milestone 1
- Milestone 2

**Phase 2: [Name]** (Duration)
- Milestone 3
- Milestone 4

Include key dates and deliverables for each phase.`,

        'Budget': `Itemize your costs transparently:

| Category | Item | Cost | Justification |
|----------|------|------|---------------|
| Personnel | [Role] | $X,XXX | [Justification] |
| Materials | [Item] | $X,XXX | [Justification] |
| Overhead | [Item] | $X,XXX | [Justification] |

**Total: $XX,XXX**

Justify major line items and explain your calculation methodology.`,

        'Team/Qualifications': `Explain why you and your team are positioned to execute successfully:
- Team member backgrounds and relevant experience
- Organizational capacity and track record
- Partnerships and collaborations
- Unique qualifications for this project`,

        'Evaluation Plan': `Describe how you'll measure success and assess impact:
- Key performance indicators (KPIs)
- Metrics you'll track
- Data collection methods
- Reporting timeline
- How you'll know if you've achieved your objectives`,

        'Sustainability': `Address how the project will continue beyond initial funding:
- Long-term sustainability strategy
- How impact will endure
- Future funding sources
- Capacity building elements
- Exit strategy or transition plan`
    };

    return placeholders[sectionTitle] || `[Add content for ${sectionTitle}]`;
}

export default CreateAIProposalDialog;
