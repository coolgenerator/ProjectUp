import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { TopicElaboration } from './TopicElaboration';

export interface ProjectDetails {
  selectedName: string;
  description: string;
  tags: string[];
}

interface ProjectDetailsGeneratorProps {
  topicElaboration?: TopicElaboration; // Optional - not needed for research projects
  topicName: string;
  topicDescription?: string; // For research projects without elaboration
  onComplete: (details: ProjectDetails, board?: any) => void;
  onBack: () => void;
  projectType?: string;
  cachedDetails?: ProjectDetails;
}

/**
 * AI Project Details Generator - Step 4 of AI-Guided Project Creation
 *
 * Generates project name options, description, and tags based on elaboration.
 * Users can select a name or provide their own, and edit all fields.
 */
const AIProjectDetailsGenerator: React.FC<ProjectDetailsGeneratorProps> = ({
  topicElaboration,
  topicName,
  topicDescription,
  onComplete,
  onBack,
  projectType = 'course',
  cachedDetails,
}) => {
  const [nameOptions, setNameOptions] = useState<Array<{ name: string; rationale: string }>>([]);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(!cachedDetails);
  const [error, setError] = useState<string | null>(null);

  const [selectedName, setSelectedName] = useState<string>(cachedDetails?.selectedName || '');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [description, setDescription] = useState(cachedDetails?.description || '');
  const [tags, setTags] = useState<string[]>(cachedDetails?.tags || []);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    // Only load if we don't have cached data
    if (!cachedDetails) {
      loadProjectDetails();
    }
  }, [cachedDetails]);

  const loadProjectDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { generateProjectDetails } = await import('../../../api/onboardingAPI');

      // For research projects without elaboration, use topic description
      const requestData = topicElaboration
        ? {
            name: topicName,
            background: topicElaboration.background,
            core_features: topicElaboration.core_features,
          }
        : {
            name: topicName,
            background: topicDescription || topicName,
          };

      const data = await generateProjectDetails(projectType, requestData);

      setNameOptions(data.name_options || []);
      setGeneratedDescription(data.description || '');
      setGeneratedTags(data.tags || []);

      // Pre-select first name option
      if (data.name_options && data.name_options.length > 0) {
        setSelectedName(data.name_options[0].name);
      }
      setDescription(data.description || '');
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to load project details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load details');
      toast.error('Failed to generate project details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleRegenerate = () => {
    // Clear all generated data and regenerate
    setNameOptions([]);
    setGeneratedDescription('');
    setGeneratedTags([]);
    setSelectedName('');
    setDescription('');
    setTags([]);
    setCustomName('');
    setIsCustomName(false);
    loadProjectDetails();
    toast.success('Regenerating project details...');
  };

  const handleContinue = () => {
    const finalName = isCustomName ? customName : selectedName;
    if (!finalName.trim()) {
      toast.error('Please select or enter a project name');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a project description');
      return;
    }

    onComplete({
      selectedName: finalName,
      description,
      tags,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI is Crafting Your Project Details...</h3>
        <p className="text-gray-600 mt-2">Creating names, description, and tags</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Generate Details</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← Go Back
            </button>
            <button onClick={loadProjectDetails} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
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
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Finalize Your Project Details</h2>
        <p className="text-gray-600">Choose a name, refine the description, and add tags</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
        {/* Project Name Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Name</h3>
          <div className="space-y-3">
            {nameOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  setSelectedName(option.name);
                  setIsCustomName(false);
                }}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedName === option.name && !isCustomName
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{option.name}</h4>
                      {selectedName === option.name && !isCustomName && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.rationale}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Custom Name Option */}
            <div
              className={`border-2 rounded-lg p-4 transition-all ${
                isCustomName ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="radio"
                  checked={isCustomName}
                  onChange={() => setIsCustomName(true)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <label className="font-semibold text-gray-900">Use my own name</label>
              </div>
              {isCustomName && (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter your project name..."
                  className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              )}
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Description</h3>
          <p className="text-sm text-gray-600 mb-3">Elevator pitch style - clear, concise, compelling</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="What is your project about? Who is it for? What problem does it solve?"
          />
          <p className="text-xs text-gray-500 mt-1">{description.length} characters</p>
        </div>

        {/* Project Tags */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Tags</h3>
          <p className="text-sm text-gray-600 mb-3">Keywords for technology, domain, and target users</p>

          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTag}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-2 hover:text-green-900 font-bold">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preview Card */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Preview</h3>
          <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
            <h4 className="text-2xl font-bold text-gray-900 mb-2">
              {isCustomName ? customName || '[Project Name]' : selectedName || '[Project Name]'}
            </h4>
            <p className="text-gray-700 mb-4">{description || '[Project Description]'}</p>
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white bg-opacity-60 text-gray-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">[No tags added]</span>
              )}
            </div>
          </div>
        </div>

        {/* Regenerate Options */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <div className="text-sm text-teal-800">
                <p className="font-medium">Need different options?</p>
                <p className="text-xs mt-1">Generate new project names, description, and tags</p>
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="ml-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            >
              🔄 Regenerate Details
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">💡 What's Next?</p>
              <p>
                AI will generate a complete project plan with phases, tasks, and milestones based on all the information
                you've provided. You'll then set up timeline and team before finalizing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Elaboration
        </button>
        <button
          onClick={handleContinue}
          disabled={(!isCustomName && !selectedName) || (isCustomName && !customName.trim()) || !description.trim()}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
        >
          Generate Full Project Plan →
        </button>
      </div>
    </div>
  );
};

export default AIProjectDetailsGenerator;
