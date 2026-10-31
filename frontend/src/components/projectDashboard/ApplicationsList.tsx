import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import { updateApplicationStatus } from '../../services/applicationServices';
import { getGroups, PERMISSIONS } from '../../services/projectService';
import UserProfileBubble from '../UserProfileBubble';
import { getDisplayName } from '../../utils/displayName';

interface ApplicationAnswer {
    answer_id: number;
    application_id: number;
    question_id: number;
    answer_text: string;
    question_text?: string;
    created_at: string;
}

interface Application {
    application_id: number;
    user_id: number;
    post_id: number;
    status: number;
    applied_at: string;
    description: string;
    role?: string;
    hours_per_week?: number;
    created_at: string;
    answers?: any;
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar?: string;
}

interface ApplicationsListProps {
    applications: Application[];
    applicationQuestions: any[];
    manageLoading: boolean;
    onDataChange: () => void;
    projectSid: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({
    applications,
    applicationQuestions,
    onDataChange,
    projectSid
}) => {
    const { t } = useTranslation();
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [applicationDetailOpen, setApplicationDetailOpen] = useState(false);
    // const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    // const [permissions, setPermissions] = useState<number>(PERMISSIONS.SCHEDULE);

    // Fetch project groups
    useEffect(() => {
        if (projectSid) {
            // Fetch groups on component mount
            fetchGroups();
        }
    }, [projectSid]);

    const fetchGroups = async () => {
        try {
            const fetchedGroups = await getGroups(projectSid);
            if (fetchedGroups && fetchedGroups.length > 0) {
                setGroups(fetchedGroups);
                console.log("Fetched groups:", fetchedGroups);
            } else {
                console.log("No groups found for project");
                setGroups([]);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
            setGroups([]);
        }
    };

    // Function to handle opening the application details dialog
    const handleViewApplication = (app: Application) => {
        setSelectedApplication(app);
        setApplicationDetailOpen(true);
    };

    // Function to close the application details dialog
    const handleCloseApplicationDetail = () => {
        setApplicationDetailOpen(false);
    };

    // Function to get application answers for a specific application
    const getApplicationAnswers = (applicationId: number): ApplicationAnswer[] => {
        if (!applicationQuestions || applicationQuestions.length === 0) return [];

        const answers: ApplicationAnswer[] = [];
        applicationQuestions.forEach(question => {
            if (question.answers) {
                const answer = question.answers.find((a: any) => a.application_id === applicationId);
                if (answer) {
                    answers.push({
                        ...answer,
                        question_text: question.text,
                        question_type: question.type
                    });
                }
            }
        });

        return answers;
    };

    // const resetPermissionsToDefault = () => {
    //     // Reset permissions to default values when opening the accept modal
    //     // Give basic scheduling permission by default
    //     setPermissions(PERMISSIONS.SCHEDULE);
    // };

    const handleOpenAcceptModal = (app: Application) => {
        // Temporarily skip the permissions modal and accept directly
        handleDirectAccept(app);
        /*
        setSelectedApplication(app);
        resetPermissionsToDefault();
        setAcceptModalOpen(true);
        */
    };

    // const handleCloseAcceptModal = () => {
    //     setAcceptModalOpen(false);
    // };

    // New direct accept handler
    const handleDirectAccept = async (app: Application) => {
        try {
            // Ensure groups are loaded
            if (groups.length === 0) {
                await fetchGroups();
            }

            // Get the first group if available, otherwise undefined
            const defaultGroupId = groups.length > 0 ? groups[0].group_id : undefined;

            console.log("Accepting application with group:", defaultGroupId);

            // Call API to accept application with basic permissions (just SCHEDULE permission)
            await updateApplicationStatus(
                app.application_id,
                'accept',
                defaultGroupId,
                PERMISSIONS.SCHEDULE // Basic permission
            );
            onDataChange();
        } catch (err) {
            console.error("Failed to accept application:", err);
        }
    };

    // const handleAcceptWithPermissions = async () => {
    //     if (!selectedApplication) return;

    //     try {
    //         // Call API to accept application with group and permissions
    //         // Only pass groupId if a valid group is selected (groups.length > 0 && selectedGroup > 0)
    //         await updateApplicationStatus(
    //             selectedApplication.application_id,
    //             'accept',
    //             groups.length > 0 ? selectedGroup : undefined,
    //             permissions
    //         );
    //         handleCloseAcceptModal();
    //         onDataChange();
    //     } catch (err) {
    //         console.error("Failed to accept application:", err);
    //     }
    // };

    const handleDeclineApplication = async (applicationId: number) => {
        try {
            await updateApplicationStatus(applicationId, 'decline');
            onDataChange();
        } catch (err) {
            console.error("Failed to decline application:", err);
        }
    };

    const handleReconsiderApplication = async (applicationId: number) => {
        try {
            await updateApplicationStatus(applicationId, 'reconsider');
            onDataChange();
        } catch (err) {
            console.error("Failed to reconsider application:", err);
        }
    };

    // const handlePermissionChange = (permission: number) => {
    //     setPermissions(prevPermissions =>
    //         prevPermissions & permission
    //             ? prevPermissions & ~permission // Remove permission
    //             : prevPermissions | permission   // Add permission
    //     );
    // };

    // const isPermissionSelected = (permission: number): boolean => {
    //     return (permissions & permission) === permission;
    // };

    // if (manageLoading) {
    //     return (
    //         <div className="flex justify-center py-6">
    //             <CircularProgress size={32} />
    //         </div>
    //     );
    // }

    if (applications.length === 0) {
        return (
            <div className="bg-gray-100 p-6 rounded-md text-center">
                <p className="text-gray-500 text-sm mb-1">No applications available.</p>
                <p className="text-gray-400 text-xs">Applications will appear here when users apply to your project.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Application status summary */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm">
                    <span className="font-semibold">{applications.filter(a => a.status === 0).length}</span> Pending
                </div>
                <div className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
                    <span className="font-semibold">{applications.filter(a => a.status === 1).length}</span> Accepted
                </div>
                <div className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                    <span className="font-semibold">{applications.filter(a => a.status === 2).length}</span> Declined
                </div>
            </div>

            {/* Pending applications section */}
            {applications.filter(a => a.status === 0).length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mb-2 text-blue-700 border-b border-blue-200 pb-1">Pending Applications</h4>
                    <div className="space-y-2">
                        {applications.filter(a => a.status === 0).map((app) => (
                            <div key={app.application_id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border-l-4 border-blue-400 shadow-sm gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        {app.avatar ? (
                                            <img
                                                src={`${app.avatar}`}
                                                alt={getDisplayName(app)}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-gray-600">
                                                {getDisplayName(app)[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                            {getDisplayName(app)}
                                        </p>
                                        {(app.role || app.hours_per_week) ? (
                                            <p className="text-xs sm:text-sm text-indigo-700">
                                                {app.role || t("match.applications.noRole")}{app.hours_per_week ? t("match.applications.committed", { n: app.hours_per_week }) : ""}
                                            </p>
                                        ) : null}
                                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{app.description}</p>
                                        <p className="text-xs text-gray-500">
                                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button
                                        onClick={() => handleViewApplication(app)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => handleOpenAcceptModal(app)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDeclineApplication(app.application_id)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Accepted applications section */}
            {applications.filter(a => a.status === 1).length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mb-2 text-green-700 border-b border-green-200 pb-1">Accepted Applications</h4>
                    <div className="space-y-2">
                        {applications.filter(a => a.status === 1).map((app) => (
                            <div key={app.application_id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border-l-4 border-green-400 shadow-sm gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        {app.avatar ? (
                                            <img
                                                src={`${app.avatar}`}
                                                alt={getDisplayName(app)}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-gray-600">
                                                {getDisplayName(app)[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                            {getDisplayName(app)}
                                        </p>
                                        {(app.role || app.hours_per_week) ? (
                                            <p className="text-xs sm:text-sm text-indigo-700">
                                                {app.role || t("match.applications.noRole")}{app.hours_per_week ? t("match.applications.committed", { n: app.hours_per_week }) : ""}
                                            </p>
                                        ) : null}
                                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{app.description}</p>
                                        <p className="text-xs text-gray-500">
                                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                                        </p>
                                        <div className="mt-1">
                                            <span className="text-green-500 font-medium text-xs">Member</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button
                                        onClick={() => handleViewApplication(app)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declined applications section */}
            {applications.filter(a => a.status === 2).length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mb-2 text-red-700 border-b border-red-200 pb-1">Declined Applications</h4>
                    <div className="space-y-2">
                        {applications.filter(a => a.status === 2).map((app) => (
                            <div key={app.application_id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border-l-4 border-red-400 shadow-sm gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        {app.avatar ? (
                                            <img
                                                src={`${app.avatar}`}
                                                alt={getDisplayName(app)}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-gray-600">
                                                {getDisplayName(app)[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                            {getDisplayName(app)}
                                        </p>
                                        {(app.role || app.hours_per_week) ? (
                                            <p className="text-xs sm:text-sm text-indigo-700">
                                                {app.role || t("match.applications.noRole")}{app.hours_per_week ? t("match.applications.committed", { n: app.hours_per_week }) : ""}
                                            </p>
                                        ) : null}
                                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{app.description}</p>
                                        <p className="text-xs text-gray-500">
                                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button
                                        onClick={() => handleViewApplication(app)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => handleReconsiderApplication(app.application_id)}
                                        className="text-blue-500 hover:text-blue-600 underline text-xs sm:text-sm"
                                    >
                                        Reconsider
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Application Detail Dialog */}
            <Dialog
                open={applicationDetailOpen}
                onClose={handleCloseApplicationDetail}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Application Details
                    {selectedApplication && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${selectedApplication.status === 0 ? "bg-blue-100 text-blue-800" :
                            selectedApplication.status === 1 ? "bg-green-100 text-green-800" :
                                "bg-red-100 text-red-800"
                            }`}>
                            {selectedApplication.status === 0 ? "Pending" : selectedApplication.status === 1 ? "Accepted" : "Declined"}
                        </span>
                    )}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedApplication && (
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Left column - User Profile */}
                            <div className="md:w-1/3 flex-shrink-0">
                                <UserProfileBubble
                                    userId={selectedApplication.user_id}
                                    key={`profile-${selectedApplication.user_id}`}
                                />
                            </div>

                            {/* Right column - Application Details */}
                            <div className="md:w-2/3 space-y-6">
                                {/* Basic info */}
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-blue-800 text-sm mb-1">
                                        <span className="font-medium">Applied:</span> {new Date(selectedApplication.applied_at).toLocaleString()}
                                    </p>
                                    {(selectedApplication.role || selectedApplication.hours_per_week) ? (
                                        <p className="text-blue-800 text-sm mb-1">
                                            <span className="font-medium">{t("match.applications.roleLabel")}</span>{selectedApplication.role || t("match.applications.unspecified")}
                                            {selectedApplication.hours_per_week ? t("match.applications.committedDetail", { n: selectedApplication.hours_per_week }) : ""}
                                        </p>
                                    ) : null}
                                    {selectedApplication.status === 0 && (
                                        <p className="text-blue-800 text-sm">
                                            <span className="inline-block px-2 py-1 bg-blue-100 text-xs font-semibold rounded-full">Pending Review</span>
                                        </p>
                                    )}
                                    {selectedApplication.status === 1 && (
                                        <p className="text-green-800 text-sm">
                                            <span className="inline-block px-2 py-1 bg-green-100 text-xs font-semibold rounded-full">Accepted</span>
                                        </p>
                                    )}
                                    {selectedApplication.status === 2 && (
                                        <p className="text-red-800 text-sm">
                                            <span className="inline-block px-2 py-1 bg-red-100 text-xs font-semibold rounded-full">Declined</span>
                                        </p>
                                    )}
                                </div>

                                {/* Motivation */}
                                {selectedApplication.description && (
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2">Motivation</h4>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p>{selectedApplication.description}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Application Answers */}
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">Application Answers</h4>
                                    <div className="space-y-3">
                                        {getApplicationAnswers(selectedApplication.application_id).length > 0 ? (
                                            getApplicationAnswers(selectedApplication.application_id).map((answer: ApplicationAnswer, index: number) => (
                                                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="font-medium mb-2">{answer.question_text || `Question ${index + 1}`}</p>
                                                    <p>{answer.answer_text}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic">No additional questions answered.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedApplication && selectedApplication.status === 0 && (
                        <>
                            <Button
                                onClick={() => {
                                    handleCloseApplicationDetail();
                                    // Use direct accept instead of opening modal
                                    handleDirectAccept(selectedApplication);
                                    // handleOpenAcceptModal(selectedApplication);
                                }}
                                color="success"
                                variant="contained"
                            >
                                Accept
                            </Button>
                            <Button
                                onClick={() => {
                                    handleDeclineApplication(selectedApplication.application_id);
                                    handleCloseApplicationDetail();
                                }}
                                color="error"
                                variant="contained"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    {selectedApplication && selectedApplication.status === 2 && (
                        <Button
                            onClick={() => {
                                handleReconsiderApplication(selectedApplication.application_id);
                                handleCloseApplicationDetail();
                            }}
                            color="primary"
                            variant="outlined"
                        >
                            Reconsider
                        </Button>
                    )}
                    <Button onClick={handleCloseApplicationDetail}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Accept Application Modal with Permission Settings */}
            {/* Temporarily commented out
            <Dialog
                open={acceptModalOpen}
                onClose={handleCloseAcceptModal}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Accept Application & Set Permissions</DialogTitle>
                <DialogContent dividers>
                    {groupsLoading ? (
                        <Box display="flex" justifyContent="center" my={3}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <Box>
                            {/* Group Selection - Only show if groups exist *//*}
                            {groups.length > 0 ? (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="group-select-label">Assign to Group</InputLabel>
                                    <Select
                                        labelId="group-select-label"
                                        id="group-select"
                                        value={selectedGroup}
                                        label="Assign to Group"
                                        onChange={(e) => setSelectedGroup(Number(e.target.value))}
                                    >
                                        {groups.map((group) => (
                                            <MenuItem key={group.group_id} value={group.group_id}>
                                                {group.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No groups found. You can assign permissions without a group or
                                        {' '}
                                        <Link
                                            onClick={() => {
                                                handleCloseAcceptModal();
                                                window.location.href = `/project/${projectSid}?section=members`;
                                            }}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            manage groups
                                        </Link>.
                                    </Typography>
                                </Box>
                            )}

                            {/* Permissions Settings *//*}
                            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                                Member Permissions
                            </Typography>
                            <Box sx={{ p: 2, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1, bgcolor: 'background.paper' }}>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    Select permissions for this new member:
                                </Typography>
                                <FormGroup>
                                    <Grid container spacing={2}>
                                        {/* Basic permissions *//*}
                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.SCHEDULE)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.SCHEDULE)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Schedule Time</Typography>
                                                        <Typography variant="caption" color="text.secondary">Manage availability</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.INVITE)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.INVITE)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Invite Members</Typography>
                                                        <Typography variant="caption" color="text.secondary">Add new team members</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.EDIT_PROJECT)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.EDIT_PROJECT)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Edit Project</Typography>
                                                        <Typography variant="caption" color="text.secondary">Modify project details and posts</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.MANAGE_APPLICATIONS)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.MANAGE_APPLICATIONS)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Manage Applications</Typography>
                                                        <Typography variant="caption" color="text.secondary">Review and accept applicants</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.MANAGE_TEAM)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.MANAGE_TEAM)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Manage Team</Typography>
                                                        <Typography variant="caption" color="text.secondary">Remove or change member roles</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.MANAGE_GROUP)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.MANAGE_GROUP)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Manage Groups</Typography>
                                                        <Typography variant="caption" color="text.secondary">Create and modify groups</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isPermissionSelected(PERMISSIONS.MANAGE_PROJECT)}
                                                        onChange={() => handlePermissionChange(PERMISSIONS.MANAGE_PROJECT)}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">Manage Project Status</Typography>
                                                        <Typography variant="caption" color="text.secondary">Complete, archive or delete project</Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>
                                    </Grid>
                                </FormGroup>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAcceptModal}>Cancel</Button>
                    <Button
                        onClick={handleAcceptWithPermissions}
                        color="success"
                        variant="contained"
                        disabled={groupsLoading}
                    >
                        Accept & Add to Project
                    </Button>
                </DialogActions>
            </Dialog>
            */}
        </div>
    );
};

export default ApplicationsList; 