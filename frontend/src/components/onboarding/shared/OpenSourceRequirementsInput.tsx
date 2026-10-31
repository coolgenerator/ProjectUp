import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Github, Clock, Award, FileCode, Globe } from 'lucide-react';

export interface OpenSourceRequirements {
  projectName: string;
  repositoryUrl: string;
  contributionArea: 'documentation' | 'features' | 'bugfixes' | 'tests' | 'other';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeCommitmentHours: number;
  languages: string[];
  preferredIssueTypes: string[];
}

interface OpenSourceRequirementsInputProps {
  onComplete: (data: OpenSourceRequirements) => void;
  onBack: () => void;
}

const OpenSourceRequirementsInput: React.FC<OpenSourceRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<OpenSourceRequirements>({
    projectName: '',
    repositoryUrl: '',
    contributionArea: 'features',
    skillLevel: 'intermediate',
    timeCommitmentHours: 10,
    languages: [],
    preferredIssueTypes: [],
  });

  const [newLanguage, setNewLanguage] = useState('');
  const [newIssueType, setNewIssueType] = useState('');

  const isValid = () => {
    return (
      data.projectName.trim() !== '' &&
      data.repositoryUrl.trim() !== '' &&
      data.timeCommitmentHours > 0 &&
      data.timeCommitmentHours <= 40
    );
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !data.languages.includes(newLanguage.trim())) {
      setData({
        ...data,
        languages: [...data.languages, newLanguage.trim()],
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setData({
      ...data,
      languages: data.languages.filter((l) => l !== lang),
    });
  };

  const addIssueType = () => {
    if (newIssueType.trim() && !data.preferredIssueTypes.includes(newIssueType.trim())) {
      setData({
        ...data,
        preferredIssueTypes: [...data.preferredIssueTypes, newIssueType.trim()],
      });
      setNewIssueType('');
    }
  };

  const removeIssueType = (type: string) => {
    setData({
      ...data,
      preferredIssueTypes: data.preferredIssueTypes.filter((t) => t !== type),
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-4">
          <Github className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Open Source Contribution</h2>
        <p className="text-gray-600">Tell us about the project you want to contribute to</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Code2 className="w-4 h-4 mr-2 text-green-600" />
                Project Name *
              </label>
              <input
                type="text"
                value={data.projectName}
                onChange={(e) => setData({ ...data, projectName: e.target.value })}
                placeholder="e.g., React, TensorFlow, VS Code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 mr-2 text-green-600" />
                Repository URL *
              </label>
              <input
                type="url"
                value={data.repositoryUrl}
                onChange={(e) => setData({ ...data, repositoryUrl: e.target.value })}
                placeholder="https://github.com/org/repo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Contribution Area and Skill Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileCode className="w-4 h-4 mr-2 text-green-600" />
                Contribution Area *
              </label>
              <select
                value={data.contributionArea}
                onChange={(e) => setData({ ...data, contributionArea: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="documentation">Documentation</option>
                <option value="features">New Features</option>
                <option value="bugfixes">Bug Fixes</option>
                <option value="tests">Testing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Award className="w-4 h-4 mr-2 text-green-600" />
                Your Skill Level *
              </label>
              <select
                value={data.skillLevel}
                onChange={(e) => setData({ ...data, skillLevel: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="beginner">Beginner (First contributions)</option>
                <option value="intermediate">Intermediate (Some experience)</option>
                <option value="advanced">Advanced (Experienced contributor)</option>
              </select>
            </div>
          </div>

          {/* Time Commitment */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 mr-2 text-green-600" />
              Time Commitment (hours/week) *
            </label>
            <input
              type="number"
              min="1"
              max="40"
              value={data.timeCommitmentHours}
              onChange={(e) => setData({ ...data, timeCommitmentHours: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Realistic weekly hours you can dedicate (1-40 hours)
            </p>
          </div>

          {/* Programming Languages */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Code2 className="w-4 h-4 mr-2 text-green-600" />
              Programming Languages You Know
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                placeholder="e.g., JavaScript, Python, Rust"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addLanguage}
                className="px-6 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.languages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preferred Issue Types */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileCode className="w-4 h-4 mr-2 text-green-600" />
              Preferred Issue Types
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newIssueType}
                onChange={(e) => setNewIssueType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIssueType())}
                placeholder="e.g., good-first-issue, help-wanted, enhancement"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addIssueType}
                className="px-6 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.preferredIssueTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.preferredIssueTypes.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                  >
                    {type}
                    <button
                      type="button"
                      onClick={() => removeIssueType(type)}
                      className="ml-2 text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Optional: Types of issues you'd like to work on
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => isValid() && onComplete(data)}
            disabled={!isValid()}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              isValid()
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue with AI Suggestions →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OpenSourceRequirementsInput;
