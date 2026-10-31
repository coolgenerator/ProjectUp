import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { getUserProfile, getUserProfileById } from "../services/userServices";
import { sendContactRequest, getContacts } from "../services/contactServices";
import { AcademicCapIcon, EnvelopeIcon, UserPlusIcon, CheckIcon } from "@heroicons/react/24/outline";
import config from "../config";
import { getPreferredOrFirstName } from "../utils/displayName";

const { AWS_BASE_URL } = config;

interface UserData {
    id: string;
    username?: string;
    preferred_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    school?: string;
    school_email_verified?: boolean;
    sid?: string;
    short_id?: string;
    projectCount?: number;
    contributionCount?: number;
    followerCount?: number;
    bio?: string;
    title?: string;
    skills?: { id: string; custom_name?: string; name?: string; level?: string; level_text?: string }[];
    interests?: { id: string; custom_name?: string; name?: string; level?: string; level_text?: string }[];
}

interface UserProfileBubbleProps {
    userId: number;
}

const UserProfileBubble: React.FC<UserProfileBubbleProps> = ({ userId }) => {
    const navigate = useNavigate();
    const senderId = useSelector((state: RootState) => state.auth.user?.id)
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isRequestSent, setIsRequestSent] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    // Debug log when bubble is created
    console.log("UserProfileBubble created for userId:", userId);

    // Function to format avatar URL
    const getFormattedAvatarUrl = (url: string | null | undefined): string => {
        if (!url) return "https://via.placeholder.com/80x80?text=User";

        // If URL already contains http/https, use it as is
        if (url.startsWith('http')) return url;

        // Otherwise, prepend AWS base URL
        return `${AWS_BASE_URL}${url}`;
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                // First try getUserProfileById which handles nested structure better and includes sid
                const userProfileData = await getUserProfileById(userId);

                if (userProfileData) {
                    // Get shortId from either sid or short_id property
                    const shortId = userProfileData.sid || userProfileData.short_id;

                    // Always set user data regardless of structure
                    // The backend now returns a flat structure with sid
                    setUserData({
                        id: userId.toString(),
                        ...userProfileData,
                        sid: shortId // Ensure sid is always set
                    });
                } else {
                    // If getUserProfileById fails, fall back to getUserProfile
                    const fallbackData = await getUserProfile(userId);

                    // Extract sid from fallback data
                    const shortId = fallbackData.sid || fallbackData.short_id;

                    setUserData({
                        id: userId.toString(),
                        ...fallbackData,
                        sid: shortId
                    });
                }
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
                setError("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        const checkConnectionStatus = async () => {
            // Only check if the current user is logged in and not viewing their own profile
            if (senderId && senderId !== userId) {
                try {
                    // Fetch user's contacts
                    const contacts = await getContacts();

                    // Check if the target user is in the contacts list
                    const isUserConnected = contacts.some((contact: any) =>
                        contact.id === userId || contact.user_id === userId || contact.contact_id === userId
                    );

                    setIsConnected(isUserConnected);

                    // If they're already connected, no need to check request status
                    if (isUserConnected) {
                        setIsRequestSent(false);
                        return;
                    }

                    // Could add code here to check if a request is pending
                    // For now we'll leave it simple
                } catch (error) {
                    console.error("Failed to check connection status:", error);
                }
            }
        };

        if (userId) {
            fetchUserProfile();
            checkConnectionStatus();
        }
    }, [userId, senderId]);

    const handleMessageClick = async () => {
        try {
            if (!senderId) {
                throw new Error("User ID not found");
            }

            // Store the target user's SID instead of numeric ID
            if (userData && (userData.sid || userData.short_id)) {
                const shortId = userData.sid || userData.short_id;
                sessionStorage.setItem('pendingChatUserSID', shortId);
            } else {
                // Fallback to numeric ID if SID not available (shouldn't happen)
                console.warn("No SID available for user, falling back to numeric ID");
                sessionStorage.setItem('pendingChatUserId', userId.toString());
            }

            navigate(`/messages`);
        } catch (error) {
            console.error("Failed to start chat:", error);
            alert("Unable to start chat. Try again later.");
        }
    };

    const handleConnectClick = async () => {
        try {
            await sendContactRequest(userId);
            setIsRequestSent(true);
            alert("Connection request sent!");
        } catch (error) {
            console.error("Error sending connection request:", error);
            alert("Error sending request. Please try again.");
        }
    };

    const handleViewProfileClick = () => {
        // Use short ID if available, otherwise fall back to numeric ID
        if (userData && (userData.sid || userData.short_id)) {
            const shortId = userData.sid || userData.short_id;
            navigate(`/profile/${shortId}`);
        } else {
            console.warn("No short ID available in userData, falling back to numeric ID");
            navigate(`/profile/${userId}`);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 w-72">
            {loading ? (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="text-red-500 p-2">
                    {error}
                </div>
            ) : userData ? (
                <div className="flex flex-col">
                    <div className="flex items-center mb-4">
                        <img
                            src={userData.avatar_url ? getFormattedAvatarUrl(userData.avatar_url) : "/default-avatar.png"}
                            alt={getPreferredOrFirstName(userData)}
                            className="w-16 h-16 rounded-full mr-4 object-cover border border-gray-200"
                            onError={(e) => {
                                e.currentTarget.src = "/default-avatar.png";
                            }}
                        />
                        <div>
                            <h3 className="text-lg font-semibold">{getPreferredOrFirstName(userData)}{userData.last_name ? ` ${userData.last_name}` : ''}</h3>
                            {userData.username && (
                                <p className="text-gray-600 text-sm">@{userData.username}</p>
                            )}
                        </div>
                    </div>
                    {userData.school && (
                        <div className="flex items-center justify-center space-x-1 mt-2 mb-3">
                            <AcademicCapIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">{userData.school}</span>
                            {userData.school_email_verified ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Verified
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Unverified
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex justify-between mb-2">
                        <div className="text-center">
                            <div className="font-bold">{userData.projectCount}</div>
                            <div className="text-xs text-gray-500">Projects</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold">{userData.contributionCount}</div>
                            <div className="text-xs text-gray-500">Contributions</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold">{userData.followerCount}</div>
                            <div className="text-xs text-gray-500">Followers</div>
                        </div>
                    </div>
                    <div className="mt-3 mb-3">
                        <button
                            onClick={handleViewProfileClick}
                            className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded text-center transition-colors duration-200"
                        >
                            View Profile
                        </button>
                    </div>
                    {userId !== senderId && (
                        <div className="flex justify-around mt-4 space-x-2">
                            <button
                                className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-2 rounded-lg transition-colors duration-200 flex-1"
                                onClick={handleMessageClick}
                            >
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                Message
                            </button>
                            {!isConnected ? (
                                !isRequestSent ? (
                                    <button
                                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg transition-colors duration-200 flex-1"
                                        onClick={handleConnectClick}
                                    >
                                        <UserPlusIcon className="h-4 w-4 mr-1" />
                                        Connect
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="flex items-center justify-center bg-gray-100 text-gray-500 cursor-not-allowed px-3 py-2 rounded-lg transition-colors duration-200 flex-1"
                                    >
                                        Request Sent
                                    </button>
                                )
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center justify-center bg-gray-100 text-gray-500 cursor-not-allowed px-3 py-2 rounded-lg flex-1"
                                >
                                    <CheckIcon className="h-4 w-4 mr-1" />
                                    Connected
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-gray-500 p-2">
                    User information not available
                </div>
            )}
        </div>
    );
};

export default UserProfileBubble;
