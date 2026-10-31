/**
 * Utility functions for persisting onboarding form data in localStorage
 * This allows users to refresh the page without losing their progress
 */

import { ProjectScenario } from '../components/onboarding/ScenarioSelection';

const STORAGE_PREFIX = 'projectup_onboarding_';
const STORAGE_EXPIRY_HOURS = 24; // Data expires after 24 hours

interface StorageItem<T> {
  data: T;
  timestamp: number;
  scenario: ProjectScenario;
  step: string;
}

/**
 * Save form data to localStorage with timestamp
 */
export function saveOnboardingData<T>(
  scenario: ProjectScenario,
  step: string,
  data: T
): void {
  try {
    const key = `${STORAGE_PREFIX}${scenario}`;
    const storageItem: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      scenario,
      step,
    };
    localStorage.setItem(key, JSON.stringify(storageItem));
  } catch (error) {
    console.error('Failed to save onboarding data:', error);
  }
}

/**
 * Load form data from localStorage
 * Returns null if data doesn't exist or has expired
 */
export function loadOnboardingData<T>(scenario: ProjectScenario): T | null {
  try {
    const key = `${STORAGE_PREFIX}${scenario}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const storageItem: StorageItem<T> = JSON.parse(stored);

    // Check if data has expired
    const hoursElapsed = (Date.now() - storageItem.timestamp) / (1000 * 60 * 60);
    if (hoursElapsed > STORAGE_EXPIRY_HOURS) {
      localStorage.removeItem(key);
      return null;
    }

    return storageItem.data;
  } catch (error) {
    console.error('Failed to load onboarding data:', error);
    return null;
  }
}

/**
 * Get the last saved step for a scenario
 */
export function getLastStep(scenario: ProjectScenario): string | null {
  try {
    const key = `${STORAGE_PREFIX}${scenario}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const storageItem: StorageItem<any> = JSON.parse(stored);

    // Check if data has expired
    const hoursElapsed = (Date.now() - storageItem.timestamp) / (1000 * 60 * 60);
    if (hoursElapsed > STORAGE_EXPIRY_HOURS) {
      return null;
    }

    return storageItem.step;
  } catch (error) {
    console.error('Failed to get last step:', error);
    return null;
  }
}

/**
 * Clear onboarding data for a specific scenario
 */
export function clearOnboardingData(scenario: ProjectScenario): void {
  try {
    const key = `${STORAGE_PREFIX}${scenario}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear onboarding data:', error);
  }
}

/**
 * Clear all onboarding data (useful after successful project creation)
 */
export function clearAllOnboardingData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear all onboarding data:', error);
  }
}

/**
 * Clean up expired onboarding data
 * Should be called on app initialization
 */
export function cleanupExpiredData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const storageItem: StorageItem<any> = JSON.parse(stored);
            const hoursElapsed = (Date.now() - storageItem.timestamp) / (1000 * 60 * 60);
            if (hoursElapsed > STORAGE_EXPIRY_HOURS) {
              console.log(`[cleanupExpiredData] Removing expired data for key: ${key}`);
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // If parsing fails, remove the corrupted data
          console.error(`[cleanupExpiredData] Removing corrupted data for key: ${key}`);
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
  }
}

/**
 * Get time remaining before data expires (in hours)
 */
export function getTimeRemaining(scenario: ProjectScenario): number | null {
  try {
    const key = `${STORAGE_PREFIX}${scenario}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const storageItem: StorageItem<any> = JSON.parse(stored);
    const hoursElapsed = (Date.now() - storageItem.timestamp) / (1000 * 60 * 60);
    const remaining = STORAGE_EXPIRY_HOURS - hoursElapsed;

    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Failed to get time remaining:', error);
    return null;
  }
}

/**
 * Update URL parameters for scenario and step
 * Uses pushState to create browser history entries for navigation,
 * allowing users to use the back button to navigate between steps and scenarios
 */
export function updateOnboardingURL(
  scenario: ProjectScenario | null,
  step?: string
): void {
  const currentParams = new URLSearchParams(window.location.search);
  const currentScenario = currentParams.get('scenario');
  const currentStep = currentParams.get('step');

  // Check if URL already matches - prevent infinite loops
  const scenarioMatches = scenario === currentScenario;
  const stepMatches = step === currentStep;

  if (scenarioMatches && stepMatches) {
    console.log('[updateOnboardingURL] URL already matches, skipping update:', { scenario, step });
    return; // Don't update if URL is already correct
  }

  const url = new URL(window.location.href);

  if (scenario) {
    url.searchParams.set('scenario', scenario);
    if (step) {
      url.searchParams.set('step', step);
    } else {
      url.searchParams.delete('step');
    }
  } else {
    url.searchParams.delete('scenario');
    url.searchParams.delete('step');
  }

  // Determine if we should push or replace
  const scenarioChanged = scenario !== currentScenario;
  const stepChanged = step !== currentStep;
  const shouldPush = scenarioChanged || stepChanged;

  if (shouldPush) {
    // Scenario or step changed - push new history entry so back button works
    console.log('[updateOnboardingURL] Pushing new history entry:', { scenario, step });
    window.history.pushState({}, '', url.toString());
  } else {
    // No change - replace to avoid duplicate entries
    console.log('[updateOnboardingURL] Replacing history entry:', { scenario, step });
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Get scenario and step from URL parameters
 */
export function getOnboardingParamsFromURL(): {
  scenario: ProjectScenario | null;
  step: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('scenario') as ProjectScenario | null;
  const step = params.get('step');

  return { scenario, step };
}
