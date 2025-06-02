const LEARNING_MODE_KEY = 'echoRoomLearningMode';

export function getLearningMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(LEARNING_MODE_KEY);
  return stored ? JSON.parse(stored) : false;
}

export function setLearningMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEARNING_MODE_KEY, JSON.stringify(enabled));
} 