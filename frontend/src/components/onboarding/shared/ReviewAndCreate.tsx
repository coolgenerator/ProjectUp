import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Edit2,
  Image as ImageIcon,
  Sparkles,
  Calendar,
  Users,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';

interface ProjectDetails {
  name: string;
  description: string;
  tags: string[];
  scenario: string;
  startDate: string;
  deadline?: string;
  teamSize: number;
  requirements?: string;
  objectives?: any;
  milestones?: any[];
}

interface ReviewAndCreateProps {
  projectDetails: ProjectDetails;
  onEdit: (section: string) => void;
  onCreate: (coverImageUrl: string) => void;
  onBack: () => void;
  isCreating: boolean;
}

// Unsplash cover image options based on project type
const getCoverImageOptions = (scenario: string) => {
  const baseOptions = {
    course: [
      { id: 1, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200', keyword: 'collaboration' },
      { id: 2, url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200', keyword: 'workspace' },
      { id: 3, url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200', keyword: 'meeting' },
    ],
    hackathon: [
      { id: 1, url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200', keyword: 'coding' },
      { id: 2, url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200', keyword: 'tech' },
      { id: 3, url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', keyword: 'speed' },
    ],
    research: [
      { id: 1, url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200', keyword: 'research' },
      { id: 2, url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1200', keyword: 'lab' },
      { id: 3, url: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a3d0?w=1200', keyword: 'science' },
    ],
    default: [
      { id: 1, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200', keyword: 'team' },
      { id: 2, url: 'https://images.unsplash.com/photo-1557425529-ee5c4e2c6d11?w=1200', keyword: 'innovation' },
      { id: 3, url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200', keyword: 'growth' },
    ]
  };

  return baseOptions[scenario as keyof typeof baseOptions] || baseOptions.default;
};

const ReviewAndCreate: React.FC<ReviewAndCreateProps> = ({
  projectDetails,
  onEdit,
  onCreate,
  onBack,
  isCreating
}) => {
  const coverOptions = getCoverImageOptions(projectDetails.scenario);
  const [selectedCover, setSelectedCover] = useState(coverOptions[0].url);

  const handleCreate = () => {
    onCreate(selectedCover);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Review Your Project
          </h1>
          <p className="text-slate-600">
            Everything looks good? Let's create your project!
          </p>
        </div>

        {/* Project Preview Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Cover Image Selection */}
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Choose Cover Image</h3>
              </div>
              <span className="text-xs text-slate-500">Powered by Unsplash</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {coverOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedCover(option.url)}
                  className={`
                    relative aspect-video rounded-lg overflow-hidden transition-all
                    ${selectedCover === option.url
                      ? 'ring-4 ring-blue-500 scale-105'
                      : 'ring-2 ring-slate-200 hover:ring-slate-300'
                    }
                  `}
                >
                  <img
                    src={option.url}
                    alt={option.keyword}
                    className="w-full h-full object-cover"
                  />
                  {selectedCover === option.url && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Cover Preview */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={selectedCover}
              alt="Project cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {projectDetails.name}
              </h2>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded">
                  {projectDetails.scenario}
                </span>
                {projectDetails.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Description</h3>
                </div>
                <button
                  onClick={() => onEdit('details')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {projectDetails.description}
              </p>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600 mb-1">Timeline</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(projectDetails.startDate).toLocaleDateString()}
                    {projectDetails.deadline && (
                      <> → {new Date(projectDetails.deadline).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600 mb-1">Team Size</p>
                  <p className="font-semibold text-slate-900">
                    {projectDetails.teamSize} {projectDetails.teamSize === 1 ? 'person' : 'people'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {projectDetails.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {projectDetails.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones Preview (if available) */}
            {projectDetails.milestones && projectDetails.milestones.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Key Milestones ({projectDetails.milestones.length})
                </h3>
                <div className="space-y-2">
                  {projectDetails.milestones.slice(0, 3).map((milestone: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-slate-900">{milestone.name || milestone.phase}</span>
                    </div>
                  ))}
                  {projectDetails.milestones.length > 3 && (
                    <p className="text-sm text-slate-500 pl-5">
                      +{projectDetails.milestones.length - 3} more milestones
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Assistance Notice */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">
                  AI-Assisted Project Setup
                </p>
                <p className="text-sm text-purple-700">
                  This project was created with AI guidance. You can edit all details after creation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={isCreating}
            className="px-6 py-3 text-slate-700 hover:text-slate-900 font-medium disabled:opacity-50"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit('details')}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-slate-300 hover:border-slate-400 rounded-lg font-medium text-slate-700 disabled:opacity-50 transition-colors"
            >
              Edit Details
            </button>

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="
                px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600
                hover:from-blue-700 hover:to-purple-700
                text-white font-semibold rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all transform hover:scale-105
                flex items-center gap-2
              "
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReviewAndCreate;
