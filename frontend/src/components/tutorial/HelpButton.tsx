import React, { useState, useRef, useEffect } from 'react';
import { useTutorial } from '../../hooks/useTutorial';

interface HelpButtonProps {
    tutorialType?: 'project' | 'dashboard';
    variant?: 'icon' | 'button' | 'fab';
    showMenu?: boolean; // Show dropdown menu with multiple help options
    disablePulse?: boolean; // Disable pulsing animation (less distracting)
}

export const HelpButton: React.FC<HelpButtonProps> = ({
    tutorialType = 'project',
    variant = 'button',
    showMenu = true,
    disablePulse = false,
}) => {
    const { startTutorial, isActive } = useTutorial(tutorialType);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = () => {
        if (showMenu) {
            setMenuOpen(!menuOpen);
        } else {
            handleStartTutorial();
        }
    };

    const handleClose = () => {
        setMenuOpen(false);
    };

    const handleStartTutorial = async () => {
        handleClose();
        await startTutorial(tutorialType === 'project');
    };

    const handleOpenDocs = () => {
        handleClose();
        window.open('https://docs.projectup.com/getting-started', '_blank');
    };

    const handleContactSupport = () => {
        handleClose();
        window.location.href = 'mailto:support@projectup.com';
    };

    const handleOpenVideos = () => {
        handleClose();
        window.open('https://www.youtube.com/@projectup', '_blank');
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuOpen &&
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                handleClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    // Menu Component
    const MenuDropdown = ({ position }: { position: 'bottom-right' | 'top-right' | 'bottom-left' }) => {
        if (!showMenu || !menuOpen) return null;

        const positionClasses = {
            'bottom-right': 'top-full right-0 mt-2',
            'top-right': 'bottom-full right-0 mb-2',
            'bottom-left': 'top-full left-0 mt-2',
        };

        return (
            <div
                ref={menuRef}
                className={`absolute ${positionClasses[position]} w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200`}
            >
                <button
                    onClick={handleStartTutorial}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Start Interactive Tutorial</span>
                </button>

                <button
                    onClick={handleOpenDocs}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Documentation</span>
                </button>

                <button
                    onClick={handleOpenVideos}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Video Tutorials</span>
                </button>

                <button
                    onClick={handleContactSupport}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Contact Support</span>
                </button>
            </div>
        );
    };

    // Floating Action Button (FAB) variant
    if (variant === 'fab') {
        return (
            <div className="relative">
                <div className="group relative">
                    <button
                        ref={buttonRef}
                        onClick={handleClick}
                        disabled={isActive}
                        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Help Menu"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-6 h-6 relative z-10"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                            />
                        </svg>
                        {/* Pulse animation when tutorial is available */}
                        {!disablePulse && (
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                        )}
                    </button>

                    {/* Tooltip */}
                    <div className="fixed bottom-6 right-24 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                            Need Help?
                            <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                    </div>
                </div>

                {/* Menu positioned relative to FAB */}
                <div className="fixed bottom-24 right-6 z-50">
                    <MenuDropdown position="top-right" />
                </div>
            </div>
        );
    }

    // Icon variant - for toolbar/header
    if (variant === 'icon') {
        return (
            <div className="relative">
                <div className="group relative inline-block">
                    <button
                        ref={buttonRef}
                        onClick={handleClick}
                        disabled={isActive}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Help Menu"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6 text-gray-700 dark:text-gray-300"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                            />
                        </svg>
                    </button>

                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                            Help & Tutorials
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                    </div>
                </div>

                <MenuDropdown position="bottom-right" />
            </div>
        );
    }

    // Button variant - default
    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onClick={handleClick}
                disabled={isActive}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                </svg>
                <span>Need Help?</span>
            </button>

            <MenuDropdown position="bottom-left" />
        </div>
    );
};

export default HelpButton;
