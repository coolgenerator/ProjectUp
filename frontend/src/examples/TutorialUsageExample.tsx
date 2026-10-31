/**
 * Tutorial System Usage Examples
 *
 * This file demonstrates how to integrate the tutorial system into your pages.
 */

import React from 'react';
import { ProjectTutorial } from '../components/tutorial/ProjectTutorial';
import { DashboardTutorial } from '../components/tutorial/DashboardTutorial';
import { useTutorial } from '../hooks/useTutorial';

// ============================================
// Example 1: Project Page with Tutorial
// ============================================
export const ProjectPageExample: React.FC = () => {
    return (
        <div className="container">
            {/* Your project page content with data-tour attributes */}
            <div className="header">
                <h1>My Projects</h1>

                {/* Add data-tour attribute to elements you want to highlight */}
                <button
                    data-tour="create-project-button"
                    className="btn btn-primary"
                >
                    Create Project
                </button>
            </div>

            <div className="project-list">
                {/* Project cards with data-tour attribute */}
                <div data-tour="project-card" className="project-card">
                    <h3>Sample Project</h3>
                    <p>Project description...</p>
                </div>
            </div>

            {/* Add the tutorial component - it will auto-start on first visit */}
            <ProjectTutorial />
        </div>
    );
};

// ============================================
// Example 2: Dashboard with Tutorial
// ============================================
export const DashboardPageExample: React.FC = () => {
    return (
        <div className="dashboard">
            {/* Dashboard content with data-tour attributes */}
            <header data-tour="dashboard-overview">
                <h1>Project Dashboard</h1>
            </header>

            <nav data-tour="navigation-tabs">
                <ul>
                    <li>Overview</li>
                    <li>Tasks</li>
                    <li>Files</li>
                    <li>Team</li>
                </ul>
            </nav>

            <div className="content">
                <button data-tour="add-task-button">Add Task</button>
                <button data-tour="share-button">Share</button>
            </div>

            {/* Add dashboard tutorial */}
            <DashboardTutorial />
        </div>
    );
};

// ============================================
// Example 3: Manual Tutorial Control
// ============================================
export const ManualTutorialExample: React.FC = () => {
    const {
        startTutorial,
        stopTutorial,
        skipTutorial,
        isCompleted,
        isActive
    } = useTutorial('project');

    return (
        <div>
            <h1>Manual Tutorial Control</h1>

            {/* Manual control buttons */}
            <div className="tutorial-controls">
                <button
                    onClick={() => startTutorial(true)}
                    disabled={isActive}
                >
                    Start Tutorial
                </button>

                <button
                    onClick={stopTutorial}
                    disabled={!isActive}
                >
                    Stop Tutorial
                </button>

                <button
                    onClick={skipTutorial}
                    disabled={isCompleted}
                >
                    Skip Forever
                </button>
            </div>

            <ProjectTutorial />
        </div>
    );
};

// ============================================
// Example 4: Settings Page with Tutorial Reset
// ============================================
export const SettingsPageExample: React.FC = () => {
    const { checkTutorialStatus } = useTutorial();

    const handleResetTutorials = async () => {
        try {
            const response = await fetch('/api/user/reset-tutorials', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                alert('Tutorials reset! Refresh the page to see them again.');
                // Refresh tutorial status
                await checkTutorialStatus();
            }
        } catch (error) {
            console.error('Failed to reset tutorials:', error);
        }
    };

    return (
        <div className="settings">
            <h2>Tutorial Settings</h2>

            <div className="setting-item">
                <p>Want to see the tutorials again?</p>
                <button onClick={handleResetTutorials}>
                    Reset All Tutorials
                </button>
            </div>
        </div>
    );
};

// ============================================
// Important: Add data-tour attributes to your actual components
// ============================================

/**
 * Example structure of a real project page component:
 *
 * <div>
 *   <button data-tour="create-project-button">Create</button>
 *   <div data-tour="project-card">Project Card</div>
 *   <div data-tour="project-settings">Settings</div>
 *   <div data-tour="team-members">Team</div>
 *   <div data-tour="task-board">Tasks</div>
 *   <div data-tour="resources">Resources</div>
 * </div>
 *
 * The tutorial will highlight these elements and guide the user through them.
 * Make sure the data-tour values match the ones in tutorialSteps.ts
 */
