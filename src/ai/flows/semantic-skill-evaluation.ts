// use server'
'use server';

/**
 * @fileOverview This file defines a Genkit flow for evaluating the semantic quality of user responses and providing relevant guidance.
 *
 * - evaluateSemanticSkill - A function that evaluates the semantic skill of a user's response.
 * - EvaluateSemanticSkillInput - The input type for the evaluateSemanticSkill function.
 * - EvaluateSemanticSkillOutput - The return type for the evaluateSemanticSkill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateSemanticSkillInputSchema = z.object({
  responseText: z.string().describe('The user response text to evaluate.'),
  context: z.string().describe('The context of the user response.'),
});
export type EvaluateSemanticSkillInput = z.infer<typeof EvaluateSemanticSkillInputSchema>;

const EvaluateSemanticSkillOutputSchema = z.object({
  score: z.number().describe('A score representing the semantic quality of the response (0-1).'),
  feedback: z.string().describe('Feedback on the response, including areas for improvement.'),
  guidance: z.string().describe('Relevant guidance based on the semantic quality of the response.'),
});
export type EvaluateSemanticSkillOutput = z.infer<typeof EvaluateSemanticSkillOutputSchema>;

export async function evaluateSemanticSkill(input: EvaluateSemanticSkillInput): Promise<EvaluateSemanticSkillOutput> {
  return evaluateSemanticSkillFlow(input);
}

const evaluateSemanticSkillPrompt = ai.definePrompt({
  name: 'evaluateSemanticSkillPrompt',
  input: {schema: EvaluateSemanticSkillInputSchema},
  output: {schema: EvaluateSemanticSkillOutputSchema},
  prompt: `You are an AI assistant that evaluates the semantic quality of user responses in a given context.

  Context: {{{context}}}

  Evaluate the following response:
  {{{responseText}}}

  Provide a score (0-1), feedback, and guidance based on the semantic quality of the response.
  Consider clarity, persuasiveness, and technical soundness in your evaluation.

  Score:
  Feedback:
  Guidance:`,
});

const evaluateSemanticSkillFlow = ai.defineFlow(
  {
    name: 'evaluateSemanticSkillFlow',
    inputSchema: EvaluateSemanticSkillInputSchema,
    outputSchema: EvaluateSemanticSkillOutputSchema,
  },
  async input => {
    const {output} = await evaluateSemanticSkillPrompt(input);
    return output!;
  }
);
