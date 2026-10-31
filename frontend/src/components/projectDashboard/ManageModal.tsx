import React, { useState, useEffect } from "react";
import { Modal, Tabs, Tab, Button, TextField } from "@mui/material";
import config from "../../config";
import LoadingPage from "../app/Loading";
import { useProject } from "../../hooks/useProject";
import { PERMISSIONS, GROUP_TYPES, GROUP_PERMISSIONS } from '../../services/projectService';
import { updateApplicationStatus } from "../../services/applicationServices";
import { getDisplayName } from "../../utils/displayName";
import ProjectSharing from "../projectSettings/ProjectSharing";

const { AWS_BASE_URL } = config;

interface ManageTeamModalProps {
    projectSid: string;
    isOpen: boolean;
    onClose: () => void;
}

const ManageModal: React.FC<ManageTeamModalProps> = ({ projectSid, isOpen, onClose }) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteStatus, setInviteStatus] = useState<string | null>(null);
    const projectShareLink = `${window.location.origin}/project/${projectSid}`;

    // Use the useProject hook
    const {
        members,
        applications,
        applicationQuestions,
        manageLoading,
        updateMemberRole,
        updateMemberPermissions,
        inviteMember,
        handleDeleteProject,
        handleArchiveProject,
        fetchManageData
    } = useProject(projectSid);

    useEffect(() => {
        if (isOpen) {
            setInviteEmail("");
            setInviteStatus(null);
            fetchManageData(); // Fetch data when modal opens
        }
    }, [isOpen]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            setInviteStatus("Please enter a valid email.");
            return;
        }

        try {
            await inviteMember(inviteEmail, 1); // Using group ID 1 for now
            setInviteStatus("Invitation sent successfully!");
            setInviteEmail("");
        } catch (err) {
            setInviteStatus("Error sending invite.");
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(projectShareLink);
        alert("Project link copied to clipboard!");
    };

    const handleAcceptApplication = async (applicationId: number) => {
        try {
            await updateApplicationStatus(applicationId, 'accept');
            fetchManageData(); // Refresh the applications list
        } catch (err) {
            console.error("Failed to accept application:", err);
        }
    };

    const handleDeclineApplication = async (applicationId: number) => {
        try {
            await updateApplicationStatus(applicationId, 'decline');
            fetchManageData(); // Refresh the applications list
        } catch (err) {
            console.error("Failed to decline application:", err);
        }
    };

    const handleReconsiderApplication = async (applicationId: number) => {
        try {
            await updateApplicationStatus(applicationId, 'reconsider');
            fetchManageData(); // Refresh the applications list
        } catch (err) {
            console.error("Failed to reconsider application:", err);
        }
    };

    return (
        <>
            <Modal open={isOpen} onClose={onClose}>
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-md max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Manage Team</h2>

                    {/* Tabs Navigation */}
                    <Tabs value={tabIndex} onChange={(_, newIndex) => setTabIndex(newIndex)} centered>
                        <Tab label="Share" />
                        <Tab label="Roles & Permissions" />
                        <Tab label="Applications" />
                        <Tab label="Manage Actions" />
                    </Tabs>

                    {/* Share Tab */}
                    {tabIndex === 0 && (
                        <div className="mt-4 space-y-6">
                            {/* Invite by Email Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Invite People to the Project</h3>
                                <div className="flex items-center space-x-2">
                                    <TextField
                                        type="email"
                                        label="Enter Email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        fullWidth
                                    />
                                    <Button variant="contained" color="primary" onClick={handleInvite}>
                                        Invite
                                    </Button>
                                </div>
                                {inviteStatus && <p className="text-sm text-gray-700">{inviteStatus}</p>}
                            </div>

                            <hr className="my-4" />

                            {/* Share Management Section - NEW with Workspace Support */}
                            <ProjectSharing projectSid={projectSid} isAdmin={true} />
                        </div>
                    )}

                    {/* Roles & Permissions Tab */}
                    <div className="overflow-y-auto max-h-[60vh] p-4">
                        {tabIndex === 1 && (
                            <div className="space-y-6 mt-4">
                                {members.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center justify-between border-b pb-4 mb-4"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={member.avatar || "/default-avatar.png"}
                                                alt={member.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div>
                                                <div className="font-medium">{member.name}</div>
                                                <div className="text-sm text-gray-500">{member.username}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium">Role</label>
                                            <select
                                                value={member.group_id}
                                                onChange={(e) => {
                                                    const groupId = parseInt(e.target.value);
                                                    const groupType = groupId === 1 ? 'admin' : groupId === 2 ? 'manager' : 'member';
                                                    const permissions = GROUP_PERMISSIONS[groupType as keyof typeof GROUP_PERMISSIONS];
                                                    updateMemberRole(member.user_id.toString(), groupId);
                                                    updateMemberPermissions(member.user_id.toString(), permissions);
                                                }}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            >
                                                <option value={GROUP_TYPES.ADMIN}>Admin</option>
                                                <option value={GROUP_TYPES.MANAGER}>Manager</option>
                                                <option value={GROUP_TYPES.MEMBER}>Member</option>
                                            </select>
                                        </div>
                                        {/* Permissions (Bitmask-based checkboxes) */}
                                        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                                            {Object.entries(PERMISSIONS).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={(member.permissions & value) === value}
                                                        onChange={(e) => {
                                                            const newPermissions = e.target.checked
                                                                ? member.permissions | value
                                                                : member.permissions & ~value;
                                                            updateMemberPermissions(member.user_id.toString(), newPermissions);
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <label className="text-sm text-gray-700">{key.replace(/_/g, ' ')}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Applications Tab */}
                        {tabIndex === 2 && (
                            <div className="space-y-6 mt-4">
                                {applications.length > 0 ? (
                                    applications.map((app) => (
                                        <div key={app.application_id} className="border rounded-lg p-4 mb-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={app.avatar ? `${AWS_BASE_URL}${app.avatar}` : "/default-avatar.png"}
                                                        alt={getDisplayName(app)}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-gray-800">
                                                            {getDisplayName(app)}
                                                        </p>
                                                        <p className="text-gray-600">{new Date(app.applied_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    {app.status === 0 && ( // Only show buttons for pending applications
                                                        <>
                                                            <button
                                                                onClick={() => handleAcceptApplication(app.application_id)}
                                                                className="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeclineApplication(app.application_id)}
                                                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {app.status === 1 && (
                                                        <span className="text-green-500 font-medium">Accepted</span>
                                                    )}
                                                    {app.status === 2 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-500 font-medium">Declined</span>
                                                            <button
                                                                onClick={() => handleReconsiderApplication(app.application_id)}
                                                                className="text-blue-500 hover:text-blue-600 text-xs"
                                                            >
                                                                Reconsider
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Motivation/Description */}
                                            {app.description && (
                                                <div className="mb-4">
                                                    <h4 className="font-semibold text-gray-700 mb-2">Motivation</h4>
                                                    <p className="text-gray-600">{app.description}</p>
                                                </div>
                                            )}

                                            {/* Questions and Answers */}
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-gray-700">Application Questions</h4>
                                                {applicationQuestions.map((question) => {
                                                    const answer = question.answers?.find(a => a.application_id === app.application_id);
                                                    return (
                                                        <div key={question.question_id} className="bg-gray-50 p-3 rounded">
                                                            <p className="font-medium text-gray-800 mb-1">{question.text}</p>
                                                            <p className="text-gray-600">{answer?.answer_text || 'No answer provided'}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No applications available.</p>
                                )}
                            </div>
                        )}

                        {/* Manage Actions Tab */}
                        {tabIndex === 3 && (
                            <div className="mt-4 flex flex-col items-center space-y-2">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    className="w-48 shadow-md"
                                    onClick={handleArchiveProject}
                                >
                                    Archive Project
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    className="w-48 shadow-md"
                                    onClick={handleDeleteProject}
                                >
                                    Delete Project
                                </Button>
                            </div>
                        )}

                        <button className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Display loading message */}
            {manageLoading && <LoadingPage />}
        </>
    );
};

export default ManageModal;
