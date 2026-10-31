import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BasicInfoStep, { BasicInfo } from '../shared/BasicInfoStep';
import TimelineSetup, { Timeline } from '../shared/TimelineSetup';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';

interface PersonalProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const PersonalProjectFlow: React.FC<PersonalProjectFlowProps> = ({ onBack, onComplete }) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    name: '',
    description: '',
    topics: [],
    location: 'Remote',
  });

  const [timeline, setTimeline] = useState<Timeline>({
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    durationWeeks: 4, // Default to 1 month
  });

  const handleSubmit = async () => {
    if (!basicInfo.name || !basicInfo.description) {
      toast.error('Please fill in the required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        project_scenario: 'personal',
        name: basicInfo.name,
        description: basicInfo.description,
        topic: basicInfo.topics,
        location: basicInfo.location,
        start_date: timeline.startDate,
        deadline: timeline.deadline || undefined,
        duration_weeks: timeline.durationWeeks,
        team_members: [], // Personal project - solo
        onboarding_metadata: {
          flow_version: '1.0',
          completion_time: new Date().toISOString(),
        },
      };

      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/projects/onboarding/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const result = await response.json();
      toast.success('Personal project created successfully!');

      onComplete(result.project.project_id, result.project.sid);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Setup for Personal Project</h3>
          <p className="text-gray-600">
            Personal projects are simple - just the essentials to get you started
          </p>
        </div>

        <BasicInfoStep data={basicInfo} onChange={setBasicInfo} showLocation={false} />

        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-900">Set Timeline (Optional)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${showTimeline ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTimeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <TimelineSetup data={timeline} onChange={setTimeline} />
            </motion.div>
          )}
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
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
            <p className="text-sm text-orange-800">
              💡 Personal projects are perfect for learning new skills, building portfolio pieces, or exploring ideas at your own pace.
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Change Scenario
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !basicInfo.name || !basicInfo.description}
            className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Project</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalProjectFlow;
