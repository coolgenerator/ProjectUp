import React from 'react';
import { ChecklistItem } from '../../../types/projectAssistant';

interface EditChecklistItemModalProps {
    editedChecklistItem: ChecklistItem | null;
    setEditedChecklistItem: React.Dispatch<React.SetStateAction<ChecklistItem | null>>;
    cancelEditingChecklistItem: () => void;
    saveEditedChecklistItem: () => void;
}

const EditChecklistItemModal: React.FC<EditChecklistItemModalProps> = ({
    editedChecklistItem,
    setEditedChecklistItem,
    cancelEditingChecklistItem,
    saveEditedChecklistItem
}) => {
    if (!editedChecklistItem) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg transform transition-all duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Checklist Item</h3>
                    <button
                        onClick={cancelEditingChecklistItem}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={editedChecklistItem.description}
                            onChange={(e) => setEditedChecklistItem({ ...editedChecklistItem, description: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={editedChecklistItem.category}
                            onChange={(e) => setEditedChecklistItem({
                                ...editedChecklistItem,
                                category: e.target.value as 'Requirements' | 'Setup' | 'Development' | 'Testing' | 'Deployment' | 'Documentation'
                            })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="Requirements">Requirements</option>
                            <option value="Setup">Setup</option>
                            <option value="Development">Development</option>
                            <option value="Testing">Testing</option>
                            <option value="Deployment">Deployment</option>
                            <option value="Documentation">Documentation</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            value={editedChecklistItem.priority}
                            onChange={(e) => setEditedChecklistItem({
                                ...editedChecklistItem,
                                priority: e.target.value as 'High' | 'Medium' | 'Low'
                            })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={cancelEditingChecklistItem}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveEditedChecklistItem}
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

export default EditChecklistItemModal; 