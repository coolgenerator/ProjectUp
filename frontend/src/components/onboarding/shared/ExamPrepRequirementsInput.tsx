import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, TrendingUp, Clock, AlertCircle, BookMarked } from 'lucide-react';

export interface ExamPrepRequirements {
  examName: string;
  examDate: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  targetGoal: string;
  studyHoursPerWeek: number;
  weakAreas: string[];
  studyMaterials?: string;
  constraints: {
    availableResources: string[];
    studyBuddies?: number;
  };
}

interface ExamPrepRequirementsInputProps {
  onComplete: (data: ExamPrepRequirements) => void;
  onBack: () => void;
}

const ExamPrepRequirementsInput: React.FC<ExamPrepRequirementsInputProps> = ({
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState<ExamPrepRequirements>({
    examName: '',
    examDate: '',
    currentLevel: 'intermediate',
    targetGoal: '',
    studyHoursPerWeek: 15,
    weakAreas: [],
    studyMaterials: '',
    constraints: {
      availableResources: [],
      studyBuddies: 0,
    },
  });

  const [newWeakArea, setNewWeakArea] = useState('');
  const [newResource, setNewResource] = useState('');

  const isValid = () => {
    return (
      data.examName.trim() !== '' &&
      data.examDate.trim() !== '' &&
      data.targetGoal.trim() !== '' &&
      data.studyHoursPerWeek > 0 &&
      data.studyHoursPerWeek <= 80
    );
  };

  const addWeakArea = () => {
    if (newWeakArea.trim() && !data.weakAreas.includes(newWeakArea.trim())) {
      setData({
        ...data,
        weakAreas: [...data.weakAreas, newWeakArea.trim()],
      });
      setNewWeakArea('');
    }
  };

  const removeWeakArea = (area: string) => {
    setData({
      ...data,
      weakAreas: data.weakAreas.filter((a) => a !== area),
    });
  };

  const addResource = () => {
    if (newResource.trim() && !data.constraints.availableResources.includes(newResource.trim())) {
      setData({
        ...data,
        constraints: {
          ...data.constraints,
          availableResources: [...data.constraints.availableResources, newResource.trim()],
        },
      });
      setNewResource('');
    }
  };

  const removeResource = (resource: string) => {
    setData({
      ...data,
      constraints: {
        ...data.constraints,
        availableResources: data.constraints.availableResources.filter((r) => r !== resource),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Exam Prep Project Details</h2>
        <p className="text-gray-600">Create a structured study plan to ace your exam</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <div className="space-y-6">
          {/* Exam Name and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BookMarked className="w-4 h-4 mr-2 text-red-600" />
                Exam Name *
              </label>
              <input
                type="text"
                value={data.examName}
                onChange={(e) => setData({ ...data, examName: e.target.value })}
                placeholder="e.g., GRE, GMAT, Technical Interview, IELTS"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-red-600" />
                Exam Date *
              </label>
              <input
                type="date"
                value={data.examDate}
                onChange={(e) => setData({ ...data, examDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Current Level and Study Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 mr-2 text-red-600" />
                Current Skill Level *
              </label>
              <select
                value={data.currentLevel}
                onChange={(e) => setData({ ...data, currentLevel: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="beginner">Beginner (Just starting)</option>
                <option value="intermediate">Intermediate (Some preparation done)</option>
                <option value="advanced">Advanced (Almost ready)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2 text-red-600" />
                Study Hours per Week *
              </label>
              <input
                type="number"
                min="1"
                max="80"
                value={data.studyHoursPerWeek}
                onChange={(e) => setData({ ...data, studyHoursPerWeek: parseInt(e.target.value) || 15 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Realistic weekly hours you can commit (1-80 hours)
              </p>
            </div>
          </div>

          {/* Target Goal */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-red-600" />
              Target Score/Goal *
            </label>
            <input
              type="text"
              value={data.targetGoal}
              onChange={(e) => setData({ ...data, targetGoal: e.target.value })}
              placeholder="e.g., Score 320+, Pass with 80%, Get job offer"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              What specific outcome are you aiming for?
            </p>
          </div>

          {/* Weak Areas */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              Weak Areas to Focus On
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newWeakArea}
                onChange={(e) => setNewWeakArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWeakArea())}
                placeholder="e.g., Verbal Reasoning, Data Structures, Essay Writing"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addWeakArea}
                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.weakAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.weakAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => removeWeakArea(area)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Identify topics that need extra attention
            </p>
          </div>

          {/* Study Materials */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <BookMarked className="w-4 h-4 mr-2 text-red-600" />
              Study Materials (Optional)
            </label>
            <textarea
              value={data.studyMaterials}
              onChange={(e) => setData({ ...data, studyMaterials: e.target.value })}
              placeholder="List any textbooks, courses, or resources you're using&#10;e.g.,&#10;- Official GRE Guide&#10;- Magoosh Online Course&#10;- Manhattan Prep Books"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Available Resources */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <BookMarked className="w-4 h-4 mr-2 text-red-600" />
              Available Resources
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())}
                placeholder="e.g., Tutor access, Practice exams, Study group"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addResource}
                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              >
                Add
              </button>
            </div>
            {data.constraints.availableResources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.constraints.availableResources.map((resource) => (
                  <span
                    key={resource}
                    className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
                  >
                    {resource}
                    <button
                      type="button"
                      onClick={() => removeResource(resource)}
                      className="ml-2 text-pink-600 hover:text-pink-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Study Buddies */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2 text-red-600" />
              Number of Study Buddies (Optional)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={data.constraints.studyBuddies || 0}
              onChange={(e) =>
                setData({
                  ...data,
                  constraints: { ...data.constraints, studyBuddies: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Are you studying with friends? (0 = studying alone)
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <Target className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">💡 Study Plan Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Break down study topics into weekly milestones</li>
                  <li>Schedule regular practice tests</li>
                  <li>Track progress and adjust plan as needed</li>
                  <li>Build in review and rest days</li>
                  <li>Focus more time on weak areas</li>
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
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 shadow-md hover:shadow-lg'
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

export default ExamPrepRequirementsInput;
