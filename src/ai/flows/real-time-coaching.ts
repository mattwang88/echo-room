// Implemented real-time coaching flow that analyzes user responses and provides feedback on clarity, persuasiveness, and technical soundness.

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

const AnalyzeResponseInputSchema = z.object({
  response: z.string().describe('The user response to analyze.'),
  context: z.string().describe('The context of the response in the meeting.'),
});
export type AnalyzeResponseInput = z.infer<typeof AnalyzeResponseInputSchema>;

const AnalyzeResponseOutputSchema = z.object({
  clarity: z.string().describe('Feedback on the clarity of the response.'),
  persuasiveness: z.string().describe('Feedback on the persuasiveness of the response.'),
  technicalSoundness: z
    .string()
    .describe('Feedback on the technical soundness of the response.'),
  overallFeedback: z.string().describe('Overall feedback on the response.'),
});
export type AnalyzeResponseOutput = z.infer<typeof AnalyzeResponseOutputSchema>;

export async function analyzeResponse(input: AnalyzeResponseInput): Promise<AnalyzeResponseOutput> {
  return analyzeResponseFlow(input);
}

const analyzeResponsePrompt = ai.definePrompt({
  name: 'analyzeResponsePrompt',
  input: {schema: AnalyzeResponseInputSchema},
  output: {schema: AnalyzeResponseOutputSchema},
  prompt: `You are a real-time communication coach providing feedback to the user during a meeting simulation. Analyze the user's response based on the context provided and provide feedback on clarity, persuasiveness, and technical soundness. Provide overall feedback to help the user improve their response.

Context: {{{context}}}

Response: {{{response}}}

Clarity: 
Persuasiveness:
Technical Soundness:
Overall Feedback:`,
});

const analyzeResponseFlow = ai.defineFlow(
  {
    name: 'analyzeResponseFlow',
    inputSchema: AnalyzeResponseInputSchema,
    outputSchema: AnalyzeResponseOutputSchema,
  },
  async input => {
    const {output} = await analyzeResponsePrompt(input);
    return output!;
  }
);
