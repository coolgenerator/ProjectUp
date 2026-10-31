import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { CourseRequirements } from './CourseRequirementsInput';

export interface ProjectTopic {
  topic_id: string;
  name: string;
  tagline: string;
  description?: string; // Optional - no longer generated to save tokens
  alignment_reason?: string; // Optional - no longer generated to save tokens
  suggested_tech: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficulty_reason: string;
  estimated_weeks: number;
  key_features: string[];
}

interface AITopicSuggestionsProps {
  projectType: 'course' | 'research' | 'hackathon' | 'capstone' | 'industry';
  context: any; // Generic context object - can be CourseRequirements or research context
  courseRequirements?: CourseRequirements; // Deprecated - kept for backwards compatibility
  onTopicSelected: (topic: ProjectTopic | null, topics?: ProjectTopic[], summary?: string) => void;
  onBack: () => void;
  cachedTopics?: ProjectTopic[];
  cachedAnalysisSummary?: string;
  cachedSelectedTopicId?: string | null;
  onTopicsGenerated?: (topics: ProjectTopic[], summary: string) => void;
}

/**
 * AI Topic Suggestions - Step 2 of AI-Guided Project Creation
 *
 * Displays 3-5 AI-generated project topics based on course requirements.
 * Users can select one topic or choose to define their own.
 */
const AITopicSuggestions: React.FC<AITopicSuggestionsProps> = ({
  projectType,
  context,
  courseRequirements, // Deprecated - fallback for backwards compatibility
  onTopicSelected,
  onBack,
  cachedTopics,
  cachedAnalysisSummary,
  cachedSelectedTopicId,
  onTopicsGenerated,
}) => {
  // Use context if provided, otherwise fall back to courseRequirements for backwards compatibility
  const actualContext = context || courseRequirements;
  const [topics, setTopics] = useState<ProjectTopic[]>(cachedTopics || []);
  const [analysisSummary, setAnalysisSummary] = useState(cachedAnalysisSummary || '');
  const [isLoading, setIsLoading] = useState(!cachedTopics);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(cachedSelectedTopicId || null);
  const [error, setError] = useState<string | null>(null);

  // Customization states
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
    // Only load topics if we don't have cached data
    if (!cachedTopics) {
      loadTopicSuggestions();
    }
  }, [cachedTopics]);

  const loadTopicSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { suggestTopics } = await import('../../../api/onboardingAPI');
      const data = await suggestTopics(projectType, actualContext);

      const generatedTopics = data.topics || [];
      const generatedSummary = data.analysis_summary || '';

      setTopics(generatedTopics);
      setAnalysisSummary(generatedSummary);

      // Notify parent component about generated topics
      if (onTopicsGenerated) {
        onTopicsGenerated(generatedTopics, generatedSummary);
      }
    } catch (error) {
      console.error('Failed to load topic suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load suggestions');
      toast.error('Failed to generate topic suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    // Clear selected topic and regenerate
    setSelectedTopic(null);
    loadTopicSuggestions();
    toast.success('Regenerating topic suggestions...');
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    setShowCustomization(false);
    if (topicId !== 'custom') {
      const topic = topics.find((t) => t.topic_id === topicId);
      if (topic) {
        setEditedTopic({ ...topic });
      }
    } else {
      setEditedTopic(null);
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

    // Set helpful placeholder based on field
    let placeholder = '';
    switch (fieldName) {
      case 'tech_stack':
        placeholder = 'e.g., Use Python/Django instead of Node.js, or Add React Native for mobile';
        break;
      case 'features':
        placeholder = 'e.g., Add real-time collaboration feature, or Focus more on data analytics';
        break;
      case 'tagline':
        placeholder = 'e.g., Make it sound more innovative, or Emphasize the social impact';
        break;
      case 'name':
        placeholder = 'e.g., Make it catchier, or Relate it to sustainability';
        break;
    }
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

      const refinedTopic = await refineTopic(projectType, {
        ...actualContext,
        base_topic: editedTopic,
        modification_request: modificationRequest,
      });

      setEditedTopic(refinedTopic);
      toast.success(`${refineFieldName.replace('_', ' ')} updated with AI!`);
      setRefineRequest('');
    } catch (error) {
      console.error('Failed to refine field:', error);
      toast.error('Failed to refine. Please try again.');
    } finally {
      setIsRegeneratingField(null);
    }
  };

  const handleAddTechStack = () => {
    if (!editedTopic) return;
    setEditedTopic({
      ...editedTopic,
      suggested_tech: [...editedTopic.suggested_tech, ''],
    });
  };

  const handleRemoveTechStack = (index: number) => {
    if (!editedTopic) return;
    setEditedTopic({
      ...editedTopic,
      suggested_tech: editedTopic.suggested_tech.filter((_, i) => i !== index),
    });
  };

  const handleAddFeature = () => {
    if (!editedTopic) return;
    setEditedTopic({
      ...editedTopic,
      key_features: [...editedTopic.key_features, ''],
    });
  };

  const handleRemoveFeature = (index: number) => {
    if (!editedTopic) return;
    setEditedTopic({
      ...editedTopic,
      key_features: editedTopic.key_features.filter((_, i) => i !== index),
    });
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
        <h3 className="text-xl font-semibold text-gray-900 mt-6">Analyzing Your Course...</h3>
        <p className="text-gray-600 mt-2">Generating customized project topics</p>
        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-gray-500">
          <p>✨ Understanding requirements</p>
          <p>🎯 Evaluating feasibility</p>
          <p>💡 Creating suggestions</p>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Suggested Project Topics</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">Choose a project that aligns with your course requirements</p>
      </div>

      {/* Topic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {topics.map((topic, index) => (
          <React.Fragment key={topic.topic_id}>
            <motion.div
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {/* Project Name - Inline Editable */}
                  {selectedTopic === topic.topic_id && showCustomization && editedTopic ? (
                    <div className="group">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editedTopic.name}
                          onChange={(e) => setEditedTopic({ ...editedTopic, name: e.target.value })}
                          className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent focus:outline-none flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRefinePrompt('name');
                          }}
                          disabled={isRegeneratingField === 'name'}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Refine with AI"
                        >
                          {isRegeneratingField === 'name' ? (
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {/* Tagline - Inline Editable */}
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="text"
                          value={editedTopic.tagline}
                          onChange={(e) => setEditedTopic({ ...editedTopic, tagline: e.target.value })}
                          className="text-sm text-blue-600 font-medium border-b border-blue-300 bg-transparent focus:outline-none flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRefinePrompt('tagline');
                          }}
                          disabled={isRegeneratingField === 'tagline'}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Refine with AI"
                        >
                          {isRegeneratingField === 'tagline' ? (
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{topic.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{topic.tagline}</p>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0 ml-3 flex items-center space-x-2">
                  {selectedTopic === topic.topic_id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (showCustomization) {
                            handleSaveManualEdits();
                          } else {
                            handleToggleEditMode();
                          }
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          showCustomization
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                        title={showCustomization ? 'Save changes' : 'Edit topic'}
                      >
                        {showCustomization ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        )}
                      </button>
                      {showCustomization && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEditMode();
                          }}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Cancel editing"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {!showCustomization && (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Difficulty & Duration */}
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(topic.difficulty)}`}>
                  {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                </span>
                <span className="text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ~{topic.estimated_weeks} weeks
                </span>
              </div>

              {/* Tech Stack */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Tech Stack:</p>
                  {selectedTopic === topic.topic_id && showCustomization && editedTopic && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRefinePrompt('tech_stack');
                        }}
                        disabled={isRegeneratingField === 'tech_stack'}
                        className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center space-x-1"
                        title="Refine with AI"
                      >
                        {isRegeneratingField === 'tech_stack' ? (
                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                        )}
                        <span>AI</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddTechStack();
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
                {selectedTopic === topic.topic_id && showCustomization && editedTopic ? (
                  <div className="space-y-2">
                    {editedTopic.suggested_tech.map((tech, idx) => (
                      <div key={idx} className="flex items-center space-x-2 group">
                        <input
                          type="text"
                          value={tech}
                          onChange={(e) => {
                            const newTech = [...editedTopic.suggested_tech];
                            newTech[idx] = e.target.value;
                            setEditedTopic({ ...editedTopic, suggested_tech: newTech });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-3 py-2 bg-blue-50 text-gray-700 rounded text-xs border border-blue-200 focus:border-blue-500 focus:outline-none"
                          placeholder="Technology (e.g., React, Python, MongoDB)"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTechStack(idx);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topic.suggested_tech.map((tech) => (
                      <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Features */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Key Features:</p>
                  {selectedTopic === topic.topic_id && showCustomization && editedTopic && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRefinePrompt('features');
                        }}
                        disabled={isRegeneratingField === 'features'}
                        className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center space-x-1"
                        title="Refine with AI"
                      >
                        {isRegeneratingField === 'features' ? (
                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                        )}
                        <span>AI</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFeature();
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
                {selectedTopic === topic.topic_id && showCustomization && editedTopic ? (
                  <ul className="space-y-2">
                    {editedTopic.key_features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2 group">
                        <span className="text-blue-600 mt-1">•</span>
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => {
                            const newFeatures = [...editedTopic.key_features];
                            newFeatures[idx] = e.target.value;
                            setEditedTopic({ ...editedTopic, key_features: newFeatures });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-xs text-gray-600 bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none"
                          placeholder="Feature description"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFeature(idx);
                          }}
                          className="p-0.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-1">
                    {topic.key_features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start">
                        <span className="text-blue-600 mr-1">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </React.Fragment>
        ))}

        {/* Custom Topic Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: topics.length * 0.1 }}
          onClick={() => handleSelectTopic('custom')}
          className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
            selectedTopic === 'custom'
              ? 'border-purple-500 shadow-lg'
              : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
          }`}
        >
          <div className="p-6 h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Define My Own Project</h3>
            <p className="text-sm text-gray-600 mb-4">
              None of these fit? Create your project from scratch with custom details.
            </p>
            {selectedTopic === 'custom' && (
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-purple-800 flex-1">
            <p className="font-medium mb-1">💡 What happens next?</p>
            <p>
              We'll help you elaborate on the selected topic with detailed features, architecture, and milestones.
            </p>
          </div>
        </div>
      </div>

      {/* Regenerate Options */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-2 flex-1">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Not satisfied with these suggestions?</p>
              <p className="text-xs mt-1">Generate new topics or go back to adjust requirements</p>
            </div>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
          >
            🔄 Regenerate Suggestions
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Team
        </button>
        <button
          onClick={() => {
            if (selectedTopic === 'custom') {
              onTopicSelected(null, topics, analysisSummary);
            } else {
              const topic = topics.find((t) => t.topic_id === selectedTopic);
              if (topic) {
                // Use editedTopic if available (user made changes), otherwise use original topic
                const finalTopic = editedTopic || topic;
                onTopicSelected(finalTopic, topics, analysisSummary);
              }
            }
          }}
          disabled={!selectedTopic}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
        >
          {selectedTopic === 'custom' ? 'Create Custom Project' : 'Continue with Selected Topic'} →
        </button>
      </div>

      {/* AI Refinement Dialog */}
      {showRefinePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRefinePrompt(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900">
                    Refine {refineFieldName.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} with AI
                  </h3>
                </div>
                <button
                  onClick={() => setShowRefinePrompt(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Describe how you'd like to refine this field. The AI will update only this field while keeping everything else unchanged.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your refinement request:</label>
                <textarea
                  value={refineRequest}
                  onChange={(e) => setRefineRequest(e.target.value)}
                  placeholder={
                    refineFieldName === 'tech_stack'
                      ? 'e.g., Use Python/Django instead of Node.js, or Add React Native for mobile'
                      : refineFieldName === 'features'
                      ? 'e.g., Add real-time collaboration feature, or Focus more on data analytics'
                      : refineFieldName === 'tagline'
                      ? 'e.g., Make it sound more innovative, or Emphasize the social impact'
                      : 'e.g., Make it catchier, or Relate it to sustainability'
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  autoFocus
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-purple-800 font-medium mb-1">💡 Tips:</p>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• Be specific about what you want to change</li>
                  <li>• You can request additions, replacements, or style changes</li>
                  <li>• The AI understands your course context and requirements</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRefinePrompt(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyRefine}
                  disabled={!refineRequest.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <span>Refine with AI</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AITopicSuggestions;
