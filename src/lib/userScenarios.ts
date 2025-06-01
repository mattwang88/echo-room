// In-memory store for user-created scenarios (session only)
const userCreatedScenarios: Record<string, any> = {};

const isBrowser = typeof window !== 'undefined';

export function addUserCreatedScenario(scenario: any) {
  userCreatedScenarios[scenario.id] = scenario;
  // Save to localStorage for persistence
  if (isBrowser) {
    try {
      localStorage.setItem('userCreatedScenarios', JSON.stringify(userCreatedScenarios));
    } catch (error) {
      console.error('Failed to save scenario to localStorage:', error);
    }
  }
}

export function getUserCreatedScenarioById(id: string) {
  return userCreatedScenarios[id];
}

export function getAllUserCreatedScenarios() {
  return Object.values(userCreatedScenarios);
}

export function deleteUserCreatedScenario(id: string) {
  if (userCreatedScenarios[id]) {
    delete userCreatedScenarios[id];
    // Update localStorage
    if (isBrowser) {
      try {
        localStorage.setItem('userCreatedScenarios', JSON.stringify(userCreatedScenarios));
      } catch (error) {
        console.error('Failed to update localStorage:', error);
      }
    }
    return true;
  }
  return false;
}

export function clearUserCreatedScenarios() {
  Object.keys(userCreatedScenarios).forEach(key => delete userCreatedScenarios[key]);
  // Clear from localStorage
  if (isBrowser) {
    try {
      localStorage.removeItem('userCreatedScenarios');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
}

// Load scenarios from localStorage on module initialization
if (isBrowser) {
  try {
    const savedScenarios = localStorage.getItem('userCreatedScenarios');
    if (savedScenarios) {
      Object.assign(userCreatedScenarios, JSON.parse(savedScenarios));
    }
  } catch (error) {
    console.error('Failed to load saved scenarios:', error);
  }
} 