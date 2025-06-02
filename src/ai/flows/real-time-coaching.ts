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

const AnalyzeMultipleResponsesInputSchema = z.object({
  responses: z.array(z.object({
    text: z.string().describe('The user response text.'),
    timestamp: z.number().describe('The timestamp of the response.'),
  })).describe('Array of user responses to analyze.'),
  context: z.string().describe('The context of the meeting.'),
});
export type AnalyzeMultipleResponsesInput = z.infer<typeof AnalyzeMultipleResponsesInputSchema>;

export async function analyzeMultipleResponses(input: AnalyzeMultipleResponsesInput): Promise<AnalyzeResponseOutput> {
  return analyzeMultipleResponsesFlow(input);
}

const analyzeMultipleResponsesPrompt = ai.definePrompt({
  name: 'analyzeMultipleResponsesPrompt',
  input: {
    schema: z.object({
      context: z.string().describe('The context of the meeting.'),
      responses: z.string().describe('Formatted string of user responses.'),
    })
  },
  output: {schema: AnalyzeResponseOutputSchema},
  prompt: `You are a real-time communication and domain expert coach providing comprehensive feedback on a user's performance across multiple responses in a meeting simulation. Analyze the user's responses based on the context provided.

Context: {{{context}}}

User's Responses:
{{{responses}}}

Analyze the user's communication throughout the meeting, considering:
1. How their communication evolved over time
2. Patterns in their responses
3. Areas where they showed improvement or could improve
4. The overall flow and effectiveness of their communication

When providing feedback, include specific examples from the user's responses to illustrate your points. For example, if you notice a pattern in their communication style, quote the relevant parts of their responses.

Provide a comprehensive summary of feedback on the following aspects:
1.  Clarity: How clear and easy to understand were the responses overall? Identify patterns in communication clarity and any evolution in clarity throughout the meeting. Include specific examples of clear or unclear communication.
2.  Persuasiveness: How convincing and impactful were the responses? Note any trends in persuasive effectiveness and how the user's persuasive approach developed. Quote examples of particularly effective or ineffective persuasive attempts.
3.  Technical Soundness: How technically accurate and robust were the responses? Highlight consistent strengths or areas needing improvement, and note any technical depth that developed during the meeting. Reference specific technical points made in the responses.
4.  Domain Knowledge: How well did the responses demonstrate understanding of the relevant subject matter? Identify patterns in knowledge gaps or strengths, and how the user's domain knowledge was demonstrated throughout the conversation. Include examples of strong or weak domain knowledge demonstrations.
5.  Suggested Learning Materials: Based on the overall performance and the evolution of responses, suggest 1-3 specific learning materials (like articles, key concepts to search for, or types of resources) that could help the user improve their domain knowledge or related communication skills.
6.  Overall Feedback: Provide a comprehensive summary of key strengths and areas for improvement across all responses, noting any progression or development in the user's communication style. Use specific examples from their responses to illustrate your points.

Format your output clearly for each field.

Clarity:
Persuasiveness:
Technical Soundness:
Domain Knowledge Feedback:
Suggested Learning Materials:
Overall Feedback:`,
});

const analyzeMultipleResponsesFlow = ai.defineFlow(
  {
    name: 'analyzeMultipleResponsesFlow',
    inputSchema: AnalyzeMultipleResponsesInputSchema,
    outputSchema: AnalyzeResponseOutputSchema,
  },
  async input => {
    // Format responses with just the content
    const formattedResponses = input.responses
      .map(r => r.text)
      .join('\n\n');

    const {output} = await analyzeMultipleResponsesPrompt({
      context: input.context,
      responses: formattedResponses,
    });
    return output!;
  }
);
