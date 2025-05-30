
import type { EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import {z} from 'genkit';

export type AgentRole = "CTO" | "Finance" | "Product" | "HR";
export type ParticipantRole = AgentRole | "User" | "System";

// Definition for AnalyzeResponseOutputSchema and AnalyzeResponseOutput moved here
export const AnalyzeResponseOutputSchema = z.object({
  clarity: z.string().describe('Feedback on the clarity of the response.'),
  persuasiveness: z.string().describe('Feedback on the persuasiveness of the response.'),
  technicalSoundness: z
    .string()
    .describe('Feedback on the technical soundness of the response.'),
  domainKnowledgeFeedback: z
    .string()
    .describe('Feedback on the accuracy and depth of domain knowledge demonstrated in the response. This should be constructive and point out specific areas related to the topic discussed.'),
  suggestedLearningMaterials: z
    .string()
    .describe('Suggestions for learning materials (e.g., articles, courses, documentation, books) to improve domain knowledge or communication skills relevant to the response and context. Provide 1-3 actionable suggestions.'),
  overallFeedback: z.string().describe('Overall feedback on the response.'),
});
export type AnalyzeResponseOutput = z.infer<typeof AnalyzeResponseOutputSchema>;

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
