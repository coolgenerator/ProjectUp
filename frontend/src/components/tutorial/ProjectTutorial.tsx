import React, { useCallback, useRef, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import { nextStep, previousStep, setStep } from '../../store/tutorial';
import { useTutorial } from '../../hooks/useTutorial';
import { projectTutorialSteps, fallbackProjectSteps } from '../../config/tutorialSteps';

export const ProjectTutorial: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { currentStep, isActive } = useSelector((state: RootState) => state.tutorial);
    const { completeTutorial, skipTutorial } = useTutorial('project');
    const retryCountRef = useRef<{[key: number]: number}>({});

    // Listen for tutorial project creation completion in tutorial mode
    useEffect(() => {
        const isTutorialMode = new URLSearchParams(window.location.search).get('tutorial') === 'true';

        if (isTutorialMode) {
            const handleTutorialSaveAll = (event: Event) => {
                // Tutorial project creation simulated
            };

            window.addEventListener('saveAll', handleTutorialSaveAll);

            return () => {
                window.removeEventListener('saveAll', handleTutorialSaveAll);
            };
        }
    }, []);

    // Handle Joyride callback events
    const handleJoyrideCallback = useCallback((data: CallBackProps) => {
        const { status, type, index, action, step } = data;

        // Handle tour completion
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            if (action === 'skip' || status === STATUS.SKIPPED) {
                skipTutorial();
            } else {
                completeTutorial();
                // On final completion, navigate to dashboard if user wants to continue
                if (index === 19) {
                    // User clicked "Start Dashboard Tutorial"
                    // First navigate to the dashboard with tutorial param
                    setTimeout(() => {
                        const dashboardButton = document.querySelector('[data-tour="project-dashboard-button"]') as HTMLElement;
                        if (dashboardButton) {
                            // Navigate with tutorial mode enabled for dashboard
                            const projectSid = dashboardButton.getAttribute('data-project-sid');
                            if (projectSid) {
                                navigate(`/project/${projectSid}/dashboard?section=overview&tutorial=true`);
                            } else {
                                dashboardButton.click();
                            }
                        }
                    }, 500);
                }
            }
            return;
        }

        // Handle step progression
        if (type === EVENTS.STEP_AFTER) {
            if (action === 'next') {
                // Special handling for AI assistant step (step 4, index 3)
                if (index === 3) {
                    // Navigate to AI assistant page with tutorial mode using React Router
                    dispatch(nextStep()); // Move to step 5 before navigation
                    navigate('/ai-project-assistant?step=analyze&tutorial=true');
                    return;
                }
                // Special handling for moving from generate button to ideas (step 6, index 5)
                // In tutorial mode, skip the actual generation and just navigate with mock data
                if (index === 5) {
                    // First navigate to ideas page
                    navigate('/ai-project-assistant?step=ideas&tutorial=true');
                    // Then after a delay, move to next step so Joyride can find the target
                    setTimeout(() => {
                        dispatch(nextStep()); // Move to step 7 after navigation
                    }, 800);
                    return;
                }
                // Special handling for navigating to roadmap page (step 9, index 8)
                if (index === 8) {
                    // Navigate to roadmap page with mock data
                    navigate('/ai-project-assistant?step=roadmap&tutorial=true');
                    // Then after a delay, move to next step so Joyride can find the target
                    setTimeout(() => {
                        dispatch(nextStep()); // Move to step 10 after navigation
                    }, 800);
                    return;
                }
                // Special handling for switching to proposals view (step 10, index 9)
                if (index === 9) {
                    // Switch to proposals view by triggering a click on the proposals tab
                    const proposalsTab = document.querySelector('[data-tab="proposals"]') as HTMLElement;
                    if (proposalsTab) {
                        proposalsTab.click();
                    }
                    setTimeout(() => {
                        dispatch(nextStep()); // Move to step 11 after view switch
                    }, 500);
                    return;
                }
                // Special handling for opening project setup modal (step 12, index 11)
                if (index === 11) {
                    // Click the "Continue to Project Setup" button
                    const setupButton = document.querySelector('[data-tour="continue-to-setup-button"]') as HTMLElement;
                    if (setupButton) {
                        setupButton.click();
                    }
                    setTimeout(() => {
                        dispatch(nextStep()); // Move to step 13 after modal opens
                    }, 500);
                    return;
                }
                // Special handling for clicking "Save & Create Post" (step 15, index 14)
                if (index === 14) {
                    // Click the "Save & Create Post" button to go to step 2
                    const saveCreateButton = document.querySelector('[data-tour="save-create-post-button"]') as HTMLElement;
                    if (saveCreateButton) {
                        saveCreateButton.click();
                    }
                    setTimeout(() => {
                        dispatch(nextStep()); // Move to step 16 after step 2 loads
                    }, 800);
                    return;
                }
                // Special handling for Save All step - redirect to my projects (step 17, index 16)
                if (index === 16) {
                    // Click Save All button
                    const saveAllButton = document.querySelector('[data-tour="save-all-button"]') as HTMLElement;
                    if (saveAllButton) {
                        saveAllButton.click();
                    }
                    // Wait for tutorial event processing, then navigate to my projects
                    setTimeout(() => {
                        // Navigate to my projects with tutorial mode
                        navigate('/my-projects?tutorial=true');
                        // Then move to step 18 after navigation
                        setTimeout(() => {
                            dispatch(nextStep()); // Move to step 18 (dashboard button)
                        }, 1000);
                    }, 500);
                    return;
                }
                dispatch(nextStep());
            } else if (action === 'prev') {
                dispatch(previousStep());
            }
        }

        // Handle missing targets - wait and retry instead of immediately skipping
        if (type === EVENTS.TARGET_NOT_FOUND) {
            const targetSelector = projectTutorialSteps[index]?.target as string;
            const currentRetries = retryCountRef.current[index] || 0;

            // Try up to 3 times before skipping
            if (currentRetries < 3) {
                retryCountRef.current[index] = currentRetries + 1;

                // Wait a bit and force a re-render by temporarily stepping back and forth
                setTimeout(() => {
                    const element = document.querySelector(targetSelector);
                    if (element) {
                        // Force Joyride to re-check by updating step
                        dispatch(setStep(index));
                    } else {
                        if (currentRetries >= 2) {
                            // After 3 retries, skip to next step
                            dispatch(nextStep());
                        }
                    }
                }, 500);
            } else {
                // Reset retry count and skip
                retryCountRef.current[index] = 0;
                dispatch(nextStep());
            }
        }
    }, [dispatch, navigate, completeTutorial, skipTutorial]);

    // Don't render if tutorial is not active
    if (!isActive) {
        return null;
    }

    // Check if tutorial elements exist, fallback if needed
    const steps: Step[] = projectTutorialSteps;

    return (
        <Joyride
            steps={steps}
            stepIndex={currentStep}
            run={isActive}
            continuous
            showProgress
            showSkipButton
            hideCloseButton
            disableOverlayClose
            disableCloseOnEsc
            spotlightClicks={true}
            spotlightPadding={8}
            scrollToFirstStep
            scrollOffset={120}
            disableScrolling={false}
            disableScrollParentFix
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    primaryColor: '#3b82f6',
                    textColor: '#1f2937',
                    width: 380,
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: 12,
                    padding: 20,
                },
                tooltipTitle: {
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                },
                tooltipContent: {
                    fontSize: 14,
                    lineHeight: 1.6,
                    padding: '8px 0',
                },
                buttonNext: {
                    backgroundColor: '#3b82f6',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '10px 20px',
                    outline: 'none',
                },
                buttonBack: {
                    color: '#6b7280',
                    fontSize: 14,
                    marginRight: 8,
                },
                buttonSkip: {
                    color: '#9ca3af',
                    fontSize: 13,
                },
                spotlight: {
                    borderRadius: 8,
                },
            }}
            locale={{
                back: 'Previous',
                close: 'Close',
                last: currentStep === 19 ? 'Start Dashboard Tutorial' : 'Finish',
                next: 'Next',
                skip: currentStep === 19 ? 'No Thanks' : 'Skip Tutorial',
            }}
            floaterProps={{
                disableAnimation: false,
                styles: {
                    arrow: {
                        length: 8,
                        spread: 16,
                    },
                },
            }}
        />
    );
};

export default ProjectTutorial;
