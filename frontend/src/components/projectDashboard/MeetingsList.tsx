import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Meeting,
    getProjectMeetings,
    deleteMeeting,
    formatMeetingTime,
    getMeetingTimeStatus,
} from '../../services/meetingService';
import { Calendar, Clock, MapPin, Video, Users, Plus, Edit2, Trash2, ExternalLink, Share2 } from 'lucide-react';
import CreatePendingMeetingDialog from './CreatePendingMeetingDialog';
import ScheduleMeetingDialog from './ScheduleMeetingDialog';

interface MeetingsListProps {
    projectId: number;
    projectMembers?: Array<{ id: number; username: string; email: string }>;
}

const MeetingsList: React.FC<MeetingsListProps> = ({ projectId, projectMembers = [] }) => {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [scheduleAvailabilityMeeting, setScheduleAvailabilityMeeting] = useState<Meeting | null>(null);

    // Load meetings
    const loadMeetings = async () => {
        try {
            setLoading(true);
            const fetchedMeetings = await getProjectMeetings(projectId);
            setMeetings(fetchedMeetings);
        } catch (error: any) {
            console.error('Failed to load meetings:', error);
            toast.error('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMeetings();
    }, [projectId]);

    const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
        if (!window.confirm(`Are you sure you want to delete "${meetingTitle}"?`)) {
            return;
        }

        try {
            await deleteMeeting(meetingId);
            toast.success('Meeting deleted successfully');
            loadMeetings();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete meeting');
        }
    };

    const handleShareAvailability = (meeting: Meeting) => {
        setScheduleAvailabilityMeeting(meeting);
    };

    const handleCloseDialog = () => {
        setIsCreateDialogOpen(false);
    };

    const handleCloseScheduleDialog = () => {
        setScheduleAvailabilityMeeting(null);
    };

    const handleMeetingCreated = () => {
        loadMeetings();
        handleCloseDialog();
    };

    const handleAvailabilityShared = () => {
        loadMeetings();
        handleCloseScheduleDialog();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'scheduled':
                return 'bg-blue-100 text-blue-700';
            case 'in_progress':
                return 'bg-green-100 text-green-700';
            case 'completed':
                return 'bg-gray-100 text-gray-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getTimeStatusColor = (timeStatus: string) => {
        switch (timeStatus) {
            case 'upcoming':
                return 'border-blue-300 bg-blue-50';
            case 'ongoing':
                return 'border-green-300 bg-green-50';
            case 'past':
                return 'border-gray-300 bg-gray-50';
            default:
                return 'border-gray-300 bg-white';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900">Project Meetings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Schedule and manage meetings with your team
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    Schedule Meeting
                </button>
            </div>

            {/* Meetings List */}
            {meetings.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        No meetings scheduled
                    </h4>
                    <p className="text-gray-600 mb-6">
                        Start by scheduling your first team meeting
                    </p>
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                        Schedule Meeting
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {meetings.map((meeting) => {
                        const isPending = meeting.status === 'pending';
                        const timeStatus = !isPending ? getMeetingTimeStatus(meeting.start_time, meeting.end_time) : null;
                        return (
                            <div
                                key={meeting.id}
                                className={`bg-white rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                                    isPending ? 'border-yellow-300 bg-yellow-50' : timeStatus ? getTimeStatusColor(timeStatus) : 'border-gray-300 bg-white'
                                }`}
                            >
                                {/* Meeting Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <Calendar className={`w-5 h-5 mt-1 ${isPending ? 'text-yellow-600' : 'text-indigo-600'}`} />
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    {meeting.title}
                                                </h4>
                                                {meeting.description && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {meeting.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                                            {meeting.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete meeting"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Pending Meeting Info or Meeting Details */}
                                {isPending ? (
                                    <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-200">
                                        <p className="text-sm text-gray-700 mb-3">
                                            <strong>Waiting for availability:</strong> All attendees need to share their availability before the meeting time can be finalized.
                                        </p>
                                        <button
                                            onClick={() => handleShareAvailability(meeting)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                                        >
                                            <Share2 className="w-4 h-4" />
                                            Share Your Availability
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span>{formatMeetingTime(meeting.start_time, meeting.end_time)}</span>
                                        </div>

                                        {meeting.location && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                <span>{meeting.location}</span>
                                            </div>
                                        )}

                                        {meeting.meeting_url && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Video className="w-4 h-4 text-gray-500" />
                                                <a
                                                    href={meeting.meeting_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                                >
                                                    Join Meeting
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Attendees */}
                                {meeting.attendee_details && meeting.attendee_details.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Users className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">
                                                Attendees ({meeting.attendee_details.length})
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {meeting.attendee_details.map((attendee) => (
                                                <div
                                                    key={attendee.user_id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                                                    title={`${attendee.email} - ${attendee.status}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                                        {attendee.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-gray-700">{attendee.username}</span>
                                                    {!isPending && (
                                                        <span
                                                            className={`text-xs px-2 py-0.5 rounded-full ${
                                                                attendee.status === 'accepted'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : attendee.status === 'declined'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : attendee.status === 'tentative'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            {attendee.status}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Pending Meeting Dialog */}
            {isCreateDialogOpen && (
                <CreatePendingMeetingDialog
                    projectId={projectId}
                    projectMembers={projectMembers}
                    onClose={handleCloseDialog}
                    onSuccess={handleMeetingCreated}
                />
            )}

            {/* Schedule Availability Dialog */}
            {scheduleAvailabilityMeeting && (
                <ScheduleMeetingDialog
                    meeting={scheduleAvailabilityMeeting}
                    onClose={handleCloseScheduleDialog}
                    onSuccess={handleAvailabilityShared}
                />
            )}
        </div>
    );
};

export default MeetingsList;
