
'use server';
/**
 * @fileOverview A Genkit flow for generating speech audio using Google Cloud Text-to-Speech.
 *
 * - generateSpeechAudio - A function that synthesizes speech from text.
 * - GenerateSpeechAudioInput - The input type for the generateSpeechAudio function.
 * - GenerateSpeechAudioOutput - The return type for the generateSpeechAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {TextToSpeechClient} from '@google-cloud/text-to-speech';
import type { protos } from '@google-cloud/text-to-speech';

const GenerateSpeechAudioInputSchema = z.object({
  text: z.string().describe('The text to synthesize into speech.'),
  languageCode: z.string().optional().default('en-US').describe('The language code for the speech synthesis (e.g., "en-US", "es-ES").'),
  voiceName: z.string().optional().default('en-US-Wavenet-D').describe('The specific voice name to use (e.g., "en-US-Wavenet-D", "en-GB-Neural2-A").'),
});
export type GenerateSpeechAudioInput = z.infer<typeof GenerateSpeechAudioInputSchema>;

const GenerateSpeechAudioOutputSchema = z.object({
  audioContentDataUri: z.string().describe('The synthesized audio content as a base64 encoded data URI (e.g., "data:audio/mp3;base64,..."). Null if synthesis failed.'),
  errorMessage: z.string().optional().describe('An error message if speech synthesis failed.'),
});
export type GenerateSpeechAudioOutput = z.infer<typeof GenerateSpeechAudioOutputSchema>;


export async function generateSpeechAudio(input: GenerateSpeechAudioInput): Promise<GenerateSpeechAudioOutput> {
  return generateSpeechAudioFlow(input);
}

const ttsClient = new TextToSpeechClient();

const generateSpeechAudioFlow = ai.defineFlow(
  {
    name: 'generateSpeechAudioFlow',
    inputSchema: GenerateSpeechAudioInputSchema,
    outputSchema: GenerateSpeechAudioOutputSchema,
  },
  async (input) => {
    console.log('[generateSpeechAudioFlow] Received input for TTS:', JSON.stringify(input));

    const langCode = input.languageCode || 'en-US';
    const voiceName = input.voiceName || 'en-US-Wavenet-D';

    if (!input.text.trim()) {
      console.warn('[generateSpeechAudioFlow] Input text is empty. Skipping synthesis.');
      return { audioContentDataUri: '', errorMessage: "Input text was empty." };
    }
    
    console.log(`[generateSpeechAudioFlow] Requesting speech synthesis with voice: ${voiceName}, lang: ${langCode}`);

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

    try {
      const [response] = await ttsClient.synthesizeSpeech(request);
      if (response.audioContent) {
        const audioBytes = response.audioContent as Uint8Array;
        const audioBase64 = Buffer.from(audioBytes).toString('base64');
        const audioContentDataUri = `data:audio/mp3;base64,${audioBase64}`;
        console.log(`[generateSpeechAudioFlow] Successfully synthesized audio. Data URI starts with: ${audioContentDataUri.substring(0,50)}...`);
        return { audioContentDataUri, errorMessage: undefined };
      } else {
        console.warn('[generateSpeechAudioFlow] TTS API returned no audio content.');
        return { audioContentDataUri: '', errorMessage: 'TTS API returned no audio content.' };
      }
    } catch (error) {
      console.error('[generateSpeechAudioFlow] Error synthesizing speech:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("INVALID_ARGUMENT") && errorMessage.includes("Voice name and locale cannot both be empty")) {
         console.error('[generateSpeechAudioFlow] Specific error: Voice name and/or locale were empty or invalid in the API request.');
      } else if (errorMessage.includes("INVALID_ARGUMENT") && errorMessage.includes("Invalid SSML")) {
         console.error('[generateSpeechAudioFlow] Invalid SSML detected. Input was plain text, check for accidental SSML-like characters or API interpretation.');
      }
      throw new Error(`Failed to synthesize speech: ${errorMessage}`);
    }
  }
);
