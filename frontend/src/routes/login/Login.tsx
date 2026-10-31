import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { login } from "../../store/auth";
import { RootState } from "../../store/store";
import { useNavigate } from 'react-router-dom';
import config from "../../config";

const { API_BASE_URL } = config;

export const Login: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [fromLogout, setFromLogout] = useState<boolean>(false);
    const [justLoggedIn, setJustLoggedIn] = useState<boolean>(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const hasAutoRedirected = useRef(false);

    // Sync language from localStorage on mount
    useEffect(() => {
        const storedLanguage = localStorage.getItem('language');
        if (storedLanguage && storedLanguage !== i18n.language) {
            i18n.changeLanguage(storedLanguage);
        }
    }, [i18n]);
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const user = useSelector((state: RootState) => state.auth.user);
    const alertShown = useRef(false);

    // Check for URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for registration success
        if (urlParams.get('registered') === 'true') {
            setSuccess('registration');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Check if coming from logout
        if (urlParams.get('logout') === 'true') {
            setFromLogout(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Redirect if authenticated (but not if just logged in - that's handled in handleLogin)
    useEffect(() => {
        console.log('Login: useEffect running', {
            hasAutoRedirected: hasAutoRedirected.current,
            isAuthenticated,
            hasUser: !!user,
            fromLogout,
            justLoggedIn
        });

        // Prevent multiple automatic redirects
        if (hasAutoRedirected.current) {
            console.log('Login: Skipping - already redirected');
            return;
        }

        if (isAuthenticated && user && !fromLogout && !justLoggedIn) {
            console.log('Login: User already authenticated, checking redirect');

            // Check if there's a redirect parameter - if so, redirect there instead of showing alert
            const urlParams = new URLSearchParams(window.location.search);
            const redirectPath = urlParams.get('redirect');
            const decodedRedirectPath = redirectPath ? decodeURIComponent(redirectPath) : null;

            console.log('Login: Redirect path:', decodedRedirectPath);

            if (decodedRedirectPath) {
                // User is already logged in and trying to access a protected page, redirect them
                console.log('Login: Redirecting to:', decodedRedirectPath);
                hasAutoRedirected.current = true;
                navigate(decodedRedirectPath, { replace: true });
            } else {
                // User is already logged in and visiting login page, show alert
                if (!alertShown.current) {
                    alertShown.current = true;
                    alert(t('auth.login.alreadyLoggedIn'));
                }

                hasAutoRedirected.current = true;
                setTimeout(() => {
                    navigate('/ideas');
                }, 500); // Small delay to allow Redux state to update
            }
        }
    }, [isAuthenticated, user, fromLogout, justLoggedIn, navigate, t]);
    
    // Reset fromLogout flag after component mount
    useEffect(() => {
        if (fromLogout) {
            const timer = setTimeout(() => {
                setFromLogout(false);
            }, 1000);
            
            return () => clearTimeout(timer);
        }
    }, [fromLogout]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || t('auth.login.errors.invalidCredentials'));
                return;
            }

            dispatch(login({
                user: {
                    id: data.id,
                    username: data.username || null,
                    first_name: data.first_name || null,
                    last_name: data.last_name || null,
                    email: data.email || null,
                    avatar: data.avatar || null,
                    sid: data.sid || null,
                },
                token: data.token,
                refreshToken: data.refreshToken
            }));

            // Set flag to prevent "already logged in" alert and useEffect redirect
            setJustLoggedIn(true);
            alertShown.current = true;
            hasAutoRedirected.current = true; // Prevent useEffect from redirecting

            // Check for redirect parameter
            const urlParams = new URLSearchParams(window.location.search);
            const redirectPath = urlParams.get('redirect');
            const decodedRedirectPath = redirectPath ? decodeURIComponent(redirectPath) : null;

            console.log('Login: handleLogin redirect check:', { redirectPath, decodedRedirectPath, hasUsername: !!data.username });

            // Redirect based on profile completion and redirect parameter
            if (!data.username) {
                console.log('Login: Navigating to edit-profile');
                navigate('/edit-profile?fromLogin=true');
            } else if (decodedRedirectPath) {
                console.log('Login: Navigating to redirect path:', decodedRedirectPath);
                navigate(decodedRedirectPath);
            } else {
                console.log('Login: Navigating to home');
                navigate('/ideas');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(t('auth.login.errors.networkError'));
        } finally {
            setLoading(false);
        }
    };
    
    const handleOAuthLogin = (provider: string) => {
        // Preserve redirect parameter for OAuth flow
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('redirect');

        // Store redirect path in sessionStorage for OAuth callback to retrieve
        if (redirectPath) {
            sessionStorage.setItem('oauth_redirect', redirectPath);
        }

        window.location.href = `${API_BASE_URL}/api/auth/${provider.toLowerCase()}`;
    };

    return (
        <div className="min-h-screen bg-cover bg-center flex flex-col" style={{ backgroundImage: "url('/background.jpg')" }}>
            {/* Form Section */}
            <div className="flex flex-col items-center justify-center flex-grow px-4 py-6">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
                    <h2 className="text-xl font-bold mb-4">{t('auth.login.title')}</h2>

                    {/* Success message */}
                    {success && (
                        <div className="p-3 mb-4 bg-green-50 border border-green-200 text-green-600 rounded-md text-sm">
                            {t('auth.login.registrationSuccess')}
                        </div>
                    )}

                    {/* OAuth Login Buttons */}
                    <div className="space-y-4 mb-4">
                        {['Google', 'Discord'].map(provider => (
                            <button
                                key={provider}
                                onClick={() => handleOAuthLogin(provider)}
                                className="w-full flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <img
                                    src={`/logo/${provider.toLowerCase()}-logo.svg`}
                                    alt={`${provider} Logo`}
                                    className="w-5 h-5"
                                />
                                <span className="flex-grow text-center">{t(`auth.login.loginWith${provider}`)}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="mx-4 text-gray-500">{t('auth.login.orContinueWith')}</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder={t('auth.login.emailOrUsernamePlaceholder')}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder={t('auth.login.passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                        </div>
                        
                        {/* Error message display */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-4 py-2 rounded-md font-medium text-white ${
                                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-300 hover:bg-purple-400'
                            } transition-colors`}
                        >
                            {loading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
                        </button>
                    </form>

                    <div className="mt-6 text-sm">
                        <div className="mb-2">
                            <a href="/forget-password" className="text-blue-500 hover:underline">
                                {t('auth.login.forgotPassword')}
                            </a>
                        </div>
                        <div>
                            {t('auth.login.noAccount')}{" "}
                            <a href="/register" className="text-blue-500 hover:underline">
                                {t('auth.login.signUp')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;