
import type { AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import type { EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';

export type AgentRole = "CTO" | "Finance" | "Product" | "HR";
export type ParticipantRole = AgentRole | "User" | "System";

export interface Message {
  id: string;
  participant: ParticipantRole;
  text: string;
  timestamp: number; // Use number (Date.now()) for easier serialization
  avatar?: string; 
  coachingFeedback?: AnalyzeResponseOutput;
  semanticEvaluation?: EvaluateSemanticSkillOutput;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  objective: string;
  initialMessage: {
    participant: AgentRole | "System"; // Usually an Agent or System message
    text: string;
  };
  agentsInvolved: AgentRole[]; // Which agents are part of this scenario
  personaConfig: {
    ctoPersona: string;
    financePersona: string;
    productPersona: string;
    hrPersona: string;
  };
  maxTurns?: number; // Optional: to define an end condition for the meeting
}

export interface MeetingSummaryData {
  scenarioTitle: string;
  objective: string;
  messages: Message[];
  finalThoughts?: string; // Could be AI generated summary
}
