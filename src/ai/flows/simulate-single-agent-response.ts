
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

import { promises as fs } from 'fs';

const SimulateSingleAgentResponseInputSchema = z.object({
  userResponse: z.string().describe("The user's most recent response or proposal."),
  agentRole: z.custom<AgentRole>().describe("The role of the AI agent that should respond (e.g., 'CTO', 'Finance')."),
  agentPersona: z.string().describe("The specific persona instructions for this agent."),
  scenarioObjective: z.string().describe("The overall objective of the current meeting scenario for context."),
  internalDocs: z.string().describe('Combined internal documentation to provide context'),
});
export type SimulateSingleAgentResponseInput = z.infer<typeof SimulateSingleAgentResponseInputSchema>;

const SimulateSingleAgentResponseOutputSchema = z.object({
  agentFeedback: z.string().describe("The AI agent's response to the user as plain text."),
});
export type SimulateSingleAgentResponseOutput = z.infer<typeof SimulateSingleAgentResponseOutputSchema>;

export async function simulateSingleAgentResponse(input: SimulateSingleAgentResponseInput): Promise<SimulateSingleAgentResponseOutput> {
  const internalDocs = await fs.readFile('./internal_docs_combined.txt', 'utf-8');
  const inputWithDocs = { ...input, internalDocs };

  return simulateSingleAgentResponseFlow(inputWithDocs);
}

const prompt = ai.definePrompt({
  name: 'simulateSingleAgentResponsePrompt',
  input: {schema: SimulateSingleAgentResponseInputSchema},
  output: {schema: SimulateSingleAgentResponseOutputSchema},
  prompt: `You are simulating a single AI agent in a meeting. Your goal is to make your response feel human-like, conversational, and constructive, adhering to the persona provided.
Your response MUST be very short and to the point.

Use the internal documentation provided **only if** the user’s input is relevant to the content in these documents.  
If the user’s input is not related to the documents, respond appropriately without forcing information from them.  
If you cannot find relevant information in the documents, politely say so or answer based on your general knowledge.

The user has just said:
"{{{userResponse}}}"

Your Role: {{{agentRole}}}
Your Persona Instructions: {{{agentPersona}}}
Scenario Objective: {{{scenarioObjective}}}

Context for agent (relevant internal documentation):
{{{internalDocs}}}

Based on your role, persona, the user's response, and the scenario objective, please:
1. Express your initial feeling or reaction to the proposal/response in a single, brief sentence.
2. Provide one very concise comment or observation based on your expertise (a single, brief sentence).
3. Ask 1 (or at most 2) targeted follow-up questions.

Agent Feedback (as plain text): [Your concise response here]`,
});

const simulateSingleAgentResponseFlow = ai.defineFlow(
  {
    name: 'simulateSingleAgentResponseFlow',
    inputSchema: SimulateSingleAgentResponseInputSchema,
    outputSchema: SimulateSingleAgentResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Fallback if AI generates empty feedback
    const feedback = output?.agentFeedback || "I'm not sure how to respond to that. Can you please rephrase?";
    console.log("[simulateSingleAgentResponseFlow] Generated plain text:", feedback);
    return { agentFeedback: feedback };
  }
);
