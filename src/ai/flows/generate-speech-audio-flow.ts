
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
  voiceName: z.string().optional().default('en-US-Chirp3-HD-Achernar').describe('The voice name (e.g., "en-US-Chirp3-HD-Achernar" - a high-quality Wavenet voice).'),
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
    
    // Ensure defaults are used if properties are not explicitly passed in the input
    const langCode = input.languageCode || GenerateSpeechAudioInputSchema.shape.languageCode._def.defaultValue();
    const voiceName = input.voiceName || GenerateSpeechAudioInputSchema.shape.voiceName._def.defaultValue();

    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: {text: input.text},
      voice: {
        languageCode: langCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3', // MP3 is widely supported and good for web.
      },
    };

    try {
      console.log(`[generateSpeechAudioFlow] Requesting speech synthesis with voice: ${voiceName}, lang: ${langCode}`);
      const [response] = await ttsClient.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Text-to-Speech API.');
      }

      let audioBase64: string;
      if (typeof response.audioContent === 'string') {
        // It's already base64 encoded string from the API (less common for this specific API response type)
        audioBase64 = response.audioContent;
        console.log(`[generateSpeechAudioFlow] Audio content was already a string (presumed base64). Length: ${audioBase64.length}`);
      } else if (response.audioContent instanceof Uint8Array || response.audioContent instanceof Buffer) {
        // It's Uint8Array or Buffer (raw bytes) - this is the typical format for audioContent
        audioBase64 = Buffer.from(response.audioContent).toString('base64');
        console.log(`[generateSpeechAudioFlow] Converted audio bytes (Uint8Array/Buffer) to base64. Original byte length: ${response.audioContent.byteLength || response.audioContent.length}, Base64 length: ${audioBase64.length}`);
      } else {
        console.error('[generateSpeechAudioFlow] Audio content is not in a recognized format. Content type:', typeof response.audioContent, response.audioContent);
        throw new Error('Audio content is not in a recognized format (string, Uint8Array, or Buffer).');
      }
      
      const audioContentDataUri = `data:audio/mp3;base64,${audioBase64}`;
      
      console.log(`[generateSpeechAudioFlow] Successfully synthesized audio. Data URI starts with: ${audioContentDataUri.substring(0, 70)}... Audio content length: ${response.audioContent.length}`);
      return { audioContentDataUri };

    } catch (error) {
      console.error('[generateSpeechAudioFlow] Error synthesizing speech:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
