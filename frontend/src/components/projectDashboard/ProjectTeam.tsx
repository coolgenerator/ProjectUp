import React, { useState } from 'react';
import ProjectGroups from './ProjectGroups';
import GroupMembers from './GroupMembers';
import MemberEditModal from './MemberEditModal';

// Icons as SVG components
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

const PersonAddIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const AdminIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.5 12c1.38 0 2.49-1.12 2.49-2.5S17.88 7 16.5 7C15.12 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zM9 11c1.66 0 2.99-1.34 2.99-3S10.66 5 9 5C7.34 5 6 6.34 6 8s1.34 3 3 3zm7.5 3c-1.83 0-5.5.92-5.5 2.75V19h11v-2.25c0-1.83-3.67-2.75-5.5-2.75zM9 13c-2.33 0-7 1.17-7 3.5V19h7v-2.25c0-.85.33-2.34 2.37-3.47C10.5 13.1 9.66 13 9 13z" />
    </svg>
);

const MemberIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const GroupIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    avatar?: string;
    dateJoined: string;
}

interface ProjectTeamProps {
    projectId: string;
    teamMembers: TeamMember[];
    currentUserId: string;
    isAdmin: boolean;
    isLoading?: boolean;
    availableWorkspaces?: Array<{
        group_id: number;
        name: string;
        workspace_type: string;
        is_main: boolean;
    }>;
    onAddMember?: (email: string, role: string) => Promise<void>;
    onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
    onRemoveMember?: (memberId: string) => Promise<void>;
    onAddGroup?: (name: string, description: string) => Promise<void>;
    onUpdateGroup?: (groupId: number, name: string, description: string) => Promise<void>;
    onDeleteGroup?: (groupId: number) => Promise<void>;
    onManageGroupMembers?: (groupId: number) => void;
    onManageGroupVisibility?: (groupId: number) => void;
    onRefresh?: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`team-tabpanel-${index}`}
            aria-labelledby={`team-tab-${index}`}
            {...other}
        >
            {value === index && (
                <div className="pt-4">
                    {children}
                </div>
            )}
        </div>
    );
};

const a11yProps = (index: number) => {
    return {
        id: `team-tab-${index}`,
        'aria-controls': `team-tabpanel-${index}`,
    };
};

const ProjectTeam: React.FC<ProjectTeamProps> = ({
    projectId,
    teamMembers,
    currentUserId,
    isAdmin,
    isLoading = false,
    availableWorkspaces = [],
    onAddMember,
    onUpdateMemberRole,
    onRemoveMember,
    onAddGroup,
    onUpdateGroup,
    onDeleteGroup,
    onManageGroupVisibility,
    onRefresh
}) => {
    // State for member edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

    // State for dialogs
    const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

    // State for group management dialogs
    const [groupMembersDialogOpen, setGroupMembersDialogOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedGroupName, setSelectedGroupName] = useState<string>('');

    // Form state
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('editor');
    const [isProcessing, setIsProcessing] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Tab state
    const [tabValue, setTabValue] = useState(0);

    // Handle tab change
    const handleTabChange = (newValue: number) => {
        setTabValue(newValue);
    };

    // Group management handlers
    const handleAddGroupImpl = async (name: string, description: string) => {
        if (!onAddGroup) {
            console.error("onAddGroup handler not provided");
            return;
        }

        try {
            await onAddGroup(name, description);
            return Promise.resolve();
        } catch (error) {
            console.error("Error adding group:", error);
            return Promise.reject(error);
        }
    };

    const handleUpdateGroupImpl = async (groupId: number, name: string, description: string) => {
        if (!onUpdateGroup) {
            console.error("onUpdateGroup handler not provided");
            return;
        }

        try {
            await onUpdateGroup(groupId, name, description);
            return Promise.resolve();
        } catch (error) {
            console.error("Error updating group:", error);
            return Promise.reject(error);
        }
    };

    const handleDeleteGroupImpl = async (groupId: number) => {
        if (!onDeleteGroup) {
            console.error("onDeleteGroup handler not provided");
            return;
        }

        try {
            await onDeleteGroup(groupId);
            return Promise.resolve();
        } catch (error) {
            console.error("Error deleting group:", error);
            return Promise.reject(error);
        }
    };

    const handleManageGroupMembersImpl = (groupId: number, groupName: string) => {
        setSelectedGroupId(groupId);
        setSelectedGroupName(groupName);
        setGroupMembersDialogOpen(true);
    };

    const handleManageGroupVisibilityImpl = (groupId: number) => {
        // This function can be implemented to handle group visibility management
        if (onManageGroupVisibility) {
            onManageGroupVisibility(groupId);
        }
    };

    // Handle closing modal dialogs
    const handleCloseGroupMembersDialog = () => {
        setGroupMembersDialogOpen(false);
    };


    // Handle opening edit modal
    const handleEditMember = (member: TeamMember) => {
        console.log('Opening edit modal for member:', member);
        setSelectedMember(member);
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setSelectedMember(null);
    };

    // Handle add member dialog
    const handleAddMemberOpen = () => {
        setAddMemberDialogOpen(true);
        setNewMemberEmail('');
        setNewMemberRole('editor');
        setEmailError('');
    };

    const handleAddMemberClose = () => {
        setAddMemberDialogOpen(false);
    };

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleAddMember = async () => {
        if (!validateEmail(newMemberEmail)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        if (onAddMember) {
            setIsProcessing(true);
            try {
                await onAddMember(newMemberEmail, newMemberRole);
                handleAddMemberClose();
            } catch (error) {
                console.error('Error adding member:', error);
            } finally {
                setIsProcessing(false);
            }
        }
    };


    // Render role icon and label
    const getRoleDetails = (role: string) => {
        switch (role) {
            case 'admin':
                return {
                    icon: <AdminIcon />,
                    label: 'Admin',
                    color: '#d32f2f'
                };
            case 'editor':
                return {
                    icon: <EditIcon />,
                    label: 'Editor',
                    color: '#1976d2'
                };
            case 'viewer':
                return {
                    icon: <MemberIcon />,
                    label: 'Viewer',
                    color: '#388e3c'
                };
            default:
                return {
                    icon: <MemberIcon />,
                    label: 'Unknown',
                    color: '#757575'
                };
        }
    };

    const renderTeamMembers = () => {
        // Filter out members that should not be displayed
        const activeMembers = teamMembers.filter((member) => {
            // Only show members with valid roles (admin, editor, viewer)
            return ['admin', 'editor', 'viewer'].includes(member.role);
        });

        return (
            <div className="space-y-2">
                {activeMembers.map((member) => {
                    const roleDetails = getRoleDetails(member.role);
                    const isCurrentUser = member.id === currentUserId;

                    return (
                        <div
                            key={member.id}
                            className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                    style={{ backgroundColor: member.avatar ? 'transparent' : roleDetails.color }}
                                >
                                    {member.avatar ? (
                                        <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                                    ) : (
                                        member.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 ml-4">
                                <div className="flex items-center">
                                    <span className="text-base font-medium text-gray-900">
                                        {member.name}
                                    </span>
                                    {isCurrentUser && (
                                        <span className="ml-2 text-sm italic text-gray-500">
                                            (You)
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {member.email}
                                </div>
                                <div className="flex items-center mt-1">
                                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ color: roleDetails.color }}>
                                        <span className="mr-1">{roleDetails.icon}</span>
                                        {roleDetails.label}
                                    </div>
                                </div>
                            </div>
                            {isAdmin && !isCurrentUser && (
                                <button
                                    onClick={() => handleEditMember(member)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                    type="button"
                                >
                                    Manage
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
                <div className="flex">
                    <button
                        onClick={() => handleTabChange(0)}
                        className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 border-b-2 transition-colors ${tabValue === 0
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        {...a11yProps(0)}
                    >
                        <MemberIcon />
                        <span className="font-medium">Team Members</span>
                    </button>
                    <button
                        onClick={() => handleTabChange(1)}
                        className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 border-b-2 transition-colors ${tabValue === 1
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        {...a11yProps(1)}
                    >
                        <GroupIcon />
                        <span className="font-medium">Groups</span>
                    </button>
                </div>
            </div>

            <div className="p-4">
                <TabPanel value={tabValue} index={0}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                        {isAdmin && (
                            <button
                                onClick={handleAddMemberOpen}
                                disabled={isLoading || isProcessing}
                                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PersonAddIcon />
                                <span className="ml-2">Add Member</span>
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">
                                No team members found
                            </p>
                            {isAdmin && (
                                <p className="text-sm text-gray-400 mt-2">
                                    Add team members to collaborate on this project
                                </p>
                            )}
                        </div>
                    ) : (
                        renderTeamMembers()
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <ProjectGroups
                        projectId={projectId}
                        isAdmin={isAdmin}
                        isLoading={isLoading}
                        onAddGroup={handleAddGroupImpl}
                        onUpdateGroup={handleUpdateGroupImpl}
                        onDeleteGroup={handleDeleteGroupImpl}
                        onManageGroupMembers={(groupId) => {
                            // Backend doesn't have individual group endpoint yet
                            handleManageGroupMembersImpl(groupId, 'Group');
                        }}
                        onManageGroupVisibility={handleManageGroupVisibilityImpl}
                    />
                </TabPanel>
            </div>

            {/* Member Edit Modal */}
            {selectedMember && (
                <MemberEditModal
                    isOpen={editModalOpen}
                    onClose={handleCloseEditModal}
                    member={{
                        id: selectedMember.id,
                        name: selectedMember.name,
                        email: selectedMember.email,
                        role: selectedMember.role,
                        avatar: selectedMember.avatar,
                    }}
                    projectId={projectId}
                    availableWorkspaces={availableWorkspaces}
                    onUpdate={() => {
                        onRefresh?.();
                        handleCloseEditModal();
                    }}
                />
            )}

            {/* Add Member Dialog */}
            {addMemberDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleAddMemberClose} />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
                        </div>
                        <div className="px-6 py-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => {
                                        setNewMemberEmail(e.target.value);
                                        setEmailError('');
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter email address"
                                    autoFocus
                                />
                                {emailError && (
                                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={newMemberRole}
                                    onChange={(e) => setNewMemberRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="admin">Admin (Full control)</option>
                                    <option value="editor">Editor (Can edit but not manage team)</option>
                                    <option value="viewer">Viewer (Read-only access)</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                            <button
                                onClick={handleAddMemberClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddMember}
                                disabled={isProcessing || !newMemberEmail}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <AddIcon />
                                        <span className="ml-2">Add Member</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Members Dialog */}
            {groupMembersDialogOpen && (
                <GroupMembers
                    open={groupMembersDialogOpen}
                    onClose={handleCloseGroupMembersDialog}
                    groupId={selectedGroupId!}
                    groupName={selectedGroupName}
                    projectId={projectId}
                />
            )}

        </div>
    );
};

export default ProjectTeam; 