import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../store/auth';
import config from '../../config';

const { API_BASE_URL } = config;

const OAuthCallback: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const handleCallback = async () => {
            const searchParams = new URLSearchParams(location.search);
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                console.error('OAuth error:', error);
                alert('Authentication failed. Please try again.');
                navigate('/login');
                return;
            }

            if (!code) {
                console.error('No code received');
                alert('Authentication failed. Please try again.');
                navigate('/login');
                return;
            }

            try {
                // Get the provider from the URL path
                const path = location.pathname;
                const provider = path.split('/')[2]; // /auth/google/callback -> google
                const response = await fetch(`${API_BASE_URL}/api/auth/${provider}/callback?code=${code}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('OAuth callback error:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                    throw new Error(`Failed to authenticate: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('OAuth login successful:', data);

                if (!data.token || !data.refreshToken) {
                    throw new Error('Missing authentication tokens in response');
                }

                dispatch(login({
                    user: {
                        username: data.username,
                        first_name: data.first_name,
                        last_name: data.last_name,
                        email: data.email,
                        avatar: data.avatar,
                        sid: data.sid,
                        id: data.id,
                    },
                    token: data.token,
                    refreshToken: data.refreshToken,
                }));

                // Check for stored redirect path from OAuth flow
                const storedRedirect = sessionStorage.getItem('oauth_redirect');
                if (storedRedirect) {
                    sessionStorage.removeItem('oauth_redirect');
                }

                // Redirect based on profile completion and stored redirect
                if (!data.username) {
                    // If username is not set, always redirect to edit profile
                    navigate('/edit-profile');
                } else if (storedRedirect) {
                    // Decode and navigate to the stored redirect path
                    navigate(decodeURIComponent(storedRedirect));
                } else if (data.avatar) {
                    navigate('/home');
                } else {
                    navigate('/edit-profile');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                alert('Authentication failed. Please try again.');
                navigate('/login');
            }
        };

        handleCallback();
    }, [location, navigate, dispatch]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Completing authentication...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            </div>
        </div>
    );
};

export default OAuthCallback; 