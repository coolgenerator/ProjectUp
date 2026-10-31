import React from 'react';
import { RoadmapStep } from '../../../types/projectAssistant';

interface EditStepModalProps {
    step: RoadmapStep;
    setStep: React.Dispatch<React.SetStateAction<RoadmapStep>>;
    cancelEditing: () => void;
    saveStep: () => void;
}

const EditStepModal: React.FC<EditStepModalProps> = ({
    step,
    setStep,
    cancelEditing,
    saveStep
}) => {
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-lg transform transition-all duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Roadmap Step</h3>
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
                            value={step.title}
                            onChange={(e) => setStep({ ...step, title: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={step.description}
                            onChange={(e) => setStep({ ...step, description: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Estimate</label>
                        <input
                            type="text"
                            value={step.timeEstimate}
                            onChange={(e) => setStep({ ...step, timeEstimate: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resources</label>
                        <div className="space-y-3 border border-gray-200 rounded-md p-3">
                            {step.resources.map((resource, idx) => (
                                <div key={idx} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between">
                                        <h4 className="text-sm font-medium">Resource {idx + 1}</h4>
                                        <button
                                            onClick={() => setStep({
                                                ...step,
                                                resources: step.resources.filter((_, i) => i !== idx)
                                            })}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div>
                                            <label className="block text-xs text-gray-500">Title</label>
                                            <input
                                                type="text"
                                                value={resource.title}
                                                onChange={(e) => {
                                                    const updatedResources = [...step.resources];
                                                    updatedResources[idx] = { ...resource, title: e.target.value };
                                                    setStep({ ...step, resources: updatedResources });
                                                }}
                                                className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500">URL</label>
                                            <input
                                                type="text"
                                                value={resource.url}
                                                onChange={(e) => {
                                                    const updatedResources = [...step.resources];
                                                    updatedResources[idx] = { ...resource, url: e.target.value };
                                                    setStep({ ...step, resources: updatedResources });
                                                }}
                                                className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        <label className="block text-xs text-gray-500">Type</label>
                                        <select
                                            value={resource.type}
                                            onChange={(e) => {
                                                const updatedResources = [...step.resources];
                                                updatedResources[idx] = {
                                                    ...resource,
                                                    type: e.target.value as 'Article' | 'Video' | 'Course' | 'Documentation' | 'Tutorial' | 'Guide' | 'Library' | 'Tool' | 'Framework'
                                                };
                                                setStep({ ...step, resources: updatedResources });
                                            }}
                                            className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="Article">Article</option>
                                            <option value="Video">Video</option>
                                            <option value="Course">Course</option>
                                            <option value="Documentation">Documentation</option>
                                            <option value="Tutorial">Tutorial</option>
                                            <option value="Guide">Guide</option>
                                            <option value="Library">Library</option>
                                            <option value="Tool">Tool</option>
                                            <option value="Framework">Framework</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => setStep({
                                    ...step,
                                    resources: [
                                        ...step.resources,
                                        { title: '', url: '', type: 'Article' }
                                    ]
                                })}
                                className="w-full py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                + Add Resource
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={cancelEditing}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveStep}
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

export default EditStepModal; 