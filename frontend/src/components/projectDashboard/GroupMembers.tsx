import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Divider,
    Chip,
    Alert
} from '@mui/material';
import {
    Close as CloseIcon,
    People as PeopleIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import fetchWithAuth from '../../hooks/fetchWithAuth';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface GroupMembersProps {
    open: boolean;
    onClose: () => void;
    groupId: number;
    groupName: string;
    projectId: string;
}

const GroupMembers: React.FC<GroupMembersProps> = ({
    open,
    onClose,
    groupId,
    groupName,
    projectId
}) => {
    const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
    const [groupMembers, setGroupMembers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Load all team members and current group members
    useEffect(() => {
        if (open && groupId) {
            fetchData();
        }
    }, [open, groupId, projectId]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Backend endpoints for group member management are not yet implemented
            setError('Group member management is not yet available. Backend API endpoints are still in development.');
            setAllMembers([]);
            setGroupMembers([]);

        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load members. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleMember = (memberId: string) => {
        setGroupMembers(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId);
            } else {
                return [...prev, memberId];
            }
        });
    };

    const handleSelectAll = () => {
        setGroupMembers(allMembers.map(member => member.id));
    };

    const handleSelectNone = () => {
        setGroupMembers([]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Backend endpoint not yet implemented
            setError('Group member management is not yet available. Backend API endpoints are still in development.');
            setIsSaving(false);
            return;

            const response = await fetchWithAuth(`/projects/${projectId}/groups/${groupId}/members`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    member_ids: groupMembers
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update group members');
            }

            setSuccess('Group members updated successfully');
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error saving group members:', error);
            setError('Failed to save group members. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={isSaving ? undefined : onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                        <PeopleIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Manage Group Members</Typography>
                    </Box>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="close"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
                )}

                <Typography variant="subtitle1" gutterBottom>
                    Group: <strong>{groupName}</strong>
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                    Select which team members should be part of this group. Members of a group can access content that is visible to the group.
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">
                        Project Members ({allMembers.length})
                    </Typography>

                    <Box>
                        <Button
                            size="small"
                            onClick={handleSelectAll}
                            disabled={isLoading || isSaving || allMembers.length === 0}
                        >
                            Select All
                        </Button>
                        <Button
                            size="small"
                            onClick={handleSelectNone}
                            disabled={isLoading || isSaving || groupMembers.length === 0}
                        >
                            Select None
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {isLoading ? (
                    <Box display="flex" justifyContent="center" py={3}>
                        <CircularProgress size={32} />
                    </Box>
                ) : allMembers.length === 0 ? (
                    <Alert severity="info">
                        No team members available in this project.
                    </Alert>
                ) : (
                    <List>
                        {allMembers.map((member) => (
                            <ListItem
                                key={member.id}
                                dense
                                sx={{
                                    p: 0.5,
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupMembers.includes(member.id)}
                                            onChange={() => handleToggleMember(member.id)}
                                            disabled={isSaving}
                                        />
                                    }
                                    label={
                                        <Box display="flex" alignItems="center">
                                            <ListItemAvatar>
                                                <Avatar
                                                    src={member.avatar}
                                                    alt={member.name.charAt(0).toUpperCase()}
                                                >
                                                    {!member.avatar && member.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={member.name}
                                                secondary={member.email}
                                            />
                                        </Box>
                                    }
                                    sx={{ width: '100%' }}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}

                {groupMembers.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="body2" gutterBottom>
                            Selected Members ({groupMembers.length}):
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {groupMembers.map(memberId => {
                                const member = allMembers.find(m => m.id === memberId);
                                return member ? (
                                    <Chip
                                        key={memberId}
                                        label={member.name}
                                        size="small"
                                        avatar={
                                            <Avatar src={member.avatar}>
                                                {!member.avatar && member.name.charAt(0).toUpperCase()}
                                            </Avatar>
                                        }
                                        onDelete={() => handleToggleMember(memberId)}
                                        disabled={isSaving}
                                    />
                                ) : null;
                            })}
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button
                    color="inherit"
                    onClick={onClose}
                    disabled={isSaving}
                    startIcon={<CloseIcon />}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GroupMembers; 