import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Persona } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Detect if the user message references a specific agent by name or role
// Accepts an optional personas array to check for custom persona names
export function detectReferencedAgent(
  userMessage: string,
  agentRoles: string[],
  personas?: Persona[]
): string | null {
  const normalizedMessage = userMessage.toLowerCase();
  // Check by role (default behavior)
  for (const role of agentRoles) {
    const normalizedRole = role.toLowerCase();
    if (
      normalizedMessage.includes(normalizedRole) ||
      normalizedRole.split(' ').some(word => word.length > 2 && normalizedMessage.includes(word))
    ) {
      return role;
    }
  }
  // Check by persona name if personas provided
  if (personas) {
    for (const persona of personas) {
      const normalizedName = persona.name.toLowerCase();
      if (
        normalizedMessage.includes(normalizedName) ||
        normalizedName.split(' ').some(word => word.length > 2 && normalizedMessage.includes(word))
      ) {
        // Return the role associated with this persona
        return persona.role;
      }
    }
  }
  return null;
}
