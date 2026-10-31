import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

const { API_BASE_URL } = config;

const Account: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Username update state
    const [username, setUsername] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState('');

    // Email update state
    const [email, setEmail] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Active section state
    const [activeSection, setActiveSection] = useState('username');

    // AI Settings state
    const [apiKeys, setApiKeys] = useState({
        openai: '',
        anthropic: '',
        google: ''
    });
    const [showApiKeys, setShowApiKeys] = useState({
        openai: false,
        anthropic: false,
        google: false
    });

    // Social Media connections state
    const [socialConnections, setSocialConnections] = useState({
        youtube: { connected: false, username: '' },
        reddit: { connected: false, username: '' },
        bilibili: { connected: false, username: '' },
        xiaohongshu: { connected: false, username: '' }
    });

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const checkUsernameAvailability = async (username: string) => {
        if (!username || username.length < 3) {
            setUsernameError('Username must be at least 3 characters long');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError('Username can only contain letters, numbers, and underscores');
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
                setUsernameError('Username is already taken');
                return false;
            }

            setUsernameError('');
            return true;
        } catch (error) {
            console.error('Error checking username:', error);
            setUsernameError('Error checking username availability');
            return false;
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const checkEmailAvailability = async (email: string) => {
        if (!email) {
            setEmailError('Email is required');
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Invalid email format');
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
                setEmailError('Email is already in use');
                return false;
            }

            setEmailError('');
            return true;
        } catch (error) {
            console.error('Error checking email:', error);
            setEmailError('Error checking email availability');
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
                setMessage('Username updated successfully');
                // Optional: Update the user in Redux store here
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update username');
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
                setMessage('Email update request sent. Please check your inbox for verification.');
                // Optional: Update the user in Redux store if needed
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update email');
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
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
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
                setMessage('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                        <h2 className="text-2xl font-bold text-white">Settings</h2>
                    </div>

                    <div className="p-6">
                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap border-b border-gray-200 mb-6">
                            <button
                                onClick={() => setActiveSection('username')}
                                className={`py-2 px-4 font-medium ${activeSection === 'username'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Username
                            </button>
                            <button
                                onClick={() => setActiveSection('email')}
                                className={`py-2 px-4 font-medium ${activeSection === 'email'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Email
                            </button>
                            <button
                                onClick={() => setActiveSection('password')}
                                className={`py-2 px-4 font-medium ${activeSection === 'password'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Password
                            </button>
                            <button
                                onClick={() => setActiveSection('ai-settings')}
                                className={`py-2 px-4 font-medium ${activeSection === 'ai-settings'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                AI Settings
                            </button>
                            <button
                                onClick={() => setActiveSection('social-media')}
                                className={`py-2 px-4 font-medium ${activeSection === 'social-media'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Social Media
                            </button>
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

                        {/* Username Section */}
                        {activeSection === 'username' && (
                            <div className="bg-white rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Username</h3>
                                <form onSubmit={updateUsername} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            className={`w-full px-4 py-2 border ${usernameError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                            required
                                        />
                                        {isCheckingUsername && (
                                            <p className="mt-1 text-sm text-gray-500">Checking username availability...</p>
                                        )}
                                        {usernameError && (
                                            <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Username can only contain letters, numbers, and underscores.
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isCheckingUsername || !!usernameError}
                                        className={`px-4 py-2 rounded-md text-white ${isLoading || isCheckingUsername || !!usernameError
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {isLoading ? 'Updating...' : 'Update Username'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Email Section */}
                        {activeSection === 'email' && (
                            <div className="bg-white rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Email</h3>
                                <form onSubmit={updateEmail} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Email</label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            className={`w-full px-4 py-2 border ${emailError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                            required
                                        />
                                        {isCheckingEmail && (
                                            <p className="mt-1 text-sm text-gray-500">Checking email availability...</p>
                                        )}
                                        {emailError && (
                                            <p className="mt-1 text-sm text-red-600">{emailError}</p>
                                        )}
                                    </div>
                                    <p className="text-sm text-yellow-600">
                                        Note: You will need to verify your new email address before the change takes effect.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isCheckingEmail || !!emailError}
                                        className={`px-4 py-2 rounded-md text-white ${isLoading || isCheckingEmail || !!emailError
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {isLoading ? 'Sending Verification...' : 'Update Email'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Password Section */}
                        {activeSection === 'password' && (
                            <div className="bg-white rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                                <form onSubmit={updatePassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`w-full px-4 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
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
                                        Password must be at least 8 characters long.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {isLoading ? 'Updating...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* AI Settings Section */}
                        {activeSection === 'ai-settings' && (
                            <div className="bg-white rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">AI API Configuration</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Configure your API keys for AI services. These keys are stored securely and used for AI-powered features.
                                </p>
                                <div className="space-y-4">
                                    {/* OpenAI API Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
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

                                    {/* Anthropic API Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Anthropic API Key</label>
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

                                    {/* Google AI API Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Google AI API Key</label>
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

                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Save API Keys
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Social Media Section */}
                        {activeSection === 'social-media' && (
                            <div className="bg-white rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Social Media Connections</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Connect your social media accounts to import content and sync your activity.
                                </p>
                                <div className="space-y-4">
                                    {/* YouTube */}
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">YouTube</h4>
                                                {socialConnections.youtube.connected && (
                                                    <p className="text-sm text-gray-500">@{socialConnections.youtube.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            socialConnections.youtube.connected
                                                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                : 'text-white bg-red-600 hover:bg-red-700'
                                        }`}>
                                            {socialConnections.youtube.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>

                                    {/* Reddit */}
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Reddit</h4>
                                                {socialConnections.reddit.connected && (
                                                    <p className="text-sm text-gray-500">u/{socialConnections.reddit.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            socialConnections.reddit.connected
                                                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                                                : 'text-white bg-orange-600 hover:bg-orange-700'
                                        }`}>
                                            {socialConnections.reddit.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>

                                    {/* Bilibili */}
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#00A1D6">
                                                    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Bilibili</h4>
                                                {socialConnections.bilibili.connected && (
                                                    <p className="text-sm text-gray-500">{socialConnections.bilibili.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            socialConnections.bilibili.connected
                                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                                : 'text-white bg-blue-600 hover:bg-blue-700'
                                        }`}>
                                            {socialConnections.bilibili.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>

                                    {/* Xiaohongshu (Little Red Book) */}
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                                    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF2442"/>
                                                    <path d="M7 8.5C7 8.22386 7.22386 8 7.5 8H8.5C8.77614 8 9 8.22386 9 8.5V15.5C9 15.7761 8.77614 16 8.5 16H7.5C7.22386 16 7 15.7761 7 15.5V8.5Z" fill="white"/>
                                                    <path d="M11 8.5C11 8.22386 11.2239 8 11.5 8H12.5C12.7761 8 13 8.22386 13 8.5V15.5C13 15.7761 12.7761 16 12.5 16H11.5C11.2239 16 11 15.7761 11 15.5V8.5Z" fill="white"/>
                                                    <path d="M15 8.5C15 8.22386 15.2239 8 15.5 8H16.5C16.7761 8 17 8.22386 17 8.5V15.5C17 15.7761 16.7761 16 16.5 16H15.5C15.2239 16 15 15.7761 15 15.5V8.5Z" fill="white"/>
                                                    <path d="M6 11H18" stroke="white" strokeWidth="1.5"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">小红书 (Xiaohongshu)</h4>
                                                {socialConnections.xiaohongshu.connected && (
                                                    <p className="text-sm text-gray-500">{socialConnections.xiaohongshu.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button className={`px-4 py-2 rounded-md text-sm font-medium ${
                                            socialConnections.xiaohongshu.connected
                                                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                : 'text-white bg-red-600 hover:bg-red-700'
                                        }`}>
                                            {socialConnections.xiaohongshu.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Account; 