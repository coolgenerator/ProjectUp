import fetchWithAuth from '../hooks/fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

// Meeting types
export interface Meeting {
    id: string;
    project_id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    meeting_url?: string;
    created_by: number;
    status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
    attendee_details?: AttendeeDetail[];
}

export interface AttendeeDetail {
    user_id: number;
    username: string;
    email: string;
    status: 'invited' | 'accepted' | 'declined' | 'tentative';
    response_at?: string;
}

export interface MeetingAvailability {
    id: number;
    meeting_id: string;
    attendee_id: number;
    available_dates: string; // JSON string of dates
    timezone: number;
    start_time: string;
    end_time: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMeetingRequest {
    project_id: number;
    title: string;
    description?: string;
    start_time?: string; // Optional for pending meetings
    end_time?: string; // Optional for pending meetings
    location?: string;
    meeting_url?: string;
    status?: 'pending' | 'scheduled';
    attendee_ids?: number[];
}

export interface UpdateMeetingRequest {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    meeting_url?: string;
    status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    attendee_ids?: number[];
}

export interface SaveAvailabilityRequest {
    available_dates: string; // JSON string of date array
    timezone: number;
    start_time: string;
    end_time: string;
}

// Create a new meeting
export const createMeeting = async (meetingData: CreateMeetingRequest): Promise<Meeting> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting');
    }

    return response.json();
};

// Get all meetings for a project
export const getProjectMeetings = async (projectId: number): Promise<Meeting[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/meetings`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch meetings');
    }

    const data = await response.json();
    return data.meetings || [];
};

// Get a specific meeting
export const getMeeting = async (meetingId: string): Promise<Meeting> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch meeting');
    }

    return response.json();
};

// Update a meeting
export const updateMeeting = async (
    meetingId: string,
    updateData: UpdateMeetingRequest
): Promise<Meeting> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update meeting');
    }

    return response.json();
};

// Delete a meeting
export const deleteMeeting = async (meetingId: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete meeting');
    }
};

// Update attendee status
export const updateAttendeeStatus = async (
    meetingId: string,
    status: 'accepted' | 'declined' | 'tentative'
): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}/attendees/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
    }
};

// Format meeting time for display
export const formatMeetingTime = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    };

    const dateStr = start.toLocaleDateString('en-US', dateOptions);
    const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
    const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);

    return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
};

// Check if meeting is upcoming, ongoing, or past
export const getMeetingTimeStatus = (
    startTime: string,
    endTime: string
): 'upcoming' | 'ongoing' | 'past' => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) {
        return 'upcoming';
    } else if (now >= start && now <= end) {
        return 'ongoing';
    } else {
        return 'past';
    }
};

// Save availability for a pending meeting
export const saveMeetingAvailability = async (
    meetingId: string,
    availabilityData: SaveAvailabilityRequest
): Promise<MeetingAvailability> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}/availability`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(availabilityData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save availability');
    }

    return response.json();
};

// Get all availability for a pending meeting
export const getMeetingAvailability = async (meetingId: string): Promise<MeetingAvailability[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/meetings/${meetingId}/availability`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch availability');
    }

    const data = await response.json();
    return data.availabilities || [];
};
