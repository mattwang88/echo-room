'use server';
/**
 * @fileOverview Generates a structured, reflective learning debrief based on meeting performance and coaching feedback.
 *
 * - generateNotebookLMDebrief - A function that creates a learning debrief.
 * - NotebookLMDebriefInput - The input type for the generateNotebookLMDebrief function.
 * - NotebookLMDebriefOutput - The return type for the generateNotebookLMDebrief function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnalyzeResponseOutputSchema } from '@/lib/types';
import type { AnalyzeResponseOutput } from '@/lib/types';

const NotebookLMDebriefInputSchema = z.object({
  scenarioTitle: z.string().describe('The title of the meeting scenario.'),
  scenarioObjective: z.string().describe('The objective of the meeting scenario.'),
  userResponsesWithCoaching: z.array(
    z.object({
      userResponseText: z.string().describe("The user's original response text."),
      coachingFeedback: AnalyzeResponseOutputSchema.describe("The detailed coaching feedback received for this specific response.")
    })
  ).min(1).describe("An array of user responses and the coaching feedback they received. Should not be empty.")
});
export type NotebookLMDebriefInput = z.infer<typeof NotebookLMDebriefInputSchema>;

const NotebookLMDebriefOutputSchema = z.object({
  notebookLMDebrief: z.string().describe('A structured, reflective debrief suitable for a personal learning notebook. Should be insightful, constructive, and formatted as plain text with clear headings and bullet points.'),
});
export type NotebookLMDebriefOutput = z.infer<typeof NotebookLMDebriefOutputSchema>;

export async function generateNotebookLMDebrief(input: NotebookLMDebriefInput): Promise<NotebookLMDebriefOutput> {
  return generateNotebookLMDebriefFlow(input);
}

const generateNotebookLMDebriefPrompt = ai.definePrompt({
  name: 'generateNotebookLMDebriefPrompt',
  input: {schema: NotebookLMDebriefInputSchema},
  output: {schema: NotebookLMDebriefOutputSchema},
  prompt: `You are an AI learning coach. Your goal is to create a structured, reflective debrief for a user based on their performance in a simulated meeting scenario, suitable for a personal learning notebook (like NotebookLM).

Scenario Title: {{{scenarioTitle}}}
Scenario Objective: {{{scenarioObjective}}}

User's Responses and Coaching Received:
{{#each userResponsesWithCoaching}}
- User Response: "{{this.userResponseText}}"
  Coaching Feedback:
    Clarity: {{this.coachingFeedback.clarity}}
    Persuasiveness: {{this.coachingFeedback.persuasiveness}}
    Technical Soundness: {{this.coachingFeedback.technicalSoundness}}
    Domain Knowledge: {{this.coachingFeedback.domainKnowledgeFeedback}}
    Overall: {{this.coachingFeedback.overallFeedback}}
    Suggested Learning: {{this.coachingFeedback.suggestedLearningMaterials}}
{{/each}}

Based on ALL the information above, generate a structured "Learning Debrief". The debrief MUST include ALL of the following sections in order:
1.  **Scenario Recap**: A brief recap of the scenario and objective.
2.  **Key Strengths Observed**: Identify 2-3 core strengths the user demonstrated, supported by examples or themes from their responses. Use bullet points.
3.  **Key Areas for Development**: Identify 2-3 primary areas where the user could improve, referencing specific coaching insights. Use bullet points.
4.  **Actionable Insights & Next Steps**: Based on the "Suggested Learning Materials" and overall feedback, provide 2-3 concrete, actionable steps or resources the user can explore. Use bullet points.
5.  **Reflection Prompts**: Include 2-3 open-ended questions to encourage the user to reflect further on their experience and learnings (e.g., "What was the most challenging part of this simulation for you and why?", "How might you approach a similar situation differently next time?"). Use bullet points.
6.  **Final Thoughts**: Conclude with an encouraging, forward-looking statement.

IMPORTANT:
- You MUST complete ALL sections listed above
- Do not cut off mid-sentence or mid-section
- If you're running out of space, prioritize completing the current section over starting a new one
- Each section should be self-contained and complete

The tone should be insightful, constructive, and supportive, aiming to facilitate self-reflection and continuous learning.
Format the output clearly using headings (e.g., "**Scenario Recap:**", "**Key Strengths Observed:**", "**Areas for Development:**", "**Actionable Insights & Next Steps:**", "**Reflection Prompts:**", "**Final Thoughts:**") and bullet points where appropriate for readability. Ensure headings are bold.
The output should be plain text.

Learning Debrief:
[Your generated structured debrief here]
`,
});

const generateNotebookLMDebriefFlow = ai.defineFlow(
  {
    name: 'generateNotebookLMDebriefFlow',
    inputSchema: NotebookLMDebriefInputSchema,
    outputSchema: NotebookLMDebriefOutputSchema,
  },
  async (input) => {
    if (!input.userResponsesWithCoaching || input.userResponsesWithCoaching.length === 0) {
      return { notebookLMDebrief: "No coaching feedback was available to generate a learning debrief." };
    }
    const {output} = await generateNotebookLMDebriefPrompt(input);
    return output!;
  }
);