import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../../config";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { useParams, useNavigate } from "react-router-dom";
import { getContacts, sendContactRequest, deleteContact } from "../../services/contactServices";
import { getOrCreatePrivateChatBySID } from "../../services/chatServices";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentChat } from "../../store/chat";
import { RootState } from "../../store/store";
import { getDisplayName } from "../../utils/displayName";
import ProfileRecord from "../../components/match/ProfileRecord";
import { MatchProfileCard } from "../../components/match/MatchProfile";

const { API_BASE_URL } = config;

interface Concept {
    id: number;
    name: string;
    custom_name?: string;
    level: number;
    level_text: string;
}

interface User {
    id: number;
    sid: string;
    username?: string;
    email?: string;
    email_verified: boolean;
    verified: boolean;
    user_type?: string;
    first_name?: string;
    last_name?: string;
    preferred_name?: string;
    avatar_url?: string;
    website?: string;
    school_email?: string;
    school_email_verified: boolean;
    field?: string;
    phone?: string;
    school?: string;
    biography?: string;
    state?: string;
    city?: string;
    country?: string;
    zip_code?: string;
    language: string;
    resume_url?: string;
    skills: Concept[];
    interests: Concept[];
}

const decodeLanguage = (languageString: string): string[] => {
    try {
        // Handle comma-separated language string from backend
        if (!languageString || languageString.trim() === '') {
            return [];
        }

        // Split by comma and trim whitespace from each language
        const languages = languageString.split(',').map(lang => lang.trim()).filter(lang => lang !== '');
        return languages;
    } catch (error) {
        console.error('Error parsing language string:', error);
        return [];
    }
};

const MyProfile: React.FC = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentUser, setIsCurrentUser] = useState(true);
    const { shortId } = useParams<{ shortId?: string }>();
    const [isConnected, setIsConnected] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
    const currentUserSID = useSelector((state: RootState) => state.auth.user?.sid || state.auth.user?.short_id);

    useEffect(() => {
        const fetchUserProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                let response;

                // If a shortId is provided in the URL, fetch that user's profile
                if (shortId) {
                    // Check if shortId is a known route path that should be treated specially
                    const reservedRoutes = ["my-posts", "my-profile", "edit-profile", "my-projects"];

                    if (reservedRoutes.includes(shortId)) {
                        // If shortId is a reserved route, fetch the current user's profile instead
                        setIsCurrentUser(true);
                        response = await fetchWithAuth(`${API_BASE_URL}/api/my-profile`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                        });
                    } else {
                        // Otherwise fetch the profile using the shortId
                        setIsCurrentUser(false);
                        response = await fetchWithAuth(`${API_BASE_URL}/api/profile?sid=${shortId}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                        });
                    }
                } else {
                    // Otherwise fetch the current user's profile
                    setIsCurrentUser(true);
                    response = await fetchWithAuth(`${API_BASE_URL}/api/my-profile`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                    });
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);

                    // Special handling for reserved route names
                    if (errorData && errorData.reserved_route) {
                        throw new Error(t('profile.errors.reservedRoute'));
                    }

                    throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Handle different response formats
                let userData;
                if (data.user) {
                    // Format: { user: { ... } }
                    userData = {
                        ...data.user,
                        skills: data.user.skills || [],
                        interests: data.user.interests || []
                    };
                } else if (data.status === "success" && data.profile) {
                    // Format: { status: "success", profile: { ... } }
                    userData = {
                        ...data.profile,
                        skills: data.profile.skills || [],
                        interests: data.profile.interests || []
                    };
                } else if (data.id || data.ID) {
                    // Direct user object: { id: ..., ... }
                    userData = {
                        ...data,
                        skills: data.skills || [],
                        interests: data.interests || []
                    };
                } else {
                    console.error("Unrecognized API response format:", data);
                    throw new Error(t('profile.errors.invalidResponseFormat'));
                }

                setUser(userData);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError(err instanceof Error ? err.message : t('profile.errors.failedToLoadProfile'));
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [shortId]);

    // Check if the user is already connected when viewing another user's profile
    useEffect(() => {
        const checkConnectionStatus = async () => {
            if (!isCurrentUser && user) {
                try {
                    // Get all contacts
                    const contacts = await getContacts();

                    // Check if current profile user is in contacts
                    if (Array.isArray(contacts)) {
                        const isAlreadyConnected = contacts.some(contact =>
                            contact.contact_id === user.id ||
                            contact.user_id === user.id
                        );
                        setIsConnected(isAlreadyConnected);
                    }
                } catch (error) {
                    console.error("Error checking connection status:", error);
                }
            }
        };

        checkConnectionStatus();
    }, [user, isCurrentUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{t('profile.noUserDataAvailable')}</span>
                </div>
            </div>
        );
    }

    const handleRequestVerification = async () => {
        // Simply redirect to edit profile page
        window.location.href = "/edit-profile#school-email";
    };

    const handleConnect = async () => {
        if (!user) {
            setError(t('profile.errors.unableToConnect'));
            return;
        }

        try {
            // Send contact request with the user's ID
            await sendContactRequest(user.id);
            setIsConnected(true);
        } catch (err) {
            console.error("Error sending connection request:", err);
            setError(t('profile.errors.connectionError'));
        }
    };

    const handleMessage = async () => {
        if (!user) {
            setError(t('profile.errors.unableToMessage'));
            return;
        }

        if (!currentUserSID) {
            setError(t('profile.errors.notLoggedIn'));
            return;
        }

        try {
            // Store the target user's SID and navigate to messages
            if (user.sid) {
                sessionStorage.setItem('pendingChatUserSID', user.sid);
                navigate("/messages");
            } else {
                // Fallback to numeric ID if SID not available
                console.warn("No SID available for user, falling back to numeric ID");
                sessionStorage.setItem('pendingChatUserId', user.id.toString());
                navigate("/messages");
            }
        } catch (err) {
            console.error("Error navigating to messages:", err);
            setError(t('profile.errors.chatError'));
        }
    };

    const handleRemoveConnection = async () => {
        if (!user) {
            setError(t('profile.errors.unableToRemove'));
            return;
        }

        try {
            await deleteContact(user.id);
            setIsConnected(false);
            setShowDeleteConfirm(false);
            setShowDropdown(false);
        } catch (err) {
            console.error("Error removing connection:", err);
            setError(t('profile.errors.removeError'));
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                    <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-purple-600">
                        <div className="absolute -bottom-16 left-8">
                            <img
                                src={user.avatar_url || "https://via.placeholder.com/150"}
                                alt="Avatar"
                                className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white"
                            />
                        </div>
                    </div>
                    <div className="pt-20 pb-6 px-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                {getDisplayName(user)}
                            </h1>
                            <p className="text-gray-600 mt-1">@{user.username}</p>
                        </div>
                        {isCurrentUser ? (
                            <button
                                className="bg-yellow-400 text-black font-semibold px-6 py-2 rounded-full shadow-md hover:bg-yellow-500 transition-colors duration-200"
                                onClick={() => (window.location.href = "/edit-profile")}
                            >
                                {t('profile.editProfile')}
                            </button>
                        ) : (
                            <div className="flex space-x-3">
                                <button
                                    className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:bg-blue-700 transition-colors duration-200"
                                    onClick={handleMessage}
                                >
                                    {t('profile.message')}
                                </button>
                                {!isConnected ? (
                                    <button
                                        className="bg-green-600 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:bg-green-700 transition-colors duration-200"
                                        onClick={handleConnect}
                                    >
                                        {t('profile.connect')}
                                    </button>
                                ) : (
                                    <div className="relative">
                                        <button
                                            className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-full shadow-md hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
                                            onClick={() => setShowDropdown(!showDropdown)}
                                        >
                                            {t('profile.connected')}
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showDropdown && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowDropdown(false)}
                                                />
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                                    <button
                                                        onClick={() => {
                                                            setShowDropdown(false);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center gap-2"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                        </svg>
                                                        {t('profile.removeConnection') || 'Remove Connection'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Organization Verification Alert - Shows at the top when organization is not verified */}
                {isCurrentUser && user.school && !user.school_email_verified && (
                    <div className="bg-white rounded-lg shadow-lg p-4 mb-6 org-alert">
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg className="h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-amber-800">{t('profile.unverifiedOrganization', { school: user.school })}</h3>
                                        <button
                                            className="text-amber-600 hover:text-amber-800"
                                            onClick={() => document.querySelector('.org-alert')?.classList.add('hidden')}
                                        >
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-sm text-amber-700">
                                            {t('profile.organizationBenefits.description')}
                                        </p>
                                        <ul className="list-disc list-inside mt-1 text-sm text-amber-700">
                                            <li>{t('profile.organizationBenefits.visibility')}</li>
                                            <li>{t('profile.organizationBenefits.exclusiveContent')}</li>
                                            <li>{t('profile.organizationBenefits.improvedTrust')}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">{t('profile.personalInformation')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('profile.email')}</p>
                                    <p className="text-gray-800 flex items-center">
                                        {user.email || t('profile.notProvided')}
                                        {user.email_verified && (
                                            <span className="ml-2 text-green-500">
                                                <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('profile.website')}</p>
                                    <a
                                        href={user.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        {user.website || t('profile.notProvided')}
                                    </a>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('profile.schoolOrganization')}</p>
                                    <div className="flex items-center">
                                        <p className="text-gray-800">{user.school || t('profile.notProvided')}</p>
                                        {user.school && (
                                            <span className={`ml-2 ${user.school_email_verified ? "text-green-500" : "text-red-500"}`}>
                                                {user.school_email_verified ? t('profile.verified') : t('profile.notVerified')}
                                            </span>
                                        )}
                                    </div>
                                    {isCurrentUser && user.school && !user.school_email_verified && (
                                        <div className="mt-2 flex space-x-2">
                                            <button
                                                className="text-sm px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200"
                                                onClick={handleRequestVerification}
                                            >
                                                {t('profile.editOrganization')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('profile.field')}</p>
                                    <p className="text-gray-800">{user.field || t('profile.notProvided')}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('profile.location')}</p>
                                    <p className="text-gray-800">
                                        {[user.city, user.state, user.country].filter(Boolean).join(", ") || t('profile.notProvided')}
                                        {user.zip_code && ` ${user.zip_code}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Biography */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('profile.biography')}</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{user.biography || t('profile.noBiographyProvided')}</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Language */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('profile.preferredLanguage')}</h2>
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {user.language ? (
                                        decodeLanguage(user.language).map((lang, index) => (
                                            <span key={index} className="text-gray-800 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                                                {lang}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-800 font-medium">{t('profile.notProvided')}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('profile.skills')}</h2>
                            <div className="flex flex-wrap gap-2">
                                {user.skills && user.skills.length > 0 ? user.skills.map((skill) => (
                                    <span
                                        key={skill.id}
                                        className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                                    >
                                        {skill.custom_name || skill.name}
                                        <span className="ml-1 text-xs text-indigo-600">
                                            ({skill.level_text})
                                        </span>
                                    </span>
                                )) : <p className="text-gray-500">{t('profile.noSkillsListed')}</p>}
                            </div>
                        </div>

                        {/* Interests */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('profile.interests')}</h2>
                            <div className="flex flex-wrap gap-2">
                                {user.interests && user.interests.length > 0 ? user.interests.map((interest) => (
                                    <span
                                        key={interest.id}
                                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                                    >
                                        {interest.custom_name || interest.name}
                                        <span className="ml-1 text-xs text-purple-600">
                                            ({interest.level_text})
                                        </span>
                                    </span>
                                )) : <p className="text-gray-500">{t('profile.noInterestsListed')}</p>}
                            </div>
                        </div>

                        {/* Track record on ProjectUp */}
                        {/* Matching fields are private to the owner's view; others see them via recommendations */}
                        {user.sid && user.sid === currentUserSID && <MatchProfileCard />}
                        {user.sid && <ProfileRecord sid={user.sid} resumeUrl={user.resume_url} />}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-3 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-800">{t('profile.confirmRemove') || 'Remove Connection'}</h2>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600">
                                {t('profile.confirmRemoveMessage', { name: getDisplayName(user || {}) }) || `Are you sure you want to remove ${getDisplayName(user || {})} from your contacts?`}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                {t('profile.actionCannotBeUndone') || 'This action cannot be undone.'}
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleRemoveConnection}
                                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                {t('profile.remove') || 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProfile;
