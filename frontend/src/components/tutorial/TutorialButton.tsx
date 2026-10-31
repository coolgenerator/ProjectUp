import React, { useState } from 'react';
import { useTutorial } from '../../hooks/useTutorial';
import { Tooltip } from '@mui/material';

interface TutorialButtonProps {
    tutorialType?: 'project' | 'dashboard';
    variant?: 'icon' | 'button' | 'link';
    className?: string;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({
    tutorialType = 'project',
    variant = 'button',
    className = '',
}) => {
    const { startTutorial, isActive, isCompleted } = useTutorial(tutorialType);
    const [isLoading, setIsLoading] = useState(false);

    const handleStartTutorial = async () => {
        setIsLoading(true);
        try {
            // Create template project for project tutorial
            await startTutorial(tutorialType === 'project');
        } catch (error) {
            console.error('Failed to start tutorial:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Icon variant - for toolbar/navbar
    if (variant === 'icon') {
        return (
            <Tooltip title={isCompleted ? "Restart Tutorial" : "Start Tutorial"}>
                <button
                    onClick={handleStartTutorial}
                    disabled={isActive || isLoading}
                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        isActive ? 'opacity-50 cursor-not-allowed' : ''
                    } ${className}`}
                    aria-label="Start Tutorial"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                        </svg>
                    )}
                </button>
            </Tooltip>
        );
    }

    // Link variant - for text links
    if (variant === 'link') {
        return (
            <button
                onClick={handleStartTutorial}
                disabled={isActive || isLoading}
                className={`text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline ${
                    isActive ? 'opacity-50 cursor-not-allowed' : ''
                } ${className}`}
            >
                {isLoading ? 'Starting...' : isCompleted ? 'Restart Tutorial' : 'Start Tutorial'}
            </button>
        );
    }

    // Button variant - default
    return (
        <button
            onClick={handleStartTutorial}
            disabled={isActive || isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
            <span>
                {isLoading ? 'Starting...' : isCompleted ? 'Restart Tutorial' : 'Start Tutorial'}
            </span>
        </button>
    );
};

export default TutorialButton;
