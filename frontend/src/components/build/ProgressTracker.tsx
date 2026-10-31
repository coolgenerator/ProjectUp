import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
    id: string;
    name: string;
    progress: number;
    health: 'good' | 'warning' | 'critical';
    streak: number;
    lastUpdate: Date;
    estimatedCompletion: Date;
    milestones: Milestone[];
}

interface Milestone {
    id: string;
    name: string;
    completed: boolean;
    dueDate: Date;
}

interface Reminder {
    id: string;
    type: 'work-time' | 'stale-task' | 'milestone' | 'summary';
    title: string;
    message: string;
    time?: string;
    priority: 'low' | 'medium' | 'high';
}

const ProgressTracker: React.FC = () => {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [reminders, setReminders] = useState<Reminder[]>([
        {
            id: '1',
            type: 'work-time',
            title: 'Best Work Time',
            message: 'Based on your habits, 9:00 AM - 11:00 AM is your most productive time',
            time: '9:00 AM',
            priority: 'medium'
        },
        {
            id: '2',
            type: 'stale-task',
            title: 'Task Stalled',
            message: 'Frontend redesign hasn\'t been updated in 3 days',
            priority: 'high'
        },
        {
            id: '3',
            type: 'milestone',
            title: 'Milestone Approaching',
            message: 'MVP Release is due in 5 days',
            priority: 'high'
        }
    ]);

    // Mock data - replace with actual API calls
    const mockProjects: Project[] = [
        {
            id: '1',
            name: 'E-commerce Platform',
            progress: 72,
            health: 'good',
            streak: 15,
            lastUpdate: new Date(Date.now() - 1000 * 60 * 60 * 2),
            estimatedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
            milestones: [
                { id: 'm1', name: 'Backend API', completed: true, dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
                { id: 'm2', name: 'Frontend UI', completed: true, dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
                { id: 'm3', name: 'Payment Integration', completed: false, dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5) },
                { id: 'm4', name: 'Launch', completed: false, dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) }
            ]
        },
        {
            id: '2',
            name: 'Mobile App',
            progress: 45,
            health: 'warning',
            streak: 3,
            lastUpdate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
            estimatedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            milestones: [
                { id: 'm5', name: 'Design Mockups', completed: true, dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) },
                { id: 'm6', name: 'Core Features', completed: false, dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10) }
            ]
        }
    ];

    useEffect(() => {
        setSelectedProject(mockProjects[0]);
    }, []);

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'good': return 'from-green-400 to-emerald-500';
            case 'warning': return 'from-yellow-400 to-orange-500';
            case 'critical': return 'from-red-400 to-pink-500';
            default: return 'from-gray-400 to-gray-500';
        }
    };

    const getHealthBgColor = (health: string) => {
        switch (health) {
            case 'good': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'critical': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getReminderIcon = (type: string) => {
        switch (type) {
            case 'work-time':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'stale-task':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'milestone':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                );
            case 'summary':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const formatTimeAgo = (date: Date) => {
        const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const calculateDaysUntil = (date: Date) => {
        const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="space-y-6">
            {/* Project Selector */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Select Project</h3>
                <div className="flex gap-3 flex-wrap">
                    {mockProjects.map((project) => (
                        <button
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                selectedProject?.id === project.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            {project.name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedProject && (
                <>
                    {/* Progress Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Health Status */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-lg p-6"
                        >
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Project Health</h4>
                            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getHealthBgColor(selectedProject.health)}`}>
                                <div className={`w-2 h-2 rounded-full bg-current mr-2`}></div>
                                {selectedProject.health.charAt(0).toUpperCase() + selectedProject.health.slice(1)}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                Last updated {formatTimeAgo(selectedProject.lastUpdate)}
                            </p>
                        </motion.div>

                        {/* Progress Circle */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-lg p-6"
                        >
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Completion</h4>
                            <div className="relative w-32 h-32 mx-auto">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#e5e7eb"
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="url(#progress-gradient)"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - selectedProject.progress / 100)}`}
                                        className="transition-all duration-500"
                                    />
                                    <defs>
                                        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold">{selectedProject.progress}%</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Work Streak */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-lg p-6"
                        >
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Work Streak</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-orange-500">{selectedProject.streak}</span>
                                <span className="text-gray-600">days</span>
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                <span className="text-xs text-gray-500">Keep it up!</span>
                            </div>
                        </motion.div>

                        {/* Estimated Completion */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-lg p-6"
                        >
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Est. Completion</h4>
                            <p className="text-lg font-semibold">{formatDate(selectedProject.estimatedCompletion)}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {calculateDaysUntil(selectedProject.estimatedCompletion)} days remaining
                            </p>
                        </motion.div>
                    </div>

                    {/* Milestones */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-xl shadow-lg p-6"
                    >
                        <h3 className="text-lg font-semibold mb-4">Milestones</h3>
                        <div className="space-y-3">
                            {selectedProject.milestones.map((milestone, index) => (
                                <div
                                    key={milestone.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                        milestone.completed
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            milestone.completed
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-300 text-gray-600'
                                        }`}>
                                            {milestone.completed ? (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                index + 1
                                            )}
                                        </div>
                                        <div>
                                            <h4 className={`font-medium ${milestone.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                {milestone.name}
                                            </h4>
                                            <p className="text-sm text-gray-500">
                                                {milestone.completed ? 'Completed' : `Due ${formatDate(milestone.dueDate)}`}
                                            </p>
                                        </div>
                                    </div>
                                    {!milestone.completed && calculateDaysUntil(milestone.dueDate) <= 7 && (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                            {calculateDaysUntil(milestone.dueDate)} days left
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}

            {/* Smart Reminders */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl shadow-lg p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Smart Reminders</h3>
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        Configure
                    </button>
                </div>
                <div className="space-y-3">
                    {reminders.map((reminder) => (
                        <motion.div
                            key={reminder.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
                                reminder.priority === 'high'
                                    ? 'bg-red-50 border-red-400'
                                    : reminder.priority === 'medium'
                                    ? 'bg-yellow-50 border-yellow-400'
                                    : 'bg-blue-50 border-blue-400'
                            }`}
                        >
                            <div className={`mt-0.5 ${
                                reminder.priority === 'high'
                                    ? 'text-red-600'
                                    : reminder.priority === 'medium'
                                    ? 'text-yellow-600'
                                    : 'text-blue-600'
                            }`}>
                                {getReminderIcon(reminder.type)}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-800">{reminder.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                                {reminder.time && (
                                    <p className="text-xs text-gray-500 mt-2">Scheduled for {reminder.time}</p>
                                )}
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Daily/Weekly Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Today's Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-indigo-600">3</p>
                            <p className="text-xs text-gray-600">Tasks Completed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">4.5h</p>
                            <p className="text-xs text-gray-600">Time Worked</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">+2%</p>
                            <p className="text-xs text-gray-600">Progress Made</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ProgressTracker;