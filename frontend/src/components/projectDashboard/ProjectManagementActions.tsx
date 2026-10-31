import React, { useState } from 'react';

interface ProjectManagementActionsProps {
    project: any;
    isMobileView: boolean;
    onCompleteProject: () => Promise<boolean>;
    onArchiveProject: () => Promise<boolean>;
    onDeleteProject: () => Promise<boolean>;
}

const ProjectManagementActions: React.FC<ProjectManagementActionsProps> = ({
    project,
    isMobileView,
    onCompleteProject,
    onArchiveProject,
    onDeleteProject
}) => {
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Handle project delete confirmation
    const handleDeleteConfirm = async () => {
        if (deleteConfirmText !== "DELETE") {
            return;
        }

        setIsProcessing(true);
        try {
            // Close dialog before redirecting to prevent React state updates on unmounted component
            setShowDeleteDialog(false);
            await onDeleteProject();
            // No need to handle success - redirect is done in handleDeleteProject
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle project archive confirmation
    const handleArchiveConfirm = async () => {
        setIsProcessing(true);
        try {
            // Close dialog before redirecting to prevent React state updates on unmounted component
            setShowArchiveDialog(false);
            await onArchiveProject();
            // No need to handle success - redirect is done in handleArchiveProject
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle project complete confirmation
    const handleCompleteConfirm = async () => {
        setIsProcessing(true);
        try {
            // Close dialog before redirecting to prevent React state updates on unmounted component
            setShowCompleteDialog(false);
            await onCompleteProject();
            // No need to handle success - redirect is done in onCompleteProject
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Project Management Actions</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                {/* Mark as Completed Button */}
                {project && (
                    <button
                        onClick={() => setShowCompleteDialog(true)}
                        disabled={Boolean(project.isCompleted)}
                        className={`${
                            isMobileView ? 'w-full px-4 py-2 text-sm' : 'px-6 py-2.5'
                        } font-medium text-white rounded-lg transition-colors ${
                            project.isCompleted
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {project.isCompleted ? "Project Completed" : "Mark as Completed"}
                    </button>
                )}

                {/* Archive Button */}
                <button
                    onClick={() => setShowArchiveDialog(true)}
                    className={`${
                        isMobileView ? 'w-full px-4 py-2 text-sm' : 'px-6 py-2.5'
                    } font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors`}
                >
                    Archive Project
                </button>

                {/* Delete Button */}
                <button
                    onClick={() => setShowDeleteDialog(true)}
                    className={`${
                        isMobileView ? 'w-full px-4 py-2 text-sm' : 'px-6 py-2.5'
                    } font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors`}
                >
                    Delete Project
                </button>
            </div>

            {/* Project Complete Confirmation Dialog */}
            {showCompleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50" 
                        onClick={() => !isProcessing && setShowCompleteDialog(false)} 
                    />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Mark Project as Completed</h3>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-gray-700 mb-3">
                                Marking the project as completed will:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                <li>Update the project status to "Completed"</li>
                                <li>Keep all project data accessible for reference</li>
                                <li>Move the project to your completed projects list</li>
                            </ul>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCompleteDialog(false)}
                                disabled={isProcessing}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompleteConfirm}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Mark as Completed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Archive Confirmation Dialog */}
            {showArchiveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50" 
                        onClick={() => !isProcessing && setShowArchiveDialog(false)} 
                    />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Archive Project</h3>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-gray-700 mb-3">
                                Archiving the project will:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                <li>Set the project status to "Archived"</li>
                                <li>Keep all project data accessible in read-only mode</li>
                                <li>Move the project to your archived projects list</li>
                            </ul>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                            <button
                                onClick={() => setShowArchiveDialog(false)}
                                disabled={isProcessing}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleArchiveConfirm}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Archive Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50" 
                        onClick={() => !isProcessing && setShowDeleteDialog(false)} 
                    />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-red-600">Delete Project</h3>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-red-600 font-medium mb-3">
                                This action cannot be undone!
                            </p>
                            <p className="text-gray-700 mb-3">
                                Deleting the project will permanently remove all project data, including:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mb-4">
                                <li>All project information, resources, and workspaces</li>
                                <li>Team membership records and task assignments</li>
                                <li>Project history and communication logs</li>
                            </ul>
                            <p className="text-gray-700 font-medium mb-2">
                                To confirm deletion, please type "DELETE" in the field below:
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                    deleteConfirmText.length > 0 && deleteConfirmText !== "DELETE"
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-blue-500'
                                }`}
                            />
                            {deleteConfirmText.length > 0 && deleteConfirmText !== "DELETE" && (
                                <p className="mt-1 text-sm text-red-600">Please type DELETE exactly as shown</p>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteDialog(false);
                                    setDeleteConfirmText("");
                                }}
                                disabled={isProcessing}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isProcessing || deleteConfirmText !== "DELETE"}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectManagementActions; 