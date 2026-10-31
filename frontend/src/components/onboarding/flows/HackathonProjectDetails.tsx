import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../../hooks/fetchWithAuth';
import config from '../../../config';
import { toast } from 'react-hot-toast';
import { TopicElaboration } from '../shared/TopicElaboration';
import AIProjectDetailsGenerator, { ProjectDetails } from '../shared/AIProjectDetailsGenerator';

interface HackathonProjectDetailsProps {
  topicElaboration: TopicElaboration;
  topicName: string;
  onComplete: (details: ProjectDetails) => void;
  onBack: () => void;
}

/**
 * Hackathon Project Details - Generates project name, description, tags
 * Uses hackathon-specific API endpoint but reuses AIProjectDetailsGenerator component
 */
const HackathonProjectDetails: React.FC<HackathonProjectDetailsProps> = ({
  topicElaboration,
  topicName,
  onComplete,
  onBack,
}) => {
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjectDetails();
  }, []);

  const loadProjectDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use new unified API endpoint
      const { generateProjectDetails } = await import('../../../api/onboardingAPI');
      const data = await generateProjectDetails('hackathon', {
        name: topicName,
        background: topicElaboration.background,
        objectives: topicElaboration.objectives,
        core_features: topicElaboration.core_features,
      });

      setProjectDetails(data);
    } catch (error) {
      console.error('Failed to load project details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load details');
      toast.error('Failed to generate project details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !projectDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mt-6">AI正在生成吸引眼球的项目名称...</h3>
        <p className="text-gray-600 mt-2">创意命名 · Pitch描述 · 关键标签</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">生成失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              ← 返回
            </button>
            <button onClick={loadProjectDetails} className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AIProjectDetailsGenerator
      topicElaboration={topicElaboration}
      topicName={topicName}
      initialDetails={projectDetails}
      onComplete={onComplete}
      onBack={onBack}
    />
  );
};

export default HackathonProjectDetails;
