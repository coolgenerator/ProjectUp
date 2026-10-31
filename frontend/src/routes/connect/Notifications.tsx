import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import LoadingPage from "../../components/app/Loading";
import config from "../../config";
import { Notification } from "../../types/message/notification";
import { markNotificationAsRead } from "../../store/notification";

const { API_BASE_URL } = config;

type InboxGroup = "all" | "application" | "invitation" | "other";
const INBOX_GROUPS: InboxGroup[] = ["all", "application", "invitation", "other"];

// groupOf sorts a notification into an inbox tab. Notifications created before
// types existed are recognised by where they link to.
const groupOf = (n: Notification): Exclude<InboxGroup, "all"> => {
    if (n.type === "application" || n.type === "invitation") return n.type;
    if (n.type && n.type !== "system") return "other";
    if (/\/invite|\/invites\//.test(n.url) || n.title.startsWith("Project Invitation") || n.title.startsWith("Invitation Accepted")) return "invitation";
    if (/^(Application|New Application)/i.test(n.title) || n.url.endsWith("/apply") || n.url === "/applications") return "application";
    return "other";
};

const NotificationPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [group, setGroup] = useState<InboxGroup>("all");
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => {
            fetchNotifications();
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/notifications`);
            const data = await response.json();
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await fetchWithAuth(`${API_BASE_URL}/api/notifications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_read: true }),
            });

            // Update local state
            setNotifications((prev) =>
                prev.map((notif) =>
                    notif.notification_id === id ? { ...notif, is_read: true } : notif
                )
            );

            // Update Redux state to sync with NavBar badge
            dispatch(markNotificationAsRead(String(id)));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleViewDetails = (id: number, url: string) => {
        markAsRead(id); // Auto-mark as read
        navigate(url);  // Navigate to the provided link
    };

    // Get notification icon based on URL pattern
    const getNotificationIcon = (url: string) => {
        if (!url) return "🔔";
        if (url.includes("/messages")) return "💬";
        if (url.includes("/project")) return "📋";
        if (url.includes("/profile")) return "👤";
        if (url.includes("/connect")) return "🔗";
        return "📣";
    };

    // Function to format time as "X mins ago", "X hours ago", etc.
    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);
        const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

        if (diffInSeconds < 60) return rtf.format(-diffInSeconds, "seconds");
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return rtf.format(-diffInMinutes, "minutes");
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return rtf.format(-diffInHours, "hours");
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return rtf.format(-diffInDays, "days");

        // If older than 7 days, return formatted date
        return notificationTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) return <LoadingPage />;

    const inGroup = notifications.filter((notif) => group === "all" || groupOf(notif) === group);
    const unreadNotifications = inGroup.filter((notif) => !notif.is_read);
    const earlierNotifications = inGroup.filter((notif) => notif.is_read);
    const unreadIn = (g: InboxGroup) => notifications.filter((n) => !n.is_read && (g === "all" || groupOf(n) === g)).length;

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('notifications.title')}</h1>
                    {unreadNotifications.length > 0 && (
                        <p className="text-blue-600 font-medium mt-1">
                            {unreadNotifications.length === 1
                                ? t('notifications.unreadCount', { count: unreadNotifications.length })
                                : t('notifications.unreadCountPlural', { count: unreadNotifications.length })
                            }
                        </p>
                    )}
                    <div className="mt-4 flex gap-2 overflow-x-auto" role="tablist">
                        {INBOX_GROUPS.map((g) => (
                            <button
                                key={g}
                                role="tab"
                                aria-selected={group === g}
                                onClick={() => setGroup(g)}
                                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${group === g ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                                {t(`match.inbox.${g}`)}
                                {unreadIn(g) > 0 && <span className={`ml-1.5 ${group === g ? "text-blue-100" : "text-blue-600"}`}>{unreadIn(g)}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Unread Notifications */}
                {unreadNotifications.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 pl-2">{t('notifications.new')}</h2>
                        <div className="space-y-3">
                            {unreadNotifications.map((notif) => (
                                <div
                                    key={notif.notification_id}
                                    className="bg-white border-l-4 border-blue-500 shadow-sm hover:shadow-md rounded-lg transition-all duration-200 overflow-hidden group"
                                >
                                    <div className="flex items-start p-4">
                                        <div className="mr-4 mt-1">
                                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white h-10 w-10 rounded-full flex items-center justify-center shadow-sm">
                                                {getNotificationIcon(notif.url)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{notif.title}</h3>
                                            <p className="text-gray-600">{notif.description}</p>
                                            <p className="text-sm text-gray-400 mt-1">{formatRelativeTime(notif.created_at)}</p>
                                        </div>
                                        <div className="ml-4 flex flex-col space-y-2">
                                            {notif.url && (
                                                <button
                                                    onClick={() => handleViewDetails(notif.notification_id, notif.url)}
                                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                                                >
                                                    {t('notifications.view')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => markAsRead(notif.notification_id)}
                                                className="text-gray-500 hover:text-blue-500 text-sm transition-colors whitespace-nowrap"
                                            >
                                                {t('notifications.markRead')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Earlier Notifications */}
                {earlierNotifications.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4 pl-2">{t('notifications.earlier')}</h2>
                        <div className="space-y-3">
                            {earlierNotifications.map((notif) => (
                                <div
                                    key={notif.notification_id}
                                    className="bg-white border-l-4 border-gray-200 shadow-sm hover:shadow-md rounded-lg transition-all duration-200 overflow-hidden group opacity-80 hover:opacity-100"
                                >
                                    <div className="flex items-start p-4">
                                        <div className="mr-4 mt-1">
                                            <div className="bg-gradient-to-br from-gray-400 to-gray-500 text-white h-10 w-10 rounded-full flex items-center justify-center shadow-sm">
                                                {getNotificationIcon(notif.url)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-700 mb-1">{notif.title}</h3>
                                            <p className="text-gray-500">{notif.description}</p>
                                            <p className="text-sm text-gray-400 mt-1">{formatRelativeTime(notif.created_at)}</p>
                                        </div>
                                        {notif.url && (
                                            <div className="ml-4">
                                                <button
                                                    onClick={() => navigate(notif.url)}
                                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors shadow-sm text-sm font-medium"
                                                >
                                                    {t('notifications.view')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Notifications */}
                {notifications.length > 0 && inGroup.length === 0 && (
                    <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">{t("match.inbox.empty")}</p>
                )}

                {notifications.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="bg-gray-100 p-6 rounded-full mb-4">
                                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('notifications.noNotifications')}</h3>
                            <p className="text-gray-500 max-w-md">{t('notifications.noNotificationsDesc')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPage;
