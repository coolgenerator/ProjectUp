import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import fetchWithAuth from '../../hooks/fetchWithAuth';

// Icons
const XIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const FolderIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface Workspace {
    group_id: number;
    group_name: string;
    workspace_type: string;
    is_main: boolean;
    role: string;
}

interface MemberEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatar?: string;
    };
    projectId: string;
    availableWorkspaces?: Array<{
        group_id: number;
        name: string;
        workspace_type: string;
        is_main: boolean;
    }>;
    onUpdate: () => void;
}

const ROLES = [
    { value: 'admin', label: 'Admin', desc: 'Full control over project - can manage team, edit all content, and change settings' },
    { value: 'editor', label: 'Editor', desc: 'Can edit and delete project content, but cannot manage team members' },
    { value: 'viewer', label: 'Viewer', desc: 'Read-only access - can view project content but cannot make changes' },
];

const MemberEditModal: React.FC<MemberEditModalProps> = ({
    isOpen,
    onClose,
    member,
    projectId,
    availableWorkspaces = [],
    onUpdate,
}) => {
    const [activeTab, setActiveTab] = useState<'role' | 'workspaces'>('role');
    const [selectedRole, setSelectedRole] = useState(member.role);
    const [memberWorkspaces, setMemberWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedWorkspaceToAdd, setSelectedWorkspaceToAdd] = useState<number | null>(null);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

    // Fetch member's current workspaces
    useEffect(() => {
        if (isOpen) {
            fetchMemberWorkspaces();
            setSelectedRole(member.role);
        }
    }, [isOpen, member.id]);

    const fetchMemberWorkspaces = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/members/${member.id}/workspaces`);
            if (response.ok) {
                const data = await response.json();
                setMemberWorkspaces(data.workspaces || []);
            } else {
                setError('Failed to load workspaces');
            }
        } catch (err) {
            setError('Error loading workspaces');
            console.error('Error fetching member workspaces:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRole = async () => {
        if (selectedRole === member.role) {
            return; // No changes
        }

        setIsSaving(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`/api/project/${projectId}/members/${member.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: selectedRole }),
            });

            if (response.ok) {
                onUpdate();
                onClose();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update role');
            }
        } catch (err) {
            setError('Error updating role');
            console.error('Error updating role:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddToWorkspace = async () => {
        if (!selectedWorkspaceToAdd) return;

        setIsSaving(true);
        setError(null);
        try {
            const response = await fetchWithAuth(
                `/api/project/${projectId}/members/${member.id}/workspace`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        group_id: selectedWorkspaceToAdd,
                        role: 'member',
                    }),
                }
            );

            if (response.ok) {
                await fetchMemberWorkspaces();
                setSelectedWorkspaceToAdd(null);
                onUpdate();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to add to workspace');
            }
        } catch (err) {
            setError('Error adding to workspace');
            console.error('Error adding to workspace:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFromWorkspace = async (workspaceId: number, isMain: boolean) => {
        if (isMain) {
            setError('Cannot remove member from Main workspace');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const response = await fetchWithAuth(
                `/api/project/${projectId}/members/${member.id}/workspace/${workspaceId}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                await fetchMemberWorkspaces();
                onUpdate();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to remove from workspace');
            }
        } catch (err) {
            setError('Error removing from workspace');
            console.error('Error removing from workspace:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveMember = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const response = await fetchWithAuth(
                `/api/projects/${projectId}/members/${member.id}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                onUpdate();
                onClose();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to remove member');
            }
        } catch (err) {
            setError('Error removing member');
            console.error('Error removing member:', err);
        } finally {
            setIsSaving(false);
            setShowRemoveConfirmation(false);
        }
    };

    if (!isOpen) return null;

    const availableToAdd = availableWorkspaces.filter(
        (ws) => !memberWorkspaces.some((mw) => mw.group_id === ws.group_id)
    );

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    >
                        <XIcon />
                    </button>

                    <div className="flex items-center space-x-4">
                        {member.avatar ? (
                            <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold">{member.name}</h2>
                            <p className="text-blue-100">{member.email}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setActiveTab('role')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                            activeTab === 'role'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <UserIcon />
                        <span>Role</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('workspaces')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                            activeTab === 'workspaces'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <FolderIcon />
                        <span>Workspaces</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {activeTab === 'role' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                                Select a role to control what {member.name} can do in this project
                            </p>
                            {ROLES.map((role) => (
                                <div
                                    key={role.value}
                                    onClick={() => setSelectedRole(role.value)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedRole === role.value
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 mr-3 ${
                                            selectedRole === role.value
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-gray-300'
                                        }`}>
                                            {selectedRole === role.value && <CheckIcon />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{role.label}</div>
                                            <div className="text-sm text-gray-600 mt-1">{role.desc}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'workspaces' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">Current Workspaces</h3>

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : memberWorkspaces.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Not assigned to any workspaces
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {memberWorkspaces.map((ws) => (
                                        <div
                                            key={ws.group_id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <FolderIcon />
                                                <div>
                                                    <div className="font-medium text-gray-900">{ws.group_name}</div>
                                                    {ws.is_main && (
                                                        <span className="text-xs text-blue-600 font-medium">Main Workspace</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!ws.is_main && (
                                                <button
                                                    onClick={() => handleRemoveFromWorkspace(ws.group_id, ws.is_main)}
                                                    disabled={isSaving}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {availableToAdd.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="font-semibold text-gray-900 mb-3">Add to Workspace</h3>
                                    <div className="flex space-x-2">
                                        <select
                                            value={selectedWorkspaceToAdd || ''}
                                            onChange={(e) => setSelectedWorkspaceToAdd(Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select workspace...</option>
                                            {availableToAdd.map((ws) => (
                                                <option key={ws.group_id} value={ws.group_id}>
                                                    {ws.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddToWorkspace}
                                            disabled={!selectedWorkspaceToAdd || isSaving}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                        >
                                            <PlusIcon />
                                            <span>Add</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center">
                    <button
                        onClick={() => setShowRemoveConfirmation(true)}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium transition-colors disabled:opacity-50 rounded-lg flex items-center space-x-2"
                    >
                        <TrashIcon />
                        <span>Remove Member</span>
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {activeTab === 'role' && (
                            <button
                                onClick={handleSaveRole}
                                disabled={isSaving || selectedRole === member.role}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Remove Confirmation Dialog */}
                {showRemoveConfirmation && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <TrashIcon />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Remove Member</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to remove <span className="font-semibold">{member.name}</span> from this project?
                                This action cannot be undone and they will lose access to all project content.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowRemoveConfirmation(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRemoveMember}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Removing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrashIcon />
                                            <span>Remove</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MemberEditModal;
