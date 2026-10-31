import React, { useState, useEffect, useRef, Fragment } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from 'react-i18next';
import config from "../../config";
import type { FormData } from "../../types/profile/formData";
import {
    schools,
    skillSuggestions,
    interestSuggestions,
    countries,
    fieldOfStudySuggestions as importedFieldOfStudySuggestions,
    skillCategories,
    interestCategories
} from "../../components/profile/datasets/createProfileData";
import SchoolEmailVerification from "../../components/profile/SchoolEmailVerification";
import TagSelector from "../../components/TagSelector";
import TagWithLevelSelector from "../../components/TagWithLevelSelector";
import { updateData, logout } from "../../store/auth";
import fetchWithAuth from "../../hooks/fetchWithAuth";
import AvatarSelectionModal from "../../components/profile/AvatarSelectionModal";
import store from "../../store/store";

const { API_BASE_URL } = config;

// Simplified language list with most common languages (in native script only)
const commonLanguages = [
    "English",
    "中文",
    "Español",
    "हिन्दी",
    "العربية",
    "Français",
    "Português",
    "Русский",
    "日本語",
    "Deutsch",
    "한국어",
    "Italiano",
    "Türkçe",
    "Bahasa Indonesia",
    "Nederlands",
];

const fieldOfStudySuggestions = importedFieldOfStudySuggestions || [];

const EditProfileMultiStep: React.FC = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.auth.user);

    // Sync language from localStorage on mount and listen for changes
    useEffect(() => {
        // Initial sync from localStorage
        const storedLanguage = localStorage.getItem('language');
        if (storedLanguage && storedLanguage !== i18n.language) {
            i18n.changeLanguage(storedLanguage);
        }

        // Listen for storage changes (cross-tab synchronization)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'language' && e.newValue) {
                i18n.changeLanguage(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [i18n]);
    const [isLoading, setIsLoading] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [validationError, setValidationError] = useState<string>('');
    const [formData, setFormData] = useState<FormData>({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        username: user?.username || "",
        prefer_name: "",
        avatar: user?.avatar || null,
        website: "",
        field: "",
        email: user?.email || "",
        school_email: "",
        school_email_verified: false,
        phone: "",
        school: "",
        biography: "",
        state: "",
        city: "",
        zipcode: "",
        country: "",
        language: Array.isArray(user?.language)
            ? user?.language
            : (typeof user?.language === 'string' && user?.language
                ? user.language.split(',').map((lang: string) => lang.trim()).filter((lang: string) => lang !== '')
                : []),
        skills: Array.isArray(user?.skills)
            ? user?.skills.map((skill: any) => {
                if (typeof skill === 'string') {
                    return { name: skill, level: 3 };
                } else {
                    return {
                        id: skill.id,
                        name: skill.name,
                        level: skill.level || 3,
                        customName: skill.customName
                    };
                }
            })
            : [],
        interests: Array.isArray(user?.interests)
            ? user?.interests.map((interest: any) => {
                if (typeof interest === 'string') {
                    return { name: interest, level: 3 };
                } else {
                    return {
                        id: interest.id,
                        name: interest.name,
                        level: interest.level || 3,
                        customName: interest.customName
                    };
                }
            })
            : [],
        resume: null,
    });
    const [usernameError, setUsernameError] = useState<string>('');
    const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean>(false);
    const usernameTimeout = useRef<number | null>(null);
    const [canChangeUsername, setCanChangeUsername] = useState(true);

    const totalSteps = 4;

    const steps = [
        { number: 1, title: t('profile.editProfileMultiStep.steps.basicInfo'), icon: "👤" },
        { number: 2, title: t('profile.editProfileMultiStep.steps.education'), icon: "🎓" },
        { number: 3, title: t('profile.editProfileMultiStep.steps.skills'), icon: "💡" },
        { number: 4, title: t('profile.editProfileMultiStep.steps.about'), icon: "✨" }
    ];

    useEffect(() => {
        if (formData.avatar && typeof formData.avatar === 'string') {
            setCroppedImage(formData.avatar);
        }
    }, [formData.avatar]);

    useEffect(() => {
        if (user?.email && (!formData.email || formData.email !== user.email)) {
            setFormData(prev => ({
                ...prev,
                email: user.email || ""
            }));
        }
    }, [user?.email, formData.email]);

    const handleSuggestionClick = (suggestion: string) => {
        setFormData({ ...formData, field: suggestion });
        setShowSuggestions(false);
    };

    const handleBlur = () => {
        setTimeout(() => setShowSuggestions(false), 200);
    };

    const checkUsernameAvailability = async (username: string) => {
        if (!username || username.length < 3) {
            setUsernameError('Username must be at least 3 characters long');
            setUsernameAvailable(false);
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError(t('profile.editProfileMultiStep.basicInfo.usernameError'));
            setUsernameAvailable(false);
            return false;
        }

        if (username === user?.username) {
            setUsernameError('');
            setUsernameAvailable(true);
            return true;
        }

        try {
            setIsCheckingUsername(true);
            const response = await fetch(`${API_BASE_URL}/api/check-username?username=${username}`);
            const data = await response.json();

            if (!response.ok || data.exists) {
                setUsernameError(t('profile.editProfileMultiStep.basicInfo.usernameTaken'));
                setUsernameAvailable(false);
                return false;
            }

            setUsernameError('');
            setUsernameAvailable(true);
            return true;
        } catch (error) {
            setUsernameError(t('profile.editProfileMultiStep.errors.unknownError'));
            setUsernameAvailable(false);
            return false;
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === "username") {
            if (value === "" || /^[a-zA-Z0-9_]*$/.test(value)) {
                setFormData(prevState => ({ ...prevState, username: value }));

                if (usernameTimeout.current) {
                    clearTimeout(usernameTimeout.current);
                }

                setUsernameAvailable(false);

                if (value.length >= 3) {
                    setIsCheckingUsername(true);
                    usernameTimeout.current = window.setTimeout(() => {
                        checkUsernameAvailability(value);
                    }, 800);
                } else {
                    setIsCheckingUsername(false);
                    setUsernameError(value.length > 0 ? t('profile.editProfileMultiStep.basicInfo.usernameMinLength') : '');
                }
            }
            return;
        }

        setFormData(prevState => ({ ...prevState, [name]: value }));

        if (name === "field") {
            const safeValue = value || '';
            const filtered = fieldOfStudySuggestions.filter((suggestion) =>
                suggestion.toLowerCase().includes(safeValue.toLowerCase())
            );
            setFilteredSuggestions(filtered);
            setShowSuggestions(!!safeValue);
        }
    };

    const handleAvatarSelect = (avatarUrl: string) => {
        setFormData(prev => ({
            ...prev,
            avatar: avatarUrl
        }));
    };

    useEffect(() => {
        // Only fetch user data once when component mounts and data hasn't been loaded yet
        if (dataLoaded) return;

        const fetchUserData = async () => {
            try {
                const token = store.getState().auth.token;
                if (!token || !user) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/my-profile`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`API returned status ${response.status}`);
                }

                const data = await response.json();

                    if (data.user) {
                        const hasUsername = data.user.username && data.user.username.trim() !== '';

                        let processedSkills = [];
                        if (Array.isArray(data.user.skills)) {
                            processedSkills = data.user.skills.map((skill: any) => {
                                if (typeof skill === 'string') {
                                    return { name: skill, level: 3 };
                                } else {
                                    return {
                                        id: skill.id,
                                        name: skill.name,
                                        level: skill.level || 3,
                                        customName: skill.custom_name || skill.customName
                                    };
                                }
                            });
                        }

                        let processedInterests = [];
                        if (Array.isArray(data.user.interests)) {
                            processedInterests = data.user.interests.map((interest: any) => {
                                if (typeof interest === 'string') {
                                    return { name: interest, level: 3 };
                                } else {
                                    return {
                                        id: interest.id,
                                        name: interest.name,
                                        level: interest.level || 3,
                                        customName: interest.custom_name || interest.customName
                                    };
                                }
                            });
                        }

                        setFormData(prev => ({
                            ...prev,
                            username: data.user.username || "",
                            first_name: data.user.first_name || "",
                            last_name: data.user.last_name || "",
                            prefer_name: data.user.preferred_name || "",
                            email: data.user.email || "",
                            school_email: data.user.school_email || "",
                            avatar: data.user.avatar_url || "",
                            biography: data.user.biography || "",
                            skills: processedSkills,
                            interests: processedInterests,
                            language: Array.isArray(data.user.language)
                                ? data.user.language
                                : (typeof data.user.language === 'string' && data.user.language
                                    ? data.user.language.split(',').map((lang: string) => lang.trim()).filter((lang: string) => lang !== '')
                                    : []),
                            field: data.user.field || "",
                            website: data.user.website || "",
                            school_email_verified: data.user.school_email_verified || false,
                            phone: data.user.phone || "",
                            school: data.user.school || "",
                            state: data.user.state || "",
                            city: data.user.city || "",
                            country: data.user.country || "",
                            zipcode: data.user.zip_code || "",
                        }));

                        setCroppedImage(data.user.avatar_url || "");
                        setCanChangeUsername(!hasUsername);
                        setDataLoaded(true); // Mark data as loaded
                    }
                } catch (error) {
                    // Handle error silently
                } finally {
                    setIsLoading(false);
                    setDataLoaded(true); // Mark as loaded even on error to prevent retries
                }
            };

        fetchUserData();
    }, [dataLoaded]); // Only run when dataLoaded is false

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();


        Object.keys(formData).forEach((key) => {
            const value = (formData as any)[key];
            if (key === "skills" || key === "interests") {
                // Send skills and interests as JSON arrays
                const jsonValue = JSON.stringify(value);
                data.append(key, jsonValue);
            } else if (key === "language") {
                // Send all selected languages as a comma-separated string
                const langValue = Array.isArray(value) ? value.join(",") : "";
                data.append(key, langValue);
            } else if (value) {
                data.append(key, value);
            }
        });

        try {
            const state = store.getState();

            if (!state.auth.token) {
                alert(t('profile.editProfileMultiStep.errors.sessionExpired'));
                window.location.href = "/login";
                return;
            }

            // Determine if this is a profile update or creation
            // Check if user has a profile shortID (sid) which indicates an existing profile
            const isProfileUpdate = user?.sid ? true : false;

            // Use appropriate endpoint and method
            const endpoint = isProfileUpdate ? `${API_BASE_URL}/api/profile` : `${API_BASE_URL}/api/create-profile`;
            const method = isProfileUpdate ? "PUT" : "POST";

            const response = await fetchWithAuth(endpoint, {
                method: method,
                body: data,
            });

            if (response.ok) {
                dispatch(
                    updateData({
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        avatar: formData.avatar,
                    })
                );

                alert(isProfileUpdate ? t('profile.editProfileMultiStep.success.profileUpdated') : t('profile.editProfileMultiStep.success.profileCreated'));

                // Redirect to my-profile for updates, home for creation
                window.location.href = isProfileUpdate ? "/my-profile" : "/home";
            } else {
                const errorData = await response.json().catch(() => ({ error: t('profile.editProfileMultiStep.errors.updateFailed') }));
                alert(`${t('profile.editProfileMultiStep.errors.updateFailed')}: ${errorData.error || t('profile.editProfileMultiStep.errors.unknownError')}`);
            }
        } catch (error) {
            if (String(error).includes("Session expired") || String(error).includes("log in again")) {
                alert(t('profile.editProfileMultiStep.errors.sessionExpired'));
                dispatch(logout());
                window.location.href = "/login";
            } else {
                alert(`${t('profile.editProfileMultiStep.errors.unknownError')}: ${error}`);
            }
        }
    };

    const validateCurrentStep = () => {
        setValidationError(''); // Clear previous errors

        switch (currentStep) {
            case 1:
                // Validate Basic Information
                if (!formData.first_name?.trim()) {
                    setValidationError(t('profile.editProfileMultiStep.validation.firstNameRequired'));
                    // Scroll to first name field
                    document.querySelector('[name="first_name"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                if (!formData.last_name?.trim()) {
                    setValidationError(t('profile.editProfileMultiStep.validation.lastNameRequired'));
                    document.querySelector('[name="last_name"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                if (!formData.username?.trim()) {
                    setValidationError(t('profile.editProfileMultiStep.validation.usernameRequired'));
                    document.querySelector('[name="username"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                if (canChangeUsername && formData.username.length < 3) {
                    setValidationError(t('profile.editProfileMultiStep.validation.usernameMinLength'));
                    document.querySelector('[name="username"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                if (canChangeUsername && (usernameError || (formData.username.length >= 3 && !usernameAvailable))) {
                    setValidationError(t('profile.editProfileMultiStep.validation.usernameInvalid'));
                    document.querySelector('[name="username"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                // Avatar is mandatory
                if (!formData.avatar && !croppedImage) {
                    setValidationError(t('profile.editProfileMultiStep.validation.avatarRequired'));
                    // Scroll to avatar section
                    document.querySelector('.avatar-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
                return true;
            case 2:
                // Education & Location - all optional
                return true;
            case 3:
                // Skills & Interests - optional but recommended
                return true;
            case 4:
                // About You - optional
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            if (validateCurrentStep()) {
                setValidationError(''); // Clear any validation errors
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setValidationError(''); // Clear validation errors when going back
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('profile.editProfileMultiStep.basicInfo.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('profile.editProfileMultiStep.basicInfo.subtitle')}</p>
                        </div>

                        {!formData.username && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            {t('profile.editProfileMultiStep.basicInfo.usernameWarning')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Name fields first */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.firstName')} *</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.lastName')} *</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.preferredName')}</label>
                                <input
                                    type="text"
                                    name="prefer_name"
                                    value={formData.prefer_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                    placeholder={t('profile.editProfileMultiStep.basicInfo.preferredNamePlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.username')} *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        readOnly={!canChangeUsername}
                                        required={canChangeUsername}
                                        className={`w-full px-4 py-3 border ${usernameError ? 'border-red-500 dark:border-red-400' :
                                            usernameAvailable ? 'border-green-500 dark:border-green-400' :
                                                'border-gray-300 dark:border-slate-600'
                                            } rounded-lg ${!canChangeUsername ? 'bg-gray-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400'} text-slate-900 dark:text-slate-100 transition-colors text-base`}
                                        onChange={handleInputChange}
                                        placeholder={t('profile.editProfileMultiStep.basicInfo.usernamePlaceholder')}
                                    />
                                    {canChangeUsername && formData.username.length >= 3 && !isCheckingUsername && (
                                        <div className="absolute right-3 top-3.5">
                                            {usernameAvailable && (
                                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            )}
                                            {!usernameAvailable && formData.username.length >= 3 && (
                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {canChangeUsername && (
                                    <div className="mt-1">
                                        {isCheckingUsername && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.editProfileMultiStep.basicInfo.checkingAvailability')}</p>
                                        )}
                                        {usernameError && (
                                            <p className="text-sm text-red-500">{usernameError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profile Picture Section - After name fields */}
                        <div className="avatar-section bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
                                {t('profile.editProfileMultiStep.basicInfo.profilePicture')}
                                <span className="text-red-500 ml-1">*</span>
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('profile.editProfileMultiStep.basicInfo.profilePictureDescription')}</p>
                            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
                                <div className="relative">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-blue-100 dark:border-slate-600 overflow-hidden bg-gray-100 dark:bg-slate-700 shadow-lg">
                                        {croppedImage ? (
                                            <img
                                                src={croppedImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                                onError={() => {
                                                    setCroppedImage(null);
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-16 h-16 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-sky-500 text-white p-2.5 rounded-full shadow-lg hover:from-blue-600 hover:to-sky-600 transition-all hover:scale-105"
                                        disabled={!formData.first_name && !formData.last_name}
                                        title={!formData.first_name && !formData.last_name ? t('profile.editProfileMultiStep.basicInfo.pleaseEnterName') : t('profile.editProfileMultiStep.basicInfo.changeAvatar')}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        disabled={!formData.first_name && !formData.last_name}
                                        className={`inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-full text-sm font-medium transition-all ${
                                            !formData.first_name && !formData.last_name
                                                ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                                                : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        }`}
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {t('profile.editProfileMultiStep.basicInfo.chooseAvatar')}
                                    </button>
                                    {!formData.first_name && !formData.last_name && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                            💡 {t('profile.editProfileMultiStep.basicInfo.nameRequiredForAvatar')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.email')}</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email || user?.email || ""}
                                    readOnly
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.basicInfo.website')}</label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                    placeholder={t('profile.editProfileMultiStep.basicInfo.websitePlaceholder')}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('profile.editProfileMultiStep.education.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('profile.editProfileMultiStep.education.subtitle')}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.education.school')}</label>
                                    <input
                                        type="text"
                                        name="school"
                                        list="school-options"
                                        value={formData.school}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                        placeholder={t('profile.editProfileMultiStep.education.schoolPlaceholder')}
                                    />
                                    <datalist id="school-options">
                                        {schools.map((school, index) => (
                                            <option key={index} value={school} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.education.fieldOfStudy')}</label>
                                    <input
                                        type="text"
                                        name="field"
                                        value={formData.field}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={handleBlur}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                        placeholder={t('profile.editProfileMultiStep.education.fieldOfStudyPlaceholder')}
                                    />
                                    {showSuggestions && filteredSuggestions.length > 0 && (
                                        <ul className="absolute z-10 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
                                            {filteredSuggestions.map((suggestion, index) => (
                                                <li
                                                    key={index}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-200 dark:border-slate-700 last:border-b-0 text-slate-800 dark:text-slate-200"
                                                >
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div id="school-email">
                                <SchoolEmailVerification formData={formData} setFormData={setFormData} />
                            </div>

                            <div className="border-t dark:border-slate-700 pt-6">
                                <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">{t('profile.editProfileMultiStep.education.location')}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.education.country')}</label>
                                        <input
                                            type="text"
                                            name="country"
                                            list="country-options"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                            placeholder={t('profile.editProfileMultiStep.education.countryPlaceholder')}
                                        />
                                        <datalist id="country-options">
                                            {countries.map((country, index) => (
                                                <option key={index} value={country} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.education.state')}</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                            placeholder={t('profile.editProfileMultiStep.education.statePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.education.city')}</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors text-sm sm:text-base"
                                            placeholder={t('profile.editProfileMultiStep.education.cityPlaceholder')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('profile.editProfileMultiStep.skillsInterests.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('profile.editProfileMultiStep.skillsInterests.subtitle')}</p>
                        </div>

                        <div className="space-y-8">
                            <TagWithLevelSelector
                                label={t('profile.editProfileMultiStep.skillsInterests.skills')}
                                suggestions={skillSuggestions}
                                selectedTags={formData.skills}
                                onAddTag={(tag, level) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        skills: [...prev.skills, { name: tag, level }],
                                    }));
                                }}
                                onRemoveTag={(tagName) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        skills: prev.skills.filter((item) => item.name !== tagName),
                                    }));
                                }}
                                onUpdateLevel={(tagName, level) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        skills: prev.skills.map((item) =>
                                            item.name === tagName ? { ...item, level } : item
                                        ),
                                    }));
                                }}
                                placeholder={t('profile.editProfileMultiStep.skillsInterests.skillsPlaceholder')}
                                bubbleColor="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                levelLabel={t('profile.editProfileMultiStep.skillsInterests.proficiency')}
                                type="skill"
                                categories={skillCategories}
                            />

                            <TagWithLevelSelector
                                label={t('profile.editProfileMultiStep.skillsInterests.interests')}
                                suggestions={interestSuggestions}
                                selectedTags={formData.interests}
                                onAddTag={(tag, level) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        interests: [...prev.interests, { name: tag, level }],
                                    }));
                                }}
                                onRemoveTag={(tagName) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        interests: prev.interests.filter((item) => item.name !== tagName),
                                    }));
                                }}
                                onUpdateLevel={(tagName, level) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        interests: prev.interests.map((item) =>
                                            item.name === tagName ? { ...item, level } : item
                                        ),
                                    }));
                                }}
                                placeholder={t('profile.editProfileMultiStep.skillsInterests.interestsPlaceholder')}
                                bubbleColor="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                                levelLabel="Interest Level"
                                type="interest"
                                categories={interestCategories}
                            />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('profile.editProfileMultiStep.aboutYou.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('profile.editProfileMultiStep.aboutYou.subtitle')}</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.aboutYou.biography')}</label>
                                <textarea
                                    name="biography"
                                    value={formData.biography}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors h-32 sm:h-40 resize-none text-sm sm:text-base"
                                    placeholder={t('profile.editProfileMultiStep.aboutYou.biographyPlaceholder')}
                                ></textarea>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t('profile.editProfileMultiStep.aboutYou.biographyHint')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile.editProfileMultiStep.aboutYou.languages')}</label>
                                <TagSelector
                                    label=""
                                    suggestions={commonLanguages}
                                    selectedTags={Array.isArray(formData.language) ? formData.language : []}
                                    onAddTag={(tag) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            language: Array.isArray(prev.language)
                                                ? [...prev.language, tag]
                                                : [tag],
                                        }));
                                    }}
                                    onRemoveTag={(tag) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            language: Array.isArray(prev.language)
                                                ? prev.language.filter((t) => t !== tag)
                                                : [],
                                        }));
                                    }}
                                    placeholder={t('profile.editProfileMultiStep.aboutYou.languagesPlaceholder')}
                                    bubbleColor="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                />
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('profile.editProfileMultiStep.aboutYou.languagesHint')}</p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-4 sm:py-10">
            <div className="max-w-4xl mx-auto px-3 sm:px-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-sky-500 dark:from-blue-600 dark:to-sky-600 px-4 sm:px-6 py-4 sm:py-6">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center drop-shadow-sm">
                            {user?.avatar ? t('profile.editProfileMultiStep.pageTitle') : t('profile.editProfileMultiStep.completionTitle')}
                        </h2>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-2 sm:pb-4">
                        <div className="flex justify-center">
                            <div className="flex items-center space-x-0 relative">
                                {steps.map((step, index) => (
                                    <React.Fragment key={step.number}>
                                        <div className="relative flex flex-col items-center z-10">
                                            <div
                                                className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-lg font-semibold transition-all transform ${
                                                    currentStep >= step.number
                                                        ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg scale-110 ring-4 ring-blue-100 dark:ring-blue-900/30"
                                                        : "bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400"
                                                }`}
                                            >
                                                <span className="text-sm sm:text-lg">{step.icon}</span>
                                            </div>
                                            <div className="absolute -bottom-6 sm:-bottom-7 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
                                                <span className={`text-[10px] sm:text-xs font-medium ${
                                                    currentStep >= step.number
                                                        ? "text-blue-600 dark:text-blue-400"
                                                        : "text-gray-400 dark:text-slate-500"
                                                }`}>
                                                    {step.title}
                                                </span>
                                            </div>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className="w-16 sm:w-24 md:w-32 h-1 -mx-3">
                                                <div
                                                    className={`h-full transition-all duration-500 rounded-full ${
                                                        currentStep > step.number
                                                            ? "bg-gradient-to-r from-blue-500 to-sky-500"
                                                            : "bg-gray-300 dark:bg-slate-700"
                                                    }`}
                                                />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        <div className="mb-8 sm:mb-10" /> {/* Spacer for labels */}
                    </div>

                    {/* Form Content */}
                    <form onSubmit={(e) => e.preventDefault()} className="px-4 sm:px-8 py-4 sm:py-6">
                        {/* Validation Error Message */}
                        {validationError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{validationError}</p>
                                </div>
                            </div>
                        )}

                        <div className="min-h-[350px] sm:min-h-[400px]">
                            {renderStepContent()}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`px-4 sm:px-6 py-2.5 rounded-full font-medium transition-all text-sm sm:text-base order-2 sm:order-1 ${
                                    currentStep === 1
                                        ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                                        : "bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-105"
                                }`}
                            >
                                <span className="hidden sm:inline">← {t('profile.editProfileMultiStep.navigation.previous')}</span>
                                <span className="sm:hidden">← {t('profile.editProfileMultiStep.navigation.back')}</span>
                            </button>

                            <div className="flex items-center justify-center space-x-2 order-1 sm:order-2">
                                {steps.map((step) => (
                                    <button
                                        key={step.number}
                                        type="button"
                                        onClick={() => setCurrentStep(step.number)}
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                            currentStep === step.number
                                                ? "bg-gradient-to-r from-blue-500 to-sky-500 w-8 shadow-md"
                                                : "bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 w-2"
                                        }`}
                                        aria-label={`Go to step ${step.number}: ${step.title}`}
                                    />
                                ))}
                            </div>

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-sky-600 transition-all hover:scale-105 shadow-sm text-sm sm:text-base order-3"
                                >
                                    <span className="hidden sm:inline">{t('profile.editProfileMultiStep.navigation.next')} →</span>
                                    <span className="sm:hidden">{t('profile.editProfileMultiStep.navigation.continue')} →</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (validateCurrentStep()) {
                                            handleSubmit(new Event('submit') as any);
                                        }
                                    }}
                                    className="px-6 sm:px-8 py-2.5 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-sky-600 transition-all hover:scale-105 shadow-md text-sm sm:text-base order-3"
                                >
                                    <span className="hidden sm:inline">{user?.avatar ? t('profile.editProfileMultiStep.navigation.updateProfile') : t('profile.editProfileMultiStep.navigation.completeProfile')} ✓</span>
                                    <span className="sm:hidden">{t('profile.editProfileMultiStep.navigation.save')} ✓</span>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Avatar Selection Modal */}
            <AvatarSelectionModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onSelect={handleAvatarSelect}
                currentAvatar={croppedImage}
                firstName={formData.first_name}
                lastName={formData.last_name}
            />
        </div>
    );
};

export default EditProfileMultiStep;