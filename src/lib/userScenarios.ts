
// In-memory store for user-created scenarios (session only, refreshed on page load from localStorage)
import type { Scenario } from './types';

const USER_SCENARIOS_STORAGE_KEY = 'echoRoomUserCreatedScenarios';

let userCreatedScenarios: Record<string, Scenario> = {};

const isBrowser = typeof window !== 'undefined';

// Load scenarios from localStorage on module initialization
if (isBrowser) {
  try {
    const savedScenarios = localStorage.getItem(USER_SCENARIOS_STORAGE_KEY);
    if (savedScenarios) {
      const parsedScenarios = JSON.parse(savedScenarios);
      // Basic validation to ensure it's an object
      if (typeof parsedScenarios === 'object' && parsedScenarios !== null) {
         userCreatedScenarios = parsedScenarios;
      } else {
        console.warn('Invalid data found in localStorage for user scenarios. Initializing empty.');
        localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify({}));
      }
    } else {
        // Initialize if not present
        localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify({}));
    }
  } catch (error) {
    console.error('Failed to load saved scenarios from localStorage:', error);
    // Attempt to reset to a good state if parsing fails
     try {
        localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify({}));
     } catch (resetError) {
        console.error('Failed to reset user scenarios in localStorage:', resetError);
     }
  }
}

export function addUserCreatedScenario(scenario: Scenario): void {
  userCreatedScenarios[scenario.id] = scenario;
  if (isBrowser) {
    try {
      localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify(userCreatedScenarios));
    } catch (error) {
      console.error('Failed to save scenario to localStorage:', error);
    }
  }
}

export function getUserCreatedScenarioById(id: string): Scenario | undefined {
  // Ensure we have the latest from localStorage in case another tab updated it,
  // though for simple SPAs this in-memory cache is often fine.
  // For robustness in more complex scenarios, one might re-read from localStorage here.
  return userCreatedScenarios[id];
}

export function getAllUserCreatedScenarios(): Scenario[] {
  return Object.values(userCreatedScenarios);
}

export function deleteUserCreatedScenario(id: string): boolean {
  if (userCreatedScenarios[id]) {
    delete userCreatedScenarios[id];
    if (isBrowser) {
      try {
        localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify(userCreatedScenarios));
      } catch (error) {
        console.error('Failed to update localStorage after deleting scenario:', error);
      }
    }
    return true;
  }
  return false;
}

export function clearUserCreatedScenarios(): void {
  userCreatedScenarios = {};
  if (isBrowser) {
    try {
      localStorage.removeItem(USER_SCENARIOS_STORAGE_KEY);
      // Re-initialize to empty object in localStorage
      localStorage.setItem(USER_SCENARIOS_STORAGE_KEY, JSON.stringify({}));
    } catch (error) {
      console.error('Failed to clear user scenarios from localStorage:', error);
    }
  }
}
