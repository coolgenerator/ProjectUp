import React, { useState } from 'react';

export interface BasicInfo {
  name: string;
  description: string;
  topics: string[];
  location: string;
}

interface BasicInfoStepProps {
  data: BasicInfo;
  onChange: (data: BasicInfo) => void;
  showLocation?: boolean;
  locationRequired?: boolean;
}

const commonTopics = [
  'AI',
  'IoT',
  'Healthcare',
  'Education',
  'Sustainability',
  'Data Science',
  'Web Development',
  'Mobile Development',
  'Robotics',
  'Business',
  'Design',
  'Algorithm',
  'Machine Learning',
  'Blockchain',
];

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  showLocation = true,
  locationRequired = false,
}) => {
  const [topicInput, setTopicInput] = useState('');

  const handleChange = (field: keyof BasicInfo, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleTopicSelect = (topic: string) => {
    if (!data.topics.includes(topic)) {
      handleChange('topics', [...data.topics, topic]);
    }
  };

  const handleTopicRemove = (topic: string) => {
    handleChange(
      'topics',
      data.topics.filter((t) => t !== topic)
    );
  };

  const handleCustomTopicAdd = () => {
    const trimmedTopic = topicInput.trim();
    if (trimmedTopic && !data.topics.includes(trimmedTopic)) {
      handleChange('topics', [...data.topics, trimmedTopic]);
      setTopicInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomTopicAdd();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h3>
        <p className="text-gray-600 mb-6">
          Let's start with the essential details about your project
        </p>
      </div>

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Study Habit Tracker App"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Choose a clear, descriptive name for your project
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe what your project is about..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Explain the purpose and goals of your project
        </p>
      </div>

      {/* Topics/Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Topics <span className="text-gray-500 text-xs">(Select or add custom)</span>
        </label>

        {/* Selected Topics */}
        {data.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {topic}
                <button
                  onClick={() => handleTopicRemove(topic)}
                  className="ml-2 hover:text-blue-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Common Topics */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Popular Topics:</p>
          <div className="flex flex-wrap gap-2">
            {commonTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicSelect(topic)}
                disabled={data.topics.includes(topic)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  data.topics.includes(topic)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-500'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Topic Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add custom topic..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCustomTopicAdd}
            disabled={!topicInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Location */}
      {showLocation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location {locationRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            value={data.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select location...</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
            <option value="UCSD">UCSD</option>
            <option value="Stanford">Stanford</option>
            <option value="MIT">MIT</option>
            <option value="Berkeley">Berkeley</option>
            <option value="Other">Other</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Where will the team work on this project?
          </p>
        </div>
      )}

      {/* Validation Messages */}
      {(!data.name || !data.description) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              Please fill in all required fields to continue
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicInfoStep;
