import React, { useState, useEffect } from 'react';
import ProjectDashboard from './ProjectDashboard';
import ProjectInfo from '../project/ProjectInfo';
import ProjectTeam from './ProjectTeam';
import ScheduleMeeting from './ScheduleMeeting';
import TimeSlotSelector from './TimeSlotSelector';
import BlockBasedContent from '../block/BlockBasedContent';
import { useBlocks } from '../../hooks/useBlocks';
import fetchWithAuth from '../../hooks/fetchWithAuth';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    avatar?: string;
    dateJoined: string;
}

interface TabBasedDashboardProps {
    projectId: string;
    currentUserId: string;
}

const TabBasedDashboard: React.FC<TabBasedDashboardProps> = ({ projectId, currentUserId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success'
    });
    const [activeTab, setActiveTab] = useState(0);
    const [userPermissions, setUserPermissions] = useState(3); // Default to editor permissions
    const [project, setProject] = useState<any>(null);

    // Meeting related states
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [selectedTimeZone, setSelectedTimeZone] = useState<number>(0);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState({ start: '09:00', end: '17:00' });
    const [showTimeSlotSelector, setShowTimeSlotSelector] = useState(false);

    // Fetch all blocks for the project to use in the BlockBasedContent components
    const { blocks: allBlocks } = useBlocks({
        projectSid: projectId
    });

    useEffect(() => {
        // Fetch project data including members
        if (projectId) {
            fetchProjectData();
        }
    }, [projectId]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        try {
            // Fetch project details
            const projectResponse = await fetchWithAuth(`/api/projects/${projectId}`);
            if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                setProject(projectData.project || projectData);
            }

            // Fetch project members
            const membersResponse = await fetch(`/project/${projectId}/members`);
            if (membersResponse.ok) {
                const data = await membersResponse.json();
                setTeamMembers(data.members || []);

                // Check if current user is admin
                const currentMember = data.members?.find((m: TeamMember) => m.id === currentUserId);
                const isUserAdmin = currentMember?.role === 'admin';
                setIsAdmin(isUserAdmin);

                // Set user permissions based on role
                if (isUserAdmin) {
                    setUserPermissions(7); // Admin (full permissions)
                } else if (currentMember?.role === 'editor') {
                    setUserPermissions(3); // Editor (view, edit)
                } else {
                    setUserPermissions(1); // Viewer (view only)
                }
            }
        } catch (error) {
            console.error('Error fetching project data:', error);
            showNotification('Failed to load project data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({
            show: true,
            message,
            type
        });
        setTimeout(() => {
            setNotification({ ...notification, show: false });
        }, 6000);
    };

    // Team management handlers
    const handleAddMember = async (email: string, role: string) => {
        try {
            const response = await fetch(`/project/${projectId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    role
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add member');
            }

            await fetchProjectData();
            showNotification('Team member added successfully', 'success');
        } catch (error) {
            console.error('Error adding member:', error);
            showNotification('Failed to add team member', 'error');
            throw error;
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(`/project/${projectId}/members/${memberId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: newRole
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update member role');
            }

            await fetchProjectData();
            showNotification('Member role updated successfully', 'success');
        } catch (error) {
            console.error('Error updating member role:', error);
            showNotification('Failed to update member role', 'error');
            throw error;
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const response = await fetch(`/project/${projectId}/members/${memberId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove member');
            }

            await fetchProjectData();
            showNotification('Team member removed successfully', 'success');
        } catch (error) {
            console.error('Error removing member:', error);
            showNotification('Failed to remove team member', 'error');
            throw error;
        }
    };

    // Group management handlers
    const handleAddGroup = async (name: string, description: string) => {
        try {
            const response = await fetch(`/project/${projectId}/groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create group');
            }

            showNotification('Group created successfully', 'success');
        } catch (error) {
            console.error('Error creating group:', error);
            showNotification('Failed to create group', 'error');
            throw error;
        }
    };

    const handleUpdateGroup = async (groupId: number, name: string, description: string) => {
        try {
            const response = await fetch(`/project/${projectId}/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update group');
            }

            showNotification('Group updated successfully', 'success');
        } catch (error) {
            console.error('Error updating group:', error);
            showNotification('Failed to update group', 'error');
            throw error;
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        try {
            const response = await fetch(`/project/${projectId}/groups/${groupId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete group');
            }

            showNotification('Group deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting group:', error);
            showNotification('Failed to delete group', 'error');
            throw error;
        }
    };

    // Meeting handlers
    const handleSaveAvailability = (data: {
        dates: string[];
        timeZone: number;
        timePeriod: { start: string; end: string };
    }) => {
        setSelectedDates(data.dates);
        setSelectedTimeZone(data.timeZone);
        setSelectedTimePeriod(data.timePeriod);
        showNotification('Availability saved successfully', 'success');
    };

    const handleTimeZoneChange = (timeZone: string) => {
        // Handle timezone change
        console.log('Timezone changed to:', timeZone);
    };

    const handleMeetingSelectionChange = (selections: any[]) => {
        // Handle meeting selection changes
        console.log('Meeting selections:', selections);
    };

    const tabs = [
        { id: 0, label: 'Overview' },
        { id: 1, label: 'Team' },
        { id: 2, label: 'Meetings' },
        { id: 3, label: 'Roadmap' },
        { id: 4, label: 'Checklist' },
        { id: 5, label: 'Curriculum' },
    ];

    // Sub-tabs for Overview section
    const [overviewSubTab, setOverviewSubTab] = useState(0);
    const overviewSubTabs = [
        { id: 0, label: 'Dashboard' },
        { id: 1, label: 'Project Details' },
    ];

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Tabs Header */}
            <div className="w-full mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                    ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {/* Overview Tab with Sub-tabs */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            {/* Overview Sub-tabs */}
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8">
                                    {overviewSubTabs.map((subTab) => (
                                        <button
                                            key={subTab.id}
                                            onClick={() => setOverviewSubTab(subTab.id)}
                                            className={`
                                                py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                                ${overviewSubTab === subTab.id
                                                    ? 'border-purple-500 text-purple-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            {subTab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Overview Sub-tab Content */}
                            <div>
                                {/* Dashboard Sub-tab */}
                                {overviewSubTab === 0 && (
                                    <ProjectDashboard projectId={projectId} />
                                )}

                                {/* Project Details Sub-tab */}
                                {overviewSubTab === 1 && project && (
                                    <ProjectInfo project={project} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Team Tab */}
                    {activeTab === 1 && (
                        <ProjectTeam
                            projectId={projectId}
                            teamMembers={teamMembers}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            isLoading={isLoading}
                            onAddMember={handleAddMember}
                            onUpdateMemberRole={handleUpdateMemberRole}
                            onRemoveMember={handleRemoveMember}
                            onAddGroup={handleAddGroup}
                            onUpdateGroup={handleUpdateGroup}
                            onDeleteGroup={handleDeleteGroup}
                        />
                    )}

                    {/* Meetings Tab */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                    Meeting Scheduling
                                </h2>
                                
                                {/* Schedule Meeting Component */}
                                <div className="mb-6">
                                    <ScheduleMeeting
                                        onSaveAvailability={handleSaveAvailability}
                                    />
                                </div>

                                {/* Show/Hide Time Slot Selector Button */}
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowTimeSlotSelector(!showTimeSlotSelector)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {showTimeSlotSelector ? 'Hide' : 'Show'} Time Slot Selector
                                    </button>
                                </div>

                                {/* Time Slot Selector Component */}
                                {showTimeSlotSelector && (
                                    <div className="mt-6">
                                        <TimeSlotSelector
                                            initialDate={new Date()}
                                            daysToShow={7}
                                            onSelectionChange={handleMeetingSelectionChange}
                                            isAdmin={isAdmin}
                                            selectedDateRange={{
                                                start: new Date(),
                                                end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                            }}
                                            timeConstraints={{
                                                start: selectedTimePeriod.start,
                                                end: selectedTimePeriod.end
                                            }}
                                            visible={true}
                                            timeZone="UTC"
                                            onTimeZoneChange={handleTimeZoneChange}
                                        />
                                    </div>
                                )}

                                {/* Display selected availability */}
                                {selectedDates.length > 0 && (
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">
                                            Your Availability
                                        </h3>
                                        <p className="text-sm text-blue-700">
                                            {selectedDates.length} date(s) selected
                                        </p>
                                        <p className="text-sm text-blue-700">
                                            Time: {selectedTimePeriod.start} - {selectedTimePeriod.end}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Roadmap Tab */}
                    {activeTab === 3 && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <BlockBasedContent
                                projectSid={projectId}
                                section="page"
                                userPermissions={userPermissions}
                                customTitle="Project Roadmap"
                                allBlocks={allBlocks}
                            />
                        </div>
                    )}

                    {/* Checklist Tab */}
                    {activeTab === 4 && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <BlockBasedContent
                                projectSid={projectId}
                                section="database"
                                userPermissions={userPermissions}
                                customTitle="Project Checklist"
                                allBlocks={allBlocks}
                            />
                        </div>
                    )}

                    {/* Curriculum Tab */}
                    {activeTab === 5 && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <BlockBasedContent
                                projectSid={projectId}
                                section="database"
                                userPermissions={userPermissions}
                                customTitle="Curriculum Alignment"
                                allBlocks={allBlocks}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {notification.show && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className={`
                        px-6 py-3 rounded-lg shadow-lg text-white flex items-center space-x-2
                        ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}
                    `}>
                        <span>{notification.message}</span>
                        <button
                            onClick={() => setNotification({ ...notification, show: false })}
                            className="ml-4 text-white hover:text-gray-200"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabBasedDashboard;