import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
    startTutorial,
    stopTutorial,
    completeTutorial,
    setTutorialCompletion,
    setTemplateProjectId,
    skipTutorial,
} from '../store/tutorial';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

export const useTutorial = (tutorialType: 'project' | 'dashboard' = 'project') => {
    const dispatch = useDispatch();
    const tutorial = useSelector((state: RootState) => state.tutorial);
    const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);
    const userId = useSelector((state: RootState) => state.auth.user?.id);

    // Check if user has completed tutorials
    const checkTutorialStatus = useCallback(async () => {
        if (!isAuthenticated || !userId) return;

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/user/tutorial-status`);
            if (response.ok) {
                const data = await response.json();
                dispatch(setTutorialCompletion({
                    project: data.project_tutorial_completed || false,
                    dashboard: data.dashboard_tutorial_completed || false,
                }));

                // Return status for conditional logic
                return {
                    projectCompleted: data.project_tutorial_completed || false,
                    dashboardCompleted: data.dashboard_tutorial_completed || false,
                };
            }
        } catch (error) {
            console.error('Failed to fetch tutorial status:', error);
        }
        return null;
    }, [isAuthenticated, userId, dispatch]);

    // Create template project for tutorial
    const createTemplateProject = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/api/tutorial/create-template-project`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                dispatch(setTemplateProjectId(data.project_id || data.short_id));
                return data;
            }
        } catch (error) {
            console.error('Failed to create template project:', error);
        }
        return null;
    }, [dispatch]);

    // Start tutorial (optionally create template project)
    const beginTutorial = useCallback(async (createTemplate: boolean = false) => {
        if (createTemplate && tutorialType === 'project') {
            await createTemplateProject();
        }

        // Small delay to ensure all elements are rendered before Joyride starts looking for them
        setTimeout(() => {
            dispatch(startTutorial({ type: tutorialType }));
        }, 300);
    }, [tutorialType, createTemplateProject, dispatch]);

    // Complete tutorial and save to backend
    const finishTutorial = useCallback(async () => {
        try {
            const endpoint = tutorialType === 'project'
                ? '/api/user/complete-project-tutorial'
                : '/api/user/complete-dashboard-tutorial';

            await fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            dispatch(completeTutorial(tutorialType));
        } catch (error) {
            console.error('Failed to save tutorial completion:', error);
            // Still mark as complete locally even if API fails
            dispatch(completeTutorial(tutorialType));
        }
    }, [tutorialType, dispatch]);

    // Skip tutorial and save preference to backend
    const handleSkipTutorial = useCallback(async () => {
        try {
            const endpoint = tutorialType === 'project'
                ? '/api/user/skip-project-tutorial'
                : '/api/user/skip-dashboard-tutorial';

            await fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            dispatch(skipTutorial());
        } catch (error) {
            console.error('Failed to save tutorial skip:', error);
            // Still mark as skipped locally
            dispatch(skipTutorial());
        }
    }, [tutorialType, dispatch]);

    // Auto-start tutorial on first visit
    useEffect(() => {
        const autoStartTutorial = async () => {
            const status = await checkTutorialStatus();

            if (!status) return;

            const shouldStart = tutorialType === 'project'
                ? !status.projectCompleted
                : !status.dashboardCompleted;

            if (shouldStart && !tutorial.isActive && !tutorial.skipRequested) {
                // Small delay to let the page render
                setTimeout(() => {
                    beginTutorial(tutorialType === 'project');
                }, 1000);
            }
        };

        if (isAuthenticated) {
            autoStartTutorial();
        }
    }, [isAuthenticated, tutorialType]); // Only run on mount and auth change

    return {
        isActive: tutorial.isActive,
        currentStep: tutorial.currentStep,
        isCompleted: tutorialType === 'project'
            ? tutorial.completed.projectTutorial
            : tutorial.completed.dashboardTutorial,
        templateProjectId: tutorial.templateProjectId,
        startTutorial: beginTutorial,
        stopTutorial: () => dispatch(stopTutorial()),
        completeTutorial: finishTutorial,
        skipTutorial: handleSkipTutorial,
        checkTutorialStatus,
    };
};
