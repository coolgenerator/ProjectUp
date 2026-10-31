import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Calendar, Clock, MapPin, Video, Users, Plus, Minus } from 'lucide-react';
import {
    Meeting,
    CreateMeetingRequest,
    createMeeting,
    updateMeeting,
} from '../../services/meetingService';

interface CreateMeetingDialogProps {
    projectId: number;
    projectMembers?: Array<{ id: number; username: string; email: string }>;
    existingMeeting?: Meeting | null;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateMeetingDialog: React.FC<CreateMeetingDialogProps> = ({
    projectId,
    projectMembers = [],
    existingMeeting,
    onClose,
    onSuccess,
}) => {
    const isEditing = !!existingMeeting;

    // Form state
    const [title, setTitle] = useState(existingMeeting?.title || '');
    const [description, setDescription] = useState(existingMeeting?.description || '');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState(existingMeeting?.location || '');
    const [meetingUrl, setMeetingUrl] = useState(existingMeeting?.meeting_url || '');
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form with existing meeting data
    useEffect(() => {
        if (existingMeeting) {
            const start = new Date(existingMeeting.start_time);
            const end = new Date(existingMeeting.end_time);

            setStartDate(start.toISOString().split('T')[0]);
            setStartTime(start.toTimeString().slice(0, 5));
            setEndDate(end.toISOString().split('T')[0]);
            setEndTime(end.toTimeString().slice(0, 5));

            if (existingMeeting.attendee_details) {
                setSelectedAttendeeIds(existingMeeting.attendee_details.map(a => a.user_id));
            }
        } else {
            // Set default start time to now + 1 hour
            const now = new Date();
            const startDefault = new Date(now.getTime() + 60 * 60 * 1000);
            const endDefault = new Date(startDefault.getTime() + 60 * 60 * 1000);

            setStartDate(startDefault.toISOString().split('T')[0]);
            setStartTime(startDefault.toTimeString().slice(0, 5));
            setEndDate(endDefault.toISOString().split('T')[0]);
            setEndTime(endDefault.toTimeString().slice(0, 5));
        }
    }, [existingMeeting]);

    const handleToggleAttendee = (userId: number) => {
        setSelectedAttendeeIds(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleSelectAllAttendees = () => {
        setSelectedAttendeeIds(projectMembers.map(m => m.id));
    };

    const handleClearAllAttendees = () => {
        setSelectedAttendeeIds([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error('Please enter a meeting title');
            return;
        }

        if (!startDate || !startTime || !endDate || !endTime) {
            toast.error('Please select start and end times');
            return;
        }

        // Combine date and time into ISO strings
        const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
        const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

        // Validate times
        if (new Date(endDateTime) <= new Date(startDateTime)) {
            toast.error('End time must be after start time');
            return;
        }

        try {
            setSubmitting(true);

            if (isEditing && existingMeeting) {
                // Update existing meeting
                await updateMeeting(existingMeeting.id, {
                    title,
                    description: description || undefined,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    location: location || undefined,
                    meeting_url: meetingUrl || undefined,
                    attendee_ids: selectedAttendeeIds.length > 0 ? selectedAttendeeIds : undefined,
                });
                toast.success('Meeting updated successfully');
            } else {
                // Create new meeting
                const meetingData: CreateMeetingRequest = {
                    project_id: projectId,
                    title,
                    description: description || undefined,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    location: location || undefined,
                    meeting_url: meetingUrl || undefined,
                    attendee_ids: selectedAttendeeIds.length > 0 ? selectedAttendeeIds : undefined,
                };

                await createMeeting(meetingData);
                toast.success('Meeting created successfully');
            }

            onSuccess();
        } catch (error: any) {
            toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} meeting`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Edit Meeting' : 'Schedule New Meeting'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Meeting Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., Sprint Planning Meeting"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Add meeting details, agenda, or notes..."
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Start Date *
                                </div>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Start Time *
                                </div>
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    End Date *
                                </div>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    End Time *
                                </div>
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Location
                            </div>
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., Conference Room A or Remote"
                        />
                    </div>

                    {/* Meeting URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <div className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Meeting URL
                            </div>
                        </label>
                        <input
                            type="url"
                            value={meetingUrl}
                            onChange={(e) => setMeetingUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., https://zoom.us/j/123456789"
                        />
                    </div>

                    {/* Attendees */}
                    {projectMembers.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Invite Attendees
                                    </div>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllAttendees}
                                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                        type="button"
                                        onClick={handleClearAllAttendees}
                                        className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                                <div className="space-y-2">
                                    {projectMembers.map((member) => (
                                        <label
                                            key={member.id}
                                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAttendeeIds.includes(member.id)}
                                                onChange={() => handleToggleAttendee(member.id)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                                                {member.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {member.username}
                                                </div>
                                                <div className="text-xs text-gray-500">{member.email}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {selectedAttendeeIds.length} attendee(s) selected
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${
                                submitting
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                            }`}
                        >
                            {submitting
                                ? 'Saving...'
                                : isEditing
                                ? 'Update Meeting'
                                : 'Schedule Meeting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateMeetingDialog;
