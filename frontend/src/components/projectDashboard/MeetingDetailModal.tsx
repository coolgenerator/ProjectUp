import React from 'react';
import { X, Calendar, Clock, MapPin, Video, Users, ExternalLink } from 'lucide-react';
import { Meeting, formatMeetingTime } from '../../services/meetingService';

interface MeetingDetailModalProps {
    meeting: Meeting;
    onClose: () => void;
}

const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({ meeting, onClose }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
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

    const getAttendeeStatusColor = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'bg-green-100 text-green-700';
            case 'declined':
                return 'bg-red-100 text-red-700';
            case 'tentative':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-200 text-gray-600';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                            {meeting.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    {meeting.description && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{meeting.description}</p>
                        </div>
                    )}

                    {/* Time */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Meeting Time</div>
                            <div className="text-gray-900 font-medium">
                                {formatMeetingTime(meeting.start_time, meeting.end_time)}
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    {meeting.location && (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <MapPin className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-700">Location</div>
                                <div className="text-sm text-gray-600">{meeting.location}</div>
                            </div>
                        </div>
                    )}

                    {/* Meeting URL */}
                    {meeting.meeting_url && (
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Video className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-700 mb-1">Video Conference</div>
                                <a
                                    href={meeting.meeting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 text-sm"
                                >
                                    Join Meeting
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Attendees */}
                    {meeting.attendee_details && meeting.attendee_details.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-700">
                                    Attendees ({meeting.attendee_details.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {meeting.attendee_details.map((attendee) => (
                                    <div
                                        key={attendee.user_id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                {attendee.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {attendee.username}
                                                </div>
                                                <div className="text-xs text-gray-500">{attendee.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAttendeeStatusColor(attendee.status)}`}>
                                                {attendee.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Attendance Summary */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-4 gap-4 text-center text-xs">
                                    <div>
                                        <div className="font-medium text-gray-500">Accepted</div>
                                        <div className="text-green-600 font-bold">
                                            {meeting.attendee_details.filter(a => a.status === 'accepted').length}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-500">Declined</div>
                                        <div className="text-red-600 font-bold">
                                            {meeting.attendee_details.filter(a => a.status === 'declined').length}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-500">Tentative</div>
                                        <div className="text-yellow-600 font-bold">
                                            {meeting.attendee_details.filter(a => a.status === 'tentative').length}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-500">Pending</div>
                                        <div className="text-gray-600 font-bold">
                                            {meeting.attendee_details.filter(a => a.status === 'invited').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>
                                <div className="font-medium">Created</div>
                                <div>{new Date(meeting.created_at).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="font-medium">Updated</div>
                                <div>{new Date(meeting.updated_at).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                {meeting.meeting_url && (
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
                        <a
                            href={meeting.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
                        >
                            <Video className="w-5 h-5" />
                            Join Video Call
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingDetailModal;
