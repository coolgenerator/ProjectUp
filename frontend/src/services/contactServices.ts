/** Send a contact request */
import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";

const { API_BASE_URL } = config;

export const sendContactRequest = async (contactId: number) => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/request?contact_id=${contactId}`,
            { method: "POST" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to send contact request");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

/** Accept a contact request */
export const acceptContactRequest = async (contactId: number) => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/accept?contact_id=${contactId}`,
            { method: "POST" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to accept contact request");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

/** Decline a contact request */
export const declineContactRequest = async (contactId: number) => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/decline?contact_id=${contactId}`,
            { method: "POST" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to decline contact request");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

/** Get all contact requests */
export const getContactRequests = async () => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/get-requests`
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to fetch contact requests");
        }

        const result = await response.json();
        return result.requests || [];
    } catch (error) {
        throw error;
    }
};

/** Get all contact requests sent by the current user */
export const getSentContactRequests = async () => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/sent-requests`
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to fetch sent contact requests");
        }

        const result = await response.json();
        return result.requests || [];
    } catch (error) {
        throw error;
    }
};

/** Get all contacts */
export const getContacts = async () => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/contact/`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to fetch contacts");
        }

        const result = await response.json();
        return result.contacts;
    } catch (error) {
        throw error;
    }
};

/** Delete a contact */
export const deleteContact = async (contactId: number) => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/contact/delete?contact_id=${contactId}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete contact");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
};

/** Search for users by username or email */
export const searchUsersByQuery = async (query: string) => {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/api/user/search?query=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to search users");
        }

        const result = await response.json();
        return result.users || [];
    } catch (error) {
        throw error;
    }
};

/** @deprecated Use searchUsersByQuery instead - searches by both username and email */
export const searchUsersByUsername = searchUsersByQuery;