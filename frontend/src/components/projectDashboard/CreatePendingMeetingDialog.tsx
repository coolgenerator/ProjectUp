import React, { useState } from 'react';
import { X, Users, FileText } from 'lucide-react';
import { createMeeting, CreateMeetingRequest } from '../../services/meetingService';

interface ProjectMember {
    id: number;
    username: string;
    email: string;
}

interface CreatePendingMeetingDialogProps {
    projectId: number;
    projectMembers: ProjectMember[];
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePendingMeetingDialog: React.FC<CreatePendingMeetingDialogProps> = ({
    projectId,
    projectMembers,
    onClose,
    onSuccess,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAttendeeToggle = (userId: number) => {
        setSelectedAttendees(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Meeting title is required');
            return;
        }

        if (selectedAttendees.length === 0) {
            setError('Please select at least one attendee');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const meetingData: CreateMeetingRequest = {
                project_id: projectId,
                title: title.trim(),
                description: description.trim() || undefined,
                status: 'pending',
                attendee_ids: selectedAttendees,
            };

            await createMeeting(meetingData);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create meeting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                {/* Header */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-gray-900">Create New Meeting</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                    <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
                        <div className="flex-1 p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Meeting Title */}
                            <div>
                                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Meeting Title *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        placeholder="e.g., Sprint Planning Meeting"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Description (Optional)
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Add meeting details or agenda..."
                                />
                            </div>

                            {/* Attendees Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Select Attendees * ({selectedAttendees.length} selected)
                                </label>
                                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                                    {projectMembers.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            No project members available
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-200">
                                            {projectMembers.map((member) => (
                                                <label
                                                    key={member.id}
                                                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAttendees.includes(member.id)}
                                                        onChange={() => handleAttendeeToggle(member.id)}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <div className="ml-3 flex items-center gap-3 flex-1">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                            {member.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {member.username}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-blue-600 mt-0.5">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 text-sm text-blue-800">
                                        <p className="font-medium mb-1">Next Steps:</p>
                                        <p>After creating this meeting, all attendees will be able to share their availability. You can then select the final meeting time based on everyone's availability.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions - Fixed at bottom */}
                        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-colors font-medium"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !title.trim() || selectedAttendees.length === 0}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Meeting'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePendingMeetingDialog;
