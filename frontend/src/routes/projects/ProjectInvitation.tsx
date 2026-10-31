import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import LoadingPage from '../../components/app/Loading';

const ProjectInvitation: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchInvitationDetails();
    }, [token]);

    const fetchInvitationDetails = async () => {
        if (!token) {
            setError('Invalid invitation link');
            setLoading(false);
            return;
        }

        try {
            const response = await fetchWithAuth(`/api/projects/invitations/${token}`);
            if (response.ok) {
                const data = await response.json();
                setInvitation(data.invitation);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to fetch invitation details');
            }
        } catch (err) {
            setError('Failed to load invitation');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        setProcessing(true);
        try {
            const response = await fetchWithAuth('/api/projects/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (response.ok) {
                const data = await response.json();
                alert('Invitation accepted! Redirecting to project...');
                navigate(`/project/${data.project_sid}/dashboard`);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to accept invitation');
            }
        } catch (err) {
            alert('Error accepting invitation');
            console.error('Error:', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        setProcessing(true);
        try {
            const response = await fetchWithAuth('/api/projects/invitations/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (response.ok) {
                alert('Invitation declined');
                navigate('/projects');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to decline invitation');
            }
        } catch (err) {
            alert('Error declining invitation');
            console.error('Error:', err);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <LoadingPage />;

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/projects')}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Go to Projects
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Invitation Not Found</h2>
                        <p className="text-gray-600 mb-6">This invitation may have expired or been revoked.</p>
                        <button
                            onClick={() => navigate('/projects')}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Go to Projects
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-lg w-full mx-4">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                        <h1 className="text-2xl font-bold text-white text-center">Project Invitation</h1>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                You've been invited to join
                            </h2>
                            <p className="text-2xl font-bold text-blue-600 mb-1">
                                {invitation.project_title}
                            </p>
                            <p className="text-gray-600">
                                as a <span className="font-semibold text-gray-800">{invitation.role}</span>
                            </p>
                        </div>

                        {/* Invitation Details */}
                        <div className="bg-gray-50 rounded-xl p-6 mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Invitation Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Invited by:</span>
                                    <span className="font-medium text-gray-800">{invitation.inviter_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Role:</span>
                                    <span className="font-medium text-gray-800 capitalize">{invitation.role}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Invited on:</span>
                                    <span className="font-medium text-gray-800">
                                        {new Date(invitation.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleAccept}
                                disabled={processing}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Processing...' : 'Accept Invitation'}
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={processing}
                                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Processing...' : 'Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInvitation;
