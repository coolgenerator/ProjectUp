import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { RootState } from "../store/store";
import { setLanguage as setLanguageAction, updateSettings } from "../store/settings";
import { updateData } from "../store/auth";
import fetchWithAuth from "../hooks/fetchWithAuth";
import config from "../config";
import { useTheme } from "../contexts/ThemeContext";
import AIAPIKeysSection from "../components/settings/AIAPIKeysSection";
import AIServicePreferencesSection from "../components/settings/AIServicePreferencesSection";
import { HelpButton } from "../components/tutorial/HelpButton";

const { API_BASE_URL } = config;

// Valid tab values for URL routing
const VALID_TABS = ['profile', 'notifications', 'security', 'ai-api-keys', 'ai-services', 'appearance'] as const;
type TabType = typeof VALID_TABS[number];

// Map URL tab to internal section name
const tabToSection: Record<string, string> = {
    'profile': 'profile',
    'notifications': 'notifications',
    'security': 'security',
    'ai-api-keys': 'ai-settings',
    'ai-services': 'ai-service-preferences',
    'appearance': 'appearance',
};

// Map internal section name to URL tab
const sectionToTab: Record<string, string> = {
    'profile': 'profile',
    'notifications': 'notifications',
    'security': 'security',
    'ai-settings': 'ai-api-keys',
    'ai-service-preferences': 'ai-services',
    'appearance': 'appearance',
};

const Settings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();

    // User data from Redux store
    const user = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const reduxLanguage = useSelector((state: RootState) => state.settings.language);

    // Determine initial section from URL tab
    const getInitialSection = () => {
        if (tab && tabToSection[tab]) {
            return tabToSection[tab];
        }
        return 'profile';
    };

    // Main section state
    const [activeSection, setActiveSection] = useState(getInitialSection);

    // Handle tab change - update both state and URL
    const handleTabChange = (section: string) => {
        setActiveSection(section);
        const urlTab = sectionToTab[section] || 'profile';
        navigate(`/settings/${urlTab}`, { replace: true });
    };

    // Sync URL changes (e.g., browser back/forward)
    useEffect(() => {
        if (tab && tabToSection[tab]) {
            setActiveSection(tabToSection[tab]);
        } else if (!tab) {
            setActiveSection('profile');
        }
    }, [tab]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // General Settings state
    const [loadingLanguage, setLoadingLanguage] = useState(false);
    const [displayName, setDisplayName] = useState(0); // 0=preferredName, 1=firstName, 2=username

    // Notification Settings state (6 separate toggles)
    const [inAppNotifications, setInAppNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [projectUpdates, setProjectUpdates] = useState(true);
    const [commentNotifications, setCommentNotifications] = useState(true);
    const [messageNotifications, setMessageNotifications] = useState(true);

    const [accountPrivacy, setAccountPrivacy] = useState(0); // 0=public, 1=private, 2=friendsOnly
    
    // Theme context
    const { theme, setTheme, toggleTheme } = useTheme();

    // Account Settings state
    const [username, setUsername] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [email, setEmail] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // TEMPORARILY DISABLED - AI Settings state
    // const [apiKeys, setApiKeys] = useState({
    //     openai: '',
    //     anthropic: '',
    //     google: ''
    // });
    // const [showApiKeys, setShowApiKeys] = useState({
    //     openai: false,
    //     anthropic: false,
    //     google: false
    // });


    // TEMPORARILY DISABLED - Modal preferences
    // const [autoCloseModals, setAutoCloseModals] = useState(true);
    // const [modalAnimations, setModalAnimations] = useState(true);

    // TEMPORARILY DISABLED - Application behavior
    // const [autoRefresh, setAutoRefresh] = useState(true);
    // const [confirmBeforeAction, setConfirmBeforeAction] = useState(true);

    // TEMPORARILY DISABLED - Performance settings
    // const [loadAnimations, setLoadAnimations] = useState(true);
    // const [prefetchData, setPrefetchData] = useState(true);

    // Sync Redux language with i18n on mount and when it changes
    useEffect(() => {
        if (reduxLanguage && i18n.language !== reduxLanguage) {
            i18n.changeLanguage(reduxLanguage);
        }
    }, [reduxLanguage, i18n]);

    // Fetch current user settings on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetchUserSettings();
            if (user) {
                setUsername(user.username || '');
                setEmail(user.email || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]); // Only run when authentication status changes, not when user object updates

    const fetchUserSettings = async () => {
        try {
            // Fetch user profile data
            const profileResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/my-profile`);
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                if (data.user) {
                    // Update Redux user state with profile data
                    dispatch(updateData({
                        first_name: data.user.first_name,
                        last_name: data.user.last_name,
                        preferred_name: data.user.preferred_name,
                        display_name_preference: data.user.display_name_preference,
                    }));

                    // Load language preference
                    if (data.user.language) {
                        dispatch(setLanguageAction(data.user.language));
                        i18n.changeLanguage(data.user.language);
                    }
                }
            }

            // Fetch user preferences separately
            const prefsResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/preferences`);
            if (prefsResponse.ok) {
                const data = await prefsResponse.json();
                if (data.preferences) {
                    const prefs = data.preferences;

                    // Load language preference from user_preferences table
                    if (prefs.language) {
                        dispatch(setLanguageAction(prefs.language));
                        i18n.changeLanguage(prefs.language);
                        localStorage.setItem('language', prefs.language);
                    }

                    // Load display name preference
                    if (prefs.display_name_preference !== undefined) {
                        setDisplayName(prefs.display_name_preference);
                        dispatch(updateData({ display_name_preference: prefs.display_name_preference }));
                    }

                    // Load notification preferences
                    if (prefs.in_app_notifications !== undefined) setInAppNotifications(prefs.in_app_notifications);
                    if (prefs.email_notifications !== undefined) setEmailNotifications(prefs.email_notifications);
                    if (prefs.push_notifications !== undefined) setPushNotifications(prefs.push_notifications);
                    if (prefs.project_updates !== undefined) setProjectUpdates(prefs.project_updates);
                    if (prefs.comment_notifications !== undefined) setCommentNotifications(prefs.comment_notifications);
                    if (prefs.message_notifications !== undefined) setMessageNotifications(prefs.message_notifications);

                    // Load privacy preferences
                    if (prefs.profile_visibility !== undefined) setAccountPrivacy(prefs.profile_visibility);

                    // TEMPORARILY DISABLED - Load modal preferences
                    // if (prefs.auto_close_modals !== undefined) setAutoCloseModals(prefs.auto_close_modals);
                    // if (prefs.modal_animations !== undefined) setModalAnimations(prefs.modal_animations);

                    // TEMPORARILY DISABLED - Load behavior preferences
                    // if (prefs.auto_refresh !== undefined) setAutoRefresh(prefs.auto_refresh);
                    // if (prefs.confirm_before_action !== undefined) setConfirmBeforeAction(prefs.confirm_before_action);

                    // TEMPORARILY DISABLED - Load performance preferences
                    // if (prefs.load_animations !== undefined) setLoadAnimations(prefs.load_animations);
                    // if (prefs.prefetch_data !== undefined) setPrefetchData(prefs.prefetch_data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch user settings:", error);
        }
    };

    const handleLanguageChange = async (newLanguage: string) => {
        setLoadingLanguage(true);
        
        // Update Redux store
        dispatch(setLanguageAction(newLanguage));
        
        // Change the UI language immediately
        i18n.changeLanguage(newLanguage);
        
        // Save to backend if authenticated
        if (isAuthenticated) {
            try {
                const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/preferences/language`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ language: newLanguage }),
                });

                if (!response.ok) {
                    console.error('Failed to update language preference');
                }
            } catch (error) {
                console.error('Error updating language preference:', error);
            }
        }
        
        // Always save to localStorage for i18n persistence
        localStorage.setItem('language', newLanguage);
        
        setLoadingLanguage(false);
    };

    const checkUsernameAvailability = async (username: string) => {
        if (!username || username.length < 3) {
            setUsernameError(t('settings.account.usernameMinLength'));
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError(t('settings.account.usernameError'));
            return false;
        }

        // Skip check if username hasn't changed
        if (username === user?.username) {
            setUsernameError('');
            return true;
        }

        try {
            setIsCheckingUsername(true);
            const response = await fetch(`${API_BASE_URL}/api/check-username?username=${username}`);
            const data = await response.json();

            if (!response.ok || data.exists) {
                setUsernameError(t('settings.account.usernameTaken'));
                return false;
            }

            setUsernameError('');
            return true;
        } catch (error) {
            console.error('Error checking username:', error);
            setUsernameError(t('settings.account.checkingAvailability'));
            return false;
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const checkEmailAvailability = async (email: string) => {
        if (!email) {
            setEmailError(t('settings.account.emailRequired'));
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError(t('settings.account.invalidEmailFormat'));
            return false;
        }

        // Skip check if email hasn't changed
        if (email === user?.email) {
            setEmailError('');
            return true;
        }

        try {
            setIsCheckingEmail(true);
            const response = await fetch(`${API_BASE_URL}/api/check-email?email=${email}`);
            const data = await response.json();

            if (!response.ok || data.exists) {
                setEmailError(t('settings.account.emailInUse'));
                return false;
            }

            setEmailError('');
            return true;
        } catch (error) {
            console.error('Error checking email:', error);
            setEmailError(t('settings.account.checkingEmail'));
            return false;
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsername(value);
        await checkUsernameAvailability(value);
    };

    const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        await checkEmailAvailability(value);
    };

    const updateUsername = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = await checkUsernameAvailability(username);
        if (!isValid) return;

        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/update-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessage(t('settings.account.usernameUpdateSuccess'));
                setIsEditingUsername(false); // Close edit mode
                // Update user state if needed
                if (data.username) {
                    dispatch(updateData({ username: data.username }));
                }
            } else {
                const data = await response.json();
                setError(data.error || t('settings.account.updateFailed'));
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = await checkEmailAvailability(email);
        if (!isValid) return;

        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/update-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setMessage(t('settings.account.emailUpdateSuccess'));
            } else {
                const data = await response.json();
                setError(data.error || t('settings.account.updateFailed'));
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const updatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        setPasswordError('');
        setError(null);
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordError(t('settings.security.passwordMismatch'));
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError(t('settings.security.passwordMinLength'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/update-password-logged-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                }),
            });

            if (response.ok) {
                setMessage(t('settings.security.passwordUpdateSuccess'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await response.json();
                setError(data.error || t('settings.security.passwordUpdateFailed'));
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Save settings function
    const saveSettings = async () => {
        const preferences = {
            // Notification preferences (snake_case for backend)
            in_app_notifications: inAppNotifications,
            email_notifications: emailNotifications,
            push_notifications: pushNotifications,
            project_updates: projectUpdates,
            comment_notifications: commentNotifications,
            message_notifications: messageNotifications,
            // Privacy
            profile_visibility: accountPrivacy,
            // TEMPORARILY DISABLED
            // auto_close_modals: autoCloseModals,
            // modal_animations: modalAnimations,
            // auto_refresh: autoRefresh,
            // confirm_before_action: confirmBeforeAction,
            // load_animations: loadAnimations,
            // prefetch_data: prefetchData
        };

        try {
            // Save to backend
            const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences),
            });

            if (response.ok) {
                setMessage(t('settings.saveSuccessMessage'));
                setTimeout(() => setMessage(null), 3000);

                // Also save to localStorage as backup
                localStorage.setItem('userSettings', JSON.stringify({
                    displayName,
                    inAppNotifications,
                    emailNotifications,
                    pushNotifications,
                    projectUpdates,
                    commentNotifications,
                    messageNotifications,
                    accountPrivacy
                    // TEMPORARILY DISABLED
                    // autoCloseModals,
                    // modalAnimations,
                    // autoRefresh,
                    // confirmBeforeAction,
                    // loadAnimations,
                    // prefetchData
                }));
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to save preferences');
                setTimeout(() => setError(null), 3000);
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            setError('Error saving preferences');
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                        <h2 className="text-2xl font-bold text-white">{t('settings.title')}</h2>
                        <p className="text-indigo-100">{t('settings.subtitle')}</p>
                    </div>

                    <div className="p-6">
                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-slate-600 mb-6 overflow-x-auto pb-1">
                            <button
                                onClick={() => handleTabChange('profile')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'profile'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t('settings.tabs.profile')}
                            </button>
                            <button
                                onClick={() => handleTabChange('notifications')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'notifications'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t('settings.tabs.notifications')}
                            </button>
                            <button
                                onClick={() => handleTabChange('security')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'security'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t('settings.tabs.security')}
                            </button>
                            <button
                                onClick={() => handleTabChange('ai-settings')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'ai-settings'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                AI API Keys
                            </button>
                            <button
                                onClick={() => handleTabChange('ai-service-preferences')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'ai-service-preferences'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                AI Services
                            </button>
                            <button
                                onClick={() => handleTabChange('appearance')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'appearance'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t('settings.tabs.appearance')}
                            </button>
                            {/* TEMPORARILY DISABLED - Preferences Tab */}
                            {/* <button
                                onClick={() => setActiveSection('preferences')}
                                className={`py-2 px-4 font-medium whitespace-nowrap ${activeSection === 'preferences'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t('settings.tabs.preferences')}
                            </button> */}
                        </div>

                        {/* Global Messages */}
                        {message && (
                            <div className="mb-6 bg-green-50 p-4 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-green-800">{message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 bg-red-50 p-4 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile & Account Settings */}
                        {activeSection === 'profile' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{t('settings.profile.title')}</h2>
                                    <p className="text-sm text-gray-600 dark:text-slate-400">{t('settings.profile.subtitle')}</p>
                                </div>

                                {/* Language Setting - Highlighted */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                                    <div className="flex items-center mb-3">
                                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">
                                            {t('settings.language.title')}
                                        </h3>
                                    </div>
                                    <select
                                        value={reduxLanguage}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        disabled={loadingLanguage}
                                        className="w-full p-3 border-2 border-indigo-300 dark:border-indigo-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-700 dark:text-slate-100 text-lg"
                                    >
                                        <option value="en">🇺🇸 English</option>
                                        <option value="zh">🇨🇳 中文 (Chinese)</option>
                                        <option value="es">🇲🇽 Español (Spanish)</option>
                                    </select>
                                    <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                                        {t('settings.language.description')}
                                    </p>
                                    {loadingLanguage && (
                                        <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                                            {t('settings.language.updating')}
                                        </p>
                                    )}
                                </div>

                                {/* Display Name Setting */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">{t('settings.displayName.title')}</h3>
                                    <select
                                        value={displayName}
                                        onChange={async (e) => {
                                            const newPreference = parseInt(e.target.value);
                                            setDisplayName(newPreference);

                                            // Update Redux state immediately for instant UI update
                                            dispatch(updateData({
                                                display_name_preference: newPreference,
                                            }));

                                            // Save to backend if authenticated
                                            if (isAuthenticated) {
                                                try {
                                                    const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/preferences/display-name`, {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({ preference: newPreference }),
                                                    });

                                                    if (response.ok) {
                                                        setMessage(t('settings.displayName.updateSuccess'));
                                                        setTimeout(() => setMessage(null), 3000);
                                                    } else {
                                                        console.error('Failed to update display name preference');
                                                        setError('Failed to save display name preference');
                                                        setTimeout(() => setError(null), 3000);
                                                    }
                                                } catch (error) {
                                                    console.error('Error updating display name preference:', error);
                                                    setError('Error updating display name preference');
                                                    setTimeout(() => setError(null), 3000);
                                                }
                                            }

                                            // Also save to localStorage as backup
                                            localStorage.setItem('displayNamePreference', newPreference.toString());
                                        }}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100"
                                    >
                                        <option value={0}>{t('settings.displayName.options.preferredName')}</option>
                                        <option value={1}>{t('settings.displayName.options.firstName')}</option>
                                        <option value={2}>{t('settings.displayName.options.username')}</option>
                                    </select>
                                </div>

                                {/* Account Privacy Setting */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">{t('settings.privacy.title')}</h3>
                                    <select
                                        value={accountPrivacy}
                                        onChange={(e) => setAccountPrivacy(parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100"
                                    >
                                        <option value={0}>{t('settings.privacy.options.public')}</option>
                                        <option value={1}>{t('settings.privacy.options.private')}</option>
                                        <option value={2}>{t('settings.privacy.options.friendsOnly')}</option>
                                    </select>
                                </div>

                                {/* Username Section */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">{t('settings.account.updateUsername')}</h3>
                                        {!isEditingUsername && (
                                            <button
                                                onClick={() => setIsEditingUsername(true)}
                                                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                            >
                                                {t('common.edit')}
                                            </button>
                                        )}
                                    </div>
                                    <form onSubmit={updateUsername} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('settings.account.username')}</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={handleUsernameChange}
                                                readOnly={!isEditingUsername}
                                                className={`w-full px-4 py-2 border ${usernameError ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isEditingUsername ? 'bg-white dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-900'} dark:text-slate-100`}
                                                required
                                            />
                                            {isEditingUsername && isCheckingUsername && (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('settings.account.checkingAvailability')}</p>
                                            )}
                                            {isEditingUsername && usernameError && (
                                                <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                                            )}
                                            {isEditingUsername && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                                    {t('settings.account.usernameHint')}
                                                </p>
                                            )}
                                        </div>
                                        {isEditingUsername && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isLoading || isCheckingUsername || !!usernameError}
                                                    className={`px-4 py-2 rounded-md text-white ${isLoading || isCheckingUsername || !!usernameError
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                                        }`}
                                                >
                                                    {isLoading ? t('settings.account.updating') : t('settings.account.updateUsernameButton')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingUsername(false);
                                                        setUsername(user?.username || '');
                                                        setUsernameError('');
                                                    }}
                                                    className="px-4 py-2 rounded-md text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                </div>

                                {/* Email Section */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">{t('settings.account.updateEmail')}</h3>
                                    <form onSubmit={updateEmail} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('settings.account.currentEmail')}</label>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                readOnly
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 dark:text-slate-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t('settings.account.newEmail')}</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={handleEmailChange}
                                                className={`w-full px-4 py-2 border ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100`}
                                                required
                                            />
                                            {isCheckingEmail && (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('settings.account.checkingEmail')}</p>
                                            )}
                                            {emailError && (
                                                <p className="mt-1 text-sm text-red-600">{emailError}</p>
                                            )}
                                        </div>
                                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                            {t('settings.account.emailVerificationNote')}
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isLoading || isCheckingEmail || !!emailError}
                                            className={`px-4 py-2 rounded-md text-white ${isLoading || isCheckingEmail || !!emailError
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                                }`}
                                        >
                                            {isLoading ? t('settings.account.sendingVerification') : t('settings.account.updateEmailButton')}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Notifications Settings */}
                        {activeSection === 'notifications' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{t('settings.notifications.title')}</h2>
                                    <p className="text-sm text-gray-600 dark:text-slate-400">{t('settings.notifications.subtitle')}</p>
                                </div>

                                {/* Delivery Methods Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">
                                            {t('settings.notifications.deliveryMethods')}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.deliveryMethodsDesc')}</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                                            <input
                                                type="checkbox"
                                                checked={inAppNotifications}
                                                onChange={() => setInAppNotifications(!inAppNotifications)}
                                                className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.inApp.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.inApp.description')}</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                                            <input
                                                type="checkbox"
                                                checked={emailNotifications}
                                                onChange={() => setEmailNotifications(!emailNotifications)}
                                                className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.email.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.email.description')}</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                                            <input
                                                type="checkbox"
                                                checked={pushNotifications}
                                                onChange={() => setPushNotifications(!pushNotifications)}
                                                className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.push.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.push.description')}</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Notification Types Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">
                                            {t('settings.notifications.notificationTypes')}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.notificationTypesDesc')}</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                                            <input
                                                type="checkbox"
                                                checked={projectUpdates}
                                                onChange={() => setProjectUpdates(!projectUpdates)}
                                                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.projectUpdates.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.projectUpdates.description')}</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                                            <input
                                                type="checkbox"
                                                checked={commentNotifications}
                                                onChange={() => setCommentNotifications(!commentNotifications)}
                                                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.comments.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.comments.description')}</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                                            <input
                                                type="checkbox"
                                                checked={messageNotifications}
                                                onChange={() => setMessageNotifications(!messageNotifications)}
                                                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <strong className="text-gray-900 dark:text-slate-100">{t('settings.notifications.messages.title')}</strong>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{t('settings.notifications.messages.description')}</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong className="font-semibold">{t('settings.notifications.quickTip')}</strong> {t('settings.notifications.quickTipDesc')}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeSection === 'security' && (
                            <div className="space-y-6">
                                {/* Security Title */}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t('settings.security.title')}</h2>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.security.changePassword')}</h3>
                                    <form onSubmit={updatePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.currentPassword')}</label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.newPassword')}</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className={`w-full px-4 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.confirmNewPassword')}</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`w-full px-4 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                                required
                                            />
                                            {passwordError && (
                                                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {t('settings.security.passwordHint')}
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                                                }`}
                                        >
                                            {isLoading ? t('settings.security.changingPassword') : t('settings.security.changePasswordButton')}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* TEMPORARILY DISABLED - AI Settings Section */}
                        {/* {activeSection === 'ai-settings' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.aiSettings.title')}</h3>
                                    <p className="text-sm text-gray-600 mb-6">
                                        {t('settings.aiSettings.description')}
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.aiSettings.openaiKey')}</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type={showApiKeys.openai ? "text" : "password"}
                                                    value={apiKeys.openai}
                                                    onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                                                    placeholder="sk-..."
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKeys({...showApiKeys, openai: !showApiKeys.openai})}
                                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                                >
                                                    {showApiKeys.openai ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.aiSettings.anthropicKey')}</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type={showApiKeys.anthropic ? "text" : "password"}
                                                    value={apiKeys.anthropic}
                                                    onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                                                    placeholder="sk-ant-..."
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKeys({...showApiKeys, anthropic: !showApiKeys.anthropic})}
                                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                                >
                                                    {showApiKeys.anthropic ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543 7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.aiSettings.googleAiKey')}</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type={showApiKeys.google ? "text" : "password"}
                                                    value={apiKeys.google}
                                                    onChange={(e) => setApiKeys({...apiKeys, google: e.target.value})}
                                                    placeholder="AIza..."
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKeys({...showApiKeys, google: !showApiKeys.google})}
                                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                                >
                                                    {showApiKeys.google ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0 8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                        >
                                            {t('settings.aiSettings.saveApiKeys')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )} */}

                        {/* AI API Keys Settings */}
                        {activeSection === 'ai-settings' && (
                            <AIAPIKeysSection onMessage={setMessage} onError={setError} />
                        )}

                        {/* AI Service Preferences Settings */}
                        {activeSection === 'ai-service-preferences' && (
                            <AIServicePreferencesSection onMessage={setMessage} onError={setError} />
                        )}

                        {/* Appearance Settings */}
                        {activeSection === 'appearance' && (
                            <div className="space-y-6">
                                {/* Theme Setting */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">{t('settings.theme.title')}</h3>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{t('settings.appearance.colorScheme')}</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <label className={`p-4 rounded-lg border-2 flex flex-col items-center cursor-pointer transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                                            <input
                                                type="radio"
                                                value="light"
                                                checked={theme === "light"}
                                                onChange={() => setTheme("light")}
                                                className="sr-only"
                                            />
                                            <div className="w-full h-16 bg-white border border-gray-200 rounded mb-3 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-gray-700 dark:text-slate-300">{t('settings.theme.options.light')}</span>
                                        </label>
                                        <label className={`p-4 rounded-lg border-2 flex flex-col items-center cursor-pointer transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                                            <input
                                                type="radio"
                                                value="dark"
                                                checked={theme === "dark"}
                                                onChange={() => setTheme("dark")}
                                                className="sr-only"
                                            />
                                            <div className="w-full h-16 bg-slate-800 border border-slate-700 rounded mb-3 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-gray-700 dark:text-slate-300">{t('settings.theme.options.dark')}</span>
                                        </label>
                                        <label className="p-4 rounded-lg border-2 flex flex-col items-center cursor-pointer transition-all border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 opacity-50">
                                            <div className="w-full h-16 bg-gradient-to-r from-white via-slate-200 to-slate-800 border border-gray-200 dark:border-slate-600 rounded mb-3 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-gray-500 dark:text-slate-500">Auto (Soon)</span>
                                        </label>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            <strong>{t('settings.appearance.currentTheme')}</strong> {theme === 'light' ? t('settings.appearance.lightMode') : t('settings.appearance.darkMode')}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            {t('settings.appearance.themePersistence')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TEMPORARILY DISABLED - Preferences Settings */}
                        {/* {activeSection === 'preferences' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('settings.modals.title')}</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={autoCloseModals}
                                                onChange={() => setAutoCloseModals(!autoCloseModals)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.modals.autoClose')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={modalAnimations}
                                                onChange={() => setModalAnimations(!modalAnimations)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.modals.enableAnimations')}</span>
                                        </label>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-500">
                                        {t('settings.modals.description')}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('settings.behavior.title')}</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={autoRefresh}
                                                onChange={() => setAutoRefresh(!autoRefresh)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.behavior.autoRefresh')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={confirmBeforeAction}
                                                onChange={() => setConfirmBeforeAction(!confirmBeforeAction)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.behavior.confirmActions')}</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('settings.performance.title')}</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={loadAnimations}
                                                onChange={() => setLoadAnimations(!loadAnimations)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.performance.enableAnimations')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={prefetchData}
                                                onChange={() => setPrefetchData(!prefetchData)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span>{t('settings.performance.prefetchData')}</span>
                                        </label>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-500">
                                        {t('settings.performance.description')}
                                    </p>
                                </div>
                            </div>
                        )} */}

                        {/* Save Button - Only show for sections without their own save mechanisms */}
                        {!['profile', 'security'].includes(activeSection) && (
                            <div className="mt-8">
                                <button
                                    onClick={saveSettings}
                                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-md font-medium hover:from-indigo-600 hover:to-purple-700 transition-colors shadow-md"
                                >
                                    {t('settings.saveButton')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Help Button */}
            {/* <HelpButton tutorialType="project" variant="fab" showMenu={true} /> */}
        </div>
    );
};

export default Settings;