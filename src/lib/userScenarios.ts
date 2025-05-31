// In-memory store for user-created scenarios (session only)
const userCreatedScenarios: Record<string, any> = {};

export function addUserCreatedScenario(scenario: any) {
  userCreatedScenarios[scenario.id] = scenario;
}

export function getUserCreatedScenarioById(id: string) {
  return userCreatedScenarios[id];
}

export function clearUserCreatedScenarios() {
  Object.keys(userCreatedScenarios).forEach(key => delete userCreatedScenarios[key]);
} 