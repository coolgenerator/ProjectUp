import React from 'react';
import {
    Typography,
    Box,
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Skeleton,
    Chip,
    Divider
} from '@mui/material';
import {
    Assignment,
    Edit,
    PersonAdd,
    Comment,
    Check,
    Schedule,
    AddCircle,
    BarChart
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

// Activity type definitions
type ActivityType =
    | 'milestone_added'
    | 'milestone_completed'
    | 'task_created'
    | 'task_updated'
    | 'task_completed'
    | 'member_joined'
    | 'comment_added'
    | 'project_updated'
    | 'report_generated';

interface ActivityItem {
    id: string;
    type: ActivityType;
    timestamp: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    content: {
        title: string;
        description?: string;
        entityId?: string;
        entityType?: string;
    };
}

interface RecentActivityProps {
    activities: ActivityItem[] | null;
    isLoading: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isLoading }) => {
    // Helper function to get icon for activity type
    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'milestone_added':
                return <Schedule color="primary" />;
            case 'milestone_completed':
                return <Check color="success" />;
            case 'task_created':
                return <AddCircle color="primary" />;
            case 'task_updated':
                return <Edit color="info" />;
            case 'task_completed':
                return <Check color="success" />;
            case 'member_joined':
                return <PersonAdd color="secondary" />;
            case 'comment_added':
                return <Comment color="info" />;
            case 'project_updated':
                return <Edit color="warning" />;
            case 'report_generated':
                return <BarChart color="info" />;
            default:
                return <Assignment />;
        }
    };

    // Helper function to get background color for avatar based on activity type
    const getAvatarColor = (type: ActivityType) => {
        switch (type) {
            case 'milestone_added':
            case 'task_created':
                return '#e3f2fd'; // light blue
            case 'milestone_completed':
            case 'task_completed':
                return '#e8f5e9'; // light green
            case 'task_updated':
            case 'project_updated':
                return '#fff8e1'; // light amber
            case 'member_joined':
                return '#f3e5f5'; // light purple
            case 'comment_added':
                return '#e0f7fa'; // light cyan
            case 'report_generated':
                return '#e8eaf6'; // light indigo
            default:
                return '#eeeeee'; // light grey
        }
    };

    // Helper function to format activity text
    const formatActivityText = (activity: ActivityItem) => {
        return {
            primary: <Typography variant="body2" fontWeight={500}>
                {activity.content.title}
            </Typography>,
            secondary: (
                <React.Fragment>
                    <Typography variant="body2" component="span" color="text.secondary">
                        {activity.content.description && (
                            <Box component="span" display="block" mb={0.5}>
                                {activity.content.description}
                            </Box>
                        )}
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Box component="span" fontSize="0.75rem">
                                {activity.user.name}
                            </Box>
                            •
                            <Box component="span" fontSize="0.75rem">
                                <time dateTime={activity.timestamp} title={format(new Date(activity.timestamp), 'PPpp')}>
                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </time>
                            </Box>
                        </Box>
                    </Typography>
                </React.Fragment>
            )
        };
    };

    // Render activity chip label
    const getActivityTypeLabel = (type: ActivityType) => {
        switch (type) {
            case 'milestone_added': return 'New Milestone';
            case 'milestone_completed': return 'Milestone Complete';
            case 'task_created': return 'New Task';
            case 'task_updated': return 'Task Updated';
            case 'task_completed': return 'Task Complete';
            case 'member_joined': return 'New Member';
            case 'comment_added': return 'Comment';
            case 'project_updated': return 'Project Update';
            case 'report_generated': return 'Report Generated';
            default: return 'Activity';
        }
    };

    // Render loading skeleton
    if (isLoading) {
        return (
            <Paper elevation={0} className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="h6" className="mb-4">Recent Activity</Typography>
                {[1, 2, 3, 4].map((i) => (
                    <Box key={i} sx={{ display: 'flex', mb: 2, width: '100%' }}>
                        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                        <Box sx={{ width: '100%' }}>
                            <Skeleton variant="text" width="70%" height={24} />
                            <Skeleton variant="text" width="40%" height={20} />
                        </Box>
                    </Box>
                ))}
            </Paper>
        );
    }

    return (
        <Paper elevation={0} className="bg-gray-50 p-4 rounded-lg">
            <Typography variant="h6" className="mb-4">Recent Activity</Typography>

            {(!activities || activities.length === 0) ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                        No recent activity to display
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Activities will appear here as your team works on the project
                    </Typography>
                </Box>
            ) : (
                <List sx={{ p: 0 }}>
                    {activities.map((activity, index) => {
                        const { primary, secondary } = formatActivityText(activity);

                        return (
                            <React.Fragment key={activity.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        px: 1,
                                        py: 1.5,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            borderRadius: 1
                                        }
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar
                                            sx={{
                                                bgcolor: getAvatarColor(activity.type),
                                                color: 'primary.main'
                                            }}
                                        >
                                            {getActivityIcon(activity.type)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                                {primary}
                                                <Chip
                                                    label={getActivityTypeLabel(activity.type)}
                                                    size="small"
                                                    sx={{
                                                        height: '20px',
                                                        fontSize: '0.7rem',
                                                        ml: 1,
                                                        fontWeight: 500
                                                    }}
                                                />
                                            </Box>
                                        }
                                        secondary={secondary}
                                    />
                                </ListItem>
                                {index < activities.length - 1 && (
                                    <Divider component="li" sx={{ ml: 7 }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </List>
            )}
        </Paper>
    );
};

export default RecentActivity; 