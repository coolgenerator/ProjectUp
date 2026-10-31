import { useState, useEffect } from 'react';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';
import { ProjectDetails } from '../types/project/projectDetails';
import { ProjectMember } from '../types/project/projectMember';

const { API_BASE_URL } = config;

interface ProjectApplication {
    application_id: number;
    user_id: number;
    post_id: number;
    status: number;
    applied_at: string;
    description: string;
    created_at: string;
    answers: any | null;
    // Flattened user fields
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar?: string;
}

interface ApplicationQuestion {
    question_id: number;
    post_id: number;
    text: string;
    type: number;
    choices?: string[];
    created_at: string;
    answers?: ApplicationAnswer[];
}

interface ApplicationAnswer {
    answer_id: number;
    application_id: number;
    question_id: number;
    answer_text: string;
    created_at: string;
}

export const useProject = (projectSid: string) => {
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [applications, setApplications] = useState<ProjectApplication[]>([]);
    const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
    const [manageLoading, setManageLoading] = useState(false);

    const fetchProjectData = async () => {
        if (!projectSid) {
            setError("Invalid project SID");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setErrorCode(null);

            // Fetch Project Details
            const projectResponse = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}`);

            if (!projectResponse.ok) {
                setErrorCode(projectResponse.status);
                const errorData = await projectResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Project fetch failed: ${projectResponse.statusText}`);
            }

            const projectData = await projectResponse.json();

            // Map API response to our project data structure
            const mappedData = {
                ...projectData,
                isPublished: projectData.is_published || false
            };

            setProject(mappedData);

            // Note: Resources and workspaces are now fetched using the block-based approach
            // via the useBlocks hook in the component

        } catch (err: any) {
            setError(err.message || "Failed to fetch project data.");
        } finally {
            setLoading(false);
        }
    };

    // New function to fetch manage section data
    const fetchManageData = async () => {
        try {
            setManageLoading(true);

            // Fetch members data
            await fetchMembers();

            // Fetch application questions and answers
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/application-questions`);
            if (!response.ok) {
                throw new Error('Failed to fetch application questions with answers');
            }

            const data = await response.json();

            // Update state with the fetched data
            if (data.questions) {
                setApplicationQuestions(data.questions);
            }

            if (data.applications) {
                setApplications(data.applications);
            }

            // Return data for components that need it
            return data;
        } catch (err) {
            return { questions: [], applications: [] };
        } finally {
            setManageLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/members`);
            const data = await response.json();
            setMembers(data.members || []);
            return data;
        } catch (err) {
            return { members: [] };
        }
    };

    const fetchApplicationQuestionsWithAnswers = async (shortId: string) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${shortId}/application-questions`);
            if (!response.ok) {
                throw new Error('Failed to fetch application questions with answers');
            }
            const data = await response.json();

            // Set both questions and applications from the response
            setApplicationQuestions(data.questions || []);
            setApplications(data.applications || []);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const updateMemberRole = async (userId: string, groupId: number) => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/members/${userId}/group`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_id: groupId }),
            });

            setMembers((prev) =>
                prev.map((member) =>
                    member.user_id.toString() === userId
                        ? {
                            ...member,
                            group: {
                                ...member.group,
                                group_id: groupId
                            }
                        }
                        : member
                )
            );
        } catch (err) {
            alert("Error updating member group.");
        }
    };

    const updateMemberPermissions = async (userId: string, permissions: number) => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/members/${userId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissions }),
            });

            setMembers((prev) =>
                prev.map((member) =>
                    member.user_id.toString() === userId
                        ? {
                            ...member,
                            permissions,
                            group: {
                                ...member.group,
                                permissions
                            }
                        }
                        : member
                )
            );
        } catch (err) {
            alert("Error updating permissions.");
        }
    };

    const removeMember = async (userId: string) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;

        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/members/${userId}`, {
                method: "DELETE",
            });

            setMembers((prev) => prev.filter((member) => member.user_id.toString() !== userId));
        } catch (err) {
            alert("Error removing member.");
        }
    };

    const handleDeleteProject = async () => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            alert("Project deleted successfully!");
            window.location.href = "/my-projects"; // Redirect to my projects page
            return true;
        } catch (err) {
            alert("Failed to delete project.");
            return false;
        }
    };

    const handleArchiveProject = async () => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            alert("Project archived successfully!");
            window.location.href = "/my-projects"; // Redirect to my projects page
            return true;
        } catch (err) {
            alert("Failed to archive project.");
            return false;
        }
    };

    const markProjectAsCompleted = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            // Update the local project state
            if (project) {
                setProject(prev => {
                    if (prev) {
                        return { ...prev, isCompleted: true };
                    }
                    return prev;
                });
            }

            alert("Project marked as completed successfully!");
            window.location.href = "/my-projects"; // Redirect to my projects page
            return true;
        } catch (err) {
            alert("Failed to mark project as completed.");
            return false;
        }
    };

    const toggleProjectPublish = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectSid}/toggle-publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const data = await response.json();

            // Update the local project state
            if (project) {
                setProject(prev => {
                    if (prev) {
                        const updated = { ...prev, isPublished: data.is_published };
                        return updated;
                    }
                    return prev;
                });
            }

            return data.is_published;
        } catch (err) {
            throw err;
        }
    };

    const inviteMember = async (email: string, groupId: number, expiry?: string) => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, group_id: groupId, expires_at: expiry }),
            });
        } catch (err) {
            throw new Error("Failed to invite member.");
        }
    };

    const createShare = async (accessLevel: 'view' | 'edit', expiryDays: number) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessLevel, expiryDays }),
            });
            return await response.json();
        } catch (err) {
            throw new Error("Failed to create share link.");
        }
    };

    useEffect(() => {
        fetchProjectData();
    }, [projectSid]);

    // Add new useEffect for manage section
    useEffect(() => {
        if (window.location.search.includes('section=manage')) {
            fetchManageData();
        }
    }, [projectSid]);

    return {
        project,
        loading,
        error,
        errorCode,
        members,
        applications,
        applicationQuestions,
        manageLoading,
        updateMemberRole,
        updateMemberPermissions,
        removeMember,
        inviteMember,
        createShare,
        handleDeleteProject,
        handleArchiveProject,
        fetchApplicationQuestionsWithAnswers,
        fetchManageData,
        toggleProjectPublish,
        markProjectAsCompleted,
        fetchProjectData
    };
}; 