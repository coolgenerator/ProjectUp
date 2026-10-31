import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TutorialState {
    isActive: boolean;
    currentStep: number;
    completed: {
        projectTutorial: boolean;
        dashboardTutorial: boolean;
    };
    templateProjectId: string | null;
    skipRequested: boolean;
}

const initialState: TutorialState = {
    isActive: false,
    currentStep: 0,
    completed: {
        projectTutorial: false,
        dashboardTutorial: false,
    },
    templateProjectId: null,
    skipRequested: false,
};

const tutorialSlice = createSlice({
    name: "tutorial",
    initialState,
    reducers: {
        startTutorial: (state, action: PayloadAction<{ type: 'project' | 'dashboard' }>) => {
            state.isActive = true;
            state.currentStep = 0;
            state.skipRequested = false;
        },
        stopTutorial: (state) => {
            state.isActive = false;
            state.currentStep = 0;
        },
        nextStep: (state) => {
            state.currentStep += 1;
        },
        previousStep: (state) => {
            if (state.currentStep > 0) {
                state.currentStep -= 1;
            }
        },
        setStep: (state, action: PayloadAction<number>) => {
            state.currentStep = action.payload;
        },
        completeTutorial: (state, action: PayloadAction<'project' | 'dashboard'>) => {
            state.completed[`${action.payload}Tutorial`] = true;
            state.isActive = false;
            state.currentStep = 0;
        },
        setTutorialCompletion: (state, action: PayloadAction<{ project: boolean; dashboard: boolean }>) => {
            state.completed.projectTutorial = action.payload.project;
            state.completed.dashboardTutorial = action.payload.dashboard;
        },
        setTemplateProjectId: (state, action: PayloadAction<string>) => {
            state.templateProjectId = action.payload;
        },
        skipTutorial: (state) => {
            state.skipRequested = true;
            state.isActive = false;
            state.currentStep = 0;
        },
        resetTutorial: (state) => {
            state.isActive = false;
            state.currentStep = 0;
            state.completed.projectTutorial = false;
            state.completed.dashboardTutorial = false;
            state.templateProjectId = null;
            state.skipRequested = false;
        },
    },
});

export const {
    startTutorial,
    stopTutorial,
    nextStep,
    previousStep,
    setStep,
    completeTutorial,
    setTutorialCompletion,
    setTemplateProjectId,
    skipTutorial,
    resetTutorial,
} = tutorialSlice.actions;

export default tutorialSlice.reducer;
