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
  prompt: `You are an AI assistant that evaluates the semantic quality of user responses in a given context. Your evaluation should be consistent and based on clear criteria.

  Context: {{{context}}}

  Evaluate the following response:
  {{{responseText}}}

  Use the following criteria to evaluate the response and assign a score between 0 and 1:

  1. Clarity (40% of total score):
     - 0.4: Response is clear, well-structured, and easy to understand
     - 0.2: Response is somewhat clear but could be better organized
     - 0.0: Response is unclear or poorly structured

  2. Technical Accuracy (30% of total score):
     - 0.3: Response demonstrates accurate technical knowledge
     - 0.15: Response shows basic understanding but has some inaccuracies
     - 0.0: Response contains significant technical errors

  3. Relevance to Context (30% of total score):
     - 0.3: Response directly addresses the context and objectives
     - 0.15: Response is somewhat relevant but misses key points
     - 0.0: Response is not relevant to the context

  Calculate the total score by summing the scores from each criterion.
  Provide specific feedback for each criterion and overall guidance for improvement.

  Score (0-1):
  Feedback (address each criterion):
  Guidance (specific steps for improvement):`,
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
