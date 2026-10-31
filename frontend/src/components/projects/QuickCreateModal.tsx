import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Image as ImageIcon,
  Calendar,
  Users,
  FileText
} from 'lucide-react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithAI: () => void;
  onQuickCreate: (projectData: QuickProjectData) => void;
}

export interface QuickProjectData {
  name: string;
  description: string;
  startDate: string;
  deadline?: string;
  coverImage?: string;
  teamSize: number;
}

// Quick cover image options
const QUICK_COVERS = [
  { id: 1, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200', color: 'blue' },
  { id: 2, url: 'https://images.unsplash.com/photo-1557425529-ee5c4e2c6d11?w=1200', color: 'purple' },
  { id: 3, url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200', color: 'green' },
  { id: 4, url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200', color: 'orange' },
];

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onCreateWithAI,
  onQuickCreate
}) => {
  const [formData, setFormData] = useState<QuickProjectData>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    coverImage: QUICK_COVERS[0].url,
    teamSize: 1
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onQuickCreate(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Quick Create Project
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Fast setup for experienced users
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* AI Alternative Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        Want AI assistance?
                      </p>
                      <p className="text-sm text-slate-600 mb-3">
                        Get intelligent suggestions, feasibility analysis, and detailed planning
                      </p>
                      <button
                        onClick={onCreateWithAI}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Use AI-Guided Setup →
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Awesome Project"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of your project..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Cover Image Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Cover Image
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {QUICK_COVERS.map((cover) => (
                        <button
                          key={cover.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, coverImage: cover.url })}
                          className={`
                            relative aspect-video rounded-lg overflow-hidden transition-all
                            ${formData.coverImage === cover.url
                              ? 'ring-4 ring-blue-500 scale-105'
                              : 'ring-2 ring-slate-200 hover:ring-slate-300'
                            }
                          `}
                        >
                          <img
                            src={cover.url}
                            alt={`Cover ${cover.id}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Deadline (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        min={formData.startDate}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Size
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>Solo (1 person)</option>
                      <option value={2}>Pair (2 people)</option>
                      <option value={3}>Small team (3-4 people)</option>
                      <option value={5}>Medium team (5-7 people)</option>
                      <option value={8}>Large team (8+ people)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isCreating}
                      className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!isValid || isCreating}
                      className="
                        px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600
                        hover:from-blue-700 hover:to-purple-700
                        text-white font-semibold rounded-lg
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all
                        flex items-center gap-2
                      "
                    >
                      {isCreating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Create Project
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickCreateModal;
