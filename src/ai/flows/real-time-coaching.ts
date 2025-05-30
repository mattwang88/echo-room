
'use server';

/**
 * @fileOverview Provides real-time coaching and feedback on user responses.
 *
 * - analyzeResponse - Analyzes the user's response and provides coaching.
 * - AnalyzeResponseInput - The input type for the analyzeResponse function.
 * - AnalyzeResponseOutput - The return type for the analyzeResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzeResponseOutput } from '@/lib/types'; // Import type
import { AnalyzeResponseOutputSchema } from '@/lib/types'; // Import schema

const AnalyzeResponseInputSchema = z.object({
  response: z.string().describe('The user response to analyze.'),
  context: z.string().describe('The context of the response in the meeting.'),
});
export type AnalyzeResponseInput = z.infer<typeof AnalyzeResponseInputSchema>;

// AnalyzeResponseOutputSchema and AnalyzeResponseOutput are now imported from '@/lib/types'

export async function analyzeResponse(input: AnalyzeResponseInput): Promise<AnalyzeResponseOutput> {
  return analyzeResponseFlow(input);
}

const analyzeResponsePrompt = ai.definePrompt({
  name: 'analyzeResponsePrompt',
  input: {schema: AnalyzeResponseInputSchema},
  output: {schema: AnalyzeResponseOutputSchema}, // Uses imported schema
  prompt: `You are a real-time communication and domain expert coach providing feedback to the user during a meeting simulation. Analyze the user's response based on the context provided.

Context: {{{context}}}

User's Response: {{{response}}}

Provide feedback on the following aspects:
1.  Clarity: How clear and easy to understand was the response?
2.  Persuasiveness: How convincing and impactful was the response?
3.  Technical Soundness: If applicable, how technically accurate and robust was the response?
4.  Domain Knowledge: How well did the response demonstrate understanding of the relevant subject matter? Point out any inaccuracies or areas for deeper understanding.
5.  Suggested Learning Materials: Based on the response and context, suggest 1-3 specific learning materials (like articles, key concepts to search for, or types of resources) that could help the user improve their domain knowledge or related communication skills.
6.  Overall Feedback: Summarize the key strengths and areas for improvement.

Format your output clearly for each field.

Clarity:
Persuasiveness:
Technical Soundness:
Domain Knowledge Feedback:
Suggested Learning Materials:
Overall Feedback:`,
});

const analyzeResponseFlow = ai.defineFlow(
  {
    name: 'analyzeResponseFlow',
    inputSchema: AnalyzeResponseInputSchema,
    outputSchema: AnalyzeResponseOutputSchema, // Uses imported schema
  },
  async input => {
    const {output} = await analyzeResponsePrompt(input);
    return output!;
  }
);
