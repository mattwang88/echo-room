// This is an auto-generated file from Firebase Studio.

'use server';

/**
 * @fileOverview Simulates AI agents with distinct roles to provide feedback on user proposals.
 *
 * - simulateAiAgents - A function that simulates AI agents and returns their feedback.
 * - SimulateAiAgentsInput - The input type for the simulateAiAgents function.
 * - SimulateAiAgentsOutput - The return type for the simulateAiAgents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateAiAgentsInputSchema = z.object({
  proposal: z.string().describe('The user proposal to be evaluated by the AI agents.'),
  ctoPersona: z.string().describe('Instructions for the CTO persona.'),
  financePersona: z.string().describe('Instructions for the Finance persona.'),
  productPersona: z.string().describe('Instructions for the Product persona.'),
  hrPersona: z.string().describe('Instructions for the HR persona.'),
});
export type SimulateAiAgentsInput = z.infer<typeof SimulateAiAgentsInputSchema>;

const SimulateAiAgentsOutputSchema = z.object({
  ctoFeedback: z.string().describe('The CTO agent feedback on the proposal.'),
  financeFeedback: z.string().describe('The Finance agent feedback on the proposal.'),
  productFeedback: z.string().describe('The Product agent feedback on the proposal.'),
  hrFeedback: z.string().describe('The HR agent feedback on the proposal.'),
});
export type SimulateAiAgentsOutput = z.infer<typeof SimulateAiAgentsOutputSchema>;

export async function simulateAiAgents(input: SimulateAiAgentsInput): Promise<SimulateAiAgentsOutput> {
  return simulateAiAgentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateAiAgentsPrompt',
  input: {schema: SimulateAiAgentsInputSchema},
  output: {schema: SimulateAiAgentsOutputSchema},
  prompt: `You are simulating a meeting with AI agents with distinct roles.

  The user will provide a proposal, and the AI agents will respond with relevant questions, concerns, and feedback.

  Here is the user's proposal: {{{proposal}}}

  Here are the agent personas:

  CTO: {{{ctoPersona}}}
  Finance: {{{financePersona}}}
  Product: {{{productPersona}}}
  HR: {{{hrPersona}}}

  Please provide the agent feedback in the following format:

  CTO Feedback: [CTO feedback]
  Finance Feedback: [Finance feedback]
  Product Feedback: [Product feedback]
  HR Feedback: [HR feedback]`,
});

const simulateAiAgentsFlow = ai.defineFlow(
  {
    name: 'simulateAiAgentsFlow',
    inputSchema: SimulateAiAgentsInputSchema,
    outputSchema: SimulateAiAgentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
