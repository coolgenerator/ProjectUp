import React, { useState } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Chip,
    Avatar,
    AvatarGroup,
    LinearProgress,
    Tab,
    Tabs,
    IconButton,
    Menu,
    MenuItem
} from '@mui/material';
import {
    Dashboard,
    People,
    Assignment,
    School,
    TrendingUp,
    Settings,
    Add,
    MoreVert,
    Group,
    Folder,
    CheckCircle,
    Schedule,
    Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const OrganizationDashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    // Mock data - replace with API calls
    const stats = {
        totalUsers: 156,
        activeProjects: 12,
        completedProjects: 45,
        totalDepartments: 8
    };

    const recentProjects = [
        { id: 1, name: 'Senior Capstone 2024', status: 'active', progress: 75, members: 24 },
        { id: 2, name: 'AI Research Initiative', status: 'active', progress: 40, members: 12 },
        { id: 3, name: 'Campus Sustainability', status: 'completed', progress: 100, members: 18 },
        { id: 4, name: 'Mobile App Development', status: 'active', progress: 60, members: 8 }
    ];

    const departments = [
        { name: 'Computer Science', projects: 15, members: 45 },
        { name: 'Engineering', projects: 12, members: 38 },
        { name: 'Business', projects: 8, members: 28 },
        { name: 'Design', projects: 10, members: 22 }
    ];

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Organization Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage your organization's projects, users, and departments
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <People color="primary" sx={{ mr: 2 }} />
                                <Typography color="text.secondary" variant="body2">
                                    Total Users
                                </Typography>
                            </Box>
                            <Typography variant="h4">{stats.totalUsers}</Typography>
                            <Typography variant="body2" color="success.main">
                                +12% from last month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Assignment color="primary" sx={{ mr: 2 }} />
                                <Typography color="text.secondary" variant="body2">
                                    Active Projects
                                </Typography>
                            </Box>
                            <Typography variant="h4">{stats.activeProjects}</Typography>
                            <Typography variant="body2" color="info.main">
                                3 starting this week
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircle color="success" sx={{ mr: 2 }} />
                                <Typography color="text.secondary" variant="body2">
                                    Completed
                                </Typography>
                            </Box>
                            <Typography variant="h4">{stats.completedProjects}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                This semester
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <School color="primary" sx={{ mr: 2 }} />
                                <Typography color="text.secondary" variant="body2">
                                    Departments
                                </Typography>
                            </Box>
                            <Typography variant="h4">{stats.totalDepartments}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                All active
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content */}
            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                    <Tab label="Projects" icon={<Assignment />} iconPosition="start" />
                    <Tab label="Departments" icon={<School />} iconPosition="start" />
                    <Tab label="Users" icon={<People />} iconPosition="start" />
                    <Tab label="Analytics" icon={<TrendingUp />} iconPosition="start" />
                </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Recent Projects</Typography>
                    <Button variant="contained" startIcon={<Add />}>
                        New Project
                    </Button>
                </Box>
                <Grid container spacing={3}>
                    {recentProjects.map((project) => (
                        <Grid item xs={12} md={6} key={project.id}>
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6">{project.name}</Typography>
                                        <Chip
                                            label={project.status}
                                            size="small"
                                            color={project.status === 'active' ? 'primary' : 'success'}
                                            sx={{ mt: 1 }}
                                        />
                                    </Box>
                                    <IconButton onClick={handleMenuClick}>
                                        <MoreVert />
                                    </IconButton>
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Progress
                                        </Typography>
                                        <Typography variant="body2">
                                            {project.progress}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={project.progress} />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <AvatarGroup max={4}>
                                        {[...Array(Math.min(project.members, 4))].map((_, i) => (
                                            <Avatar key={i} sx={{ width: 32, height: 32 }}>
                                                {i + 1}
                                            </Avatar>
                                        ))}
                                    </AvatarGroup>
                                    <Typography variant="body2" color="text.secondary">
                                        {project.members} members
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Departments</Typography>
                    <Button variant="outlined" startIcon={<Add />}>
                        Add Department
                    </Button>
                </Box>
                <Grid container spacing={3}>
                    {departments.map((dept, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <School color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6">{dept.name}</Typography>
                                    </Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Projects
                                        </Typography>
                                        <Typography variant="body2">{dept.projects}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Members
                                        </Typography>
                                        <Typography variant="body2">{dept.members}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                    User Management
                </Typography>
                <Typography color="text.secondary">
                    User management features coming soon...
                </Typography>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                    Analytics & Reports
                </Typography>
                <Typography color="text.secondary">
                    Analytics dashboard coming soon...
                </Typography>
            </TabPanel>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
                <MenuItem onClick={handleMenuClose}>Edit Project</MenuItem>
                <MenuItem onClick={handleMenuClose}>Manage Members</MenuItem>
                <Divider />
                <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                    Archive Project
                </MenuItem>
            </Menu>
        </Container>
    );
};

export default OrganizationDashboard;