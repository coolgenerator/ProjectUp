import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../store/store";
import ScheduleMeeting from "../../components/projectDashboard/ScheduleMeeting";
import TimeSlotSelector from "../../components/projectDashboard/TimeSlotSelector";
import CreateProjectModal from "../../components/project/CreateProjectModal";
import { useProject } from "../../hooks/useProject";
import config from "../../config";
import LoadingPage from "../../components/app/Loading";
import { PERMISSIONS } from "../../services/projectService";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import withAuth from "../../hooks/withAuth";
import PermissionDenied from "../../components/errors/PermissionDenied";
import { HelpButton } from "../../components/tutorial/HelpButton";
import { DashboardTutorial } from "../../components/tutorial/DashboardTutorial";
import { useTutorial } from "../../hooks/useTutorial";

// Import additional components
import ApplicationsList from "../../components/projectDashboard/ApplicationsList";
import ProjectManagementActions from "../../components/projectDashboard/ProjectManagementActions";
import ProjectTeam from "../../components/projectDashboard/ProjectTeam";
import ProjectWorkspaces from "../../components/projectDashboard/ProjectWorkspaces";
import ProjectResources from "../../components/projectDashboard/ProjectResources";
import ProjectMilestones from "../../components/projectDashboard/ProjectMilestones";
import ProjectDashboardComponent from "../../components/projectDashboard/ProjectDashboard";
import TeamPulse from "../../components/match/TeamPulse";
import TeamChat from "../../components/match/TeamChat";
import ProjectSharing from "../../components/projectSettings/ProjectSharing";

// Import Idea Forest component
import IdeaForest from "../../components/project/IdeaForest";
import TaskManagement from "../../components/project/TaskManagement/TaskManagement";
import ProjectProposals from "../../components/projectDashboard/ProjectProposals";
import MeetingsList from "../../components/projectDashboard/MeetingsList";
import ProjectCalendar from "../../components/projectDashboard/ProjectCalendar";

// Icon Components - Using SVG icons instead of MUI
const DashboardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const FolderIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const AssignmentIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EventNoteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const GroupIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ComputerIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const AccountTreeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11m0 0L7 3m7 7l-7 7m12-7v8a2 2 0 01-2 2h-3" />
    </svg>
);

const TaskIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const ViewModuleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const MenuIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
);

const ProposalsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const { AWS_BASE_URL } = config;

// Define dashboard section types
type DashboardSection = 'overview' | 'milestones' | 'resources' | 'workspaces' | 'meetings' | 'members' | 'settings' | string;

// Define customizable section types
type CustomizableSectionType = 'task' | 'link' | 'embed' | 'page' | 'database' | 'todo' | 'text' | string;

// Define section configuration
interface SectionConfig {
    id: DashboardSection;
    label: string;
    icon: React.ReactNode;
    order: number;
    visible: boolean;
    blockType?: CustomizableSectionType;
    isCustomizable?: boolean;
    requiredPermission?: number; // Add permission requirement
    blockId?: number; // Use number type since block_id is a number
}

// Helper function to check if user has the required permission
const hasRequiredPermission = (userPermissions: number, requiredPermission: number | undefined): boolean => {
    if (!requiredPermission) return true; // No permission required
    return (userPermissions & requiredPermission) === requiredPermission;
};

// Helper functions for visibility status
const getVisibilityLabel = (project: any): string => {
    const visibility = project.visibility;

    if (!visibility && visibility !== 0) return "Public";

    switch (visibility) {
        case 0: return "Private";
        case 1: return "Public";
        case 2: return "Local";
        case 3: return "Organization";
        default: return "Public";
    }
};

const getVisibilityColor = (project: any): string => {
    const visibility = project.visibility;

    if (!visibility && visibility !== 0) return "bg-blue-100 text-blue-800";

    switch (visibility) {
        case 0: return "bg-slate-100 text-slate-800";
        case 1: return "bg-green-100 text-green-800";
        case 2: return "bg-blue-100 text-blue-800";
        case 3: return "bg-sky-100 text-sky-800";
        default: return "bg-blue-100 text-blue-800";
    }
};

const getVisibilityDotColor = (project: any): string => {
    const visibility = project.visibility;

    if (!visibility && visibility !== 0) return "bg-blue-500";

    switch (visibility) {
        case 0: return "bg-slate-500";
        case 1: return "bg-green-500";
        case 2: return "bg-blue-500";
        case 3: return "bg-sky-500";
        default: return "bg-blue-500";
    }
};


const ProjectDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { shortId } = useParams<{ shortId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const sid = shortId ?? "";

    // Get current user from Redux state
    const user = useSelector((state: RootState) => state.auth.user);

    // Check for section parameter in URL
    const queryParams = new URLSearchParams(location.search);
    const sectionParam = queryParams.get('section') as DashboardSection || 'overview';

    const [activeSection, setActiveSection] = useState<DashboardSection>(sectionParam);
    const [isSidebarOpen, setIsSidebarOpen] = useState(!(window.innerWidth < 768));
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [userPermissions, setUserPermissions] = useState<number>(0); // No permissions by default until loaded from backend
    const [error, setError] = useState<string | null>(null);

    // Inline editing state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedProject, setEditedProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Post management modal state
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Overview sub-tab state (Dashboard vs Project Details)
    const [overviewSubTab, setOverviewSubTab] = useState<'dashboard' | 'details'>('dashboard');

    // Tutorial handling
    const { startTutorial } = useTutorial('dashboard');

    // Start tutorial if URL has tutorial=true
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const isTutorial = urlParams.get('tutorial') === 'true';

        if (isTutorial) {
            // Start the dashboard tutorial
            setTimeout(() => {
                startTutorial();
            }, 1000); // Delay to ensure page is loaded
        }
    }, [location.search, startTutorial]);

    // Meeting section state
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [selectedTimeZone, setSelectedTimeZone] = useState<number>(0);
    const [timePeriod, setTimePeriod] = useState<{ start: string; end: string }>({ start: "09:00", end: "17:00" });
    const [meetingTimes, setMeetingTimes] = useState<any[]>([]);

    // Add responsive handler for window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobileView(mobile);

            // Automatically close sidebar on mobile
            if (mobile && isSidebarOpen) {
                setIsSidebarOpen(false);
            } else if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isSidebarOpen]);

    // Define sections. A newly formed team needs overview, tasks, resources, members and
    // settings; the rest are hidden until they earn their place.
    const sections: SectionConfig[] = [
        { id: 'overview', label: t('projects.dashboard.sections.overview'), icon: <DashboardIcon />, order: 0, visible: true, blockType: 'overview', isCustomizable: false },
        // { id: 'idea-forest', label: t('projects.dashboard.sections.ideaForest'), icon: <AccountTreeIcon />, order: 1, visible: true, blockType: 'idea-forest', isCustomizable: false },
        { id: 'tasks', label: t('projects.dashboard.sections.tasks'), icon: <TaskIcon />, order: 2, visible: true, blockType: 'tasks', isCustomizable: false },
        // { id: 'calendar', label: 'Calendar', icon: <EventNoteIcon />, order: 3, visible: true, blockType: 'calendar', isCustomizable: false },
        // { id: 'plans', label: 'Proposals', icon: <ProposalsIcon />, order: 4, visible: true, blockType: 'plans', isCustomizable: false },
        { id: 'resources', label: t('projects.dashboard.sections.resources'), icon: <FolderIcon />, order: 5, visible: true, blockType: 'link', isCustomizable: false },
        // { id: 'workspaces', label: t('projects.dashboard.sections.workTools'), icon: <ComputerIcon />, order: 6, visible: true, blockType: 'embed', isCustomizable: false },
        // { id: 'meetings', label: t('projects.dashboard.sections.meetings'), icon: <EventNoteIcon />, order: 7, visible: true, blockType: 'meeting', isCustomizable: false },
        // Admin-only sections - no permission required, just role check
        { id: 'members', label: t('projects.dashboard.sections.teamMembers'), icon: <GroupIcon />, order: 8, visible: true, blockType: 'members', isCustomizable: false },
        { id: 'settings', label: t('projects.dashboard.sections.projectSettings'), icon: <SettingsIcon />, order: 9, visible: true, blockType: 'settings', isCustomizable: false },
    ];




    // Use custom hooks
    const {
        project,
        loading,
        error: projectError,
        errorCode,
        members,
        applications,
        manageLoading,
        updateMemberRole,
        removeMember,
        handleDeleteProject,
        handleArchiveProject,
        fetchManageData,
        toggleProjectPublish,
        markProjectAsCompleted,
        fetchProjectData
    } = useProject(sid);

    // State for groups
    const [groups, setGroups] = useState<any[]>([]);

    // State for invite/share tab
    const [inviteShareTab, setInviteShareTab] = useState<'email' | 'link'>('email');

    // Fetch groups
    useEffect(() => {
        const fetchGroups = async () => {
            if (!sid) return;
            try {
                const response = await fetchWithAuth(`/api/projects/${sid}/groups`);
                if (response.ok) {
                    const data = await response.json();
                    setGroups(data.groups || []);
                }
            } catch {
                // Silently fail - groups are optional
            }
        };

        if (activeSection === 'settings' || activeSection === 'members') {
            fetchGroups();
        }
    }, [sid, activeSection]);

    // Helper to check if current user is admin
    const isUserAdmin = (): boolean => {
        if (!members || members.length === 0) {
            return false;
        }
        if (!user || !user.id) {
            return false;
        }
        const userId = user.id.toString();
        const currentUser = members.find(member =>
            member.user_id != null && member.user_id.toString() === userId
        );
        // Only check role - admin role is required for admin actions
        const isAdmin = currentUser?.role === 'admin';
        return !!isAdmin;
    };

    // Update user permissions once members are loaded
    useEffect(() => {
        if (members && members.length > 0) {
            // Find current user in members array
            const currentUser = members.find(member =>
                member.user_id != null && member.user_id.toString() === localStorage.getItem('user_id')
            );

            if (currentUser) {
                // Use permissions from backend based on user's role
                // The backend returns permissions based on role:
                // - admin: all permissions
                // - editor: PERMISSIONS.VIEW | PERMISSIONS.EDIT | PERMISSIONS.SHARE
                // - viewer: PERMISSIONS.VIEW only
                setUserPermissions(currentUser.permissions || 0);
            }
        }
    }, [members]);

    // const {
    //     availableDates,
    //     timePeriod,
    //     handleSaveAvailability,
    //     handleTimeZoneChange
    // } = useAvailability();





    // Helper function to get media URL
    const getMediaUrl = (file: string | File): string => {
        if (typeof file === "string") {
            return file.startsWith('http') ? file : `${AWS_BASE_URL}${file}`;
        }
        return URL.createObjectURL(file);
    };

    // Update the section change handler to sync with URL
    const handleSectionChange = (section: DashboardSection) => {
        setActiveSection(section);
        // Update URL to reflect the section change
        navigate(`/project/${shortId}/dashboard?section=${section}`, { replace: true });
    };



    // Responsive sidebar toggle
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    // Helper function to get the appropriate icon for a section
    const getIconForSection = (sectionId: DashboardSection) => {
        // First check if it's one of the standard sections
        switch (sectionId) {
            case 'overview': return <DashboardIcon />;
            case 'plans': return <ProposalsIcon />;
            case 'idea-forest': return <AccountTreeIcon />;
            case 'idea-tree': return <AccountTreeIcon />; // Legacy support
            case 'tasks': return <TaskIcon />;
            case 'calendar': return <EventNoteIcon />;
            case 'resources': return <FolderIcon />;
            case 'workspaces': return <ComputerIcon />;
            case 'meetings': return <EventNoteIcon />;
            case 'members': return <GroupIcon />;
            case 'settings': return <SettingsIcon />;
            default:
                // Default icon
                return <DashboardIcon />;
        }
    };

    // Render the content for the active section
    const renderActiveSection = () => {
        // Check if the user has role access to view this section (admin-only sections)
        if ((activeSection === 'members' || activeSection === 'settings') && !isUserAdmin()) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <SettingsIcon />
                    <h2 className="text-xl font-semibold text-slate-500 dark:text-slate-400 mt-4">
                        You don't have permission to access this section
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 mt-2">
                        Only admins can access this section
                    </p>
                </div>
            );
        }


        // Handle other section types
        switch (activeSection) {
            case 'overview':
                return renderOverviewSection();
            case 'meetings':
                return renderMeetingsSection();
            case 'members':
                return renderMembersSection();
            case 'settings':
                return renderSettingsSection();
            case 'resources':
                return (
                    <ProjectResources
                        projectId={sid}
                        isAdmin={isUserAdmin()}
                    />
                );
            case 'workspaces':
                return (
                    <ProjectWorkspaces
                        projectId={sid}
                        isAdmin={isUserAdmin()}
                    />
                );
            case 'plans':
                return (
                    <ProjectProposals
                        projectId={sid}
                        isAdmin={isUserAdmin()}
                    />
                );
            case 'idea-forest':
            case 'idea-tree': // Legacy support
                if (!sid) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    );
                }

                // Show dashboard or tree based on state
                return (
                    <div className="h-full overflow-hidden">
                        <IdeaForest projectId={sid} />
                    </div>
                );
            case 'tasks':
                // Render Task Management inline (similar to idea-forest)
                if (!sid || !project?.id) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    );
                }
                return (
                    <div className="h-full overflow-hidden -m-6">
                        <TaskManagement
                            projectId={String(project.id)}
                            projectSid={sid}
                        />
                    </div>
                );
            case 'calendar':
                return renderCalendarSection();
            default:
                // Default fallback
                return (
                    <div className="p-6 text-center">
                        <h2 className="text-xl font-medium text-slate-700 mb-3">Content Not Available</h2>
                        <p className="text-slate-500">This section doesn't have any content yet.</p>
                    </div>
                );
        }
    };

    // Inline editing helper functions
    const startEditMode = () => {
        setEditedProject({
            name: project?.name || '',
            type: project?.type || '',
            otherType: project?.otherType || '',
            location: project?.location || '',
            startTime: project?.startTime || '',
            deadline: project?.deadline || '',
            communicationApp: project?.communicationApp || '',
            otherApp: project?.otherApp || '',
            school: project?.school || '',
            class: project?.class || '',
            description: project?.description || ''
        });
        setIsEditMode(true);
    };

    const cancelEditMode = () => {
        setIsEditMode(false);
        setEditedProject(null);
    };

    const saveAllFields = async () => {
        if (isSaving || !project || !editedProject) return;

        setIsSaving(true);
        try {
            const response = await fetchWithAuth(`/projects/${sid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedProject)
            });

            if (response.ok) {
                await fetchProjectData();
                setIsEditMode(false);
                setEditedProject(null);
            } else {
                alert('Failed to update project. Please try again.');
            }
        } catch (error) {
            alert('Error updating project');
        } finally {
            setIsSaving(false);
        }
    };

    // Project overview section
    const renderOverviewSection = () => {
        return (
            <section>
                {/* Overview Sub-tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            data-tour="overview-dashboard-tab"
                            onClick={() => setOverviewSubTab('dashboard')}
                            className={`
                                py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${overviewSubTab === 'dashboard'
                                    ? 'border-purple-500 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {t("match.overview.dashboardTab")}
                        </button>
                        <button
                            data-tour="overview-details-tab"
                            onClick={() => setOverviewSubTab('details')}
                            className={`
                                py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${overviewSubTab === 'details'
                                    ? 'border-purple-500 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {t("match.overview.detailsTab")}
                        </button>
                    </nav>
                </div>

                {/* Dashboard Sub-tab Content */}
                {overviewSubTab === 'dashboard' && (
                    <>
                        {sid && <TeamPulse projectSid={sid} />}
                        {sid && <TeamChat projectSid={sid} />}
                        <ProjectDashboardComponent projectId={sid} />
                    </>
                )}

                {/* Project Details Sub-tab Content */}
                {overviewSubTab === 'details' && (
                    <div>
                        <div className="flex justify-end mb-6">
                            {/* Combined Visibility and Publish Status Selector */}
                            {project && (
                            <select
                                value={`${project.visibility}-${project?.isPublished ? '1' : '0'}`}
                                onChange={async (e) => {
                                    const [visibilityStr, publishStr] = e.target.value.split('-');
                                    const newVisibility = parseInt(visibilityStr);
                                    const newPublish = publishStr === '1';

                                    try {
                                        // Update both visibility and publish status in one call
                                        const response = await fetchWithAuth(`/projects/${sid}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                visibility: newVisibility,
                                                isPublished: newPublish
                                            })
                                        });

                                        if (!response.ok) {
                                            const errorData = await response.json();
                                            throw new Error(errorData.error || 'Failed to update project status');
                                        }

                                        // Refresh project data
                                        await fetchProjectData();
                                    } catch (error) {
                                        alert(`Failed to update project status: ${error instanceof Error ? error.message : 'Please try again.'}`);
                                    }
                                }}
                                className="flex items-center px-4 py-2 rounded-xl text-sm font-medium shadow-sm backdrop-blur-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all appearance-none pr-8 bg-no-repeat bg-right border"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='currentColor' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundSize: '12px',
                                    backgroundColor: project.visibility !== 0 && !project?.isPublished ? '#fffbeb' : '#ffffff',
                                    color: project.visibility !== 0 && !project?.isPublished ? '#b45309' : project.visibility === 0 ? '#475569' : project.visibility === 1 ? '#059669' : '#0284c7',
                                    borderColor: project.visibility !== 0 && !project?.isPublished ? '#fed7aa' : project.visibility === 0 ? '#cbd5e1' : project.visibility === 1 ? '#a7f3d0' : '#bae6fd'
                                }}
                            >
                                <option value="0-0">{t('projects.dashboard.visibility.private')}</option>
                                <option value="1-0">{t('projects.dashboard.visibility.public')} (Draft)</option>
                                <option value="1-1">{t('projects.dashboard.visibility.public')} (Published)</option>
                                <option value="2-0">{t('projects.dashboard.visibility.unlisted')} (Draft)</option>
                                <option value="2-1">{t('projects.dashboard.visibility.unlisted')} (Published)</option>
                            </select>
                        )}

                        {/* Admin-only buttons */}
                        {isUserAdmin() && (
                            !isEditMode ? (
                                <div className="flex gap-2">
                                    <button
                                        className="text-white flex items-center bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                                        onClick={() => setIsPostModalOpen(true)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="ml-1.5">{t('projects.dashboard.buttons.managePosts')}</span>
                                    </button>
                                    <button
                                        className="text-white flex items-center bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 shadow-md hover:shadow-lg px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                                        onClick={startEditMode}
                                    >
                                        <EditIcon />
                                        <span className="ml-1.5">{t('projects.dashboard.buttons.editProject')}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveAllFields}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
                                    >
                                        {isSaving ? t('projects.dashboard.buttons.saving') : t('projects.dashboard.buttons.saveChanges')}
                                    </button>
                                    <button
                                        onClick={cancelEditMode}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
                                    >
                                        {t('projects.dashboard.buttons.cancel')}
                                    </button>
                                </div>
                            )
                        )}
                        </div>

                        {/* Project Name */}
                <div className="mb-6">
                    {isEditMode ? (
                        <input
                            type="text"
                            value={editedProject?.name || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
                            className="w-full text-3xl font-bold px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Project Name"
                        />
                    ) : (
                        <h2 className="text-3xl font-bold text-slate-900">{project?.name || 'Untitled Project'}</h2>
                    )}
                </div>

                {/* Cover Image */}
                {project?.cover && (
                    <div className="w-full mb-6 overflow-hidden rounded-2xl shadow-xl">
                        <img
                            src={typeof project.cover === "string" ?
                                (project.cover.startsWith('http') ? project.cover : `${AWS_BASE_URL}${project.cover}`)
                                : URL.createObjectURL(project.cover)}
                            alt={project.name}
                            className="w-full h-48 sm:h-72 object-cover transition-transform duration-500 hover:scale-105"
                        />
                    </div>
                )}

                {/* Project Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
                    {/* Type */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Type:</span>
                        {isEditMode ? (
                            <select
                                value={editedProject?.type || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, type: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                            >
                                <option value="">Select Type</option>
                                <option value="Research">Research</option>
                                <option value="School Work">School Work</option>
                                <option value="Personal Project">Personal Project</option>
                                <option value="Others">Others</option>
                            </select>
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.otherType || project?.type || 'Not set'}</span>
                        )}
                    </div>

                    {/* Location */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Location:</span>
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editedProject?.location || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, location: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                                placeholder="e.g., Remote, New York, etc."
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.location || 'Not set'}</span>
                        )}
                    </div>

                    {/* Start Date */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Start Date:</span>
                        {isEditMode ? (
                            <input
                                type="date"
                                value={editedProject?.startTime || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, startTime: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">
                                {project?.startTime ? new Date(project.startTime).toLocaleDateString() : 'Not set'}
                            </span>
                        )}
                    </div>

                    {/* Deadline */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Deadline:</span>
                        {isEditMode ? (
                            <input
                                type="date"
                                value={editedProject?.deadline || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, deadline: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">
                                {project?.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}
                            </span>
                        )}
                    </div>

                    {/* Communication App */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Communication:</span>
                        {isEditMode ? (
                            <input
                                type="text"
                                list="communication-apps"
                                value={editedProject?.communicationApp || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, communicationApp: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                                placeholder="e.g., Discord, Slack, Teams"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.communicationApp || 'Not set'}</span>
                        )}
                    </div>

                    {/* Other Apps */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Other Apps:</span>
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editedProject?.otherApp || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, otherApp: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                                placeholder="Other tools or apps"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.otherApp || 'Not set'}</span>
                        )}
                    </div>

                    {/* School */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">School:</span>
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editedProject?.school || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, school: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                                placeholder="School name"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.school || 'Not set'}</span>
                        )}
                    </div>

                    {/* Class */}
                    <div className="flex items-start p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 hover:shadow-sm transition-all duration-200">
                        <span className="font-semibold text-slate-800 min-w-[100px]">Class:</span>
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editedProject?.class || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, class: e.target.value })}
                                className="ml-3 flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
                                placeholder="Class name"
                            />
                        ) : (
                            <span className="ml-3 text-slate-600">{project?.class || 'Not set'}</span>
                        )}
                    </div>
                </div>

                {/* Communication Apps Datalist */}
                <datalist id="communication-apps">
                    <option value="Discord" />
                    <option value="Slack" />
                    <option value="Microsoft Teams" />
                    <option value="Zoom" />
                    <option value="Email" />
                    <option value="WhatsApp" />
                </datalist>

                {/* Topics */}
                {((project?.topics && project.topics.length > 0) || (project?.topic && Object.keys(project.topic).length > 0)) && (
                    <div className="mb-6 sm:mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {project?.topics && project.topics.length > 0
                                ? (Array.isArray(project.topics)
                                    ? project.topics
                                    : [project.topics]).map((topic: string, index: number) => (
                                        <span key={index} className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 text-blue-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105">
                                            {topic}
                                        </span>
                                    ))
                                : project?.topic && Object.keys(project.topic).length > 0 &&
                                Object.keys(project.topic).map((key: string, index: number) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs sm:text-sm">
                                        {String(project.topic[key as keyof typeof project.topic])}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Description */}
                <div className="mb-6 sm:mb-8 p-6 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Description</h3>
                    {isEditMode ? (
                        <textarea
                            value={editedProject?.description || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 resize-none"
                            placeholder="Describe your project..."
                        />
                    ) : (
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                            {project?.description || 'No description provided.'}
                        </p>
                    )}
                </div>

                {/* Media Files */}
                {renderMediaFiles()}
                    </div>
                )}
            </section>
        );
    };

    // Fix for the media rendering
    const renderMediaFiles = () => {
        if (!project || !project.media || !Array.isArray(project.media) || project.media.length === 0) {
            return null;
        }

        return (
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Media Files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {project.media.map((file, index) => (
                        <div key={index} className="relative group overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <img
                                src={getMediaUrl(file)}
                                alt={`Media ${index}`}
                                className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    // Meetings section
    const renderMeetingsSection = () => {
        if (!sid) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            );
        }

        // Transform members data to match MeetingsList expected format
        const projectMembersForMeetings = members.map(member => ({
            id: member.user_id || 0,
            username: member.username || '',
            email: member.email || '',
        })).filter(m => m.id > 0);

        return (
            <MeetingsList
                projectId={project?.id || 0}
                projectMembers={projectMembersForMeetings}
            />
        );
    };

    // Calendar section - renders tasks and meetings in calendar view
    const renderCalendarSection = () => {
        if (!sid) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            );
        }

        return (
            <ProjectCalendar
                projectId={sid}
            />
        );
    };

    // Members section
    const renderMembersSection = () => {
        return (
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Team Members</h2>
                </div>

                {/* Use ProjectTeam component for better organization and UI */}
                {manageLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : members && members.length > 0 ? (
                    <ProjectTeam
                        projectId={sid}
                        teamMembers={members
                            .filter(member => member.user_id != null)
                            .map(member => ({
                                id: member.user_id!.toString(),
                                name: member.name || member.username || `User ${member.user_id}`,
                                email: member.email || '',
                                role: (member.role || 'viewer') as 'admin' | 'editor' | 'viewer',
                                avatar: member.avatar,
                                dateJoined: member.joined_at || new Date().toISOString()
                            }))}
                        currentUserId={user?.id?.toString() || ''}
                        isAdmin={isUserAdmin()}
                        isLoading={manageLoading}
                        onUpdateMemberRole={async (memberId, newRole) => {
                            await updateMemberRole(memberId, parseInt(newRole, 10) || 0);
                        }}
                        onRemoveMember={async (memberId) => {
                            await removeMember(memberId);
                        }}
                        onRefresh={fetchProjectData}
                    />
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No team members found. {isUserAdmin() && 'Invite members to get started!'}</p>
                    </div>
                )}
            </section>
        );
    };

    // Settings section
    const renderSettingsSection = () => {
        return (
            <section>
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Project Settings</h2>
                </div>

                <div className="space-y-5 sm:space-y-6">
                    {/* Combined Invite & Share */}
                    <div className="bg-gradient-to-br from-white to-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">
                            Project Sharing & Invitations
                        </h3>

                        {/* Tab Buttons */}
                        <div className="flex gap-2 mb-6 border-b border-gray-200">
                            <button
                                onClick={() => setInviteShareTab('email')}
                                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                    inviteShareTab === 'email'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Invite by Email
                            </button>
                            <button
                                onClick={() => setInviteShareTab('link')}
                                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                                    inviteShareTab === 'link'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Share Link
                            </button>
                        </div>

                        {/* Email Invite Tab */}
                        {inviteShareTab === 'email' && (
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Invite people to join your project by email. Select their role and optionally assign them to a group.
                                </p>
                                <div className="space-y-3">
                                    <input
                                        id="invite-email-input"
                                        type="email"
                                        placeholder="Enter email address..."
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                            <select
                                                id="invite-role-select"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                defaultValue="viewer"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Group (Optional)</label>
                                            <select
                                                id="invite-group-select"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                <option value="">No Group</option>
                                                {groups.map((group: any) => (
                                                    <option key={group.group_id} value={group.group_id}>
                                                        {group.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const emailInput = document.getElementById('invite-email-input') as HTMLInputElement;
                                            const roleSelect = document.getElementById('invite-role-select') as HTMLSelectElement;
                                            const groupSelect = document.getElementById('invite-group-select') as HTMLSelectElement;

                                            const email = emailInput?.value;
                                            const role = roleSelect?.value || 'viewer';
                                            const groupId = groupSelect?.value;

                                            if (email && email.includes('@')) {
                                                try {
                                                    const payload: any = { email, role };
                                                    if (groupId) {
                                                        payload.group_id = parseInt(groupId, 10);
                                                    }

                                                    const response = await fetchWithAuth(`/api/projects/${sid}/invite`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(payload),
                                                    });

                                                    if (response.ok) {
                                                        emailInput.value = '';
                                                        roleSelect.value = 'viewer';
                                                        groupSelect.value = '';
                                                        alert('Invitation sent successfully!');
                                                    } else {
                                                        const data = await response.json();
                                                        alert(data.error || 'Failed to send invitation');
                                                    }
                                                } catch (error) {
                                                    alert('Error sending invitation');
                                                }
                                            } else {
                                                alert('Please enter a valid email address');
                                            }
                                        }}
                                        className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Share Link Tab */}
                        {inviteShareTab === 'link' && (
                            <ProjectSharing projectSid={sid} isAdmin={isUserAdmin()} />
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-white to-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">{t('projects.dashboard.applications.title')}</h3>
                        <div className="space-y-4">
                            {manageLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : applications.length > 0 ? (
                                <ApplicationsList
                                    applications={applications}
                                    applicationQuestions={[]}
                                    manageLoading={manageLoading}
                                    onDataChange={fetchManageData}
                                    projectSid={sid}
                                />
                            ) : (
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-xl text-center border border-slate-200/30">
                                    <p className="text-slate-600 font-medium mb-1">{t('projects.dashboard.applications.noApplications')}</p>
                                    <p className="text-slate-500 text-sm">{t('projects.dashboard.applications.emptyMessage')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Use ProjectManagementActions component */}
                    <ProjectManagementActions
                        project={project}
                        isMobileView={isMobileView}
                        onCompleteProject={async () => {
                            try {
                                await markProjectAsCompleted();
                                return true;
                            } catch (error) {
                                return false;
                            }
                        }}
                        onArchiveProject={async () => {
                            try {
                                await handleArchiveProject();
                                return true;
                            } catch (error) {
                                return false;
                            }
                        }}
                        onDeleteProject={async () => {
                            try {
                                await handleDeleteProject();
                                return true;
                            } catch (error) {
                                return false;
                            }
                        }}
                    />
                </div>
            </section>
        );
    };

    // Add a useEffect for URL synchronization
    useEffect(() => {
        // Only sync URL with section, don't fetch data on every render
        const newParams = new URLSearchParams(location.search);
        newParams.set('section', activeSection);
        navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }, [activeSection, location.pathname, location.search, navigate]);

    // Redirect users if they try to access admin-only sections without admin role
    useEffect(() => {
        // If current section is admin-only and user is not admin, redirect to overview
        if ((activeSection === 'members' || activeSection === 'settings') && !isUserAdmin()) {
            handleSectionChange('overview');
        }
    }, [activeSection, members]);

    // Fetch members data on mount for admin checks
    useEffect(() => {
        if (sid) {
            fetchManageData();
        }
    }, [sid]);

    // Add a separate useEffect for fetching manage data when section changes
    useEffect(() => {
        if (activeSection) {
            // Reset error states
            setError('');

            // Fetch necessary data based on active section
            if (activeSection === 'members' || activeSection === 'settings') {
                fetchManageData();
            }
        }
    }, [activeSection]); // Only include stable dependencies to prevent infinite loops


    // Loading check
    const isLoading = loading;

    if (isLoading) return <LoadingPage />;

    // Check for authorization errors (403 Forbidden or 401 Unauthorized)
    if (errorCode === 403 || errorCode === 401) {
        return (
            <PermissionDenied
                message="You don't have permission to access this project."
                returnPath="/projects"
            />
        );
    }

    // Show error message if applicable
    if (error || projectError) {
        return <div className="p-4 text-red-500">{error || projectError}</div>;
    }

    return (
        <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Mobile header - visible only on mobile */}
            <div className="md:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 flex justify-between items-center p-4 sticky top-0 z-50">
                <button
                    onClick={toggleSidebar}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                    <ViewModuleIcon />
                </button>
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                    {project?.name || t('projects.dashboard.title')}
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startTutorial()}
                        className="p-2.5 rounded-xl bg-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-slate-100"
                        title="Start Interactive Tutorial"
                    >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2.5 rounded-xl bg-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-slate-100"
                    >
                        <EditIcon />
                    </button>
                </div>
            </div>

            {/* Main layout container */}
            <div className="flex flex-1 relative overflow-hidden">


                {/* Desktop Sidebar - Custom implementation without MUI Drawer */}
                {!isMobileView && (
                    <div className={`relative flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[280px]' : 'w-0'}`}>
                        <div className={`h-full bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}`}>
                            <div className="flex flex-col h-full">
                                <div className="p-5 flex items-center justify-between bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/10"></div>
                                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                    <h2 className="text-xl font-bold truncate relative z-10">
                                        {project?.name || t('projects.dashboard.title')}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startTutorial()}
                                            className="p-1.5 text-white relative z-10 hover:bg-white/20 transition-colors rounded-lg"
                                            title="Start Interactive Tutorial"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        <button onClick={toggleSidebar} className="p-1 text-white relative z-10 hover:bg-white/20 transition-colors rounded-lg">
                                            <CloseIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className="py-2 overflow-hidden flex-1 overflow-y-auto">
                                    {sections
                                        .filter(section => {
                                            // Filter based on role, not permissions
                                            if (section.id === 'members' || section.id === 'settings') {
                                                return section.visible && isUserAdmin();
                                            }
                                            return section.visible;
                                        })
                                        .sort((a, b) => {
                                            // Always put settings at the bottom
                                            if (a.id === 'settings') return 1;
                                            if (b.id === 'settings') return -1;
                                            // Sort by order for other sections
                                            return a.order - b.order;
                                        })
                                        .map((section) => (
                                            <div
                                                key={section.id}
                                                data-tour={section.id === 'idea-forest' ? 'idea-forest-section' : ''}
                                                onClick={() => {
                                                    handleSectionChange(section.id);
                                                    // On mobile, automatically close the sidebar after selection
                                                    if (isMobileView) {
                                                        setIsSidebarOpen(false);
                                                    }
                                                }}
                                                className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-300 rounded-xl my-1.5 mx-2 group ${activeSection === section.id
                                                    ? 'bg-gradient-to-r from-blue-500/10 to-sky-500/10 text-blue-700 font-semibold shadow-sm border border-blue-200/50'
                                                    : 'hover:bg-slate-100/70 hover:shadow-sm text-slate-600 hover:text-slate-900'
                                                    }`}
                                            >
                                                <div className={`min-w-[28px] flex justify-center p-1.5 rounded-lg transition-all duration-300 ${activeSection === section.id
                                                        ? 'bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md'
                                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                                                    }`}>
                                                    {section.icon}
                                                </div>
                                                <div className="ml-3.5 text-sm font-medium">{section.label}</div>
                                                {(section.id === 'meetings') && (
                                                    <span className="ml-auto px-2 py-0.5 text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full font-semibold shadow-sm">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                </div>
                                <div className="mt-auto border-t border-slate-100 p-4 bg-gradient-to-b from-transparent to-slate-50/50">
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Sidebar - Pure Tailwind implementation */}
                {isMobileView && isSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsSidebarOpen(false)}
                        />

                        {/* Sidebar */}
                        <div className={`fixed left-0 top-0 h-full w-[280px] bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 shadow-2xl z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                            <div className="flex flex-col h-full">
                                <div className="p-5 flex items-center justify-between bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/10"></div>
                                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                    <h2 className="text-xl font-bold truncate relative z-10">
                                        {project?.name || t('projects.dashboard.title')}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startTutorial()}
                                            className="p-1.5 text-white relative z-10 hover:bg-white/20 transition-colors rounded-lg"
                                            title="Start Interactive Tutorial"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                        <button onClick={toggleSidebar} className="p-1 text-white relative z-10 hover:bg-white/20 transition-colors rounded-lg">
                                            <ViewModuleIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className="py-2 overflow-hidden flex-1 overflow-y-auto">
                                    {sections
                                        .filter(section => {
                                            // Filter based on role, not permissions
                                            if (section.id === 'members' || section.id === 'settings') {
                                                return section.visible && isUserAdmin();
                                            }
                                            return section.visible;
                                        })
                                        .sort((a, b) => {
                                            if (a.id === 'settings') return 1;
                                            if (b.id === 'settings') return -1;
                                            return a.order - b.order;
                                        })
                                        .map((section) => (
                                            <div
                                                key={section.id}
                                                data-tour={section.id === 'idea-forest' ? 'idea-forest-section' : ''}
                                                onClick={() => {
                                                    handleSectionChange(section.id);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-300 rounded-xl my-1.5 mx-2 group ${activeSection === section.id
                                                    ? 'bg-gradient-to-r from-blue-500/10 to-sky-500/10 text-blue-700 font-semibold shadow-sm border border-blue-200/50'
                                                    : 'hover:bg-slate-100/70 hover:shadow-sm text-slate-600 hover:text-slate-900'
                                                    }`}
                                            >
                                                <div className={`min-w-[28px] flex justify-center p-1.5 rounded-lg transition-all duration-300 ${activeSection === section.id
                                                        ? 'bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md'
                                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                                                    }`}>
                                                    {section.icon}
                                                </div>
                                                <div className="ml-3.5 text-sm font-medium">{section.label}</div>
                                                {(section.id === 'meetings') && (
                                                    <span className="ml-auto px-2 py-0.5 text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full font-semibold shadow-sm">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                </div>
                                <div className="mt-auto border-t border-slate-100 p-4 bg-gradient-to-b from-transparent to-slate-50/50">
                                </div>
                            </div>
                        </div>
                    </>
                )}



                {/* Main content area - modernized with better spacing and card design */}
                <div className="flex-1 transition-all duration-300 relative min-w-0 overflow-x-hidden">
                    {/* Collapsed sidebar indicator for desktop */}
                    {!isSidebarOpen && !isMobileView && (
                        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 animate-slide-in-left">
                            <button
                                onClick={toggleSidebar}
                                className="relative bg-white border-2 border-slate-200 text-slate-700 px-2 py-4 rounded-r-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 hover:border-blue-300 group overflow-hidden"
                                aria-label="Open sidebar"
                                title="Open menu"
                            >
                                {/* Animated background gradient on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-sky-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

                                <div className="relative flex flex-col items-center space-y-3">
                                    {/* Menu icon */}
                                    <div className="group-hover:text-blue-600 transition-colors">
                                        <MenuIcon />
                                    </div>

                                    {/* Animated chevron */}
                                    <div className="group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                                        <ChevronRightIcon />
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                    <div className="h-full">
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm overflow-hidden">
                            {/* Main content area with sections */}
                            <div className={activeSection === 'idea-forest' || activeSection === 'idea-tree' || activeSection === 'tasks' ? '' : 'p-6'}>
                                {/* Render active section */}
                                {renderActiveSection()}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Manage Posts Modal */}
            {isPostModalOpen && (
                <CreateProjectModal
                    projectData={project}
                    isOpen={isPostModalOpen}
                    onClose={() => setIsPostModalOpen(false)}
                />
            )}

            {/* Floating Help Button */}
            {/* <HelpButton tutorialType="dashboard" variant="fab" showMenu={true} disablePulse={true} /> */}

            {/* Dashboard Tutorial */}
            <DashboardTutorial />
        </div>
    );
};

export default withAuth(ProjectDashboard);
