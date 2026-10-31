import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';

const CreateProject: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get current scenario from URL using React Router's location
    const searchParams = new URLSearchParams(location.search);
    const currentScenario = searchParams.get('scenario');
    const isInScenario = !!currentScenario;
    const isTutorialMode = searchParams.get('tutorial') === 'true';

    // Debug logging
    useEffect(() => {
        console.log('[CreateProject] Rendered with:', {
            currentScenario,
            isInScenario,
            search: location.search,
            buttonText: isInScenario ? 'Back to Project Templates' : 'Back to Projects'
        });
    }, [currentScenario, isInScenario, location.search]);

    const handleComplete = (projectId: number, projectSid: string) => {
        // Navigate to the project dashboard after successful creation
        navigate(`/project/${projectSid}/dashboard`);
    };

    const handleBack = () => {
        console.log('[CreateProject] handleBack clicked - isInScenario:', isInScenario, 'currentScenario:', currentScenario);
        if (isInScenario) {
            // If in a scenario, go back to scenario selection (remove scenario and step params)
            console.log('[CreateProject] Navigating to /create-project (remove scenario)');
            navigate('/create-project');
        } else {
            // If on scenario selection, go back to projects list
            console.log('[CreateProject] Navigating to /projects');
            navigate('/projects');
        }
    };

    const handleClose = () => {
        // Navigate back to projects page if user cancels
        navigate('/projects');
    };

    return (
        <div key={`create-project-${currentScenario || 'selection'}`} className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo/Back Button */}
                        <button
                            onClick={handleBack}
                            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-sm font-medium">
                                {isInScenario ? 'Back to Project Templates' : 'Back to Projects'}
                            </span>
                        </button>

                        {/* Title */}
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                            Create New Project
                        </h1>

                        {/* Empty div for flex spacing */}
                        <div className="w-32"></div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Onboarding Wizard - Page mode */}
                <OnboardingWizard
                    onClose={handleClose}
                    onComplete={handleComplete}
                />
            </div>
        </div>
    );
};

export default CreateProject;
