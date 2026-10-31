import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createGroup, deleteGroup, updateGroup } from '../../services/projectService';
import fetchWithAuth from '../../hooks/fetchWithAuth';

// SVG Icons
const MoreVertIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
);

const AddIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
);

const PeopleIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);

const VisibilityIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
);

const VisibilityOffIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
);

interface ProjectGroup {
    group_id: number;
    project_id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    visible_blocks_count?: number;
}

interface ProjectGroupsProps {
    projectId: string;
    isAdmin: boolean;
    isLoading?: boolean;
    onAddGroup?: (name: string, description: string) => Promise<void>;
    onUpdateGroup?: (groupId: number, name: string, description: string) => Promise<void>;
    onDeleteGroup?: (groupId: number) => Promise<void>;
    onManageGroupMembers?: (groupId: number) => void;
    onManageGroupVisibility?: (groupId: number) => void;
}

const ProjectGroups: React.FC<ProjectGroupsProps> = ({
    projectId,
    isAdmin,
    isLoading = false,
    onAddGroup,
    onUpdateGroup,
    onDeleteGroup,
    onManageGroupMembers,
    onManageGroupVisibility
}) => {
    // State for groups data
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);

    // State for UI controls
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
    const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
    const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupDescription, setEditGroupDescription] = useState('');

    // Refs
    const menuRef = useRef<HTMLDivElement>(null);

    // Compute if update button should be disabled
    const isUpdateButtonDisabled = () => {
        if (isProcessing || !editGroupName.trim()) {
            return true;
        }

        if (selectedGroup) {
            return editGroupName.trim() === selectedGroup.name &&
                editGroupDescription.trim() === (selectedGroup.description || '');
        }

        return false;
    };

    // Load groups data
    useEffect(() => {
        if (projectId) {
            fetchGroups();
        }
    }, [projectId]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    const fetchGroups = async () => {
        try {
            const response = await fetchWithAuth(`/projects/${projectId}/groups`);
            if (response.ok) {
                const data = await response.json();
                setGroups(data.groups || []);
            } else {
                console.error('Failed to fetch groups');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    // Menu handlers
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: ProjectGroup) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 200; // Approximate menu width
        const menuHeight = 180; // Approximate menu height

        // Calculate position, ensuring menu stays within viewport
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 4; // 4px spacing

        // Adjust if menu would overflow right edge
        if (left + menuWidth > window.innerWidth) {
            left = rect.right + window.scrollX - menuWidth;
        }

        // Adjust if menu would overflow bottom edge
        if (rect.bottom + menuHeight > window.innerHeight) {
            top = rect.top + window.scrollY - menuHeight - 4;
        }

        setMenuPosition({ top, left });
        setSelectedGroup(group);
        setMenuOpen(true);
    };

    const handleMenuClose = () => {
        setMenuOpen(false);
    };

    // Dialog handlers
    const handleAddGroupOpen = () => {
        setNewGroupName('');
        setNewGroupDescription('');
        setAddGroupDialogOpen(true);
    };

    const handleAddGroupClose = () => {
        setAddGroupDialogOpen(false);
    };

    const handleEditGroupOpen = () => {
        if (selectedGroup) {
            setEditGroupName(selectedGroup.name);
            setEditGroupDescription(selectedGroup.description || '');
            setEditGroupDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleEditGroupClose = () => {
        setEditGroupDialogOpen(false);
    };

    const handleDeleteGroupOpen = () => {
        setDeleteGroupDialogOpen(true);
        handleMenuClose();
    };

    const handleDeleteGroupClose = () => {
        setDeleteGroupDialogOpen(false);
    };

    // Action handlers
    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;

        setIsProcessing(true);
        try {
            if (onAddGroup) {
                await onAddGroup(newGroupName.trim(), newGroupDescription.trim());
            } else {
                await createGroup(projectId, {
                    name: newGroupName.trim(),
                    description: newGroupDescription.trim(),
                    permissions: 0,
                    group_type: 'custom',
                    is_default: false
                });
            }
            setAddGroupDialogOpen(false);
            await fetchGroups();
        } catch (error) {
            console.error('Error adding group:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateGroup = async () => {
        if (!editGroupName.trim() || !selectedGroup) return;

        setIsProcessing(true);
        try {
            if (onUpdateGroup) {
                await onUpdateGroup(selectedGroup.group_id, editGroupName.trim(), editGroupDescription.trim());
            } else {
                await updateGroup(projectId, selectedGroup.group_id, {
                    name: editGroupName.trim(),
                    description: editGroupDescription.trim()
                });
            }
            setEditGroupDialogOpen(false);
            await fetchGroups();
        } catch (error) {
            console.error('Error updating group:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!selectedGroup) return;

        setIsProcessing(true);
        try {
            if (onDeleteGroup) {
                await onDeleteGroup(selectedGroup.group_id);
            } else {
                await deleteGroup(projectId, selectedGroup.group_id);
            }
            setDeleteGroupDialogOpen(false);
            await fetchGroups();
        } catch (error) {
            console.error('Error deleting group:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManageMembers = () => {
        if (!selectedGroup || !onManageGroupMembers) return;

        onManageGroupMembers(selectedGroup.group_id);
        handleMenuClose();
    };

    const handleManageVisibility = () => {
        if (!selectedGroup || !onManageGroupVisibility) return;

        onManageGroupVisibility(selectedGroup.group_id);
        handleMenuClose();
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
                {isAdmin && (
                    <button
                        onClick={handleAddGroupOpen}
                        disabled={isLoading || isProcessing}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AddIcon />
                        <span className="ml-2">Add Group</span>
                    </button>
                )}
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500">No groups found</p>
                    {isAdmin && (
                        <p className="text-sm text-gray-400 mt-2">
                            Add groups to organize team members and control content visibility
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map((group) => (
                        <div
                            key={group.group_id}
                            className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <PeopleIcon />
                                </div>
                            </div>
                            <div className="flex-1 ml-4">
                                <div className="flex items-center">
                                    <span className="text-base font-medium text-gray-900">
                                        {group.name}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {group.description || "No description"}
                                </div>
                                <div className="flex items-center mt-1">
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        group.visible_blocks_count
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {group.visible_blocks_count ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                        <span className="ml-1">{group.visible_blocks_count || 0} visible blocks</span>
                                    </div>
                                </div>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={(e) => handleMenuOpen(e, group)}
                                    disabled={isProcessing}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                >
                                    <MoreVertIcon />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Dropdown Menu */}
            {menuOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[200px]"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                    }}
                >
                    <button
                        onClick={handleEditGroupOpen}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <EditIcon />
                        <span className="ml-2">Rename Group</span>
                    </button>
                    <button
                        onClick={handleManageMembers}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <PeopleIcon />
                        <span className="ml-2">Manage Members</span>
                    </button>
                    <button
                        onClick={handleManageVisibility}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <VisibilityIcon />
                        <span className="ml-2">Manage Visibility</span>
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                        onClick={handleDeleteGroupOpen}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <DeleteIcon />
                        <span className="ml-2">Delete Group</span>
                    </button>
                </div>,
                document.body
            )}

            {/* Add Group Dialog */}
            {addGroupDialogOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Group</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                    <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                                        <div className="pl-3 text-gray-400">
                                            <PeopleIcon />
                                        </div>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className="flex-1 px-3 py-2 outline-none"
                                            placeholder="Enter group name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={newGroupDescription}
                                        onChange={(e) => setNewGroupDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        placeholder="Describe the purpose of this group"
                                    />
                                </div>
                                <p className="text-sm text-gray-500">
                                    Groups help you organize team members and control which content they can access.
                                </p>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={handleAddGroupClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddGroup}
                                disabled={isProcessing || !newGroupName.trim()}
                                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <AddIcon />
                                        <span className="ml-2">Add Group</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Group Dialog */}
            {editGroupDialogOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Group</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editGroupName}
                                        onChange={(e) => setEditGroupName(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={editGroupDescription}
                                        onChange={(e) => setEditGroupDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        placeholder="Describe the purpose of this group"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={handleEditGroupClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateGroup}
                                disabled={isUpdateButtonDisabled()}
                                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <EditIcon />
                                        <span className="ml-2">Update Group</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Group Dialog */}
            {deleteGroupDialogOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Group</h3>
                            <p className="text-gray-700 mb-2">
                                Are you sure you want to delete the group <strong>{selectedGroup?.name}</strong>?
                            </p>
                            <p className="text-sm text-red-600">
                                This action cannot be undone. All content visibility settings for this group will be removed.
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={handleDeleteGroupClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteGroup}
                                disabled={isProcessing}
                                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <DeleteIcon />
                                        <span className="ml-2">Delete Group</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ProjectGroups;
