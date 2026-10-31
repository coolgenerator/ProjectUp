/**
 * Tutorial Test Page
 *
 * This is a simple test page to try out the tutorial system.
 *
 * To use:
 * 1. Add this route to your router:
 *    <Route path="/tutorial-test" element={<TutorialTestPage />} />
 *
 * 2. Navigate to: http://localhost:5173/tutorial-test
 *
 * 3. Click the "Start Tutorial" button
 */

import React from 'react';
import { TutorialButton } from '../components/tutorial/TutorialButton';
import { ProjectTutorial } from '../components/tutorial/ProjectTutorial';
import { useTutorial } from '../hooks/useTutorial';

export const TutorialTestPage: React.FC = () => {
    const { isActive, isCompleted, currentStep } = useTutorial('project');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Tutorial Test Page
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Test the tutorial system with sample elements.
                    </p>

                    {/* Status Info */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold">Status:</span>
                            {isActive && <span className="text-blue-600">🎯 Tutorial Active (Step {currentStep + 1})</span>}
                            {!isActive && isCompleted && <span className="text-green-600">✅ Tutorial Completed</span>}
                            {!isActive && !isCompleted && <span className="text-gray-600">⏸️ Tutorial Not Started</span>}
                        </div>
                    </div>
                </div>

                {/* Tutorial Trigger Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Click to Start Tutorial
                    </h2>

                    <div className="flex flex-wrap gap-4">
                        {/* Button Variant */}
                        <div>
                            <p className="text-sm text-gray-600 mb-2">Button Variant:</p>
                            <TutorialButton tutorialType="project" variant="button" />
                        </div>

                        {/* Icon Variant */}
                        <div>
                            <p className="text-sm text-gray-600 mb-2">Icon Variant:</p>
                            <TutorialButton tutorialType="project" variant="icon" />
                        </div>

                        {/* Link Variant */}
                        <div>
                            <p className="text-sm text-gray-600 mb-2">Link Variant:</p>
                            <TutorialButton tutorialType="project" variant="link" />
                        </div>
                    </div>
                </div>

                {/* Sample Elements with data-tour attributes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Create Project Button */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Step 1: Create Project
                        </h3>
                        <button
                            data-tour="create-project-button"
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            📝 Create New Project
                        </button>
                        <p className="mt-2 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="create-project-button"</code>
                        </p>
                    </div>

                    {/* Project Card */}
                    <div
                        data-tour="project-card"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300"
                    >
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                            My First Project (Tutorial)
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            This is a sample project to help you learn ProjectUp.
                        </p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Template</span>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="project-card"</code>
                        </p>
                    </div>

                    {/* Project Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Step 3: Settings
                        </h3>
                        <button
                            data-tour="project-settings"
                            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                        >
                            ⚙️ Project Settings
                        </button>
                        <p className="mt-2 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="project-settings"</code>
                        </p>
                    </div>

                    {/* Team Members */}
                    <div
                        data-tour="team-members"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                    >
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Step 4: Team Members
                        </h3>
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                                U
                            </div>
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                                +
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="team-members"</code>
                        </p>
                    </div>

                    {/* Task Board */}
                    <div
                        data-tour="task-board"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                    >
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Step 5: Task Board
                        </h3>
                        <div className="space-y-2">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                ☐ Set up project
                            </div>
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                ☐ Invite team members
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="task-board"</code>
                        </p>
                    </div>

                    {/* Resources */}
                    <div
                        data-tour="resources"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                    >
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Step 6: Resources
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <span>📄</span>
                                <span className="text-sm">Project Brief.pdf</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <span>📊</span>
                                <span className="text-sm">Data.xlsx</span>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            This element has: <code className="bg-gray-100 px-1 rounded">data-tour="resources"</code>
                        </p>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                    <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-200">
                        📖 How to Use
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-yellow-800 dark:text-yellow-300">
                        <li>Click any of the "Start Tutorial" buttons above</li>
                        <li>The tutorial will highlight each element with a spotlight effect</li>
                        <li>Click "Next" to proceed through the steps</li>
                        <li>Background clicks are blocked during the tutorial</li>
                        <li>Click "Skip Tutorial" to exit anytime</li>
                        <li>Click "Finish" on the last step to complete</li>
                    </ol>
                </div>
            </div>

            {/* Tutorial Component */}
            <ProjectTutorial />
        </div>
    );
};

export default TutorialTestPage;
