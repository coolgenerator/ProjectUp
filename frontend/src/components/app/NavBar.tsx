import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout } from "../../store/auth";
import useSSE from "../../hooks/sseService";
import { RootState } from "../../store/store";
import logo from "../../assets/icon.svg";
import { PAGE_WIDTH } from "../ui";
import config from "../../config";
import { getContactRequests } from "../../services/contactServices";
import { setContactRequests, setNotifications } from "../../store/notification";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import { getDisplayName } from "../../utils/displayName";

// Material UI imports
import {
    Tooltip,
    Menu,
    MenuItem,
    Avatar,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    IconButton,
    Select,
    FormControl,
    SelectChangeEvent
} from "@mui/material";

// Import icons directly from heroicons (modern approach)
interface UserSubscription {
    id: number;
    tier: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
}

const NavBar: React.FC = () => {
    const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const user = useSelector((state: RootState) => state.auth.user);

    // Get notification states from Redux
    const unreadMessages = useSelector((state: RootState) => state.notification.unreadMessages);
    const notifications = useSelector((state: RootState) => state.notification.notifications);
    const contactRequests = useSelector((state: RootState) => state.notification.contactRequests);

    // Calculate totals
    const totalUnreadMessages = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
    const unreadNotifications = notifications.filter((n: any) => !n.read).length;
    const contactRequestCount = contactRequests.length;

    // Initialize SSE connection for real-time updates
    const sse = useSSE();

    // Fetch contact requests and subscription status on component mount
    useEffect(() => {
        if (isAuthenticated) {
            const fetchContactRequests = async () => {
                try {
                    const requests = await getContactRequests();
                    if (requests && requests.length > 0) {
                        dispatch(setContactRequests(requests));
                    }
                } catch (error) {
                    console.error("Failed to fetch contact requests:", error);
                }
            };

            const fetchNotifications = async () => {
                try {
                    const response = await fetchWithAuth(`${config.API_BASE_URL}/api/notifications`);
                    if (response.ok) {
                        const data = await response.json();
                        const notifications = data.notifications || [];
                        // Transform API format to Redux format
                        const transformedNotifications = notifications.map((notif: any) => ({
                            id: String(notif.notification_id),
                            type: notif.title || 'notification',
                            content: notif.description,
                            timestamp: notif.created_at,
                            read: notif.is_read
                        }));
                        dispatch(setNotifications(transformedNotifications));
                    }
                } catch (error) {
                    console.error("Failed to fetch notifications:", error);
                }
            };

            const fetchUserSubscription = async () => {
                try {
                    const response = await fetchWithAuth(`${config.API_BASE_URL}/api/v1/subscription`, {
                        cache: 'no-store', // Force fresh fetch, bypass browser cache
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status && data.data) {
                            setUserSubscription(data.data);
                        } else {
                            // If no subscription data, default to free tier
                            setUserSubscription({
                                id: 0,
                                tier: 'free',
                                status: 'active',
                                current_period_end: '',
                                cancel_at_period_end: false
                            });
                        }
                    } else {
                        // Default to free tier if request fails
                        setUserSubscription({
                            id: 0,
                            tier: 'free',
                            status: 'active',
                            current_period_end: '',
                            cancel_at_period_end: false
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch user subscription:', error);
                    // Default to free tier on error
                    setUserSubscription({
                        id: 0,
                        tier: 'free',
                        status: 'active',
                        current_period_end: '',
                        cancel_at_period_end: false
                    });
                }
            };

            fetchContactRequests();
            fetchNotifications();
            fetchUserSubscription();
        }
    }, [isAuthenticated, dispatch]);

    // Handle scroll events to change navbar appearance
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/logout`, {
                method: "POST",
                credentials: "include",
            });

            if (response.ok) {
                // SSE connection will close automatically when token is cleared
                dispatch(logout());
                setProfileMenuAnchor(null);
                navigate("/login?logout=true");
            } else {
                console.error("Logout failed:", await response.json());
            }
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleNavigate = (path: string) => {
        setProfileMenuAnchor(null);
        setMobileMenuOpen(false);
        const [base, id] = path.split("#");
        // Already on the landing page: the hash may not change, so scroll directly.
        if (id && location.pathname === base) {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }
        navigate(path);
    };

    const handleOpenProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
        setProfileMenuAnchor(event.currentTarget);
    };

    const handleCloseProfileMenu = () => {
        setProfileMenuAnchor(null);
    };

    const formatCount = (count: number) => (count > 99 ? "99+" : count);

    const handleLanguageChange = (event: SelectChangeEvent<string>) => {
        const newLang = event.target.value;
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    // Navigation items
    interface NavItem {
        name: string;
        path: string;
        requiresAuth: boolean;
        guestOnly?: boolean;
        comingSoon?: boolean;
    }

    const navItems: NavItem[] = [
        { name: t("nav.community"), path: "/home", requiresAuth: true },
        { name: t("match.nav"), path: "/ideas", requiresAuth: true },
        { name: t("nav.myProjects"), path: "/my-projects", requiresAuth: true },
        // { name: t("nav.spark"), path: "/spark", requiresAuth: false },
        { name: t("nav.openProjects"), path: "/projects", requiresAuth: false },
        { name: t("nav.howItWorks"), path: "/#how-it-works", requiresAuth: false, guestOnly: true },
        { name: t("nav.faq"), path: "/#faq", requiresAuth: false, guestOnly: true },
        // Hidden for the matching demo
        // { name: t("nav.research"), path: "/research", requiresAuth: false },
        // { name: t("nav.build"), path: "/build", requiresAuth: false },
        // { name: "Partners", path: "/partners", requiresAuth: false, comingSoon: true },
        // { name: "Jobs", path: "/jobs", requiresAuth: false, comingSoon: true },
        { name: t("nav.pricing"), path: "/pricing", requiresAuth: false },
        { name: t("nav.about"), path: "/about", requiresAuth: false, guestOnly: true }
    ];

    // Profile menu options
    const profileOptions = [
        {
            name: t("nav.profile"), path: "/my-profile", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
            )
        },
        /* Hidden along with the Home feed
        {
            name: t("nav.myPosts"), path: "/my-posts", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            )
        },
        */
        {
            name: t("nav.myProjects"), path: "/my-projects", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
            )
        },
        /* Hidden for the matching demo
        {
            name: t("nav.resources"), path: "/resources", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
            )
        },
        */
        // My Schedules option temporarily hidden until scheduling feature is fully implemented
        /*
        {
            name: "My Schedules", path: "/my-schedules", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            )
        },
        */
        {
            name: t("nav.saved"), path: "/saved", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
            )
        },
        /* Hidden for the matching demo
        {
            name: t("nav.subscription"), path: "/account/subscription", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
            )
        },
        */
        // {
        //     name: t("nav.pricing"), path: "/pricing", icon: (
        //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        //             <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        //         </svg>
        //     )
        // },
        {
            name: t("nav.settings"), path: "/settings", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        }
    ];

    return (
        <header
            className={`sticky top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? 'bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 backdrop-blur-md bg-opacity-70 dark:bg-opacity-90 shadow-md py-2'
                : 'bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 backdrop-blur-sm bg-opacity-60 dark:bg-opacity-80 py-3'
                }`}
        >
            <div className={`${PAGE_WIDTH} flex items-center justify-between`}>
                {/* Logo */}
                <div
                    className="flex shrink-0 items-center cursor-pointer"
                    onClick={() => handleNavigate("/")}
                >
                    <img src={logo} alt={t("nav.logoAlt")} className="w-8 h-8 mr-2 drop-shadow-sm" />
                    <span className="font-bold text-2xl text-slate-800 dark:text-slate-200 drop-shadow-sm">
                        ProjectUp
                    </span>
                </div>

                {/* Desktop Navigation */}
                {/* Guests get five links, so they need more room before the inline nav fits. */}
                <nav className={`hidden items-center ${isAuthenticated ? "md:flex" : "xl:flex"} space-x-6`}>
                    {navItems.map((item) => {
                        if (!isAuthenticated && item.requiresAuth) return null;
                        if (isAuthenticated && item.guestOnly) return null;
                        // Hide Pricing from nav bar when user is logged in
                        if (isAuthenticated && item.path === "/pricing") return null;

                        return (
                            <div key={item.name}>
                                {item.comingSoon ? (
                                    <Tooltip title={t("nav.comingSoonTooltip")} arrow>
                                        <span className="text-gray-500 cursor-not-allowed">
                                            {item.name}
                                        </span>
                                    </Tooltip>
                                ) : (
                                    <button
                                        onClick={() => handleNavigate(item.path)}
                                        className={`relative whitespace-nowrap font-medium transition-colors ${location.pathname === item.path
                                            ? 'font-semibold text-blue-600 dark:text-blue-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400'
                                            }`}
                                    >
                                        {item.name}
                                        {location.pathname === item.path && (
                                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 dark:bg-blue-400 transform -translate-y-1"></span>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Right side: notifications and profile */}
                <div className="flex items-center gap-1 sm:gap-3">
                    {isAuthenticated && (
                        <>

                            {/* Hidden until billing is live: the checkout success and subscription pages are still off.
                            {userSubscription && (
                                <Tooltip title={
                                    userSubscription.tier === 'free'
                                        ? 'Click to upgrade your plan'
                                        : `${userSubscription.tier.charAt(0).toUpperCase() + userSubscription.tier.slice(1)} Plan`
                                }>
                                    {userSubscription.tier === 'free' ? (
                                        <button
                                            onClick={() => handleNavigate('/pricing')}
                                            className="hidden sm:flex items-center px-3 py-1.5 mr-2 bg-gradient-to-r from-slate-400 to-slate-500 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold rounded-full shadow-md transition-all duration-300 hover:scale-105 cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v2m0 8v2m0-8h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>FREE</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            <span className="ml-1">Upgrade</span>
                                        </button>
                                    ) : (
                                        <div className="hidden sm:flex items-center px-3 py-1.5 mr-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">
                                            {userSubscription.tier === 'basic' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                                                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {(userSubscription.tier === 'professional' || userSubscription.tier === 'pro') && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                                                    <path fillRule="evenodd" d="M9.661 2.237a.75.75 0 01.678 0 11.947 11.947 0 007.678 2.831.75.75 0 01.729.744v6.42a11.954 11.954 0 01-8.356 11.384.75.75 0 01-.678 0 11.954 11.954 0 01-8.356-11.384v-6.42a.75.75 0 01.729-.744 11.947 11.947 0 007.678-2.831z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {userSubscription.tier === 'team' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                                                </svg>
                                            )}
                                            {userSubscription.tier === 'enterprise' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                                                    <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                                                </svg>
                                            )}
                                            <span>{userSubscription.tier === 'pro' ? 'PRO' : userSubscription.tier.toUpperCase()}</span>
                                        </div>
                                    )}
                                </Tooltip>
                            )} */}

                            {/* Messages Icon */}
                            <Tooltip title={t("nav.messagesTooltip")}>
                                <button
                                    onClick={() => handleNavigate("/messages")}
                                    className="relative p-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    aria-label={t("nav.messagesTooltip")}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                    {totalUnreadMessages > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping"></span>
                                            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs text-white font-bold">
                                                {formatCount(totalUnreadMessages)}
                                            </span>
                                        </span>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Connections Icon */}
                            <Tooltip title={t("nav.connectionsTooltip")}>
                                <button
                                    onClick={() => handleNavigate("/connections")}
                                    className="relative p-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    aria-label={t("nav.connectionsTooltip")}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                    </svg>
                                    {contactRequestCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping"></span>
                                            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs text-white font-bold">
                                                {formatCount(contactRequestCount)}
                                            </span>
                                        </span>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Notifications Icon */}
                            <Tooltip title={t("nav.notificationsTooltip")}>
                                <button
                                    onClick={() => handleNavigate("/notifications")}
                                    className="relative p-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    aria-label={t("nav.notificationsTooltip")}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                    </svg>
                                    {unreadNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping"></span>
                                            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs text-white font-bold">
                                                {formatCount(unreadNotifications)}
                                            </span>
                                        </span>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Profile Avatar */}
                            <button
                                onClick={handleOpenProfileMenu}
                                className="flex items-center ml-2 focus:outline-none"
                                aria-label={t("nav.openProfileMenu")}
                            >
                                <Avatar
                                    src={typeof user?.avatar === 'string' ? user.avatar : undefined}
                                    alt={user?.username || t("nav.userFallback")}
                                    className="border-2 border-blue-100 dark:border-slate-600"
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.05)'
                                        }
                                    }}
                                />
                            </button>

                            {/* Profile Menu */}
                            <Menu
                                anchorEl={profileMenuAnchor}
                                open={Boolean(profileMenuAnchor)}
                                onClose={handleCloseProfileMenu}
                                PaperProps={{
                                    elevation: 3,
                                    sx: {
                                        mt: 1.5,
                                        borderRadius: '0.75rem',
                                        minWidth: 200,
                                        overflow: 'visible',
                                        '&:before': {
                                            content: '""',
                                            display: 'block',
                                            position: 'absolute',
                                            top: 0,
                                            right: 14,
                                            width: 10,
                                            height: 10,
                                            bgcolor: 'background.paper',
                                            transform: 'translateY(-50%) rotate(45deg)',
                                            zIndex: 0,
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-600">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {getDisplayName(user)}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                                        {user?.email || ""}
                                    </p>
                                    {/* Hidden until billing is live
                                    {userSubscription && (
                                        <div className={`mt-2 inline-flex items-center px-2 py-0.5 text-white text-xs font-bold rounded-full ${userSubscription.tier === 'free'
                                            ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                                            : 'bg-gradient-to-r from-amber-400 to-amber-500'
                                            }`}>
                                            {userSubscription.tier === 'free'
                                                ? 'FREE TIER'
                                                : `${userSubscription.tier === 'pro' ? 'PRO' : userSubscription.tier.toUpperCase()} MEMBER`
                                            }
                                        </div>
                                    )} */}
                                </div>

                                {/* Navigation Links for Mobile View */}
                                <div className="md:hidden border-b border-slate-100 dark:border-slate-600">
                                    {navItems.map((item) => {
                                        if (!isAuthenticated && item.requiresAuth) return null;
                                        if (isAuthenticated && item.guestOnly) return null;
                                        if (item.comingSoon) return null;
                                        // Hide Pricing from mobile nav when user is logged in
                                        if (isAuthenticated && item.path === "/pricing") return null;

                                        return (
                                            <MenuItem
                                                key={item.name}
                                                onClick={() => handleNavigate(item.path)}
                                                sx={{
                                                    py: 1.5,
                                                    px: 2.5,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(59, 130, 246, 0.05)'
                                                    }
                                                }}
                                            >
                                                <span className="text-sm font-medium">{item.name}</span>
                                            </MenuItem>
                                        );
                                    })}
                                </div>

                                {profileOptions.map((option) => (
                                    <MenuItem
                                        key={option.name}
                                        onClick={() => handleNavigate(option.path)}
                                        sx={{
                                            py: 1.5,
                                            px: 2.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.05)'
                                            }
                                        }}
                                    >
                                        <div className="mr-3 text-slate-500 dark:text-slate-400">{option.icon}</div>
                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{option.name}</span>
                                    </MenuItem>
                                ))}

                                <Divider sx={{ my: 1 }} />

                                <MenuItem
                                    onClick={handleLogout}
                                    sx={{
                                        py: 1.5,
                                        px: 2.5,
                                        color: 'rgb(239, 68, 68)',
                                        '&:hover': {
                                            bgcolor: 'rgba(239, 68, 68, 0.05)'
                                        }
                                    }}
                                >
                                    <div className="mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium">{t("logout")}</span>
                                </MenuItem>
                            </Menu>
                        </>
                    )}

                    {/* Login/Signup buttons */}
                    {!isAuthenticated && (
                        <>
                            {/* Language Selector */}
                            <FormControl size="small" sx={{ minWidth: 80, mr: 2 }}>
                                <Select
                                    value={i18n.language}
                                    onChange={handleLanguageChange}
                                    displayEmpty
                                    variant="outlined"
                                    sx={{
                                        fontSize: '0.875rem',
                                        height: '36px',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(148, 163, 184, 0.3)',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(148, 163, 184, 0.5)',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgb(59, 130, 246)',
                                        },
                                        '& .MuiSelect-select': {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            py: 1,
                                        },
                                    }}
                                >
                                    <MenuItem value="en">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '16px' }}>🇺🇸</span>
                                            English
                                        </span>
                                    </MenuItem>
                                    <MenuItem value="zh">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '16px' }}>🇨🇳</span>
                                            中文
                                        </span>
                                    </MenuItem>
                                    <MenuItem value="es">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '16px' }}>🇪🇸</span>
                                            Español
                                        </span>
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <div className="hidden sm:flex items-center gap-3">
                                <button
                                    onClick={() => handleNavigate("/login")}
                                    className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                    {t("login")}
                                </button>
                                <button
                                    onClick={() => handleNavigate("/register")}
                                    className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-sky-500 rounded-full hover:from-blue-600 hover:to-sky-600 transition-colors shadow-sm"
                                >
                                    {t("register")}
                                </button>
                            </div>

                            {/* Mobile menu toggle for non-authenticated users */}
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="xl:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                                aria-label={t("nav.openMenu")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile Navigation Drawer - Only for non-authenticated users */}
            {!isAuthenticated && (
                <Drawer
                    anchor="left"
                    open={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                    PaperProps={{
                        sx: {
                            width: '80%',
                            maxWidth: 300,
                            borderTopRightRadius: 16,
                            borderBottomRightRadius: 16,
                            background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.85), rgba(14, 165, 233, 0.85))',
                        }
                    }}
                >
                    <div className="p-5 flex items-center">
                        <img src={logo} alt={t("nav.logoAlt")} className="w-8 h-8 mr-2" />
                        <span className="font-bold text-xl text-white">
                            ProjectUp
                        </span>
                    </div>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                    <List sx={{ color: 'white' }}>
                        {navItems.map((item) => {
                            if (item.requiresAuth) return null;

                            if (item.comingSoon) {
                                return (
                                    <ListItem key={item.name} sx={{ opacity: 0.6 }}>
                                        <ListItemText
                                            primary={item.name}
                                            secondary={t("nav.comingSoonSecondary")}
                                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                                        />
                                    </ListItem>
                                );
                            }

                            return (
                                <ListItemButton
                                    key={item.name}
                                    onClick={() => handleNavigate(item.path)}
                                    selected={location.pathname === item.path}
                                    sx={{
                                        borderRadius: '8px',
                                        mx: 1,
                                        color: 'white',
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        }
                                    }}
                                >
                                    <ListItemText primary={item.name} />
                                </ListItemButton>
                            );
                        })}
                    </List>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                    {/* Language Selector in Mobile Menu */}
                    <div className="p-4">
                        <FormControl fullWidth size="small">
                            <Select
                                value={i18n.language}
                                onChange={handleLanguageChange}
                                displayEmpty
                                variant="outlined"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'white',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: 'white',
                                    },
                                    '& .MuiSelect-select': {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    },
                                }}
                            >
                                <MenuItem value="en">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🇺🇸</span>
                                        English
                                    </span>
                                </MenuItem>
                                <MenuItem value="zh">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🇨🇳</span>
                                        中文
                                    </span>
                                </MenuItem>
                                <MenuItem value="es">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🇪🇸</span>
                                        Español
                                    </span>
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                    <div className="p-4 flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate("/login");
                            }}
                            className="w-full py-2 text-sm font-medium text-white/90 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            {t("login")}
                        </button>
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate("/register");
                            }}
                            className="w-full py-2 text-sm font-medium text-blue-700 bg-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                        >
                            {t("register")}
                        </button>
                    </div>
                </Drawer>
            )}
        </header>
    );
};

export default NavBar;
