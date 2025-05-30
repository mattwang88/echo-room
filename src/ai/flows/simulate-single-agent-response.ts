
'use server';
/**
 * @fileOverview Simulates a single AI agent's response based on their role and persona, generating SSML for emotional expression.
 *
 * - simulateSingleAgentResponse - A function that simulates a single AI agent and returns their feedback as SSML.
 * - SimulateSingleAgentResponseInput - The input type for the simulateSingleAgentResponse function.
 * - SimulateSingleAgentResponseOutput - The return type for the simulateSingleAgentResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AgentRole } from '@/lib/types';

const SimulateSingleAgentResponseInputSchema = z.object({
  userResponse: z.string().describe("The user's most recent response or proposal."),
  agentRole: z.custom<AgentRole>().describe("The role of the AI agent that should respond (e.g., 'CTO', 'Finance')."),
  agentPersona: z.string().describe("The specific persona instructions for this agent, including emotional tendencies."),
  scenarioObjective: z.string().describe("The overall objective of the current meeting scenario for context."),
});
export type SimulateSingleAgentResponseInput = z.infer<typeof SimulateSingleAgentResponseInputSchema>;

const SimulateSingleAgentResponseOutputSchema = z.object({
  agentFeedback: z.string().describe("The AI agent's response to the user, formatted as an SSML string for emotional text-to-speech."),
});
export type SimulateSingleAgentResponseOutput = z.infer<typeof SimulateSingleAgentResponseOutputSchema>;

export async function simulateSingleAgentResponse(input: SimulateSingleAgentResponseInput): Promise<SimulateSingleAgentResponseOutput> {
  return simulateSingleAgentResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateSingleAgentResponsePrompt',
  input: {schema: SimulateSingleAgentResponseInputSchema},
  output: {schema: SimulateSingleAgentResponseOutputSchema},
  prompt: `You are simulating a single AI agent in a meeting. Your goal is to make your response feel human-like, conversational, constructive, and EMOTIONALLY expressive, adhering to the persona provided.
You MUST format your entire response as a valid SSML (Speech Synthesis Markup Language) string, wrapped in <speak> tags.

The user has just said:
"{{{userResponse}}}"

Your Role: {{{agentRole}}}
Your Persona Instructions (including emotional tendencies): {{{agentPersona}}}
Scenario Objective: {{{scenarioObjective}}}

Based on your role, persona, the user's response, and the scenario objective, please:
1.  Determine an appropriate emotion for your response (e.g., curious, skeptical, enthusiastic, concerned, annoyed, supportive).
2.  Formulate your response. It should typically include:
    a.  An initial feeling or reaction (1 brief sentence).
    b.  One concise comment or observation based on your expertise (1 brief sentence).
    c.  1 (or at most 2) targeted follow-up questions.
3.  Wrap your entire response in SSML, using tags to convey the determined emotion.
    *   ALWAYS start with \`<speak>\` and end with \`</speak>\`.
    *   Use \`<emphasis level="strong|moderate|reduced">\` to emphasize words.
    *   Use \`<prosody rate="fast|slow|x-slow|medium" pitch="+Xst|-Xst|medium" volume="soft|loud|x-loud">\` to change speech rate, pitch, and volume. (e.g., pitch="+2st" for higher, rate="slow" for thoughtful).
    *   Use \`<break time="0.5s"/>\` for pauses.
    *   Be subtle; overuse of SSML tags can sound unnatural. The goal is to enhance, not distract.
    *   Ensure all tags are correctly nested and closed. Invalid SSML will fail.

Example of good SSML for a slightly skeptical CTO:
<speak>
  <prosody rate="medium" pitch="-1st">From a tech perspective, I'm <emphasis level="moderate">intrigued</emphasis> by your proposal.</prosody>
  <break time="0.3s"/>
  <prosody rate="medium">The concept is innovative, but I have some reservations about the scalability with our current infrastructure.</prosody>
  <break time="0.4s"/>
  <prosody rate="medium" pitch="+1st">Could you elaborate on the expected load, and <emphasis level="strong">what specific</emphasis> measures you've considered for performance under pressure?</prosody>
</speak>

Agent Feedback (as SSML): [Your SSML response here]`,
});

const simulateSingleAgentResponseFlow = ai.defineFlow(
  {
    name: 'simulateSingleAgentResponseFlow',
    inputSchema: SimulateSingleAgentResponseInputSchema,
    outputSchema: SimulateSingleAgentResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    let feedback = output!.agentFeedback;

    // Basic SSML validation/correction: Ensure it's wrapped in <speak> tags
    if (feedback) {
        feedback = feedback.trim();
        if (!feedback.startsWith('<speak>')) {
            feedback = '<speak>' + feedback;
        }
        if (!feedback.endsWith('</speak>')) {
            feedback = feedback + '</speak>';
        }
        // A very naive attempt to remove text outside the main speak block if any
        const speakMatch = feedback.match(/<speak>.*<\/speak>/s);
        if (speakMatch && speakMatch[0] !== feedback) {
            console.warn("[simulateSingleAgentResponseFlow] Corrected SSML to only include content within the first <speak> block. Original:", feedback, "Corrected:", speakMatch[0]);
            feedback = speakMatch[0];
        }

    } else {
        // Fallback if AI generates empty feedback
        feedback = "<speak>I'm not sure how to respond to that. Can you please rephrase?</speak>";
    }

    console.log("[simulateSingleAgentResponseFlow] Generated SSML:", feedback);
    return { agentFeedback: feedback };
  }
);
