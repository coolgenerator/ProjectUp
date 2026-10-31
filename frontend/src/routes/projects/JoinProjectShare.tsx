import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import toast from 'react-hot-toast';
import config from '../../config';
import { getDisplayName } from '../../utils/displayName';
import fetchWithAuth from '../../hooks/fetchWithAuth';

const { API_BASE_URL, AWS_BASE_URL } = config;

interface ShareLink {
    share_id: number;
    project_id: number;
    workspace_id?: number;
    share_token: string;
    access_level: string;
    expires_at?: string;
    is_active: boolean;
    usage_count: number;
}

interface Project {
    project_id: number;
    sid: string;
    title: string;
    description: string;
    cover?: string;
    owner_id: number;
    project_type?: string;
    location?: string;
    status?: number;
}

interface Workspace {
    group_id: number;
    name: string;
    description?: string;
}

interface ShareLinkResponse {
    share_link: ShareLink;
    project: Project;
    workspace?: Workspace;
}

const JoinProjectShare: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { authenticated: isAuthenticated, user } = useSelector((state: RootState) => state.auth);

    const [loading, setLoading] = useState(true);
    const [shareData, setShareData] = useState<ShareLinkResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const hasRedirected = useRef(false);
    const authCheckCompleted = useRef(false);

    useEffect(() => {
        // Prevent multiple redirects
        if (hasRedirected.current || authCheckCompleted.current) {
            return;
        }

        // Wait for Redux Persist to finish rehydrating
        // isAuthenticated will be undefined during rehydration
        if (isAuthenticated === undefined) {
            console.log('JoinProjectShare: Waiting for Redux rehydration...');
            return;
        }

        authCheckCompleted.current = true;
        console.log('JoinProjectShare: Auth state:', { isAuthenticated, user });

        // If explicitly not authenticated (false, not undefined), redirect to login
        if (isAuthenticated === false) {
            console.log('JoinProjectShare: Not authenticated, redirecting to login');
            hasRedirected.current = true;
            const returnUrl = encodeURIComponent(location.pathname);
            navigate(`/login?redirect=${returnUrl}`, { replace: true });
            return;
        }

        // User is authenticated, fetch share link
        console.log('JoinProjectShare: Authenticated, fetching share link');
        fetchShareLink();
    }, [isAuthenticated, user, location.pathname, navigate]); // Include dependencies but use ref to prevent multiple executions

    const fetchShareLink = async () => {
        if (!token) {
            setError('Invalid share link');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/share/${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Share link not found or expired');
                }
                throw new Error('Failed to load share link');
            }

            const data = await response.json();
            setShareData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load share link');
            toast.error(err.message || 'Failed to load share link');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!token) return;

        setAccepting(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/share/${token}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join project');
            }

            const data = await response.json();
            toast.success(data.message || 'Successfully joined project!');

            // Redirect to project dashboard using the SID from accept response
            const projectSid = data.project?.sid || data.share_link?.project?.sid || shareData?.project?.sid;
            if (projectSid) {
                navigate(`/project/${projectSid}/dashboard`);
            } else {
                console.error('No project SID found in response:', data);
                navigate('/projects');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to join project');
        } finally {
            setAccepting(false);
        }
    };

    const handleDecline = () => {
        navigate('/projects');
    };

    // Format avatar URL with AWS base URL if needed
    const getFormattedAvatarUrl = (url: string | null | undefined): string => {
        if (!url) return "/default-avatar.jpg";

        // If URL already contains http/https, use it as is
        if (url.startsWith('http')) return url;

        // Otherwise, prepend AWS base URL
        return `${AWS_BASE_URL}${url}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (error || !shareData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invitation</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse Projects
                    </button>
                </div>
            </div>
        );
    }

    const { share_link, project, workspace } = shareData;

    // Additional safety check for project data
    if (!project || !project.title) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Project Data</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">The project information could not be loaded.</p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse Projects
                    </button>
                </div>
            </div>
        );
    }

    // Determine if this is a personal invitation or general share link
    // Personal invitations would have additional metadata (future: check for targeted_user_id or invitation_email)
    const isPersonalInvitation = false; // TODO: Update when backend supports personal invitations

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
            <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isPersonalInvitation ? 'Project Invitation' : 'Join Project'}
                            </h1>
                            <p className="text-blue-100 text-sm">
                                {isPersonalInvitation ? "You've been invited to join" : 'Review project details and join'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6 space-y-6">
                    {/* Project Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl font-bold text-white">
                                    {project.title.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    {project.title}
                                </h2>
                                {project.description && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                        {project.description}
                                    </p>
                                )}
                                {workspace && (
                                    <div className="mt-3 inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        Workspace: {workspace.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expiry Info */}
                    {share_link.expires_at && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Expires: {new Date(share_link.expires_at).toLocaleDateString()}</span>
                        </div>
                    )}

                    {/* User Info */}
                    {user && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <img
                                    src={getFormattedAvatarUrl(user.avatar)}
                                    alt={getDisplayName(user)}
                                    className="w-10 h-10 rounded-full border-2 border-blue-300 dark:border-blue-600 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = "/default-avatar.jpg";
                                    }}
                                />
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Joining as</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {getDisplayName(user)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {isPersonalInvitation ? (
                        // Personal invitation: Show Accept/Decline buttons
                        <div className="flex space-x-4 pt-4">
                            <button
                                onClick={handleAccept}
                                disabled={accepting}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                            >
                                {accepting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Accepting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Accept Invitation</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={accepting}
                                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Decline
                            </button>
                        </div>
                    ) : (
                        // General share link: Show only Join button
                        <div className="pt-4">
                            <button
                                onClick={handleAccept}
                                disabled={accepting}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                            >
                                {accepting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Joining...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        <span>Join Project</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JoinProjectShare;
