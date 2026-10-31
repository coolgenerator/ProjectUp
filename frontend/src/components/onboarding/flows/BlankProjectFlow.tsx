import React, { useState } from 'react';
import BasicInfoStep, { BasicInfo } from '../shared/BasicInfoStep';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';

interface BlankProjectFlowProps {
  onBack: () => void;
  onComplete: (projectId: number, projectSid: string) => void;
}

const BlankProjectFlow: React.FC<BlankProjectFlowProps> = ({ onBack, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    name: '',
    description: '',
    topics: [],
    location: 'Remote',
  });

  const handleSubmit = async () => {
    if (!basicInfo.name || !basicInfo.description) {
      toast.error('Please fill in the required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        project_scenario: 'blank',
        name: basicInfo.name,
        description: basicInfo.description,
        topic: basicInfo.topics,
        location: basicInfo.location,
        start_date: new Date().toISOString().split('T')[0],
        team_members: [],
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
      toast.success('Blank project created successfully!');

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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Blank Project</h3>
          <p className="text-gray-600">
            Start with a clean slate and customize as you go
          </p>
        </div>

        <BasicInfoStep data={basicInfo} onChange={setBasicInfo} showLocation={false} />

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Your project will be created with minimal structure</span>
            </li>
            <li className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>You can add team members, timelines, and milestones later</span>
            </li>
            <li className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Customize everything in the project dashboard</span>
            </li>
          </ul>
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
            className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
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

export default BlankProjectFlow;
