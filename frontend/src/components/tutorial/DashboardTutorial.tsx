import React, { useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { nextStep, previousStep, setStep } from '../../store/tutorial';
import { useTutorial } from '../../hooks/useTutorial';
import { dashboardTutorialSteps } from '../../config/tutorialSteps';

export const DashboardTutorial: React.FC = () => {
    const dispatch = useDispatch();
    const { currentStep, isActive } = useSelector((state: RootState) => state.tutorial);
    const { completeTutorial, skipTutorial } = useTutorial('dashboard');
    const retryCountRef = useRef<{[key: number]: number}>({});

    const handleJoyrideCallback = useCallback((data: CallBackProps) => {
        const { status, type, action, index, step } = data;

        console.log('Dashboard Tutorial Event:', { type, index, action, status, target: step?.target });

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            if (action === 'skip' || status === STATUS.SKIPPED) {
                skipTutorial();
            } else {
                completeTutorial();
            }
            return;
        }

        // Scroll to top for early steps to ensure dashboard overview is visible
        if (type === EVENTS.STEP_BEFORE || type === EVENTS.STEP_AFTER) {
            if (index <= 2) {
                // Scroll to top smoothly for first few steps
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        if (type === EVENTS.STEP_AFTER) {
            console.log(`Moving to step ${index + 1}`, action);
            if (action === 'next') {
                // Special handling for clicking details tab (step 3, index 2)
                if (index === 2) {
                    const detailsTab = document.querySelector('[data-tour="overview-details-tab"]') as HTMLElement;
                    if (detailsTab) {
                        detailsTab.click();
                    }
                    setTimeout(() => {
                        dispatch(nextStep());
                    }, 500);
                    return;
                }
                // Special handling for clicking idea-forest section (step 4, index 3)
                if (index === 3) {
                    const ideaForestSection = document.querySelector('[data-tour="idea-forest-section"]') as HTMLElement;
                    if (ideaForestSection) {
                        ideaForestSection.click();
                    }
                    setTimeout(() => {
                        dispatch(nextStep());
                    }, 800);
                    return;
                }
                dispatch(nextStep());
            } else if (action === 'prev') {
                dispatch(previousStep());
            }
        }

        // Handle missing targets - retry logic
        if (type === EVENTS.TARGET_NOT_FOUND) {
            const targetSelector = dashboardTutorialSteps[index]?.target as string;
            const currentRetries = retryCountRef.current[index] || 0;

            console.warn(`Tutorial target not found for step ${index}:`, targetSelector);

            if (currentRetries < 3) {
                retryCountRef.current[index] = currentRetries + 1;
                setTimeout(() => {
                    const element = document.querySelector(targetSelector);
                    if (element) {
                        console.log(`Element found on retry ${currentRetries + 1}:`, element);
                        dispatch(setStep(index));
                    } else if (currentRetries >= 2) {
                        dispatch(nextStep());
                    }
                }, 500);
            } else {
                retryCountRef.current[index] = 0;
                dispatch(nextStep());
            }
        }
    }, [dispatch, completeTutorial, skipTutorial]);

    if (!isActive) {
        return null;
    }

    return (
        <Joyride
            steps={dashboardTutorialSteps as Step[]}
            stepIndex={currentStep}
            run={isActive}
            continuous
            showProgress
            showSkipButton
            disableOverlayClose
            disableCloseOnEsc
            hideCloseButton
            disableScrolling={true}
            spotlightClicks={true}
            spotlightPadding={8}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.7)',
                    primaryColor: '#3b82f6',
                    textColor: '#1f2937',
                    width: 380,
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: 12,
                    padding: 20,
                },
                buttonNext: {
                    backgroundColor: '#3b82f6',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '10px 20px',
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
            }}
            locale={{
                back: 'Previous',
                close: 'Close',
                last: 'Finish',
                next: 'Next',
                skip: 'Skip Tutorial',
            }}
        />
    );
};

export default DashboardTutorial;
