import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BasicInfo } from './BasicInfoStep';
import { Timeline } from './TimelineSetup';
import { TeamMember } from './TeamSetup';

interface ProjectPreviewProps {
  basicInfo: BasicInfo;
  timeline: Timeline;
  teamMembers: TeamMember[];
  additionalInfo?: {
    courseInfo?: {
      courseName?: string;
      school?: string;
      class?: string;
    };
    researchInfo?: {
      researchType?: string;
      researchDomain?: string;
    };
  };
  onSubmit: () => void;
  onEdit: (section: 'basic' | 'timeline' | 'team') => void;
  isSubmitting?: boolean;
}

const ProjectPreview: React.FC<ProjectPreviewProps> = ({
  basicInfo,
  timeline,
  teamMembers,
  additionalInfo,
  onSubmit,
  onEdit,
  isSubmitting = false,
}) => {
  const [showAIInsights, setShowAIInsights] = useState(true);

  const placeholderCount = teamMembers.filter((m) => m.isPlaceholder).length;
  const totalMembers = teamMembers.length + 1; // +1 for the owner

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Project</h2>
        <p className="text-gray-600">
          Everything looks good? Let's create your project!
        </p>
      </div>

      {/* Project Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {/* Basic Info Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
            <button
              onClick={() => onEdit('basic')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Project Name</p>
              <p className="font-semibold text-gray-900">{basicInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p className="text-gray-900">{basicInfo.description}</p>
            </div>
            {basicInfo.topics.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Topics</p>
                <div className="flex flex-wrap gap-2">
                  {basicInfo.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {basicInfo.location && (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="text-gray-900">{basicInfo.location}</p>
              </div>
            )}
            {additionalInfo?.courseInfo && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Course Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {additionalInfo.courseInfo.school && (
                    <div>
                      <p className="text-gray-600">School</p>
                      <p className="text-gray-900">{additionalInfo.courseInfo.school}</p>
                    </div>
                  )}
                  {additionalInfo.courseInfo.courseName && (
                    <div>
                      <p className="text-gray-600">Course</p>
                      <p className="text-gray-900">{additionalInfo.courseInfo.courseName}</p>
                    </div>
                  )}
                  {additionalInfo.courseInfo.class && (
                    <div>
                      <p className="text-gray-600">Class</p>
                      <p className="text-gray-900">{additionalInfo.courseInfo.class}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {additionalInfo?.researchInfo && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Research Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {additionalInfo.researchInfo.researchType && (
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="text-gray-900">{additionalInfo.researchInfo.researchType}</p>
                    </div>
                  )}
                  {additionalInfo.researchInfo.researchDomain && (
                    <div>
                      <p className="text-gray-600">Domain</p>
                      <p className="text-gray-900">{additionalInfo.researchInfo.researchDomain}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Timeline Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
            <button
              onClick={() => onEdit('timeline')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(timeline.startDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold text-gray-900">{timeline.durationWeeks} weeks</p>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Deadline</p>
                <p className="font-semibold text-gray-900">
                  {timeline.deadline
                    ? new Date(timeline.deadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Team Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Team</h3>
            <button
              onClick={() => onEdit('team')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                You
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">You (Owner)</p>
                <p className="text-sm text-gray-600">Project creator</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                Owner
              </span>
            </div>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.isPlaceholder ? '?' : member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    {member.isPlaceholder && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                  {member.email && (
                    <p className="text-sm text-gray-600">{member.email}</p>
                  )}
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  member.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">
                You'll be working on this project solo
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {showAIInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="font-semibold text-purple-900">AI Insights</h4>
            </div>
            <button
              onClick={() => setShowAIInsights(false)}
              className="text-purple-600 hover:text-purple-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3 text-sm text-purple-900">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p>Your project timeline ({timeline.durationWeeks} weeks) is reasonable for the scope</p>
            </div>
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p>Team size ({totalMembers} members) is optimal for collaboration</p>
            </div>
            {placeholderCount > 0 && (
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Don't forget to send invite links to {placeholderCount} pending member{placeholderCount > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating Project...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Create Project</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProjectPreview;
