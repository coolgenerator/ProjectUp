import React, { useState, useEffect } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { searchUsersByUsername, sendContactRequest } from "../../services/contactServices";
import { acceptContactRequest, declineContactRequest } from "../../services/contactServices";
import { getContacts, getContactRequests, getSentContactRequests } from "../../services/contactServices";
import { removeContactRequest } from "../../store/notification";
import { getUserProfileById } from "../../services/userServices";
import { getDisplayName } from "../../utils/displayName";

// Fix the Contact interface to match backend model
interface Contact {
    id: number;
    user_id: number;
    contact_id: number;
    category: string;
    status: number;
    created_at: string;
    updated_at: string;
}

// Define proper UserProfile interface
interface UserProfile {
    id: number;
    username?: string;
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    field?: string;
    school?: string;
    short_id?: string;
}

const Connections: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const senderId = useSelector((state: RootState) => state.auth.user?.id)
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]); // Accepted contacts
    const [contactRequests, setContactRequests] = useState([]); // Pending requests
    const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // User search functionality
    const [usernameSearch, setUsernameSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showFindUsers, setShowFindUsers] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [sentRequests, setSentRequests] = useState<number[]>([]);

    useEffect(() => {
        fetchContacts();
        fetchContactRequests();
        fetchSentRequests();
    }, []);

    /** Update filtered contacts when searchTerm changes */
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredContacts(contacts); // Show all if no search
        } else {
            const filtered = contacts.filter(contact => {
                const user = userProfiles[contact.contact_id] || {};
                const fullName = getDisplayName(user).toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            });
            setFilteredContacts(filtered);
        }
    }, [searchTerm, contacts, userProfiles]);

    // Fetch pending requests that the current user has sent
    const fetchSentRequests = async () => {
        try {
            const sentRequestsData = await getSentContactRequests();

            // Extract just the IDs of the users we've sent requests to
            const sentRequestIds = sentRequestsData.map((req: any) => req.contact_id);
            setSentRequests(sentRequestIds);

            // The user profiles are now included in each request object
            // Add recipient profiles to userProfiles state
            const userProfilesMap = { ...userProfiles };

            // Add recipient profiles from the sent requests to our state
            sentRequestsData.forEach((request: any) => {
                if (request.recipient_id) {
                    userProfilesMap[request.recipient_id] = {
                        id: request.recipient_id,
                        username: request.username,
                        preferred_name: request.first_name,
                        last_name: request.last_name,
                        avatar_url: request.avatar_url
                    };
                }
            });

            // Update profiles state with the recipients
            setUserProfiles(userProfilesMap);
        } catch (error) {
            // Handle error silently
        }
    };

    /** Fetch all accepted contacts */
    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const contacts = await getContacts();

            if (Array.isArray(contacts)) {
                setContacts(contacts);

                // Extract user IDs for profile fetching
                const userIds = contacts.map((contact: Contact) => contact.contact_id);

                if (userIds.length > 0) {
                    try {
                        // Use the new getUserProfileById function to fetch profiles
                        const profilePromises = userIds.map(userId => getUserProfileById(userId));
                        const profileResults = await Promise.all(profilePromises);
                        const profilesMap: Record<number, UserProfile> = {};

                        // Filter out any null results and process the successful ones
                        profileResults.filter(Boolean).forEach((profile: any) => {
                            if (profile && profile.id) {
                                profilesMap[profile.id] = {
                                    id: profile.id,
                                    username: profile.username || '',
                                    first_name: profile.first_name || '',
                                    last_name: profile.last_name || '',
                                    preferred_name: profile.preferred_name || profile.first_name || '',
                                    avatar_url: profile.avatar_url || '',
                                    field: profile.field || '',
                                    school: profile.school || '',
                                    short_id: profile.sid || profile.short_id || '' // Ensure we capture ShortID
                                };
                            }
                        });

                        setUserProfiles(profilesMap);
                    } catch (profileError) {
                        console.error("Error fetching user profiles:", profileError);
                    }
                }
            } else {
                console.error("Invalid contacts data format:", contacts);
                setContacts([]);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
            setContacts([]);
        } finally {
            setIsLoading(false);
        }
    };

    /** Fetch pending contact requests */
    const fetchContactRequests = async () => {
        try {
            const requests = await getContactRequests();
            setContactRequests(requests);

            if (Array.isArray(requests) && requests.length > 0) {
                // The user profiles are now included in each request object,
                // but we'll still add them to the userProfiles state
                const userProfilesMap = { ...userProfiles };

                // Add user profiles from the requests to our state
                requests.forEach((request: any) => {
                    // Each request now has the user details included
                    if (request.sender_id) {
                        userProfilesMap[request.sender_id] = {
                            id: request.sender_id,
                            username: request.username,
                            preferred_name: request.first_name,
                            last_name: request.last_name,
                            avatar_url: request.avatar_url
                        };
                    }
                });

                setUserProfiles(userProfilesMap);
            }
        } catch (error) {
            console.error("Error fetching contact requests:", error);
        }
    };

    /** Accept a contact request */
    const handleAcceptRequest = async (contactId: number) => {
        try {
            await acceptContactRequest(contactId);
            // Remove contact request notification after accepting
            dispatch(removeContactRequest(contactId));
            // Refresh contact data
            fetchContacts();
            fetchContactRequests();
        } catch (error) {
            console.error("Failed to accept contact request:", error);
        }
    };

    /** Reject a contact request */
    const handleRejectRequest = async (contactId: number) => {
        try {
            await declineContactRequest(contactId);
            // Remove contact request notification after declining
            dispatch(removeContactRequest(contactId));
            // Refresh pending requests
            fetchContactRequests();
        } catch (error) {
            console.error("Failed to decline contact request:", error);
        }
    };

    const handleMessageClick = async (userId: number) => {
        try {
            if (!senderId) {
                throw new Error("User ID not found");
            }

            // Get user profile to retrieve SID
            const userProfile = userProfiles[userId];

            if (userProfile && userProfile.short_id) {
                // Store SID instead of numeric ID
                sessionStorage.setItem('pendingChatUserSID', userProfile.short_id);
            } else {
                // Fallback to numeric ID if SID not available
                console.warn("No SID available for user, falling back to numeric ID");
                sessionStorage.setItem('pendingChatUserId', userId.toString());
            }

            navigate(`/messages`);
        } catch (error) {
            alert("Unable to start chat. Try again later.");
        }
    };

    const handleViewProfile = (userId: number) => {
        // Get the user profile from our userProfiles state
        const userProfile = userProfiles[userId];

        if (userProfile && userProfile.short_id) {
            // Use the ShortID for navigation if available
            navigate(`/profile/${userProfile.short_id}`);
        } else {
            // If we don't have the profile cached, get it first
            getUserProfileById(userId)
                .then(profile => {
                    if (profile && profile.sid) {
                        navigate(`/profile/${profile.sid}`);
                    } else {
                        console.error("Could not get user profile for ID:", userId);
                    }
                })
                .catch(error => {
                    console.error("Error navigating to profile:", error);
                });
        }
    };

    // Search for users by username
    const searchUsers = async () => {
        if (!usernameSearch.trim()) {
            setSearchError(t('connections.searchError'));
            return;
        }

        setIsSearching(true);
        setSearchError("");
        setSearchResults([]);

        try {
            const users = await searchUsersByUsername(usernameSearch.trim());
            if (users.length > 0) {
                // Mark users who have pending requests from current user
                const markedUsers = users.map((user: any) => ({
                    ...user,
                    requestSent: sentRequests.includes(user.id)
                }));
                setSearchResults(markedUsers);
            } else {
                setSearchError(t('connections.noResults'));
            }
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "An error occurred while searching");
        } finally {
            setIsSearching(false);
        }
    };

    // Send connection request
    const sendConnectionRequest = async (userId: number) => {
        try {
            await sendContactRequest(userId);

            // Update the search results to show that a request was sent
            setSearchResults(prev =>
                prev.map(user =>
                    user.id === userId ? { ...user, requestSent: true } : user
                )
            );

            // Add this user ID to our sent requests
            setSentRequests(prev => [...prev, userId]);
        } catch (error) {
            alert(error instanceof Error ? error.message : t('connections.connectionRequestFailed'));
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header with search */}
                <div className="bg-white rounded-xl shadow-sm mb-8 p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <h1 className="text-3xl font-bold text-gray-800">{t('connections.title')}</h1>

                        <div className="flex flex-1 md:max-w-md gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('connections.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <span>{t('connections.requests')}</span>
                                {contactRequests.length > 0 && (
                                    <span className="flex items-center justify-center bg-white text-blue-600 text-xs font-bold rounded-full h-5 min-w-5 px-1">
                                        {contactRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Find Users Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">{t('connections.findPeople')}</h2>
                        <button
                            onClick={() => setShowFindUsers(!showFindUsers)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            {showFindUsers ? (
                                <>
                                    <span>{t('connections.hideSearch')}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>{t('connections.showSearch')}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>

                    {showFindUsers && (
                        <div className="mt-4">
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 3a1 1 0 012 0v5.5a.5.5 0 001 0V4a1 1 0 112 0v4.5a.5.5 0 001 0V6a1 1 0 112 0v5a7 7 0 11-14 0V9a1 1 0 012 0v2.5a.5.5 0 001 0V4a1 1 0 012 0v4.5a.5.5 0 001 0V3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('connections.searchByUsername')}
                                        value={usernameSearch}
                                        onChange={(e) => setUsernameSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') searchUsers();
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    onClick={searchUsers}
                                    disabled={isSearching}
                                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSearching ? t('connections.searching') : t('connections.search')}
                                </button>
                            </div>

                            {searchError && (
                                <p className="text-red-500 mt-2">{searchError}</p>
                            )}

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium text-gray-700 mb-3">{t('connections.searchResults')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {searchResults.map(user => {
                                            // Check if this user is already a contact
                                            const isContact = contacts.some(contact => contact.contact_id === user.id);
                                            // Check if we've sent a request to this user already
                                            const isPendingRequest = user.requestSent || false;

                                            return (
                                                <div key={user.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <img
                                                            src={user.avatar_url || "/assets/default-avatar.png"}
                                                            alt={user.username}
                                                            className="w-14 h-14 rounded-full object-cover border border-gray-200"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.onerror = null;
                                                                target.src = "/assets/default-avatar.png";
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-base font-semibold text-gray-800 truncate">
                                                                {user.preferred_name && user.last_name
                                                                    ? `${user.preferred_name} ${user.last_name}`
                                                                    : user.username}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                                            {user.field && (
                                                                <p className="text-xs text-gray-400 truncate">{user.field}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3">
                                                        {isContact ? (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleMessageClick(user.id)}
                                                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium"
                                                                >
                                                                    {t('connections.message')}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleViewProfile(user.id)}
                                                                    className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
                                                                >
                                                                    {t('connections.profile')}
                                                                </button>
                                                            </div>
                                                        ) : isPendingRequest ? (
                                                            <button
                                                                disabled
                                                                className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm font-medium"
                                                            >
                                                                {t('connections.requestSent')}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => sendConnectionRequest(user.id)}
                                                                className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                            >
                                                                {t('connections.sendRequest')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Contact List */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Contacts</h2>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : filteredContacts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredContacts.map((contact: Contact) => {
                                const user = userProfiles[contact.contact_id] || {};

                                return (
                                    <div
                                        key={contact.contact_id}
                                        className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center space-x-4">
                                                <img
                                                    src={user.avatar_url || "/assets/default-avatar.png"}
                                                    alt={getDisplayName(user)}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.onerror = null;
                                                        target.src = "/assets/default-avatar.png";
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    {/* Display name with fallbacks */}
                                                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                                                        {(user.preferred_name || user.first_name) && user.last_name
                                                            ? getDisplayName(user)
                                                            : getDisplayName(user) || "Unknown User"}
                                                    </h3>

                                                    {/* Display username */}
                                                    {user.username && (
                                                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                                    )}

                                                    {/* Display field/school if available */}
                                                    {(user.field || user.school) && (
                                                        <p className="text-xs text-gray-400 mt-1 truncate">
                                                            {user.field && <span>{user.field}</span>}
                                                            {user.field && user.school && <span> · </span>}
                                                            {user.school && <span>{user.school}</span>}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                                    onClick={() => handleMessageClick(contact.contact_id)}
                                                >
                                                    {t('connections.message')}
                                                </button>
                                                <button
                                                    className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                                                    onClick={() => handleViewProfile(contact.contact_id)}
                                                >
                                                    {t('connections.profile')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3 className="mt-3 text-lg font-medium text-gray-700">{t('connections.noConnections')}</h3>
                            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                                {t('connections.noConnectionsDesc')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Request Modal with improved design */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-3 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-800">{t('connections.pendingRequests')}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="p-1 max-h-[70vh] overflow-y-auto">
                            {contactRequests.length > 0 ? (
                                contactRequests.map((request: any) => {
                                    // Use userProfiles if available, otherwise use the data directly from the request
                                    // which includes user details from the backend
                                    const user = userProfiles[request.sender_id] || {
                                        username: request.username,
                                        preferred_name: request.first_name,
                                        last_name: request.last_name,
                                        avatar_url: request.avatar_url
                                    };

                                    return (
                                        <div
                                            key={request.id}
                                            className="p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={user.avatar_url || "/assets/default-avatar.png"}
                                                    alt={getDisplayName(user)}
                                                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.onerror = null;
                                                        target.src = "/assets/default-avatar.png";
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-base font-medium text-gray-800 block truncate">
                                                        {user.preferred_name || user.first_name
                                                            ? getDisplayName(user)
                                                            : getDisplayName(user) || "Unknown User"}
                                                    </span>
                                                    {user.username && (
                                                        <span className="text-sm text-gray-500 block truncate">@{user.username}</span>
                                                    )}
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(request.sender_id || request.user_id)}
                                                        className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                                    >
                                                        {t('connections.accept')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request.sender_id || request.user_id)}
                                                        className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                                    >
                                                        {t('connections.decline')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <p className="mt-3 text-gray-500">{t('connections.noPendingRequests')}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100">
                            <button
                                className="w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Connections;
