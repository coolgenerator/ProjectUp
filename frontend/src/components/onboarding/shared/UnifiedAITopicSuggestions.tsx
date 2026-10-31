import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';

export interface ProjectTopic {
  topic_id: string;
  name: string;
  tagline: string;
  description: string;
  alignment_reason?: string;
  suggested_tech: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficulty_reason?: string;
  estimated_weeks?: number;
  key_features: string[];
}

interface UnifiedAITopicSuggestionsProps {
  projectType: string; // course, hackathon, capstone, competition, etc.
  context: Record<string, any>; // Flexible context object for any project type
  onTopicSelected: (topic: ProjectTopic | null) => void;
  onBack: () => void;
}

/**
 * Unified AI Topic Suggestions Component
 *
 * Works with all 9 project types via the unified backend API.
 * Dynamically adapts UI based on project type.
 */
const UnifiedAITopicSuggestions: React.FC<UnifiedAITopicSuggestionsProps> = ({
  projectType,
  context,
  onTopicSelected,
  onBack,
}) => {
  const [topics, setTopics] = useState<ProjectTopic[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customization and editing states
  const [showCustomization, setShowCustomization] = useState(false);
  const [customizationRequest, setCustomizationRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Manual editing states
  const [editedTopic, setEditedTopic] = useState<ProjectTopic | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isRegeneratingField, setIsRegeneratingField] = useState<string | null>(null);
  const [showRefinePrompt, setShowRefinePrompt] = useState(false);
  const [refineFieldName, setRefineFieldName] = useState<string>('');
  const [refineRequest, setRefineRequest] = useState('');

  useEffect(() => {
    console.log('[UnifiedAITopicSuggestions] Component mounted, loading topics for:', projectType);
    console.log('[UnifiedAITopicSuggestions] Context:', context);
    loadTopicSuggestions();
  }, [projectType, context]);

  const loadTopicSuggestions = async () => {
    console.log('[UnifiedAITopicSuggestions] Starting to load topics...');
    setIsLoading(true);
    setError(null);

    try {
      const url = `${config.AI_AGENT_URL}/onboarding/${projectType}/suggest-topics`;
      console.log('[UnifiedAITopicSuggestions] Fetching from:', url);
      console.log('[UnifiedAITopicSuggestions] Request body:', context);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      console.log('[UnifiedAITopicSuggestions] Response status:', response.status, response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error('[UnifiedAITopicSuggestions] Error response:', error);
        throw new Error(error.error || 'Failed to generate topic suggestions');
      }

      const data = await response.json();
      console.log('[UnifiedAITopicSuggestions] Received data:', data);
      console.log('[UnifiedAITopicSuggestions] Topics count:', data.topics?.length);
      setTopics(data.topics || []);
      setAnalysisSummary(data.analysis_summary || '');
    } catch (error) {
      console.error('Failed to load topic suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load suggestions');
      toast.error('Failed to generate topic suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    setSelectedTopic(null);
    setEditedTopic(null);
    setShowCustomization(false);
    loadTopicSuggestions();
    toast.success('Regenerating topic suggestions...');
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    setShowCustomization(false);
    const topic = topics.find((t) => t.topic_id === topicId);
    if (topic) {
      setEditedTopic({ ...topic });
    }
  };

  const handleToggleEditMode = () => {
    if (showCustomization) {
      // Exiting edit mode - reset to original
      const originalTopic = topics.find((t) => t.topic_id === selectedTopic);
      if (originalTopic) {
        setEditedTopic({ ...originalTopic });
      }
    }
    setShowCustomization(!showCustomization);
    setEditingField(null);
  };

  const handleSaveManualEdits = () => {
    if (!editedTopic || !selectedTopic) return;

    // Update the topic in the list
    setTopics(topics.map((t) => (t.topic_id === selectedTopic ? editedTopic : t)));
    setShowCustomization(false);
    setEditingField(null);
    toast.success('Changes saved!');
  };

  const handleOpenRefinePrompt = (fieldName: string) => {
    setRefineFieldName(fieldName);
    setShowRefinePrompt(true);
    setRefineRequest('');
  };

  const handleApplyRefine = async () => {
    if (!editedTopic || !selectedTopic || !refineRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsRegeneratingField(refineFieldName);
    setShowRefinePrompt(false);

    try {
      const { refineTopic } = await import('../../../api/onboardingAPI');

      // Build the modification request based on field and user input
      let modificationRequest = '';
      switch (refineFieldName) {
        case 'tech_stack':
          modificationRequest = `For the tech stack: ${refineRequest}. Keep all other aspects (name, tagline, features, difficulty, duration) exactly the same.`;
          break;
        case 'features':
          modificationRequest = `For the key features: ${refineRequest}. Keep all other aspects (name, tagline, tech stack, difficulty, duration) exactly the same.`;
          break;
        case 'tagline':
          modificationRequest = `For the tagline: ${refineRequest}. Keep all other aspects (name, tech stack, features, difficulty, duration) exactly the same.`;
          break;
        case 'name':
          modificationRequest = `For the project name: ${refineRequest}. Keep all other aspects (tagline, tech stack, features, difficulty, duration) exactly the same.`;
          break;
      }

      const refinedTopic = await refineTopic(projectType, editedTopic, modificationRequest, context);

      // Update only the refined field(s)
      const updatedTopic = { ...editedTopic, ...refinedTopic };
      setEditedTopic(updatedTopic);
      setTopics(topics.map((t) => (t.topic_id === selectedTopic ? updatedTopic : t)));

      toast.success('Field refined successfully!');
    } catch (error) {
      console.error('Failed to refine field:', error);
      toast.error('Failed to refine field. Please try again.');
    } finally {
      setIsRegeneratingField(null);
      setRefineRequest('');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getProjectTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: 'Course Project',
      hackathon: 'Hackathon Project',
      capstone: 'Capstone Project',
      competition: 'Competition Entry',
      internship: 'Internship Project',
      opensource: 'Open Source Contribution',
      portfolio: 'Portfolio Project',
      coursenote: 'Course Notes',
      examprep: 'Exam Preparation',
    };
    return labels[type] || 'Project';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI is Analyzing Your Requirements...</h3>
        <p className="text-gray-600 mt-2">Generating customized {getProjectTypeLabel(projectType)} topic suggestions</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>✨ Understanding requirements</p>
          <p>🎯 Evaluating feasibility</p>
          <p>💡 Creating topic suggestions</p>
        </div>
      </div>
    );
  }

  if (error) {
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Generate Suggestions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← Go Back
            </button>
            <button
              onClick={loadTopicSuggestions}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Suggested {getProjectTypeLabel(projectType)} Topics</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">{analysisSummary}</p>
      </div>

      {/* Topic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.topic_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelectTopic(topic.topic_id)}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
              selectedTopic === topic.topic_id
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="p-6">
              {/* Topic Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{topic.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{topic.tagline}</p>
                </div>
                {selectedTopic === topic.topic_id && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-700 text-sm leading-relaxed mb-4">{topic.description}</p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(topic.difficulty)}`}>
                  {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                </span>
                {topic.estimated_weeks && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    {topic.estimated_weeks} weeks
                  </span>
                )}
              </div>

              {/* Key Features */}
              {topic.key_features && topic.key_features.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Features</p>
                  <div className="flex flex-wrap gap-1">
                    {topic.key_features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {feature}
                      </span>
                    ))}
                    {topic.key_features.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                        +{topic.key_features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tech Stack */}
              {topic.suggested_tech && topic.suggested_tech.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested Tech</p>
                  <div className="flex flex-wrap gap-1">
                    {topic.suggested_tech.slice(0, 4).map((tech, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">
                        {tech}
                      </span>
                    ))}
                    {topic.suggested_tech.length > 4 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                        +{topic.suggested_tech.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Customization Panel */}
      {selectedTopic && editedTopic && showCustomization && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">✏️ Customize Topic</h3>
            <button
              onClick={handleSaveManualEdits}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Save Changes
            </button>
          </div>

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedTopic.name}
                  onChange={(e) => setEditedTopic({ ...editedTopic, name: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleOpenRefinePrompt('name')}
                  disabled={isRegeneratingField === 'name'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center space-x-2"
                >
                  {isRegeneratingField === 'name' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Refine</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tagline Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedTopic.tagline}
                  onChange={(e) => setEditedTopic({ ...editedTopic, tagline: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleOpenRefinePrompt('tagline')}
                  disabled={isRegeneratingField === 'tagline'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center space-x-2"
                >
                  {isRegeneratingField === 'tagline' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Refine</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tech Stack</label>
              <div className="flex items-start space-x-2">
                <div className="flex-1 flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-white">
                  {editedTopic.suggested_tech.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleOpenRefinePrompt('tech_stack')}
                  disabled={isRegeneratingField === 'tech_stack'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center space-x-2"
                >
                  {isRegeneratingField === 'tech_stack' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Refine</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Key Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Features</label>
              <div className="flex items-start space-x-2">
                <div className="flex-1 space-y-2">
                  {editedTopic.key_features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded">
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleOpenRefinePrompt('features')}
                  disabled={isRegeneratingField === 'features'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center space-x-2"
                >
                  {isRegeneratingField === 'features' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Refine</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Refine Prompt Modal */}
      {showRefinePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
          >
            <h3 className="text-xl font-bold mb-4">✨ AI Refinement</h3>
            <p className="text-gray-600 mb-4">
              Describe how you want to modify the <strong>{refineFieldName.replace('_', ' ')}</strong>:
            </p>
            <textarea
              value={refineRequest}
              onChange={(e) => setRefineRequest(e.target.value)}
              placeholder="e.g., Make it more modern, use Python instead, add mobile support..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRefinePrompt(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyRefine}
                disabled={!refineRequest.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
              >
                Apply Refinement
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          ← Back
        </button>
        <div className="flex items-center space-x-3">
          {selectedTopic && !showCustomization && (
            <button
              onClick={handleToggleEditMode}
              className="px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Customize Topic</span>
            </button>
          )}
          {showCustomization && (
            <button
              onClick={handleToggleEditMode}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel Editing
            </button>
          )}
          <button
            onClick={() => {
              const selected = editedTopic || topics.find((t) => t.topic_id === selectedTopic);
              onTopicSelected(selected || null);
            }}
            disabled={!selectedTopic}
            className={`px-8 py-3 rounded-lg font-semibold ${
              selectedTopic
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue with Selected Topic →
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAITopicSuggestions;
