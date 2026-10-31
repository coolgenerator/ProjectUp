import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    IconButton,
    Typography,
    Paper,
    Chip,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Edit,
    Delete,
    Add,
    Group as GroupIcon,
    PeopleAlt,
} from '@mui/icons-material';
import {
    Workspace,
    getUserWorkspaces,
    createChildWorkspace,
    updateWorkspace,
    deleteWorkspace,
} from '../../services/workspaceService';

interface WorkspaceManagementProps {
    projectSid: string;
    onWorkspaceSelect?: (workspaceId: number) => void;
}

const WORKSPACE_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#EC4899', // Pink
];

const WORKSPACE_ICONS = ['💻', '📢', '⚙️', '🎨', '📊', '🔧', '📱', '🌐', '💼', '🎯'];

const WorkspaceManagement: React.FC<WorkspaceManagementProps> = ({
    projectSid,
    onWorkspaceSelect,
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [mainWorkspace, setMainWorkspace] = useState<Workspace | null>(null);
    const [isInMain, setIsInMain] = useState(false);
    const [loading, setLoading] = useState(false);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

    // Form fields
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDescription, setWorkspaceDescription] = useState('');
    const [workspaceType, setWorkspaceType] = useState<'team' | 'department'>('team');
    const [workspaceColor, setWorkspaceColor] = useState(WORKSPACE_COLORS[0]);
    const [workspaceIcon, setWorkspaceIcon] = useState(WORKSPACE_ICONS[0]);

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
        fetchWorkspaces();
    }, [projectSid]);

    const fetchWorkspaces = async () => {
        try {
            setLoading(true);
            const data = await getUserWorkspaces(projectSid);
            setWorkspaces(data.workspaces || []);
            setMainWorkspace(data.main_workspace);
            setIsInMain(data.is_in_main);
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
            showSnackbar('Failed to fetch workspaces', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const openCreateDialog = () => {
        setEditingWorkspace(null);
        setWorkspaceName('');
        setWorkspaceDescription('');
        setWorkspaceType('team');
        setWorkspaceColor(WORKSPACE_COLORS[0]);
        setWorkspaceIcon(WORKSPACE_ICONS[0]);
        setDialogOpen(true);
    };

    const openEditDialog = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
        setWorkspaceName(workspace.name);
        setWorkspaceDescription(workspace.description || '');
        setWorkspaceType(workspace.workspace_type as 'team' | 'department');
        setWorkspaceColor(workspace.color || WORKSPACE_COLORS[0]);
        setWorkspaceIcon(workspace.icon || WORKSPACE_ICONS[0]);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingWorkspace(null);
    };

    const handleSave = async () => {
        if (!workspaceName.trim()) {
            showSnackbar('Workspace name is required', 'error');
            return;
        }

        try {
            if (editingWorkspace) {
                // Update existing workspace
                await updateWorkspace(projectSid, editingWorkspace.group_id, {
                    name: workspaceName,
                    description: workspaceDescription,
                    color: workspaceColor,
                    icon: workspaceIcon,
                });
                showSnackbar('Workspace updated successfully!', 'success');
            } else {
                // Create new workspace (as child of main)
                if (!mainWorkspace) {
                    showSnackbar('Main workspace not found', 'error');
                    return;
                }

                await createChildWorkspace(projectSid, mainWorkspace.group_id, {
                    name: workspaceName,
                    description: workspaceDescription,
                    workspace_type: workspaceType,
                    color: workspaceColor,
                    icon: workspaceIcon,
                });
                showSnackbar('Workspace created successfully!', 'success');
            }

            closeDialog();
            fetchWorkspaces();
        } catch (error: any) {
            showSnackbar(error.response?.data?.error || 'Failed to save workspace', 'error');
        }
    };

    const handleDelete = async (workspace: Workspace) => {
        if (workspace.is_main) {
            showSnackbar('Cannot delete main workspace', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteWorkspace(projectSid, workspace.group_id);
            showSnackbar('Workspace deleted successfully!', 'success');
            fetchWorkspaces();
        } catch (error: any) {
            showSnackbar(
                error.response?.data?.error || 'Failed to delete workspace',
                'error'
            );
        }
    };

    const childWorkspaces = workspaces.filter((w) => !w.is_main);

    // Check if user can manage workspaces (must be in main workspace)
    const canManageWorkspaces = isInMain;

    if (!canManageWorkspaces) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    You don't have permission to manage workspaces
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Only Main workspace members can create and manage team workspaces
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Team Workspaces</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={openCreateDialog}
                >
                    Create Workspace
                </Button>
            </Box>

            {/* Main Workspace Display */}
            {mainWorkspace && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0f9ff', borderLeft: `4px solid ${mainWorkspace.color}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 32, mr: 2 }}>{mainWorkspace.icon || '🎯'}</Typography>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{mainWorkspace.name}</Typography>
                                <Chip label="MAIN" size="small" color="primary" />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {mainWorkspace.description || 'Project leadership and overview workspace'}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            startIcon={<PeopleAlt />}
                            onClick={() => onWorkspaceSelect?.(mainWorkspace.group_id)}
                        >
                            Manage Members
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Child Workspaces List */}
            {childWorkspaces.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No team workspaces yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Create team workspaces to organize your project members into groups like
                        Development, Marketing, Operations, etc.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={openCreateDialog}
                        size="large"
                    >
                        Create First Workspace
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {childWorkspaces.map((workspace) => (
                        <Paper
                            key={workspace.group_id}
                            sx={{
                                p: 2,
                                borderLeft: `4px solid ${workspace.color || '#6B7280'}`,
                                transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: 3 },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{ fontSize: 28, mr: 2 }}>
                                    {workspace.icon || '📁'}
                                </Typography>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6">{workspace.name}</Typography>
                                        <Chip
                                            label={workspace.workspace_type.toUpperCase()}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                    {workspace.description && (
                                        <Typography variant="body2" color="text.secondary">
                                            {workspace.description}
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        startIcon={<PeopleAlt />}
                                        onClick={() => onWorkspaceSelect?.(workspace.group_id)}
                                    >
                                        Members
                                    </Button>
                                    <IconButton
                                        size="small"
                                        onClick={() => openEditDialog(workspace)}
                                    >
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(workspace)}
                                        color="error"
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField
                            label="Workspace Name"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            fullWidth
                            required
                            placeholder="e.g., Development, Marketing, Operations"
                        />

                        <TextField
                            label="Description"
                            value={workspaceDescription}
                            onChange={(e) => setWorkspaceDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Describe the purpose of this workspace"
                        />

                        {!editingWorkspace && (
                            <FormControl fullWidth>
                                <InputLabel>Workspace Type</InputLabel>
                                <Select
                                    value={workspaceType}
                                    onChange={(e) => setWorkspaceType(e.target.value as 'team' | 'department')}
                                    label="Workspace Type"
                                >
                                    <MenuItem value="team">Team</MenuItem>
                                    <MenuItem value="department">Department</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        {/* Icon Selector */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Icon
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {WORKSPACE_ICONS.map((icon) => (
                                    <Button
                                        key={icon}
                                        variant={workspaceIcon === icon ? 'contained' : 'outlined'}
                                        onClick={() => setWorkspaceIcon(icon)}
                                        sx={{
                                            minWidth: 48,
                                            height: 48,
                                            fontSize: 24,
                                            p: 0,
                                        }}
                                    >
                                        {icon}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        {/* Color Selector */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Color
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {WORKSPACE_COLORS.map((color) => (
                                    <Button
                                        key={color}
                                        variant="outlined"
                                        onClick={() => setWorkspaceColor(color)}
                                        sx={{
                                            minWidth: 48,
                                            height: 48,
                                            bgcolor: color,
                                            border: workspaceColor === color ? 3 : 1,
                                            borderColor: workspaceColor === color ? 'primary.main' : 'divider',
                                            '&:hover': {
                                                bgcolor: color,
                                                opacity: 0.8,
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        color="primary"
                        disabled={!workspaceName.trim()}
                    >
                        {editingWorkspace ? 'Save Changes' : 'Create Workspace'}
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
        </Box>
    );
};

export default WorkspaceManagement;
