import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Chip,
    Alert,
    Snackbar,
    TextField,
    Autocomplete,
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import {
    WorkspaceMember,
    getWorkspaceMembers,
    addWorkspaceMember,
    updateMemberRole,
    removeMemberFromWorkspace,
} from '../../services/workspaceService';
import { ProjectMember } from '../../types/project/projectMember';

interface WorkspaceMembersProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    workspaceName: string;
    projectSid: string;
    projectMembers: ProjectMember[]; // All project members for selection
}

const WorkspaceMembers: React.FC<WorkspaceMembersProps> = ({
    open,
    onClose,
    workspaceId,
    workspaceName,
    projectSid,
    projectMembers,
}) => {
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [loading, setLoading] = useState(false);

    // Add member state
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ProjectMember | null>(null);
    const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member');

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
        if (open) {
            fetchMembers();
        }
    }, [open, workspaceId]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const data = await getWorkspaceMembers(projectSid, workspaceId);
            setMembers(data);
        } catch (error) {
            console.error('Failed to fetch workspace members:', error);
            showSnackbar('Failed to fetch members', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleAddMember = async () => {
        if (!selectedUser) {
            showSnackbar('Please select a user', 'error');
            return;
        }

        try {
            await addWorkspaceMember(projectSid, workspaceId, {
                user_id: selectedUser.user_id,
                role: selectedRole,
            });
            showSnackbar('Member added successfully!', 'success');
            setAddMemberOpen(false);
            setSelectedUser(null);
            setSelectedRole('member');
            fetchMembers();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to add member',
                'error'
            );
        }
    };

    const handleRoleChange = async (userId: number, newRole: 'admin' | 'member' | 'viewer') => {
        try {
            await updateMemberRole(projectSid, workspaceId, userId, newRole);
            showSnackbar('Role updated successfully!', 'success');
            fetchMembers();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to update role',
                'error'
            );
        }
    };

    const handleRemoveMember = async (userId: number, userName: string) => {
        if (!window.confirm(`Are you sure you want to remove ${userName} from this workspace?`)) {
            return;
        }

        try {
            await removeMemberFromWorkspace(projectSid, workspaceId, userId);
            showSnackbar('Member removed successfully!', 'success');
            fetchMembers();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to remove member',
                'error'
            );
        }
    };

    // Filter out members who are already in the workspace
    const availableUsers = projectMembers.filter(
        (pm) => !members.some((m) => m.user_id === pm.user_id)
    );

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'error';
            case 'member':
                return 'primary';
            case 'viewer':
                return 'default';
            default:
                return 'default';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin':
                return '👑 Admin';
            case 'member':
                return '✏️ Member';
            case 'viewer':
                return '👁️ Viewer';
            default:
                return role;
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                            {workspaceName} - Members
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PersonAdd />}
                            onClick={() => setAddMemberOpen(true)}
                        >
                            Add Member
                        </Button>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Typography>Loading members...</Typography>
                        </Box>
                    ) : members.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                No members in this workspace yet
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<PersonAdd />}
                                onClick={() => setAddMemberOpen(true)}
                                sx={{ mt: 2 }}
                            >
                                Add First Member
                            </Button>
                        </Box>
                    ) : (
                        <List>
                            {members.map((member) => (
                                <ListItem
                                    key={member.user_id}
                                    divider
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <Select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        handleRoleChange(
                                                            member.user_id,
                                                            e.target.value as 'admin' | 'member' | 'viewer'
                                                        )
                                                    }
                                                >
                                                    <MenuItem value="admin">👑 Admin</MenuItem>
                                                    <MenuItem value="member">✏️ Member</MenuItem>
                                                    <MenuItem value="viewer">👁️ Viewer</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <IconButton
                                                edge="end"
                                                onClick={() =>
                                                    handleRemoveMember(
                                                        member.user_id,
                                                        `${member.first_name} ${member.last_name}`
                                                    )
                                                }
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar src={member.avatar} alt={member.first_name}>
                                            {member.first_name?.charAt(0)}
                                            {member.last_name?.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">
                                                    {member.first_name} {member.last_name}
                                                </Typography>
                                                <Chip
                                                    label={getRoleLabel(member.role)}
                                                    size="small"
                                                    color={getRoleColor(member.role)}
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                {member.email}
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {/* Role Descriptions */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="caption" display="block" gutterBottom>
                            <strong>Role Permissions:</strong>
                        </Typography>
                        <Typography variant="caption" display="block">
                            👑 <strong>Admin:</strong> Can manage workspace settings and members
                        </Typography>
                        <Typography variant="caption" display="block">
                            ✏️ <strong>Member:</strong> Can view and edit workspace content
                        </Typography>
                        <Typography variant="caption" display="block">
                            👁️ <strong>Viewer:</strong> Can only view workspace content
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Add Member Dialog */}
            <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Member to Workspace</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <Autocomplete
                            options={availableUsers}
                            getOptionLabel={(option) =>
                                `${option.first_name} ${option.last_name} (${option.email})`
                            }
                            value={selectedUser}
                            onChange={(_, newValue) => setSelectedUser(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} label="Select User" required />
                            )}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Avatar
                                        src={option.avatar}
                                        sx={{ width: 32, height: 32, mr: 2 }}
                                    >
                                        {option.first_name?.charAt(0)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2">
                                            {option.first_name} {option.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.email}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={selectedRole}
                                onChange={(e) =>
                                    setSelectedRole(e.target.value as 'admin' | 'member' | 'viewer')
                                }
                                label="Role"
                            >
                                <MenuItem value="admin">👑 Admin - Full control</MenuItem>
                                <MenuItem value="member">✏️ Member - Can edit content</MenuItem>
                                <MenuItem value="viewer">👁️ Viewer - Read only</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddMember}
                        variant="contained"
                        color="primary"
                        disabled={!selectedUser}
                    >
                        Add Member
                    </Button>
                </DialogActions>
            </Dialog>

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
        </>
    );
};

export default WorkspaceMembers;
