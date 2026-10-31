import React from 'react';
import { ProjectIdea } from '../../../types/projectAssistant';

interface EditIdeaModalProps {
    editedIdea: ProjectIdea;
    setEditedIdea: React.Dispatch<React.SetStateAction<ProjectIdea | null>>;
    cancelEditing: () => void;
    saveEditedIdea: () => void;
}

const EditIdeaModal: React.FC<EditIdeaModalProps> = ({
    editedIdea,
    setEditedIdea,
    cancelEditing,
    saveEditedIdea
}) => {
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-lg transform transition-all duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Project Idea</h3>
                    <button
                        onClick={cancelEditing}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={editedIdea.title}
                            onChange={(e) => setEditedIdea({ ...editedIdea, title: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={editedIdea.description}
                            onChange={(e) => setEditedIdea({ ...editedIdea, description: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            <select
                                value={editedIdea.difficulty}
                                onChange={(e) => setEditedIdea({ ...editedIdea, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time</label>
                            <input
                                type="text"
                                value={editedIdea.estimatedTime}
                                onChange={(e) => setEditedIdea({ ...editedIdea, estimatedTime: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Technologies (comma-separated)</label>
                        <input
                            type="text"
                            value={editedIdea.keyTechnologies.join(', ')}
                            onChange={(e) => setEditedIdea({
                                ...editedIdea,
                                keyTechnologies: e.target.value.split(',').map(t => t.trim())
                            })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Features (comma-separated)</label>
                        <input
                            type="text"
                            value={editedIdea.keyFeatures.join(', ')}
                            onChange={(e) => setEditedIdea({
                                ...editedIdea,
                                keyFeatures: e.target.value.split(',').map(f => f.trim())
                            })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Learning Outcomes (comma-separated)</label>
                        <input
                            type="text"
                            value={editedIdea.learningOutcomes.join(', ')}
                            onChange={(e) => setEditedIdea({
                                ...editedIdea,
                                learningOutcomes: e.target.value.split(',').map(o => o.trim())
                            })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={cancelEditing}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveEditedIdea}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditIdeaModal; 