
'use server';
/**
 * @fileOverview Generates a podcast-style summary script based on meeting performance and coaching feedback.
 *
 * - generatePodcastSummary - A function that creates a podcast script.
 * - PodcastSummaryInput - The input type for the generatePodcastSummary function.
 * - PodcastSummaryOutput - The return type for the generatePodcastSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnalyzeResponseOutputSchema } from './real-time-coaching'; // Import the schema

const PodcastSummaryInputSchema = z.object({
  scenarioTitle: z.string().describe('The title of the meeting scenario.'),
  scenarioObjective: z.string().describe('The objective of the meeting scenario.'),
  userResponsesWithCoaching: z.array(
    z.object({
      userResponseText: z.string().describe("The user's original response text."),
      coachingFeedback: AnalyzeResponseOutputSchema.describe("The detailed coaching feedback received for this specific response.")
    })
  ).min(1).describe("An array of user responses and the coaching feedback they received. Should not be empty.")
});
export type PodcastSummaryInput = z.infer<typeof PodcastSummaryInputSchema>;

const PodcastSummaryOutputSchema = z.object({
  podcastScript: z.string().describe('A script for a short podcast segment summarizing the meeting performance and key coaching takeaways. Should be engaging, constructive, and formatted as plain text ready for reading.'),
});
export type PodcastSummaryOutput = z.infer<typeof PodcastSummaryOutputSchema>;

export async function generatePodcastSummary(input: PodcastSummaryInput): Promise<PodcastSummaryOutput> {
  return generatePodcastSummaryFlow(input);
}

const generatePodcastSummaryPrompt = ai.definePrompt({
  name: 'generatePodcastSummaryPrompt',
  input: {schema: PodcastSummaryInputSchema},
  output: {schema: PodcastSummaryOutputSchema},
  prompt: `You are an expert communication coach hosting a mini-podcast series called "EchoRoom Debrief".
Your goal is to provide a personalized, engaging, and constructive audio-style summary script based on a user's performance in a simulated meeting scenario.

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

Based on ALL the information above, generate a podcast script (as plain text) for a short debrief segment. The script should:
1. Start with a friendly welcome to "EchoRoom Debrief".
2. Briefly mention the scenario the user just completed: "{{scenarioTitle}}".
3. Synthesize the overall themes from the coaching feedback. Don't just list feedback for each response, but identify patterns or key takeaways.
4. Highlight 1-2 major strengths the user demonstrated.
5. Discuss 1-2 primary areas for improvement, referencing the coaching insights.
6. Offer 1-2 actionable tips or pieces of advice drawing from the "Suggested Learning Materials" or general best practices related to the feedback.
7. Conclude with an encouraging remark and a sign-off.
8. The tone should be supportive, insightful, and conversational, as if speaking directly to the user.
9. Structure the output clearly. Aim for a script that would take about 2-3 minutes to read aloud.

Podcast Script:
[Your generated script here. Ensure it is plain text and engaging.]
`,
});

const generatePodcastSummaryFlow = ai.defineFlow(
  {
    name: 'generatePodcastSummaryFlow',
    inputSchema: PodcastSummaryInputSchema,
    outputSchema: PodcastSummaryOutputSchema,
  },
  async (input) => {
    // Ensure there's at least one response with coaching to process
    if (!input.userResponsesWithCoaching || input.userResponsesWithCoaching.length === 0) {
      return { podcastScript: "No coaching feedback was available to generate a podcast summary." };
    }
    const {output} = await generatePodcastSummaryPrompt(input);
    return output!;
  }
);
