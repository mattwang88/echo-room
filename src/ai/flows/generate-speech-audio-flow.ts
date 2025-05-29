'use server';
/**
 * @fileOverview Generates speech audio from text using Google Cloud Text-to-Speech.
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
  languageCode: z.string().optional().default('en-US').describe('The language code (e.g., "en-US").'),
  voiceName: z.string().optional().default('en-US-Wavenet-D').describe('The voice name (e.g., "en-US-Wavenet-D" - a high-quality Wavenet voice).'),
});
export type GenerateSpeechAudioInput = z.infer<typeof GenerateSpeechAudioInputSchema>;

const GenerateSpeechAudioOutputSchema = z.object({
  audioContentDataUri: z.string().describe('The synthesized audio content as a base64 encoded data URI (MP3).'),
});
export type GenerateSpeechAudioOutput = z.infer<typeof GenerateSpeechAudioOutputSchema>;

// This wrapper function will be called from the frontend.
export async function generateSpeechAudio(input: GenerateSpeechAudioInput): Promise<GenerateSpeechAudioOutput> {
  return generateSpeechAudioFlow(input);
}

// Initialize the TextToSpeechClient.
// This client will use Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS env var.
const ttsClient = new TextToSpeechClient();

const generateSpeechAudioFlow = ai.defineFlow(
  {
    name: 'generateSpeechAudioFlow',
    inputSchema: GenerateSpeechAudioInputSchema,
    outputSchema: GenerateSpeechAudioOutputSchema,
  },
  async (input) => {
    console.log(`[generateSpeechAudioFlow] Received input for TTS: "${input.text.substring(0,50)}..."`);
    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: {text: input.text},
      voice: {
        languageCode: input.languageCode!,
        name: input.voiceName!,
      },
      audioConfig: {
        audioEncoding: 'MP3', // MP3 is widely supported and good for web.
        // You can adjust speakingRate, pitch, etc. here if needed
        // speakingRate: 1.0,
        // pitch: 0,
      },
    };

    try {
      console.log(`[generateSpeechAudioFlow] Requesting speech synthesis with voice: ${input.voiceName}, lang: ${input.languageCode}`);
      const [response] = await ttsClient.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Text-to-Speech API.');
      }

      // Ensure audioContent is treated as Buffer or Uint8Array for base64 conversion
      const audioBytes = response.audioContent instanceof Uint8Array 
        ? response.audioContent 
        : Buffer.from(response.audioContent as string, 'binary'); // Fallback, assuming binary string if not Uint8Array

      const audioBase64 = Buffer.from(audioBytes).toString('base64');
      const audioContentDataUri = `data:audio/mp3;base64,${audioBase64}`;
      
      console.log(`[generateSpeechAudioFlow] Successfully synthesized audio. Audio content length: ${audioBytes.length}`);
      return { audioContentDataUri };

    } catch (error) {
      console.error('[generateSpeechAudioFlow] Error synthesizing speech:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
