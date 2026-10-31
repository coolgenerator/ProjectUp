import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, Users, FileText, Target, Clock } from 'lucide-react';

export interface CourseNoteRequirements {
  courseName: string;
  school: string;
  instructor?: string;
  targetAudience: 'self' | 'classmates' | 'public';
  contentFormat: 'notes' | 'summaries' | 'tutorials' | 'mixed';
  coverage: 'full_course' | 'specific_topics';
  specificTopics?: string;
  durationWeeks: number;
}

interface CourseNoteRequirementsInputProps {
  onComplete: (data: CourseNoteRequirements) => void;
  onBack: () => void;
}

const CourseNoteRequirementsInput: React.FC<CourseNoteRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<CourseNoteRequirements>({
    courseName: '',
    school: '',
    instructor: '',
    targetAudience: 'self',
    contentFormat: 'mixed',
    coverage: 'full_course',
    specificTopics: '',
    durationWeeks: 14,
  });

  const isValid = () => {
    return (
      data.courseName.trim() !== '' &&
      data.school.trim() !== '' &&
      data.durationWeeks >= 1 &&
      data.durationWeeks <= 24 &&
      (data.coverage === 'full_course' || data.specificTopics?.trim() !== '')
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Note Project Details</h2>
        <p className="text-gray-600">Create comprehensive notes for your course</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Course Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 mr-2 text-teal-600" />
                Course Name *
              </label>
              <input
                type="text"
                value={data.courseName}
                onChange={(e) => setData({ ...data, courseName: e.target.value })}
                placeholder="e.g., Data Structures and Algorithms"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 mr-2 text-teal-600" />
                School/University *
              </label>
              <input
                type="text"
                value={data.school}
                onChange={(e) => setData({ ...data, school: e.target.value })}
                placeholder="e.g., UC Berkeley"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Instructor and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-2 text-teal-600" />
                Instructor Name
              </label>
              <input
                type="text"
                value={data.instructor}
                onChange={(e) => setData({ ...data, instructor: e.target.value })}
                placeholder="e.g., Professor Smith (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2 text-teal-600" />
                Duration (weeks) *
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={data.durationWeeks}
                onChange={(e) => setData({ ...data, durationWeeks: parseInt(e.target.value) || 14 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Typical semester: 12-16 weeks</p>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-teal-600" />
              Target Audience *
            </label>
            <select
              value={data.targetAudience}
              onChange={(e) => setData({ ...data, targetAudience: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="self">Personal Study (Just for me)</option>
              <option value="classmates">Classmates (Share with class)</option>
              <option value="public">Public (Open educational resource)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Who will be using these notes?
            </p>
          </div>

          {/* Content Format */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 mr-2 text-teal-600" />
              Content Format *
            </label>
            <select
              value={data.contentFormat}
              onChange={(e) => setData({ ...data, contentFormat: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="notes">Lecture Notes (Detailed transcriptions)</option>
              <option value="summaries">Summaries (Key concepts and highlights)</option>
              <option value="tutorials">Tutorials (Step-by-step guides)</option>
              <option value="mixed">Mixed (Combination of formats)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the format that best fits your learning style
            </p>
          </div>

          {/* Coverage */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 mr-2 text-teal-600" />
              Coverage *
            </label>
            <select
              value={data.coverage}
              onChange={(e) => setData({ ...data, coverage: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="full_course">Full Course (All lectures and topics)</option>
              <option value="specific_topics">Specific Topics (Selected chapters only)</option>
            </select>
          </div>

          {/* Specific Topics (conditional) */}
          {data.coverage === 'specific_topics' && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2 text-teal-600" />
                Specific Topics to Cover *
              </label>
              <textarea
                value={data.specificTopics}
                onChange={(e) => setData({ ...data, specificTopics: e.target.value })}
                placeholder="List the specific topics or chapters you want to focus on&#10;e.g.,&#10;- Chapter 3: Binary Trees&#10;- Chapter 5: Graph Algorithms&#10;- Final exam review topics"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Specify which parts of the course you'll focus on
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start">
              <BookOpen className="w-5 h-5 text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-teal-800">
                <p className="font-semibold mb-1">💡 Tips for Great Course Notes:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Include examples and diagrams</li>
                  <li>Add your own explanations and insights</li>
                  <li>Create practice problems and solutions</li>
                  <li>Link to external resources</li>
                  <li>Keep it organized with clear sections</li>
                </ul>
              </div>
            </div>
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
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md hover:shadow-lg'
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

export default CourseNoteRequirementsInput;
