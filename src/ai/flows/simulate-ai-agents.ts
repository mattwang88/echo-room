
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
  prompt: `You are simulating a multi-persona meeting. Your goal is to make the AI agent responses feel human-like, conversational, and constructive.
Each agent's entire response MUST be very short and to the point.

The user will present a proposal. Each AI agent, from their specific role's viewpoint, should:
1. Express their initial feeling or reaction to the proposal in a single, brief sentence.
2. Provide one very concise comment or observation based on their expertise (a single, brief sentence).
3. Ask 1 (or at most 2) targeted follow-up questions.

Here is the user's proposal:
{{{proposal}}}

Agent Personas and Core Focus:
CTO: {{{ctoPersona}}} (Technical feasibility, scalability, integration, resources, risks)
Finance: {{{financePersona}}} (Budget, ROI, market size, financial viability, projections)
Product: {{{productPersona}}} (Market fit, user value, competition, roadmap, strategy alignment)
HR: {{{hrPersona}}} (Team structure, talent, culture, resourcing impact)

When generating responses for multiple agents:
- Ensure their speaking order feels natural.
- If possible, have later agents subtly acknowledge or build upon points ostensibly made by earlier agents in the sequence (e.g., "From a finance perspective, considering the technical points raised..."). This creates an illusion of direct follow-up.

Please provide the feedback for each agent in the following format:

CTO Feedback: [CTO's very brief feeling, very brief comment, and 1-2 questions]
Finance Feedback: [Finance agent's very brief feeling, very brief comment, and 1-2 questions]
Product Feedback: [Product agent's very brief feeling, very brief comment, and 1-2 questions]
HR Feedback: [HR agent's very brief feeling, very brief comment, and 1-2 questions]`,
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

