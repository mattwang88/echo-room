'use server';
/**
 * @fileOverview Generates custom meeting scenario details based on user input.
 *
 * - generateCustomScenarioDetails - Creates scenario title, objective, and initial message.
 * - GenerateCustomScenarioInput - Input type.
 * - GenerateCustomScenarioOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomScenarioInputSchema = z.object({
  simulationDescription: z.string().min(1, { message: "Simulation description cannot be empty." }).describe('The user-provided description for the meeting simulation.'),
  selectedRoles: z.array(z.string()).describe('A list of AI agent roles selected to participate in the meeting.'),
});
export type GenerateCustomScenarioInput = z.infer<typeof GenerateCustomScenarioInputSchema>;

const GenerateCustomScenarioOutputSchema = z.object({
  scenarioTitle: z.string().describe('A concise and descriptive title for the generated scenario.'),
  scenarioObjective: z.string().describe('A clear objective for the user to achieve during this meeting scenario.'),
  initialSystemMessage: z.string().describe('An engaging initial message from the System to start the meeting, setting the context and mentioning participants if roles are provided.'),
});
export type GenerateCustomScenarioOutput = z.infer<typeof GenerateCustomScenarioOutputSchema>;

export async function generateCustomScenarioDetails(input: GenerateCustomScenarioInput): Promise<GenerateCustomScenarioOutput> {
  return generateCustomScenarioDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomScenarioPrompt',
  input: {schema: GenerateCustomScenarioInputSchema},
  output: {schema: GenerateCustomScenarioOutputSchema},
  prompt: `You are an AI assistant that helps create custom meeting simulation scenarios for an app called EchoRoom.
Based on the user's description and the selected participant roles, generate the following three distinct fields:
1.  A concise "Scenario Title" (max 5-7 words).
2.  A clear "Scenario Objective" for the user of EchoRoom to achieve in the meeting (1-2 sentences). This objective should be framed from the user's perspective (e.g., "Your goal is to...").
3.  An "Initial System Message" to start the meeting. This message should be from the "System" participant. It should set the context based on the description and, if AI roles are provided, welcome the user and mention the AI participant roles who are present (e.g., "The CTO and Head of Finance are present."). If no AI roles are selected, just set the scene generally.

User's Simulation Description:
"{{{simulationDescription}}}"

Selected AI Participant Roles:
{{#if selectedRoles.length}}
  {{#each selectedRoles}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
  (No specific AI roles selected by the user for this simulation)
{{/if}}

Ensure the output strictly follows the schema with distinct values for scenarioTitle, scenarioObjective, and initialSystemMessage.

Example Output Structure:
Scenario Title: Pitching the New Mobile App
Scenario Objective: Your goal is to convince the CTO and Product Manager to allocate budget for the new mobile application by highlighting its key features and market potential.
Initial System Message: Welcome to the project pitch meeting. You're here to discuss your proposal for a new mobile application. The CTO and Product Manager are present. Please begin when you're ready.

Provide your response in the specified structured format.
`,
});

const generateCustomScenarioDetailsFlow = ai.defineFlow(
  {
    name: 'generateCustomScenarioDetailsFlow',
    inputSchema: GenerateCustomScenarioInputSchema,
    outputSchema: GenerateCustomScenarioOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.scenarioTitle || !output.scenarioObjective || !output.initialSystemMessage) {
        console.error("AI failed to generate complete scenario details. Output:", output);
        throw new Error("AI failed to generate all required scenario details. Please try again.");
    }
    // Ensure fields are strings and not accidentally other types if schema is loose
    return {
        scenarioTitle: String(output.scenarioTitle),
        scenarioObjective: String(output.scenarioObjective),
        initialSystemMessage: String(output.initialSystemMessage),
    };
  }
);
