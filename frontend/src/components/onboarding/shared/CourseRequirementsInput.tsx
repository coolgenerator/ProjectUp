import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface CourseRequirements {
  courseName: string;
  school: string;
  courseCode: string;
  requirements: string;
  constraints: {
    teamSize: number;
    durationWeeks: number;
    startDate: string;
    deadline: string;
    requiredTech: string[];
  };
}

interface CourseRequirementsInputProps {
  onComplete: (data: CourseRequirements) => void;
  onBack: () => void;
  cachedRequirements?: CourseRequirements;
}

/**
 * Course Requirements Input - Step 1 of AI-Guided Project Creation
 *
 * Collects course information and project constraints before AI suggests topics.
 * Users can paste text or upload syllabus file.
 */
const CourseRequirementsInput: React.FC<CourseRequirementsInputProps> = ({
  onComplete,
  onBack,
  cachedRequirements,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [data, setData] = useState<CourseRequirements>(
    cachedRequirements || {
      courseName: '',
      school: '',
      courseCode: '',
      requirements: '',
      constraints: {
        teamSize: 0, // Optional - user can leave empty
        durationWeeks: 0, // Will be calculated from dates
        startDate: new Date().toISOString().split('T')[0],
        deadline: '', // Optional - can be empty for ongoing projects
        requiredTech: [],
      },
    }
  );
  const [newTech, setNewTech] = useState('');

  const handleAddTech = () => {
    if (newTech.trim() && !data.constraints.requiredTech.includes(newTech.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          requiredTech: [...data.constraints.requiredTech, newTech.trim()],
        },
      });
      setNewTech('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        requiredTech: data.constraints.requiredTech.filter((t) => t !== tech),
      },
    });
  };

  // Calculate duration in weeks based on start date and deadline
  const calculateDurationWeeks = (): number => {
    if (!data.constraints.startDate || !data.constraints.deadline) {
      return 0;
    }
    const start = new Date(data.constraints.startDate);
    const end = new Date(data.constraints.deadline);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    return weeks;
  };

  const durationWeeks = calculateDurationWeeks();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setData({ ...data, requirements: text });
    };
    reader.readAsText(file);
  };

  const isValid = () => {
    const hasValidDates = data.constraints.startDate.trim() !== '';
    const hasDeadline = data.constraints.deadline.trim() !== '';

    // If deadline is provided, ensure it's after start date
    const datesAreValid = !hasDeadline || (hasDeadline && durationWeeks > 0);

    return (
      data.courseName.trim() !== '' &&
      data.school.trim() !== '' &&
      data.requirements.trim() !== '' &&
      hasValidDates &&
      datesAreValid
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Let's Start with Your Course</h2>
        <p className="text-gray-600">
          Tell us about your course requirements, and AI will suggest project topics that fit perfectly
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Course Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Course Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.courseName}
              onChange={(e) => setData({ ...data, courseName: e.target.value })}
              placeholder="e.g., Web Development, Software Engineering"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School/University <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.school}
                onChange={(e) => setData({ ...data, school: e.target.value })}
                placeholder="e.g., UC San Diego"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={data.courseCode}
                onChange={(e) => setData({ ...data, courseCode: e.target.value })}
                placeholder="e.g., CSE 110"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Requirements Input */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Requirements</h3>

          {/* Input Mode Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                inputMode === 'text'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                inputMode === 'file'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload File
            </button>
          </div>

          {/* Text Input Mode */}
          {inputMode === 'text' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Requirements or Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={data.requirements}
                onChange={(e) => setData({ ...data, requirements: e.target.value })}
                rows={8}
                placeholder="Paste your course syllabus, project requirements, or describe what the project should accomplish...

Example:
- Build a full-stack web application
- Must include user authentication
- Work in teams of 4-5 students
- 10-week timeline
- Final presentation required"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </motion.div>
          )}

          {/* File Upload Mode */}
          {inputMode === 'file' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-700 font-medium mb-2">Upload syllabus or requirements document</p>
                <p className="text-sm text-gray-500 mb-4">PDF, TXT, DOC, or DOCX (max 5MB)</p>
                <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {data.requirements && (
                  <p className="text-green-600 text-sm mt-4">✓ File uploaded and parsed successfully</p>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Project Constraints */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Constraints</h3>
          <p className="text-sm text-gray-600">
            These help AI suggest projects that fit your timeline and team
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Size <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={data.constraints.teamSize || ''}
              onChange={(e) =>
                setData({
                  ...data,
                  constraints: { ...data.constraints, teamSize: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="e.g., 4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if you're still forming a team</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={data.constraints.startDate}
                onChange={(e) =>
                  setData({
                    ...data,
                    constraints: { ...data.constraints, startDate: e.target.value },
                  })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="date"
                value={data.constraints.deadline}
                onChange={(e) =>
                  setData({
                    ...data,
                    constraints: { ...data.constraints, deadline: e.target.value },
                  })
                }
                min={data.constraints.startDate}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for ongoing projects</p>
            </div>
          </div>

          {/* Calculated Duration Display */}
          {data.constraints.startDate && !data.constraints.deadline && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Ongoing project
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    💡 Add a deadline to see estimated duration
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {data.constraints.startDate && data.constraints.deadline && durationWeeks > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Project Duration: <span className="text-blue-600 font-bold">{durationWeeks} weeks</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {durationWeeks < 4 && '⚡ Short sprint - focus on essentials'}
                    {durationWeeks >= 4 && durationWeeks <= 12 && '✨ Standard timeline - balanced scope'}
                    {durationWeeks > 12 && '🚀 Extended project - ambitious scope possible'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {data.constraints.startDate && data.constraints.deadline && durationWeeks <= 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800">
                  Deadline must be after the start date
                </p>
              </div>
            </motion.div>
          )}

          {/* Required Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Technologies <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="e.g., React, Node.js, MongoDB"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTech}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {data.constraints.requiredTech.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.requiredTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      onClick={() => handleRemoveTech(tech)}
                      className="ml-2 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 What happens next?</p>
              <p>
                AI will analyze your course requirements and suggest 3-5 project topics tailored to your needs.
                You'll be able to choose one and refine it together with AI.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Change Scenario
          </button>
          <button
            onClick={() => onComplete({
              ...data,
              constraints: {
                ...data.constraints,
                durationWeeks: durationWeeks,
              }
            })}
            disabled={!isValid()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next: Team Setup →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseRequirementsInput;
