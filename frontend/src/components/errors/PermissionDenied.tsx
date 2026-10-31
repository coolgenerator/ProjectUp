import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PermissionDeniedProps {
    message?: string;
    returnPath?: string;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({
    message = "You don't have permission to access this resource.",
    returnPath = '/projects'
}) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Access Denied
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {message}
                </p>
                <button
                    onClick={() => navigate(returnPath)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default PermissionDenied;
