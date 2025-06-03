import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Detect if the user message references a specific agent by name or role
export function detectReferencedAgent(userMessage: string, agentRoles: string[]): string | null {
  const normalizedMessage = userMessage.toLowerCase();
  for (const role of agentRoles) {
    const normalizedRole = role.toLowerCase();
    // Direct match or partial match (e.g., 'finance' in 'head of finance')
    if (
      normalizedMessage.includes(normalizedRole) ||
      normalizedRole.split(' ').some(word => word.length > 2 && normalizedMessage.includes(word))
    ) {
      return role;
    }
  }
  return null;
}
