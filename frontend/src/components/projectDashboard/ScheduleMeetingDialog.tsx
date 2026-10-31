import React, { useState } from 'react';
import { X } from 'lucide-react';
import ScheduleMeeting from './ScheduleMeeting';
import { saveMeetingAvailability, Meeting } from '../../services/meetingService';

interface ScheduleMeetingDialogProps {
    meeting: Meeting;
    onClose: () => void;
    onSuccess: () => void;
}

const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({
    meeting,
    onClose,
    onSuccess,
}) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSaveAvailability = async (data: {
        dates: string[];
        timeZone: number;
        timePeriod: { start: string; end: string };
    }) => {
        setSaving(true);
        setError(null);

        try {
            await saveMeetingAvailability(meeting.id, {
                available_dates: JSON.stringify(data.dates),
                timezone: data.timeZone,
                start_time: data.timePeriod.start,
                end_time: data.timePeriod.end,
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save availability');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Share Your Availability</h2>
                        <p className="text-sm text-gray-600 mt-1">{meeting.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={saving}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Availability saved successfully! Closing...
                        </div>
                    )}

                    {!success && (
                        <>
                            {/* Info Box */}
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-blue-600 mt-0.5">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 text-sm text-blue-800">
                                        <p className="font-medium mb-1">How it works:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Select the dates when you're available</li>
                                            <li>Choose your preferred time range for each day</li>
                                            <li>Click "Share with Team" to save your availability</li>
                                            <li>The meeting organizer will choose the final time based on everyone's availability</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Meeting Component */}
                            <ScheduleMeeting onSaveAvailability={handleSaveAvailability} />

                            {saving && (
                                <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                                    <span className="text-gray-700 font-medium">Saving availability...</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleMeetingDialog;
