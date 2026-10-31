import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import EmailVerification from "../../components/auth/EmailVerification";
import { FormData } from "../../types/auth/formData";
import config from "../../config";

const { API_BASE_URL } = config

export const Register: React.FC = () => {
    const { t, i18n } = useTranslation();

    // Sync language from localStorage on mount
    useEffect(() => {
        const storedLanguage = localStorage.getItem('language');
        if (storedLanguage && storedLanguage !== i18n.language) {
            i18n.changeLanguage(storedLanguage);
        }
    }, [i18n]);
    const [formData, setFormData] = useState<FormData>({
        email: "",
        confirmEmail: "",
        password: "",
        verifyPassword: "",
    });

    const [step, setStep] = useState<number>(1);
    const [emailValid, setEmailValid] = useState<boolean | null>(null);
    const [emailExists, setEmailExists] = useState<boolean | null>(null);
    const [passwordStrength, setPasswordStrength] = useState<string | null>(null);
    const [verified, setVerified] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear error message when user starts typing again
        if (errorMessage) {
            setErrorMessage(null);
        }
    };

    const handleSignUpWithEmail = () => {
        setStep(2);
    };

    // Check if email is valid format
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setEmailValid(emailRegex.test(formData.email));

        // Reset email exists check when email changes
        if (emailExists) {
            setEmailExists(null);
        }
    }, [formData.email]);

    // Check if email already exists when email is valid and user completes typing
    useEffect(() => {
        const checkEmailExists = async () => {
            if (emailValid && formData.email) {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/api/check-email?email=${encodeURIComponent(formData.email)}`
                    );
                    setEmailExists(response.data.exists);
                } catch (error) {
                    console.error("Error checking email:", error);
                }
            }
        };

        // Add debounce to avoid too many requests
        const debounceTimer = setTimeout(() => {
            checkEmailExists();
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [emailValid, formData.email]);

    useEffect(() => {
        const validatePasswordStrength = (password: string): string | null => {
            if (!password) return null;
            if (password.length < 8) return t('auth.register.password.validation.minLength');
            if (!/[A-Z]/.test(password)) return t('auth.register.password.validation.uppercase');
            if (!/[a-z]/.test(password)) return t('auth.register.password.validation.lowercase');
            if (!/[0-9]/.test(password)) return t('auth.register.password.validation.number');
            if (!/[^A-Za-z0-9]/.test(password)) return t('auth.register.password.validation.special');
            return t('auth.register.password.validation.strong');
        };

        setPasswordStrength(validatePasswordStrength(formData.password));
    }, [formData.password]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setLoading(true);

        try {
            // Check for validation issues
            if (formData.password !== formData.verifyPassword) {
                setErrorMessage(t('auth.register.errors.passwordMismatch'));
                setLoading(false);
                return;
            }

            if (!emailValid) {
                setErrorMessage(t('auth.register.errors.invalidEmail'));
                setLoading(false);
                return;
            }

            if (passwordStrength !== t('auth.register.password.validation.strong')) {
                setErrorMessage(t('auth.register.errors.passwordRequirements'));
                setLoading(false);
                return;
            }

            // Check if email already exists
            if (emailExists) {
                setErrorMessage(t('auth.register.errors.emailExists'));
                setLoading(false);
                return;
            }

            // Check if email is verified
            if (!verified) {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/api/check-email-verified?email=${encodeURIComponent(formData.email)}`
                    );

                    if (response.data.is_verified) {
                        setVerified(true); // Update the state
                    } else {
                        setErrorMessage(t('auth.register.errors.emailNotVerified'));
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    setErrorMessage(t('auth.register.errors.verificationCheckFailed'));
                    setLoading(false);
                    return;
                }
            }

            // Prepare the payload for the API - only email and password
            const payload = {
                email: formData.email,
                password: formData.password,
            };

            // Make a POST request to the backend API
            const response = await axios.post(`${API_BASE_URL}/api/signup`, payload);

            if (response.status === 201) {
                // Registration successful
                const urlParams = new URLSearchParams(window.location.search);
                const redirectPath = urlParams.get('redirect');
                const planId = urlParams.get('plan');
                
                // Construct login URL with redirect if provided
                let loginUrl = "/login?registered=true";
                if (redirectPath) {
                    loginUrl += `&redirect=${encodeURIComponent(redirectPath)}`;
                }
                if (planId) {
                    loginUrl += `&plan=${planId}`;
                }
                
                window.location.href = loginUrl;
            }
        } catch (error: any) {
            console.error("Error during registration:", error);
            const errorMsg = error.response?.data?.error || t('auth.register.errors.unexpected');
            setErrorMessage(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cover bg-center flex flex-col" style={{ backgroundImage: "url('/background.jpg')" }}>
            {/* Form Section */}
            <div className="flex flex-col items-center justify-center flex-grow px-4 py-6">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
                    <h2 className="text-xl font-bold mb-4">{t('auth.register.title')}</h2>
                    {step === 1 && (
                        <>
                            <div className="space-y-4 mb-4">
                                {['Google', 'Discord'].map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => window.location.href = `${API_BASE_URL}/api/auth/${provider.toLowerCase()}?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/' + provider.toLowerCase() + '/callback')}`}
                                        className="w-full flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <img
                                            src={`/logo/${provider.toLowerCase()}-logo.svg`}
                                            alt={`${provider} Logo`}
                                            className="w-5 h-5"
                                        />
                                        <span className="flex-grow text-center">{t('auth.register.signUpWith', { provider })}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative my-6 flex items-center">
                                <div className="flex-grow border-t border-gray-300"></div>
                                <span className="mx-4 text-gray-500">{t('auth.register.or')}</span>
                                <div className="flex-grow border-t border-gray-300"></div>
                            </div>
                            <button
                                onClick={handleSignUpWithEmail}
                                className="w-full px-4 py-2 bg-purple-300 text-white font-medium rounded-md hover:bg-purple-400"
                            >
{t('auth.register.signUpWithEmail')}
                            </button>
                            <div className="mt-4 text-sm">
                                {t('auth.register.alreadyMember')}{" "}
                                <a href="/login" className="text-blue-500 hover:underline">
                                    {t('auth.register.logIn')}
                                </a>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <EmailVerification formData={formData} setFormData={setFormData} verified={verified} setVerified={setVerified} />

                            {emailExists && (
                                <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
{t('auth.register.emailAlreadyRegistered')} <a href="/login" className="font-medium underline">{t('auth.register.logInInstead')}</a>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2">
                                    <label className="block font-medium text-left mb-1">{t('auth.register.password.label')}:</label>
                                    {/* Tooltip Icon */}
                                    <div className="relative group">
                                        <div
                                            className="w-4 h-4 flex items-center justify-center bg-gray-300 rounded-full text-white font-bold cursor-pointer"
                                            title={t('auth.register.password.tooltip.title')}
                                        >
                                            ?
                                        </div>
                                        {/* Tooltip Content */}
                                        <div className="absolute left-6 top-0 hidden group-hover:block bg-gray-700 text-white text-sm rounded-md p-3 w-64 shadow-lg z-10">
                                            <p className="font-medium">{t('auth.register.password.tooltip.header')}:</p>
                                            <ul className="list-disc list-inside">
                                                <li>{t('auth.register.password.tooltip.minLength')}</li>
                                                <li>{t('auth.register.password.tooltip.uppercase')}</li>
                                                <li>{t('auth.register.password.tooltip.lowercase')}</li>
                                                <li>{t('auth.register.password.tooltip.number')}</li>
                                                <li>{t('auth.register.password.tooltip.special')}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Password Input */}
                                    <input
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-md"
                                        required
                                    />

                                </div>
                                {passwordStrength && (
                                    <p className={`text-sm ${passwordStrength === t('auth.register.password.validation.strong') ? "text-green-500" : "text-red-500"}`}>
                                        {passwordStrength}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block font-medium text-left mb-1">{t('auth.register.verifyPassword.label')}:</label>
                                <input
                                    name="verifyPassword"
                                    type="password"
                                    value={formData.verifyPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-md"
                                    required
                                />
                                {formData.verifyPassword &&
                                    formData.password !== formData.verifyPassword && (
                                        <p className="text-sm text-red-500">{t('auth.register.errors.passwordMismatch')}</p>
                                    )}
                            </div>

                            {/* Error message display */}
                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="mt-4 text-sm text-gray-600">
                                <p>{t('auth.register.profileCompletionNote')}</p>
                            </div>
                            <button
                                type="submit"
                                className={`w-full px-4 py-2 text-white font-medium rounded-md ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                                    }`}
                                disabled={
                                    loading ||
                                    !formData.email ||
                                    !formData.password ||
                                    !formData.verifyPassword ||
                                    emailValid === false ||
                                    emailExists === true ||
                                    passwordStrength !== t('auth.register.password.validation.strong')
                                }
                            >
{loading ? t('auth.register.processing') : t('auth.register.registerButton')}
                            </button>
                            <div className="mt-4 text-sm">
                                {t('auth.register.alreadyMember')}{" "}
                                <a href="/login" className="text-blue-500 hover:underline">
                                    {t('auth.register.logIn')}
                                </a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Register;
