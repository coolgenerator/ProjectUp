import React, { useState, useEffect } from 'react';
import {
    Workspace,
    ShareLink,
    getUserWorkspaces,
    createShareLink,
    getProjectShareLinks,
    deleteShareLink,
} from '../../services/workspaceService';

interface ProjectSharingProps {
    projectSid: string;
    isAdmin: boolean;
}

const ProjectSharing: React.FC<ProjectSharingProps> = ({ projectSid, isAdmin }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);

    // Share Link Dialog
    const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<number | undefined>(undefined);
    const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
    const [expiryDays, setExpiryDays] = useState<number>(7);
    const [generatedLink, setGeneratedLink] = useState<string>('');

    // Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        if (isAdmin) {
            fetchWorkspaces();
            fetchShareLinks();
        }
    }, [isAdmin, projectSid]);

    const fetchWorkspaces = async () => {
        try {
            const data = await getUserWorkspaces(projectSid);
            setWorkspaces(data.workspaces || []);
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
        }
    };

    const fetchShareLinks = async () => {
        try {
            const links = await getProjectShareLinks(projectSid);
            setShareLinks(links);
        } catch (error) {
            console.error('Failed to fetch share links:', error);
            showSnackbar('Failed to fetch share links', 'error');
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
        setTimeout(() => setSnackbar({ ...snackbar, open: false }), 6000);
    };

    const handleCreateShareLink = async () => {
        try {
            const newShare = await createShareLink(projectSid, {
                workspace_id: selectedWorkspace,
                access_level: accessLevel,
                expiry_days: expiryDays,
            });

            const link = `${window.location.origin}/projects/share/${newShare.share_token}`;
            setGeneratedLink(link);
            showSnackbar('Share link created successfully!', 'success');

            // Refresh the list
            fetchShareLinks();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to create share link',
                'error'
            );
        }
    };

    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        showSnackbar('Link copied to clipboard!', 'success');
    };

    const handleDeleteShareLink = async (shareId: number) => {
        if (!window.confirm('Are you sure you want to delete this share link?')) {
            return;
        }

        try {
            await deleteShareLink(projectSid, shareId);
            showSnackbar('Share link deleted', 'success');
            fetchShareLinks();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to delete share link',
                'error'
            );
        }
    };

    const resetShareLinkForm = () => {
        setSelectedWorkspace(undefined);
        setAccessLevel('view');
        setExpiryDays(7);
        setGeneratedLink('');
    };

    const getShareUrl = (token: string) => {
        return `${window.location.origin}/projects/share/${token}`;
    };

    if (!isAdmin) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                    <span className="text-yellow-700">⚠️ Only project administrators can manage sharing settings.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Project Sharing & Invitations</h2>
                <p className="text-sm text-gray-600">Create secure share links with workspace-specific access</p>
            </div>

            {/* Snackbar */}
            {snackbar.open && (
                <div className={`rounded-lg p-4 ${snackbar.severity === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                        <span className={snackbar.severity === 'success' ? 'text-green-800' : 'text-red-800'}>
                            {snackbar.message}
                        </span>
                        <button
                            onClick={() => setSnackbar({ ...snackbar, open: false })}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => setShareLinkDialogOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <span>🔗</span> Create Share Link
                </button>
            </div>

            {/* Active Share Links */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Share Links</h3>
                {shareLinks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-5xl mb-3">🔗</div>
                        <p className="text-gray-600 font-medium">No active share links</p>
                        <p className="text-sm text-gray-500 mt-1">Create a share link to allow others to access this project</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shareLinks.map((share) => (
                            <div
                                key={share.share_id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-base font-medium text-gray-900">
                                                {share.workspace?.name || 'Full Project'}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${share.access_level === 'edit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {share.access_level.toUpperCase()}
                                            </span>
                                            {!share.is_active && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    INACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600 font-mono break-all">
                                                {getShareUrl(share.share_token)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Created by: {share.creator?.first_name} {share.creator?.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {share.expires_at
                                                    ? `Expires: ${new Date(share.expires_at).toLocaleDateString()}`
                                                    : 'No expiration'
                                                } • Used {share.usage_count} times
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleCopyLink(getShareUrl(share.share_token))}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Copy link"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={() => handleDeleteShareLink(share.share_id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete link"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Share Link Dialog */}
            {shareLinkDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Share Link</h3>

                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-800">
                                        Create a shareable link that anyone with the link can use to access your project.
                                    </p>
                                </div>

                                {/* Workspace Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Workspace (Optional)
                                    </label>
                                    <select
                                        value={selectedWorkspace || ''}
                                        onChange={(e) => setSelectedWorkspace(e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Full Project Access</option>
                                        {workspaces.map((workspace) => (
                                            <option key={workspace.group_id} value={workspace.group_id}>
                                                {workspace.icon} {workspace.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Leave empty to share the entire project, or select a specific workspace
                                    </p>
                                </div>

                                {/* Access Level */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Access Level
                                    </label>
                                    <select
                                        value={accessLevel}
                                        onChange={(e) => setAccessLevel(e.target.value as 'view' | 'edit')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="view">👁️ View Only - Can see content</option>
                                        <option value="edit">✏️ Edit - Can view and modify content</option>
                                    </select>
                                </div>

                                {/* Expiry */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link Expires In
                                    </label>
                                    <select
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={1}>1 Day</option>
                                        <option value={7}>7 Days</option>
                                        <option value={14}>14 Days</option>
                                        <option value={30}>30 Days</option>
                                        <option value={90}>90 Days</option>
                                    </select>
                                </div>

                                {/* Generated Link */}
                                {generatedLink && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Share Link:
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={generatedLink}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                                            />
                                            <button
                                                onClick={() => handleCopyLink(generatedLink)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dialog Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShareLinkDialogOpen(false);
                                        resetShareLinkForm();
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    {generatedLink ? 'Close' : 'Cancel'}
                                </button>
                                {!generatedLink && (
                                    <button
                                        onClick={handleCreateShareLink}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Create Link
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSharing;
