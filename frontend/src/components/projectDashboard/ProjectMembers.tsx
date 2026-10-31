import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Box,
    IconButton,
    Typography,
    List,
    ListItem,
    ListItemText,
    Snackbar,
    Alert,
    Chip,
    Tooltip,
    Avatar,
    Paper,
    Fab,
    CircularProgress
} from "@mui/material";
import {
    Delete,
    Edit,
    Group,
    Person,
    Visibility,
    PeopleAlt,
    Add,
    Lock
} from "@mui/icons-material";
import {
    ProjectGroup,
    createGroup,
    getGroups,
    updateGroup,
    deleteGroup,
    inviteMember,
    PERMISSIONS,
    hasPermission,
} from "../../services/projectService";
import { ProjectMember } from "../../types/project/projectMember";
import GroupMembers from "./GroupMembers";
import { getDisplayName } from "../../utils/displayName";

// Permission labels and their corresponding bitmasks
const PERMISSION_LABELS = {
    [PERMISSIONS.SCHEDULE]: "Can Schedule Time",
    [PERMISSIONS.INVITE]: "Can Invite Members",
    [PERMISSIONS.EDIT_PROJECT]: "Can Edit Project",
    [PERMISSIONS.MANAGE_APPLICATIONS]: "Can Manage Applications",
    [PERMISSIONS.MANAGE_TEAM]: "Can Manage Team",
    [PERMISSIONS.MANAGE_GROUP]: "Can Manage Groups",
    [PERMISSIONS.MANAGE_PROJECT]: "Can Manage Project Status",
};

interface ProjectMembersProps {
    members: ProjectMember[];
    projectSid: string;
    onUpdateMemberRole: (userId: string, groupId: number) => Promise<void>;
    onUpdateMemberPermissions: (userId: string, permissions: number) => Promise<void>;
    onRemoveMember: (userId: string) => Promise<void>;
    currentUserId?: string; // Current user ID to identify the current user
}

const renderPermissionChips = (permissions: number) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(PERMISSION_LABELS).map(([value, label]) => {
            const hasPermissionValue = hasPermission(permissions, parseInt(value));
            return (
                <Tooltip key={value} title={label}>
                    <Chip
                        size="small"
                        color={hasPermissionValue ? "primary" : "default"}
                        variant={hasPermissionValue ? "filled" : "outlined"}
                        sx={{ margin: '2px' }}
                    />
                </Tooltip>
            );
        })}
    </Box>
);

const ProjectMembers: React.FC<ProjectMembersProps> = ({
    members,
    projectSid,
    onUpdateMemberRole,
    onRemoveMember,
    currentUserId
}) => {
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteGroupId, setInviteGroupId] = useState<number | null>(null);
    const [inviteExpiry, setInviteExpiry] = useState("");
    const [inviteSending, setInviteSending] = useState(false);
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [groupPermissions, setGroupPermissions] = useState<number>(0);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Add/Edit Group Modal State
    const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");

    // Group management dialog states
    const [groupMembersDialogOpen, setGroupMembersDialogOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedGroupName, setSelectedGroupName] = useState<string>('');

    // Main view tabs
    const [activeTab, setActiveTab] = useState("members");

    // Check if current user can manage groups based on permissions
    const getCurrentUserPermissions = (): number => {
        if (!currentUserId) return 0;

        const currentUser = members.find(member => member.user_id.toString() === currentUserId);
        return currentUser?.permissions || 0;
    };

    const userPermissions = getCurrentUserPermissions();

    // Check if user has specific permissions
    const canManageTeam = hasPermission(userPermissions, PERMISSIONS.MANAGE_TEAM);
    const canInviteMembers = hasPermission(userPermissions, PERMISSIONS.INVITE);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const fetchedGroups = await getGroups(projectSid);
            setGroups(fetchedGroups || []);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
            setSnackbar({
                open: true,
                message: "Failed to fetch groups",
                severity: "error"
            });
        }
    };

    const handleInviteMember = async () => {
        if (inviteSending) return; // Prevent duplicate submissions

        try {
            if (!inviteGroupId) {
                throw new Error("Please select a group");
            }

            setInviteSending(true);
            await inviteMember(projectSid, {
                email: inviteEmail,
                group_id: inviteGroupId,
                expires_at: inviteExpiry || undefined,
            });
            setSnackbar({ open: true, message: "Invitation sent successfully!", severity: "success" });
            setInviteDialogOpen(false);
            setInviteEmail("");
            setInviteGroupId(null);
            setInviteExpiry("");
        } catch (error) {
            setSnackbar({ open: true, message: "Failed to send invitation", severity: "error" });
        } finally {
            setInviteSending(false);
        }
    };

    // Group Modal functions
    const openAddGroupModal = () => {
        setEditingGroup(null);
        setGroupName("");
        setGroupDescription("");
        setGroupPermissions(PERMISSIONS.SCHEDULE); // Default to at least SCHEDULE permission
        setAddGroupModalOpen(true);
    };

    const openEditGroupModal = (group: ProjectGroup) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setGroupDescription(group.description || "");
        setGroupPermissions(group.permissions);
        setAddGroupModalOpen(true);
    };

    const closeGroupModal = () => {
        setAddGroupModalOpen(false);
    };

    const handleSaveGroup = async () => {
        try {
            if (!groupName.trim()) {
                setSnackbar({
                    open: true,
                    message: "Group name is required",
                    severity: "error"
                });
                return;
            }

            if (groupPermissions === 0) {
                setSnackbar({
                    open: true,
                    message: "Please select at least one permission",
                    severity: "error"
                });
                return;
            }

            if (editingGroup) {
                // Update existing group
                await updateGroup(projectSid, editingGroup.group_id, {
                    name: groupName.trim(),
                    description: groupDescription.trim(),
                    permissions: groupPermissions
                });
                setSnackbar({
                    open: true,
                    message: "Group updated successfully!",
                    severity: "success"
                });
            } else {
                // Create new group
                const newGroup: Omit<ProjectGroup, 'group_id' | 'created_at'> = {
                    name: groupName.trim(),
                    description: groupDescription.trim(),
                    permissions: groupPermissions,
                    group_type: 'custom',
                    is_default: false
                };

                await createGroup(projectSid, newGroup);
                setSnackbar({
                    open: true,
                    message: "Group created successfully!",
                    severity: "success"
                });
            }

            // Close modal and refresh groups
            closeGroupModal();
            fetchGroups();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || `Failed to ${editingGroup ? 'update' : 'create'} group`,
                severity: "error"
            });
        }
    };

    const isDefaultGroup = (group: ProjectGroup) => {
        return group.is_default;
    };

    const handleDeleteGroup = async (groupId: number) => {
        try {
            const group = groups.find(g => g.group_id === groupId);
            if (!group) {
                throw new Error("Group not found");
            }

            if (isDefaultGroup(group)) {
                setSnackbar({
                    open: true,
                    message: "Cannot delete default groups",
                    severity: "error"
                });
                return;
            }

            // Check if group has members
            const hasMembers = members.some(member => member.group_id === groupId);
            if (hasMembers) {
                setSnackbar({
                    open: true,
                    message: "Cannot delete groups with members. Please reassign members first.",
                    severity: "error"
                });
                return;
            }

            await deleteGroup(projectSid, groupId);
            setSnackbar({
                open: true,
                message: "Group deleted successfully!",
                severity: "success"
            });
            fetchGroups();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || "Failed to delete group",
                severity: "error"
            });
        }
    };

    const handleDeleteGroupClick = (groupId: number) => {
        if (window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
            handleDeleteGroup(groupId);
        }
    };

    // Group management handlers
    const handleManageGroupMembers = (groupId: number) => {
        const group = groups.find(g => g.group_id === groupId);
        if (group) {
            setSelectedGroupId(groupId);
            setSelectedGroupName(group.name);
            setGroupMembersDialogOpen(true);
        }
    };

    const handleManageGroupVisibility = (groupId: number) => {
        setSelectedGroupId(groupId);
        // Content visibility management - to be implemented
        console.log('Manage visibility for group:', groupId);
        // TODO: Implement content visibility management UI
    };

    // Render the no-permissions message
    const renderNoPermissionsMessage = () => (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            textAlign: 'center'
        }}>
            <Lock sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
                You don't have permission to manage groups
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Contact the project administrator to request access
            </Typography>
        </Box>
    );

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold mb-4">Project Team & Groups</h2>

            {/* Tabs */}
            <div className="border-b mb-4">
                <div className="flex space-x-4">
                    <button
                        className={`py-2 px-4 font-medium ${activeTab === "members" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setActiveTab("members")}
                    >
                        <div className="flex items-center">
                            <Person className="mr-1" fontSize="small" />
                            Team Members
                        </div>
                    </button>
                    <button
                        className={`py-2 px-4 font-medium ${activeTab === "groups" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setActiveTab("groups")}
                    >
                        <div className="flex items-center">
                            <Group className="mr-1" fontSize="small" />
                            Groups
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === "members" ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Team Members</h3>
                        {canInviteMembers && (
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => setInviteDialogOpen(true)}
                            >
                                Invite Member
                            </Button>
                        )}
                    </div>

                    <List>
                        {members.map((member: ProjectMember) => (
                            <ListItem
                                key={member.user_id}
                                divider
                                secondaryAction={
                                    canManageTeam && (
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={() => onRemoveMember(member.user_id.toString())}
                                        >
                                            <Delete />
                                        </IconButton>
                                    )
                                }
                            >
                                <Avatar
                                    alt={getDisplayName(member)}
                                    src={member.avatar || ""}
                                    sx={{ mr: 2 }}
                                />
                                <ListItemText
                                    primary={getDisplayName(member)}
                                    secondary={
                                        <React.Fragment>
                                            {member.role} • {member.email}
                                            {renderPermissionChips(member.permissions)}
                                        </React.Fragment>
                                    }
                                />

                                {canManageTeam && (
                                    <FormControl sx={{ minWidth: 120, mr: 2 }}>
                                        <Select
                                            size="small"
                                            value={member.group_id?.toString() || ""}
                                            onChange={(e) => onUpdateMemberRole(member.user_id.toString(), Number(e.target.value))}
                                            displayEmpty
                                        >
                                            <MenuItem value="">No Group</MenuItem>
                                            {groups.map((group: ProjectGroup) => (
                                                <MenuItem key={group.group_id} value={group.group_id.toString()}>
                                                    {group.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </ListItem>
                        ))}
                    </List>
                </div>
            ) : (
                <div>
                    {/* Check if user has permission to manage groups */}
                    {canManageTeam ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Project Groups</h3>
                                {hasPermission(userPermissions, PERMISSIONS.MANAGE_GROUP) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<Add />}
                                        onClick={openAddGroupModal}
                                    >
                                        Add Group
                                    </Button>
                                )}
                            </div>

                            {/* Add a floating action button for adding groups that's always visible on mobile */}
                            {hasPermission(userPermissions, PERMISSIONS.MANAGE_GROUP) && (
                                <Fab
                                    color="primary"
                                    aria-label="add group"
                                    onClick={openAddGroupModal}
                                    sx={{
                                        position: 'fixed',
                                        bottom: 24,
                                        right: 24,
                                        display: { xs: 'flex', md: 'none' }
                                    }}
                                >
                                    <Add />
                                </Fab>
                            )}

                            {/* Groups List */}
                            {groups.length === 0 ? (
                                <div className="text-center py-8">
                                    <Group sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No groups created yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Groups help you organize team members and control access to project content.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<Add />}
                                        onClick={openAddGroupModal}
                                        size="large"
                                    >
                                        Create First Group
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {groups.map((group: ProjectGroup) => (
                                        <Paper key={group.group_id} className="p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Typography variant="h6">
                                                        {group.name}
                                                        {isDefaultGroup(group) && (
                                                            <Chip
                                                                size="small"
                                                                label="Default"
                                                                color="primary"
                                                                variant="outlined"
                                                                sx={{ ml: 1 }}
                                                            />
                                                        )}
                                                    </Typography>
                                                    {group.description && (
                                                        <Typography variant="body2" color="textSecondary">
                                                            {group.description}
                                                        </Typography>
                                                    )}
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        size="small"
                                                        startIcon={<Edit />}
                                                        onClick={() => openEditGroupModal(group)}
                                                        disabled={isDefaultGroup(group) || !hasPermission(userPermissions, PERMISSIONS.MANAGE_GROUP)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        startIcon={<PeopleAlt />}
                                                        onClick={() => handleManageGroupMembers(group.group_id)}
                                                        disabled={!hasPermission(userPermissions, PERMISSIONS.MANAGE_TEAM)}
                                                    >
                                                        Members
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        startIcon={<Visibility />}
                                                        onClick={() => handleManageGroupVisibility(group.group_id)}
                                                        disabled={!hasPermission(userPermissions, PERMISSIONS.MANAGE_GROUP)}
                                                    >
                                                        Access
                                                    </Button>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteGroupClick(group.group_id)}
                                                        disabled={isDefaultGroup(group) || !hasPermission(userPermissions, PERMISSIONS.MANAGE_GROUP)}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </Paper>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        // Show message when user doesn't have permission
                        renderNoPermissionsMessage()
                    )}
                </div>
            )}

            {/* Invite Dialog */}
            <Dialog
                open={inviteDialogOpen}
                onClose={() => !inviteSending && setInviteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Invite Member</DialogTitle>
                <DialogContent>
                    <div className="space-y-4 mt-4">
                        <TextField
                            label="Email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            fullWidth
                            disabled={inviteSending}
                        />
                        <FormControl fullWidth disabled={inviteSending}>
                            <InputLabel>Group</InputLabel>
                            <Select
                                value={inviteGroupId ?? ""}
                                onChange={(e) => setInviteGroupId(Number(e.target.value))}
                            >
                                {groups.map((group) => (
                                    <MenuItem
                                        key={group.group_id}
                                        value={group.group_id}
                                    >
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Expiry Date (Optional)"
                            type="date"
                            value={inviteExpiry}
                            onChange={(e) => setInviteExpiry(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            disabled={inviteSending}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialogOpen(false)} disabled={inviteSending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInviteMember}
                        variant="contained"
                        color="primary"
                        disabled={inviteSending || !inviteEmail || !inviteGroupId}
                        startIcon={inviteSending ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {inviteSending ? "Sending..." : "Invite"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Group Modal */}
            <Dialog open={addGroupModalOpen} onClose={closeGroupModal} maxWidth="sm" fullWidth>
                <DialogTitle>{editingGroup ? 'Edit Group' : 'Add New Group'}</DialogTitle>
                <DialogContent>
                    <div className="space-y-4 mt-4">
                        <TextField
                            label="Group Name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Description"
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Describe the purpose of this group"
                        />
                        <Typography variant="subtitle1" className="mt-4">Permissions</Typography>
                        <FormGroup>
                            {Object.entries(PERMISSION_LABELS).map(([value, label]) => (
                                <FormControlLabel
                                    key={value}
                                    control={
                                        <Checkbox
                                            checked={hasPermission(groupPermissions, parseInt(value))}
                                            onChange={(e) => {
                                                const permissionValue = parseInt(value);
                                                setGroupPermissions(prev =>
                                                    e.target.checked
                                                        ? prev | permissionValue
                                                        : prev & ~permissionValue
                                                );
                                            }}
                                        />
                                    }
                                    label={label}
                                />
                            ))}
                        </FormGroup>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeGroupModal}>Cancel</Button>
                    <Button
                        onClick={handleSaveGroup}
                        variant="contained"
                        color="primary"
                        disabled={!groupName.trim() || groupPermissions === 0}
                    >
                        {editingGroup ? 'Save Changes' : 'Create Group'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Group Members Dialog */}
            {groupMembersDialogOpen && selectedGroupId && (
                <GroupMembers
                    open={groupMembersDialogOpen}
                    onClose={() => setGroupMembersDialogOpen(false)}
                    groupId={selectedGroupId}
                    groupName={selectedGroupName}
                    projectId={projectSid}
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default ProjectMembers; 