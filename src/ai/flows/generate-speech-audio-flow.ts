
'use server';
/**
 * @fileOverview A Genkit flow to synthesize speech using Google Cloud Text-to-Speech.
 *
 * - generateSpeechAudio - Synthesizes speech from text and returns audio as a data URI.
 * - GenerateSpeechAudioInput - Input schema for the flow.
 * - GenerateSpeechAudioOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const GenerateSpeechAudioInputSchema = z.object({
  text: z.string().describe('The text to synthesize into speech.'),
  languageCode: z.string().optional().default('en-US').describe('The language code (e.g., "en-US", "es-ES").'),
  voiceName: z.string().optional().default('en-US-Wavenet-D').describe('The name of the voice to use (e.g., "en-US-Wavenet-D").'),
});
export type GenerateSpeechAudioInput = z.infer<typeof GenerateSpeechAudioInputSchema>;

const GenerateSpeechAudioOutputSchema = z.object({
  audioContentDataUri: z.string().describe('The synthesized audio content as a base64 encoded data URI (e.g., data:audio/mp3;base64,...).'),
});
export type GenerateSpeechAudioOutput = z.infer<typeof GenerateSpeechAudioOutputSchema>;

export async function generateSpeechAudio(input: GenerateSpeechAudioInput): Promise<GenerateSpeechAudioOutput> {
  return generateSpeechAudioFlow(input);
}

const generateSpeechAudioFlow = ai.defineFlow(
  {
    name: 'generateSpeechAudioFlow',
    inputSchema: GenerateSpeechAudioInputSchema,
    outputSchema: GenerateSpeechAudioOutputSchema,
  },
  async (input) => {
    console.log('[generateSpeechAudioFlow] Received input:', input.text.substring(0, 50) + "...");
    const client = new TextToSpeechClient();

    const request = {
      input: { text: input.text },
      voice: {
        languageCode: input.languageCode,
        name: input.voiceName,
        // ssmlGender: 'NEUTRAL', // You can specify gender if needed
      },
      audioConfig: {
        audioEncoding: 'MP3' as const, // Specify MP3 encoding
      },
    };

    try {
      const [response] = await client.synthesizeSpeech(request);
      if (response.audioContent instanceof Uint8Array) {
        const audioBase64 = Buffer.from(response.audioContent).toString('base64');
        const audioContentDataUri = `data:audio/mp3;base64,${audioBase64}`;
        console.log('[generateSpeechAudioFlow] Successfully synthesized audio.');
        return { audioContentDataUri };
      } else {
        console.error('[generateSpeechAudioFlow] Audio content is not Uint8Array:', response.audioContent);
        throw new Error('Failed to synthesize speech: Audio content format unexpected.');
      }
    } catch (error) {
      console.error('[generateSpeechAudioFlow] Error synthesizing speech:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
