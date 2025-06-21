import type { Persona } from '@/lib/types';

const STORAGE_KEY = 'echoRoomUserPersonas';

export function getAllUserPersonas(): Persona[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addUserPersona(persona: Persona): void {
  if (typeof window === 'undefined') return;
  const personas = getAllUserPersonas();
  const updatedPersonas = personas.some(p => p.id === persona.id)
    ? personas.map(p => p.id === persona.id ? persona : p)
    : [...personas, persona];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPersonas));
}

export function deleteUserPersona(id: string): void {
  if (typeof window === 'undefined') return;
  const personas = getAllUserPersonas();
  const updatedPersonas = personas.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPersonas));
}

export function getUserPersonaById(id: string): Persona | undefined {
  if (typeof window === 'undefined') return undefined;
  const personas = getAllUserPersonas();
  return personas.find(p => p.id === id);
}

export function saveUserPersona(persona: Persona) {
  const personas = getAllUserPersonas();
  const index = personas.findIndex(p => p.id === persona.id);
  
  if (index === -1) {
    throw new Error('Persona not found');
  }
  
  personas[index] = persona;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
} 