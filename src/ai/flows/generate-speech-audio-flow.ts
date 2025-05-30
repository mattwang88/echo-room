'use server';
/**
 * @fileOverview Generates speech audio from text using Google Cloud Text-to-Speech.
 *
 * - generateSpeechAudio - A function that synthesizes speech.
 * - GenerateSpeechAudioInput - The input type for the generateSpeechAudio function.
 * - GenerateSpeechAudioOutput - The return type for the generateSpeechAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {TextToSpeechClient} from '@google-cloud/text-to-speech';
import type { protos } from '@google-cloud/text-to-speech';

const GenerateSpeechAudioInputSchema = z.object({
  text: z.string().describe('The text to synthesize into speech.'),
  languageCode: z.string().optional().default('en-US').describe('The language code (e.g., "en-US").'),
  voiceName: z.string().optional().default('en-US-Neural2-A').describe('The voice name (e.g., "en-US-Wavenet-D").'),
});
export type GenerateSpeechAudioInput = z.infer<typeof GenerateSpeechAudioInputSchema>;

const GenerateSpeechAudioOutputSchema = z.object({
  audioContentDataUri: z.string().describe('The synthesized audio content as a Base64 encoded data URI (MP3 format).'),
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
    console.log('[generateSpeechAudioFlow] Received input for TTS (expecting plain text):', JSON.stringify({text: input.text, voice: input.voiceName, lang: input.languageCode}));
    const client = new TextToSpeechClient();

    const langCode = input.languageCode || 'en-US';
    const voiceName = input.voiceName || 'en-US-Neural2-A';

    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: {text: input.text},
      voice: {
        languageCode: langCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };
    console.log(`[generateSpeechAudioFlow] Requesting speech synthesis with voice: ${voiceName}, lang: ${langCode}`);

    try {
      const [response] = await client.synthesizeSpeech(request);
      if (response.audioContent) {
        const audioBytes = response.audioContent as Uint8Array;
        const audioBase64 = Buffer.from(audioBytes).toString('base64');
        const audioContentDataUri = `data:audio/mp3;base64,${audioBase64}`;
        console.log(`[generateSpeechAudioFlow] Successfully synthesized audio. Data URI starts with: ${audioContentDataUri.substring(0,50)}...`);
        return { audioContentDataUri };
      } else {
        console.error('[generateSpeechAudioFlow] No audio content in response.');
        throw new Error('No audio content received from Text-to-Speech API.');
      }
    } catch (error) {
      console.error('[generateSpeechAudioFlow] Error synthesizing speech:', error);
      throw new Error(`Failed to synthesize speech from text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
