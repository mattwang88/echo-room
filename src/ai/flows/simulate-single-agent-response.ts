
'use server';
/**
 * @fileOverview Simulates a single AI agent's response based on their role and persona.
 *
 * - simulateSingleAgentResponse - A function that simulates a single AI agent and returns their feedback.
 * - SimulateSingleAgentResponseInput - The input type for the simulateSingleAgentResponse function.
 * - SimulateSingleAgentResponseOutput - The return type for the simulateSingleAgentResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AgentRole } from '@/lib/types';

const SimulateSingleAgentResponseInputSchema = z.object({
  userResponse: z.string().describe("The user's most recent response or proposal."),
  agentRole: z.custom<AgentRole>().describe("The role of the AI agent that should respond (e.g., 'CTO', 'Finance')."),
  agentPersona: z.string().describe("The specific persona instructions for this agent."),
  scenarioObjective: z.string().describe("The overall objective of the current meeting scenario for context."),
});
export type SimulateSingleAgentResponseInput = z.infer<typeof SimulateSingleAgentResponseInputSchema>;

const SimulateSingleAgentResponseOutputSchema = z.object({
  agentFeedback: z.string().describe("The AI agent's response to the user."),
});
export type SimulateSingleAgentResponseOutput = z.infer<typeof SimulateSingleAgentResponseOutputSchema>;

export async function simulateSingleAgentResponse(input: SimulateSingleAgentResponseInput): Promise<SimulateSingleAgentResponseOutput> {
  return simulateSingleAgentResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateSingleAgentResponsePrompt',
  input: {schema: SimulateSingleAgentResponseInputSchema},
  output: {schema: SimulateSingleAgentResponseOutputSchema},
  prompt: `You are simulating a single AI agent in a meeting. Your goal is to make your response feel human-like, conversational, and constructive, adhering to the persona provided.
Your entire response MUST be very short and to the point.

The user has just said:
"{{{userResponse}}}"

Your Role: {{{agentRole}}}
Your Persona: {{{agentPersona}}}
Scenario Objective: {{{scenarioObjective}}}

Based on your role and persona, please provide a response that:
1. Expresses your initial feeling or reaction to the user's response in a single, brief sentence.
2. Provides one very concise comment or observation based on your expertise (a single, brief sentence).
3. Asks 1 (or at most 2) targeted follow-up questions related to the user's response and your role's focus.

Agent Feedback: [Your very brief feeling, very brief comment, and 1-2 questions based on your persona and the user's response]`,
});

const simulateSingleAgentResponseFlow = ai.defineFlow(
  {
    name: 'simulateSingleAgentResponseFlow',
    inputSchema: SimulateSingleAgentResponseInputSchema,
    outputSchema: SimulateSingleAgentResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
