import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    IconButton,
    Button,
    Snackbar,
    Alert,
    Paper,
} from "@mui/material";
import {
    Person,
    Group,
    Delete,
    Add,
} from "@mui/icons-material";
import { ProjectMember } from "../../types/project/projectMember";
import { getDisplayName } from "../../utils/displayName";
import WorkspaceManagement from "./WorkspaceManagement";
import WorkspaceMembers from "./WorkspaceMembers";

interface ProjectMembersProps {
    members: ProjectMember[];
    projectSid: string;
    onRemoveMember: (userId: string) => Promise<void>;
    currentUserId?: string;
}

const ProjectMembersUpdated: React.FC<ProjectMembersProps> = ({
    members,
    projectSid,
    onRemoveMember,
    currentUserId
}) => {
    const [activeTab, setActiveTab] = useState("members");
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    const [workspaceMembersOpen, setWorkspaceMembersOpen] = useState(false);
    const [selectedWorkspaceName, setSelectedWorkspaceName] = useState("");

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error'
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleWorkspaceSelect = (workspaceId: number, workspaceName?: string) => {
        setSelectedWorkspaceId(workspaceId);
        setSelectedWorkspaceName(workspaceName || "Workspace");
        setWorkspaceMembersOpen(true);
    };

    const handleRemoveMember = async (userId: string) => {
        if (window.confirm("Are you sure you want to remove this member from the project?")) {
            try {
                await onRemoveMember(userId);
                showSnackbar("Member removed successfully!", "success");
            } catch (error) {
                showSnackbar("Failed to remove member", "error");
            }
        }
    };

    // Get member's workspaces (this would come from API in real implementation)
    const getMemberWorkspaces = (memberId: number): string[] => {
        // TODO: Fetch actual workspace memberships from API
        return [];
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Project Team & Workspaces
            </Typography>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
                <Tab
                    icon={<Person />}
                    iconPosition="start"
                    label="All Members"
                    value="members"
                />
                <Tab
                    icon={<Group />}
                    iconPosition="start"
                    label="Workspaces"
                    value="workspaces"
                />
            </Tabs>

            {/* All Members Tab */}
            {activeTab === "members" && (
                <Box>
                    <Paper>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="h6">
                                All Project Members ({members.length})
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Members across all workspaces
                            </Typography>
                        </Box>

                        <List>
                            {members.map((member: ProjectMember) => (
                                <ListItem
                                    key={member.user_id}
                                    divider
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleRemoveMember(member.user_id.toString())}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar
                                            alt={getDisplayName(member)}
                                            src={member.avatar || ""}
                                        />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">
                                                    {getDisplayName(member)}
                                                </Typography>
                                                {member.user_id.toString() === currentUserId && (
                                                    <Chip label="You" size="small" color="primary" />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" component="span">
                                                    {member.email}
                                                </Typography>
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    Role: {member.role}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>

                    <Box sx={{ mt: 2 }}>
                        <Alert severity="info">
                            <Typography variant="body2">
                                <strong>Tip:</strong> To organize members into teams, go to the "Workspaces" tab
                                and add members to specific workspaces like Development, Marketing, or Operations.
                            </Typography>
                        </Alert>
                    </Box>
                </Box>
            )}

            {/* Workspaces Tab */}
            {activeTab === "workspaces" && (
                <WorkspaceManagement
                    projectSid={projectSid}
                    onWorkspaceSelect={(workspaceId) => {
                        // Find workspace name from the list
                        handleWorkspaceSelect(workspaceId);
                    }}
                />
            )}

            {/* Workspace Members Dialog */}
            {selectedWorkspaceId && (
                <WorkspaceMembers
                    open={workspaceMembersOpen}
                    onClose={() => {
                        setWorkspaceMembersOpen(false);
                        setSelectedWorkspaceId(null);
                    }}
                    workspaceId={selectedWorkspaceId}
                    workspaceName={selectedWorkspaceName}
                    projectSid={projectSid}
                    projectMembers={members}
                />
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProjectMembersUpdated;
