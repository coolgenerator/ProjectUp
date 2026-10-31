import { Step } from 'react-joyride';

export interface TutorialStep extends Step {
    action?: () => void | Promise<void>; // Optional action to perform when reaching this step
}

// Project listing page tutorial - focused on discovering and creating projects
export const projectTutorialSteps: TutorialStep[] = [
    {
        target: 'body',
        content: (
            <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">Welcome to ProjectUp! 🎉</h3>
                <p className="text-gray-700">
                    Let's learn how to discover and create amazing projects. This quick tour will show you the essentials!
                </p>
                <p className="text-sm text-gray-500">
                    This tutorial takes about 1 minute. You can skip it anytime.
                </p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '[data-tour="project-card"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Discover Projects</h4>
                <p className="text-gray-700">
                    Browse projects from the community. Click any project card to view details and join collaborations.
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="filter-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Filter & Search</h4>
                <p className="text-gray-700">
                    Use filters to find projects by type, topic, date, and more. Find exactly what you're looking for!
                </p>
            </div>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="ai-assistant-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Create Your Project with AI</h4>
                <p className="text-gray-700">
                    Ready to start your own project? Let's create one together with AI assistance! Click Next to continue to the AI assistant.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="project-goal-input"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Describe Your Project Idea</h4>
                <p className="text-gray-700">
                    Tell the AI what you want to create! We've added a sample idea to get you started.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="generate-ideas-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Generate Project Ideas</h4>
                <p className="text-gray-700">
                    Click this button to generate AI-powered project ideas based on your goals and skills! Click Next to see the ideas.
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="idea-cards-grid"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Browse AI-Generated Ideas</h4>
                <p className="text-gray-700">
                    The AI has generated personalized project ideas based on your goals and skills! Browse through them and select one that interests you.
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="selected-idea-review"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Review Your Selected Idea</h4>
                <p className="text-gray-700">
                    Here you can review the selected project idea in detail. You can edit it, customize features, or proceed to generate a roadmap!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="generate-roadmap-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Generate Project Roadmap</h4>
                <p className="text-gray-700">
                    Ready to plan your project? Click Next to see your AI-generated roadmap with phases, milestones, and tasks!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="roadmap-section"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Your Project Roadmap</h4>
                <p className="text-gray-700">
                    Here's your detailed project roadmap! It's organized into phases, milestones, and tasks with time estimates. You can expand sections to see all the details.
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="proposal-section"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Implementation Strategy</h4>
                <p className="text-gray-700">
                    This section provides strategic guidance including approach, benefits, challenges, success metrics, and resources needed for your project!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="continue-to-setup-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Create Your Project</h4>
                <p className="text-gray-700">
                    Ready to turn your plan into reality? Click this button to set up your project with all the details!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="project-cover-section"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Select Project Cover</h4>
                <p className="text-gray-700">
                    Choose an eye-catching cover image for your project! You can upload your own image or choose from Unsplash.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="save-project-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Save Project</h4>
                <p className="text-gray-700">
                    Click "Save" to create your project without a recruitment post, or "Save & Create Post" to also create a post to find team members!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="save-create-post-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Create Recruitment Post</h4>
                <p className="text-gray-700">
                    This will save your project and create a post to recruit team members. Let's continue to see the post creation form!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="visibility-section"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Set Post Visibility</h4>
                <p className="text-gray-700">
                    Choose who can see your recruitment post: Private (only you), Public (everyone), Local (your area), or Organization (your school).
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="save-all-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Save Everything</h4>
                <p className="text-gray-700">
                    Click "Save All" to create your project and publish your recruitment post! Your AI-generated roadmap will be automatically saved with the project.
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '[data-tour="project-dashboard-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Access Your Project Dashboard</h4>
                <p className="text-gray-700">
                    Click the Dashboard button to manage your project, track tasks, collaborate with team members, and monitor progress!
                </p>
            </div>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: 'body',
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Project Creation Complete! 🎉</h3>
                <p className="text-gray-700">
                    Congratulations! You've learned how to discover projects and create your own with AI assistance.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 font-semibold mb-2">Continue Learning?</p>
                    <p className="text-blue-800 text-sm">
                        Click "Start Dashboard Tutorial" to learn how to manage your project, track tasks, and collaborate with your team.
                    </p>
                    <p className="text-blue-700 text-xs mt-2">
                        Or click "No Thanks" to explore on your own.
                    </p>
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

// Dashboard tutorial for when user is inside a project
export const dashboardTutorialSteps: TutorialStep[] = [
    {
        target: 'body',
        content: (
            <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">Welcome to Your Project Dashboard! 📊</h3>
                <p className="text-gray-700">
                    This is your project control center. Let's explore how to manage your project effectively.
                </p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '[data-tour="overview-dashboard-tab"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Dashboard Overview</h4>
                <p className="text-gray-700">
                    The Dashboard tab shows your project's key metrics, progress visualization, and quick insights at a glance.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="overview-details-tab"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Project Details</h4>
                <p className="text-gray-700">
                    The Project Details tab lets you view and edit your project's information, including title, description, timeline, and visibility settings.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="idea-forest-section"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Idea Forest</h4>
                <p className="text-gray-700">
                    The Idea Forest is a visual brainstorming space where you can organize ideas, create mind maps, and collaborate with your team on project concepts.
                </p>
            </div>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="dashboard-overview"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Dashboard Overview</h4>
                <p className="text-gray-700">
                    See project statistics, recent activity, and quick insights at a glance.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="navigation-tabs"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Navigation Tabs</h4>
                <p className="text-gray-700">
                    Switch between different sections: Overview, Tasks, Files, Team, and more.
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '[data-tour="add-task-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Create Tasks</h4>
                <p className="text-gray-700">
                    Add new tasks quickly. Set priorities, assignees, and due dates to keep your team organized.
                </p>
            </div>
        ),
        placement: 'left',
        disableBeacon: true,
    },
    {
        target: '[data-tour="share-button"]',
        content: (
            <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900">Share Your Project</h4>
                <p className="text-gray-700">
                    Generate shareable links or invite collaborators via email. Build your team!
                </p>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: 'body',
        content: (
            <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">Dashboard Tour Complete! 🎯</h3>
                <p className="text-gray-700">
                    You're ready to manage your project like a pro. Happy collaborating!
                </p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

// Fallback steps if elements are not found
export const fallbackProjectSteps: TutorialStep[] = [
    {
        target: 'body',
        content: (
            <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">Welcome to ProjectUp! 🎉</h3>
                <p className="text-gray-700">
                    Create projects, collaborate with your team, and manage tasks all in one place.
                </p>
                <p className="text-sm text-gray-500">
                    Explore the interface to discover all features. You can restart this tutorial anytime from the help menu.
                </p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];
