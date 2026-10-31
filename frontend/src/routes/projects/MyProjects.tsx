import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import config from "../../config";
import LoadingPage from "../../components/app/Loading";
import ProjectCard from "../../components/project/ProjectCard";
import EmptyState from "../../components/EmptyState";
import QuickCreateModal, { QuickProjectData } from "../../components/projects/QuickCreateModal";
import { toast } from "react-hot-toast";
// import { HelpButton } from "../../components/tutorial/HelpButton"; // Currently not used
import { DashboardTutorial } from "../../components/tutorial/DashboardTutorial";
import MatchTodo from "../../components/match/MatchTodo";
import { ChevronDown, Plus } from "lucide-react";
import { Badge, Button, PageContainer, PageHeader } from "../../components/ui";
// import { useTutorial } from "../../hooks/useTutorial"; // Currently not used

const { API_BASE_URL } = config;

interface Project {
    project_id: number;
    sid: string;
    title: string;
    project_type: string;
    start_time: string;
    end_time: string;
    status: number;
    description: string;
    location: string;
    cover?: string;
    topic?: any;
    owner_id?: number;
    user_id?: number;
    is_published?: boolean;
    visibility?: number;
    user_role?: string; // User's role in the project: 'owner', 'admin', 'editor', 'viewer'
    is_removed?: boolean; // Whether the user was removed from the project
    removed_at?: string; // When the user was removed
}

// Transform the backend project object to the format expected by ProjectCard
const transformProject = (project: Project) => {
    // Convert numeric visibility to string format
    let visibilityString = "public"; // Default
    if (project.visibility) {
        switch (project.visibility) {
            case 1:
                visibilityString = "private";
                break;
            case 2:
                visibilityString = "public";
                break;
            case 3:
                visibilityString = "local";
                break;
            case 4:
                visibilityString = "organization";
                break;
            default:
                visibilityString = "public";
        }
    }

    const transformed = {
        id: project.project_id,
        sid: project.sid,
        title: project.title || "",
        project_type: project.project_type || "",
        start_time: project.start_time || "",
        end_time: project.end_time || "",
        status: project.status,
        description: project.description || "",
        location: project.location || "",
        cover: project.cover,
        topic: Array.isArray(project.topic) ? project.topic :
            (typeof project.topic === 'string' ? JSON.parse(project.topic || '[]') : []),
        style: project.project_type || "",
        spots: 0,
        owner_id: project.owner_id || project.user_id,
        is_published: project.is_published,
        visibility: visibilityString,  // Use string visibility
        user_role: project.user_role || "viewer",  // Include user's role in the project
        is_removed: project.is_removed || false,  // Whether user was removed
        removed_at: project.removed_at  // When user was removed
    };
    return transformed;
};

type TabType = "active-owned" | "active-joined" | "archived" | "completed" | "all";

const MyProjects: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [pendingApplications, setPendingApplications] = useState<number | null>(null);

    // Applications waiting on the founder, shown on the board button
    useEffect(() => {
        fetchWithAuth("/api/match/applications")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data) setPendingApplications((data.applications || []).filter((a: { status: number }) => a.status === 0).length);
            })
            .catch(() => setPendingApplications(null));
    }, []);
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
    const [joinedProjects, setJoinedProjects] = useState<Project[]>([]);
    const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
    const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
    // The "master your projects" tutorial banner is hidden: it walks through the old project-management flow
    const [showTutorialBanner, setShowTutorialBanner] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isDropdownOpen && !target.closest('.relative')) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDropdownOpen]);

    // Tutorial handling - currently not using the hook's startTutorial function
    // Instead, we have custom tutorial start logic below
    // const { startTutorial, isCompleted } = useTutorial('dashboard');

    // Handle tutorial start - navigate to tutorial project dashboard
    const handleStartTutorial = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/tutorial/create-template-project`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                const projectId = data.short_id || data.sid;
                navigate(`/project/${projectId}/dashboard?tutorial=true`);
            } else {
                console.error('Failed to load tutorial project');
            }
        } catch (error) {
            console.error('Error loading tutorial project:', error);
        }
    };

    // Handle quick project creation
    const handleQuickCreate = async (projectData: QuickProjectData) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/onboarding/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_scenario: 'blank',
                    name: projectData.name,
                    description: projectData.description,
                    start_date: projectData.startDate,
                    deadline: projectData.deadline,
                    cover_image_url: projectData.coverImage,
                    duration_weeks: projectData.deadline ?
                        Math.ceil((new Date(projectData.deadline).getTime() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7)) :
                        4,
                    team_members: [],
                    onboarding_metadata: {
                        ai_assisted: false,
                        quick_create: true,
                        created_at: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create project');
            }

            const data = await response.json();
            toast.success('Project created successfully!');

            // Navigate to the new project
            if (data.project && data.project.sid) {
                navigate(`/project/${data.project.sid}/dashboard`);
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create project');
            throw error;
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            // Fetch owned projects
            const ownedResponse = await fetchWithAuth(`${API_BASE_URL}/api/projects?type=owned`);
            const ownedData = await ownedResponse.json();
            let ownedProjectsList = ownedData.projects || [];

            // Fetch joined projects
            const joinedResponse = await fetchWithAuth(`${API_BASE_URL}/api/projects?type=joined`);
            const joinedData = await joinedResponse.json();
            let joinedProjectsList = joinedData.projects || [];

            // The sample tutorial project is off: it belongs to the old project-management
            // flow, and creating it fails (owner_id 0 breaks the users foreign key).
            // try {
            //     const tutorialResponse = await fetchWithAuth(`${API_BASE_URL}/api/tutorial/create-template-project`, {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //     });
            //     if (tutorialResponse.ok) {
            //         const tutorialData = await tutorialResponse.json();
            //         const tutorialProjectSid = tutorialData.short_id || tutorialData.sid;
            //         if (tutorialProjectSid) {
            //             // Fetch full tutorial project details
            //             const tutorialProjectResponse = await fetchWithAuth(`${API_BASE_URL}/api/projects/${tutorialProjectSid}`);
            //             if (tutorialProjectResponse.ok) {
            //                 const tutorialProject = await tutorialProjectResponse.json();
            //                 // Add tutorial project to owned projects at the end
            //                 ownedProjectsList = [...ownedProjectsList, tutorialProject];
            //             }
            //         }
            //     }
            // } catch (tutorialError) {
            //     console.error("Error fetching tutorial project:", tutorialError);
            //     // Continue without tutorial project if it fails
            // }

            setOwnedProjects(ownedProjectsList);
            setJoinedProjects(joinedProjectsList);

            // Get all projects
            const allProjectsArray = [...ownedProjectsList, ...joinedProjectsList];
            setAllProjects(allProjectsArray);

            // Filter archived projects (status 2)
            setArchivedProjects(allProjectsArray.filter(project => project.status === 2));

            // Filter completed projects (status 3)
            setCompletedProjects(allProjectsArray.filter(project => project.status === 3));
        } catch (err) {
            console.error("Error fetching projects:", err);
            setError(t('projects.myProjects.errors.fetchFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    // TEMPORARY: Force tutorial banner to always show for testing
    // useEffect(() => {
    //     if (!showTutorialBanner) {
    //         setShowTutorialBanner(true);
    //     }
    // }, [showTutorialBanner]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setIsTabMenuOpen(false);
    };

    const getTabLabel = (tab: TabType): string => {
        switch (tab) {
            case "all": return t('projects.myProjects.tabs.all');
            case "active-owned": return t('projects.myProjects.tabs.activeOwned');
            case "active-joined": return t('projects.myProjects.tabs.activeJoined');
            case "archived": return t('projects.myProjects.tabs.archived');
            case "completed": return t('projects.myProjects.tabs.completed');
            default: return "";
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <PageContainer>
            <PageHeader
                title={t('projects.myProjects.title')}
                actions={
                <div className="relative flex items-center gap-2">
                    <Button variant="secondary" onClick={() => navigate('/applications')}>
                        {t('match.board.title')}
                        {pendingApplications ? <Badge tone="indigo">{pendingApplications}</Badge> : null}
                    </Button>
                    <Button onClick={() => setIsDropdownOpen(!isDropdownOpen)} icon={<Plus className="h-4 w-4" />}>
                        {t('projects.myProjects.createProject')}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden />
                    </Button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        navigate('/ai-project-assistant');
                                    }}
                                    className="w-full px-4 py-3 text-left rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">AI-Guided Setup</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                                Get intelligent suggestions, planning, and step-by-step guidance
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>

                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setShowQuickCreate(true);
                                    }}
                                    className="w-full px-4 py-3 text-left rounded-lg hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">Quick Create</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                                Fast setup for experienced users who know what they want
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                }
            />

            {/* Tutorial Banner */}
            <MatchTodo />

            {showTutorialBanner && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6 shadow-md">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-purple-500 text-white p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Ready to Master Your Projects? 🚀
                                </h3>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-4 ml-14">
                                Learn how to use the project dashboard to manage tasks, create effective plans, and leverage the Idea Tree to expand and deepen your project ideas!
                            </p>
                            <div className="flex gap-3 ml-14">
                                <button
                                    onClick={handleStartTutorial}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    🎯 Start Tutorial
                                </button>
                                <button
                                    onClick={() => setShowTutorialBanner(false)}
                                    className="px-6 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg border-2 border-gray-300 dark:border-slate-600 transition-all duration-200"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTutorialBanner(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                            aria-label="Close banner"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Tab Dropdown */}
            <div className="md:hidden relative mb-6">
                <button
                    onClick={() => setIsTabMenuOpen(!isTabMenuOpen)}
                    className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center"
                >
                    <span>{getTabLabel(activeTab)}</span>
                    <svg className={`w-5 h-5 transition-transform duration-200 ${isTabMenuOpen ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                    </svg>
                </button>

                {isTabMenuOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                        <button
                            className={`block w-full text-left px-4 py-2 ${activeTab === "all" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}
                            onClick={() => handleTabChange("all")}
                        >
                            {t('projects.myProjects.tabs.all')}
                        </button>
                        <button
                            className={`block w-full text-left px-4 py-2 ${activeTab === "active-owned" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}
                            onClick={() => handleTabChange("active-owned")}
                        >
                            {t('projects.myProjects.tabs.activeOwned')}
                        </button>
                        <button
                            className={`block w-full text-left px-4 py-2 ${activeTab === "active-joined" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}
                            onClick={() => handleTabChange("active-joined")}
                        >
                            {t('projects.myProjects.tabs.activeJoined')}
                        </button>
                        <button
                            className={`block w-full text-left px-4 py-2 ${activeTab === "archived" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}
                            onClick={() => handleTabChange("archived")}
                        >
                            {t('projects.myProjects.tabs.archived')}
                        </button>
                        <button
                            className={`block w-full text-left px-4 py-2 ${activeTab === "completed" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}
                            onClick={() => handleTabChange("completed")}
                        >
                            {t('projects.myProjects.tabs.completed')}
                        </button>
                    </div>
                )}
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden md:flex overflow-x-auto border-b border-gray-200 mb-6">
                <button
                    className={`whitespace-nowrap py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === "all"
                        ? "text-indigo-700 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => handleTabChange("all")}
                >
                    {t('projects.myProjects.tabs.all')}
                </button>
                <button
                    className={`whitespace-nowrap py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === "active-owned"
                        ? "text-indigo-700 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => handleTabChange("active-owned")}
                >
                    {t('projects.myProjects.tabs.activeOwned')}
                </button>
                <button
                    className={`whitespace-nowrap py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === "active-joined"
                        ? "text-indigo-700 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => handleTabChange("active-joined")}
                >
                    {t('projects.myProjects.tabs.activeJoined')}
                </button>
                <button
                    className={`whitespace-nowrap py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === "archived"
                        ? "text-indigo-700 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => handleTabChange("archived")}
                >
                    {t('projects.myProjects.tabs.archived')}
                </button>
                <button
                    className={`whitespace-nowrap py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === "completed"
                        ? "text-indigo-700 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => handleTabChange("completed")}
                >
                    {t('projects.myProjects.tabs.completed')}
                </button>
            </div>

            {/* Tab Content */}
            <div>
                {/* All Projects View */}
                {activeTab === "all" && (
                    <div>
                        {allProjects.filter(project => project.status !== 4).length > 0 ? (
                            <div>
                                {/* Owned Projects Section */}
                                {ownedProjects.filter(project => project.status !== 4).length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-medium mb-3 pb-2 border-b border-gray-200">{t('projects.myProjects.sections.owned')}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {ownedProjects
                                                .filter(project => project.status !== 4)
                                                .map((project) => (
                                                    <ProjectCard
                                                        key={project.sid}
                                                        project={transformProject(project)}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Joined Projects Section */}
                                {joinedProjects.filter(project => project.status !== 4).length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-medium mb-3 pb-2 border-b border-gray-200">{t('projects.myProjects.sections.joined')}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {joinedProjects
                                                .filter(project => project.status !== 4)
                                                .map((project) => (
                                                    <ProjectCard
                                                        key={project.sid}
                                                        project={transformProject(project)}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg
                                        className="w-16 h-16"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                                title={t('projects.myProjects.emptyStates.noProjects.title')}
                                description={t('projects.myProjects.emptyStates.noProjects.description')}
                                actionLabel={t('projects.myProjects.emptyStates.noProjects.action')}
                                onAction={() => navigate('/ideas')}
                                secondaryActionLabel={t('projects.myProjects.emptyStates.noProjects.secondaryAction')}
                                onSecondaryAction={() => navigate('/projects')}
                            />
                        )}
                    </div>
                )}

                {/* Active Owned Projects View */}
                {activeTab === "active-owned" && (
                    <div>
                        {ownedProjects.filter(project => project.status === 1).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {ownedProjects
                                    .filter(project => project.status === 1)
                                    .map((project) => (
                                        <ProjectCard
                                            key={project.sid}
                                            project={transformProject(project)}
                                        />
                                    ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg
                                        className="w-16 h-16"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                }
                                title={t('projects.myProjects.emptyStates.noActiveOwned.title')}
                                description={t('projects.myProjects.emptyStates.noActiveOwned.description')}
                                actionLabel={t('projects.myProjects.emptyStates.noActiveOwned.action')}
                                onAction={() => navigate('/ideas')}
                            />
                        )}
                    </div>
                )}

                {/* Active Joined Projects View */}
                {activeTab === "active-joined" && (
                    <div>
                        {joinedProjects.filter(project => project.status === 1).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {joinedProjects
                                    .filter(project => project.status === 1)
                                    .map((project) => (
                                        <ProjectCard
                                            key={project.sid}
                                            project={transformProject(project)}
                                        />
                                    ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg
                                        className="w-16 h-16"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                }
                                title={t('projects.myProjects.emptyStates.noActiveJoined.title')}
                                description={t('projects.myProjects.emptyStates.noActiveJoined.description')}
                                actionLabel={t('projects.myProjects.emptyStates.noActiveJoined.action')}
                                onAction={() => navigate('/projects')}
                            />
                        )}
                    </div>
                )}

                {/* Archived Projects View */}
                {activeTab === "archived" && (
                    <div>
                        {archivedProjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {archivedProjects.map((project) => (
                                    <ProjectCard
                                        key={project.sid}
                                        project={transformProject(project)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg
                                        className="w-16 h-16"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                }
                                title={t('projects.myProjects.emptyStates.noArchived.title')}
                                description={t('projects.myProjects.emptyStates.noArchived.description')}
                            />
                        )}
                    </div>
                )}

                {/* Completed Projects View */}
                {activeTab === "completed" && (
                    <div>
                        {completedProjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {completedProjects.map((project) => (
                                    <ProjectCard
                                        key={project.sid}
                                        project={transformProject(project)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg
                                        className="w-16 h-16"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                                title={t('projects.myProjects.emptyStates.noCompleted.title')}
                                description={t('projects.myProjects.emptyStates.noCompleted.description')}
                                actionLabel={t('projects.myProjects.emptyStates.noCompleted.action')}
                                onAction={() => handleTabChange('all')}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Help Button - Floating Action Button */}
            {/* <HelpButton tutorialType="dashboard" variant="fab" showMenu={true} disablePulse={false} /> */}

            {/* Tutorial Component */}
            <DashboardTutorial />

            {/* Quick Create Modal */}
            <QuickCreateModal
                isOpen={showQuickCreate}
                onClose={() => setShowQuickCreate(false)}
                onCreateWithAI={() => {
                    setShowQuickCreate(false);
                    navigate('/ai-project-assistant');
                }}
                onQuickCreate={handleQuickCreate}
            />
        </PageContainer>
    );
};

export default MyProjects;
