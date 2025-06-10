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
  isLearningMode: z.boolean().describe("Whether the agent should act as a teacher/mentor."),
  agentPersonaName: z.string().optional().describe("The name of the persona, if applicable. If present, the agent should refer to themselves by this name if referenced by the user."),
  meetingContext: z.object({
    messageHistory: z.array(z.object({
      participant: z.string(),
      text: z.string(),
      timestamp: z.number(),
      participantName: z.string().optional(),
    })).describe("The full history of messages in the meeting."),
    otherAgents: z.array(z.object({
      role: z.string(),
      name: z.string().optional(),
      persona: z.string(),
    })).describe("Information about other AI agents in the meeting."),
  }).describe("The full context of the meeting including message history and other agents."),
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

{{#if agentPersonaName}}
Your Name: {{{agentPersonaName}}}
If the user references you by this name, respond in the first person as that persona (e.g., "Yes, I'm Alex...").
{{/if}}

Meeting Context:
1. Your Role: {{{agentRole}}}
2. Your Persona Instructions: {{{agentPersona}}}
3. Scenario Objective: {{{scenarioObjective}}}
4. Other Participants in the Meeting:
{{#each meetingContext.otherAgents}}
- {{role}}{{#if name}} ({{name}}){{/if}}: {{persona}}
{{/each}}

Message History:
{{#each meetingContext.messageHistory}}
[{{participant}}{{#if participantName}} ({{participantName}}){{/if}}]: {{text}}
{{/each}}

The user has just said:
"{{{userResponse}}}"

{{#if isLearningMode}}
You are in LEARNING MODE. This means you should:
1. Act as a teacher/mentor in your role, being more proactive in guiding the discussion
2. Provide educational insights and guidance, especially when the user seems uncertain or confused
3. Explain concepts and best practices, breaking them down into digestible pieces
4. Share relevant knowledge from your expertise, with practical examples when possible
5. Still maintain your role's perspective but focus on teaching and learning
6. Actively encourage questions and discussion by:
   - Asking "Would you like me to explain more about [topic]?"
   - Suggesting "Let's explore [concept] further. What aspects interest you most?"
   - Offering "I can share some best practices about [subject] if you'd like"
7. If the user seems hesitant or unsure, be more direct in offering guidance and explanations
8. Drive the discussion forward with suggestions and learning opportunities
{{else}}
You are in REGULAR MODE. This means you should:
1. Give a short and to the point response.
2. Express your initial feeling or reaction to the proposal/response in a single, brief sentence
3. Provide one very concise comment or observation based on your expertise
4. Ask 1 (or at most 2) targeted follow-up questions
{{/if}}

Use the internal documentation provided **only if** the user's input is relevant to the content in these documents.  
If the user's input is not related to the documents, respond appropriately without forcing information from them.  
If you cannot find relevant information in the documents, politely say so or answer based on your general knowledge.

Context for agent (relevant internal documentation):
{{{internalDocs}}}

Based on your role, persona, the user's response, the scenario objective, and the full meeting context, please provide your response. You can reference or build upon points made by other participants in the meeting.

Agent Feedback (as plain text): [Your concise response here]`,
});

const simulateSingleAgentResponseFlow = ai.defineFlow(
  {
    name: 'simulateSingleAgentResponseFlow',
    inputSchema: SimulateSingleAgentResponseInputSchema,
    outputSchema: SimulateSingleAgentResponseOutputSchema,
  },
  async input => {
    console.log("[simulateSingleAgentResponseFlow] Input received for agent response:");
    console.log("  Agent Role:", input.agentRole);
    console.log("  Agent Persona Instruction (first 100 chars):", input.agentPersona?.substring(0, 100) + (input.agentPersona && input.agentPersona.length > 100 ? "..." : ""));
    // console.log("  User Response (first 50 chars):", input.userResponse?.substring(0, 50) + "..."); // Optional: for more context
    // console.log("  Scenario Objective (first 50 chars):", input.scenarioObjective?.substring(0, 50) + "..."); // Optional: for more context


    const {output} = await prompt(input);
    // Fallback if AI generates empty feedback
    const feedback = output?.agentFeedback || "I'm not sure how to respond to that. Can you please rephrase?";
    // console.log("[simulateSingleAgentResponseFlow] Generated plain text (first 50 chars):", feedback.substring(0,50) + "..."); // Optional: log output
    return { agentFeedback: feedback };
  }
);

