import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import { toast } from 'react-hot-toast';

interface InviteInfo {
  project: {
    project_id: number;
    sid: string;
    name: string;
    description: string;
  };
  placeholder: {
    name: string;
    email: string;
    role: string;
  };
}

const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteInfo();
    }
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/invites/${token}/info`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid or expired invite');
      }

      const data = await response.json();
      setInviteInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite information');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/invites/${token}/accept`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      const data = await response.json();
      toast.success('Successfully joined the project!');

      // Redirect to project dashboard
      if (data.project?.sid) {
        navigate(`/project/${data.project.sid}/dashboard`);
      } else {
        navigate('/my-projects');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    toast.success('Invite declined');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!inviteInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
          <p className="text-blue-100">
            You've been invited to join a project on ProjectUp
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Project Info */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{inviteInfo.project.name}</h2>
            <p className="text-gray-600 mb-4">{inviteInfo.project.description}</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your Role</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {inviteInfo.placeholder.role}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Invited as</p>
                <p className="font-semibold text-gray-900">{inviteInfo.placeholder.name}</p>
              </div>
            </div>
          </div>

          {/* Role Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">As a {inviteInfo.placeholder.role}, you can:</p>
                <ul className="list-disc list-inside space-y-1">
                  {inviteInfo.placeholder.role === 'admin' && (
                    <>
                      <li>Manage team members and permissions</li>
                      <li>Edit project content</li>
                      <li>View all project information</li>
                    </>
                  )}
                  {inviteInfo.placeholder.role === 'editor' && (
                    <>
                      <li>Edit project content and tasks</li>
                      <li>Collaborate with team members</li>
                      <li>View all project information</li>
                    </>
                  )}
                  {inviteInfo.placeholder.role === 'viewer' && (
                    <>
                      <li>View project information</li>
                      <li>Track project progress</li>
                      <li>Add comments and feedback</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center space-x-2"
            >
              {accepting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Accept Invitation</span>
                </>
              )}
            </button>
            <button
              onClick={handleDecline}
              disabled={accepting}
              className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Decline
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AcceptInvite;
