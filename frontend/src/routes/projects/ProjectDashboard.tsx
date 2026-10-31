import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../store/store";
import ScheduleMeeting from "../../components/projectDashboard/ScheduleMeeting";
import TimeSlotSelector from "../../components/projectDashboard/TimeSlotSelector";
import CreateProjectModal from "../../components/project/CreateProjectModal";
import { useProject } from "../../hooks/useProject";
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
import ProjectDetailsPanel, { DetailsProject } from "../../components/projectDashboard/ProjectDetailsPanel";
import BriefPlanCard from "../../components/projectDashboard/BriefPlanCard";
import { HelpCircle, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Badge, cx } from "../../components/ui";

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

const ProposalsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);


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

    // Post management modal state
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

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
        // Owners are stored with their own role and have every admin right
        return currentUser?.role === 'admin' || currentUser?.role === 'owner';
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
                    <div className="h-full overflow-hidden">
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

    // Project overview section
    const renderOverviewSection = () => {
        return (
            <section>
                {/* Overview Sub-tabs */}
                <div className="mb-6 inline-flex rounded-lg bg-gray-100 p-1" role="tablist">
                    {(['dashboard', 'details'] as const).map((tab) => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={overviewSubTab === tab}
                            data-tour={tab === 'dashboard' ? 'overview-dashboard-tab' : 'overview-details-tab'}
                            onClick={() => setOverviewSubTab(tab)}
                            className={cx(
                                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                                overviewSubTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            {t(tab === 'dashboard' ? "match.overview.dashboardTab" : "match.overview.detailsTab")}
                        </button>
                    ))}
                </div>

                {/* Dashboard Sub-tab Content */}
                {overviewSubTab === 'dashboard' && (
                    <>
                        {sid && (
                            <TeamPulse
                                projectSid={sid}
                                beforeCheckin={project && (
                                    <BriefPlanCard
                                        sid={sid}
                                        brief={(project as DetailsProject).brief || null}
                                        briefUpdatedAt={(project as DetailsProject).brief_updated_at}
                                        recruiting={(project as DetailsProject).recruiting?.status === 1}
                                        isAdmin={isUserAdmin()}
                                        onSaved={fetchProjectData}
                                        onOpenDetails={() => setOverviewSubTab('details')}
                                    />
                                )}
                            />
                        )}
                        {sid && <TeamChat projectSid={sid} />}
                        <ProjectDashboardComponent projectId={sid} />
                    </>
                )}

                {/* Project Details Sub-tab Content */}
                {overviewSubTab === 'details' && project && (
                    <ProjectDetailsPanel
                        project={project}
                        sid={sid}
                        isAdmin={isUserAdmin()}
                        onSaved={fetchProjectData}
                        onManagePosts={() => setIsPostModalOpen(true)}
                    />
                )}
            </section>
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

    const visibleSections = sections
        // Members and settings are admin-only
        .filter(section => section.visible && ((section.id !== 'members' && section.id !== 'settings') || isUserAdmin()))
        // Settings always goes last
        .sort((a, b) => (a.id === 'settings' ? 1 : b.id === 'settings' ? -1 : a.order - b.order));

    const iconButton = "rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900";

    // The sidebar is the same on desktop and in the mobile drawer
    const renderSidebar = () => (
        <div className="flex h-full min-w-[15rem] flex-col bg-white">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-4">
                <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900" title={project?.name}>
                    {project?.name || t('projects.dashboard.title')}
                </h2>
                <button onClick={() => startTutorial()} className={iconButton} title="Start Interactive Tutorial" aria-label="Start Interactive Tutorial">
                    <HelpCircle className="h-4 w-4" />
                </button>
                <button onClick={toggleSidebar} className={iconButton} aria-label="Close sidebar">
                    {isMobileView ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {visibleSections.map((section) => {
                    const active = activeSection === section.id;
                    return (
                        <button
                            key={section.id}
                            data-tour={section.id === 'idea-forest' ? 'idea-forest-section' : undefined}
                            onClick={() => {
                                handleSectionChange(section.id);
                                if (isMobileView) setIsSidebarOpen(false);
                            }}
                            aria-current={active ? 'page' : undefined}
                            className={cx(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                                active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <span className={cx("flex shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]", active ? "text-indigo-600" : "text-gray-400")}>{section.icon}</span>
                            <span className="truncate">{section.label}</span>
                            {section.id === 'meetings' && <Badge tone="amber" className="ml-auto">Soon</Badge>}
                        </button>
                    );
                })}
            </nav>
        </div>
    );

    const fullBleed = activeSection === 'idea-forest' || activeSection === 'idea-tree' || activeSection === 'tasks';

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50">
            {/* Mobile header */}
            <div className="sticky top-14 z-30 flex items-center gap-2 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
                <button onClick={toggleSidebar} className={iconButton} aria-label="Open sidebar">
                    <Menu className="h-5 w-5" />
                </button>
                <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">
                    {project?.name || t('projects.dashboard.title')}
                </h1>
                <button onClick={() => startTutorial()} className={iconButton} aria-label="Start Interactive Tutorial">
                    <HelpCircle className="h-5 w-5" />
                </button>
            </div>

            <div className="relative flex flex-1">
                {/* Desktop sidebar */}
                {!isMobileView && (
                    <aside className={cx("shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200", isSidebarOpen ? "w-60" : "w-0 border-r-0")}>
                        {/* Stays in view under the 56px nav bar while the content scrolls */}
                        <div className={cx("sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden", isSidebarOpen ? "w-60" : "w-0")}>{renderSidebar()}</div>
                    </aside>
                )}

                {/* Mobile drawer */}
                {isMobileView && isSidebarOpen && (
                    <>
                        <div className="fixed inset-0 z-[60] bg-gray-900/40" onClick={() => setIsSidebarOpen(false)} />
                        <aside className="fixed left-0 top-0 z-[70] h-full w-64 shadow-xl">{renderSidebar()}</aside>
                    </>
                )}

                <main className={cx("relative min-w-0 flex-1 overflow-x-hidden", fullBleed && "bg-white")}>
                    {!isSidebarOpen && !isMobileView && (
                        <button
                            onClick={toggleSidebar}
                            className="absolute left-3 top-4 z-20 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition-colors hover:text-gray-900"
                            aria-label="Open sidebar"
                            title="Open menu"
                        >
                            <PanelLeftOpen className="h-4 w-4" />
                        </button>
                    )}
                    <div className={fullBleed ? "h-full" : cx("mx-auto max-w-6xl px-4 py-6 sm:px-6", !isSidebarOpen && !isMobileView && "pl-14 sm:pl-16")}>
                        {renderActiveSection()}
                    </div>
                </main>
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
