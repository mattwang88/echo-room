
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

const voiceMap: Record<Exclude<ParticipantRole, 'User'>, VoiceConfig> = {
  CTO: { voiceName: 'en-US-Neural2-J', languageCode: 'en-US' }, // Male, Neural2
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Female, Wavenet
  Product: { voiceName: 'en-US-Neural2-A', languageCode: 'en-US' }, // Male, Neural2 (Upgraded)
  HR: { voiceName: 'en-US-Neural2-F', languageCode: 'en-US' },    // Female, Neural2
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' }, // Male, Wavenet (Default/System)
};

export function useTextToSpeech() {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // Enabled by default
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSpeechTextRef = useRef<string | null>(null); // To track what's currently being spoken or fetched
  const isSpeakingStateRef = useRef(isSpeakingState); // Ref to track the latest speaking state

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
          console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for: "${currentSpeechTextRef.current.substring(0,30)}..."`);
        } else {
          console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event.`);
        }
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      };
      audioRef.current.onerror = (e) => {
        const audioElement = e.target as HTMLAudioElement;
        let errorDetails = "Unknown audio playback error.";
        if (audioElement.error) {
            errorDetails = `Code: ${audioElement.error.code}, Message: ${audioElement.error.message}`;
        }
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event:`, errorDetails, e);
        
        // Only show toast if it wasn't an intentional cancel (which often reports as an abort error)
        // And if we were actually trying to speak something.
        if (isSpeakingStateRef.current && currentSpeechTextRef.current && audioElement.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
            toast({
              title: "Audio Playback Error",
              description: `Could not play speech: ${errorDetails}. Check console.`,
              variant: "destructive",
            });
        }
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Detach source
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };
  }, [toast]);

  const cancelCurrentSpeech = useCallback(async (isSilent = false) => {
    if (!isSilent) console.log('[useTextToSpeech] cancelCurrentSpeech called.');
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
         if (!isSilent) console.log('[useTextToSpeech] Paused current audio playback.');
      }
      audioRef.current.removeAttribute('src'); // Detach current audio source
      audioRef.current.load(); // Reset audio element
    }
    setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
  }, []);


  const speak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log('[useTextToSpeech] Speak called for User, skipping TTS.');
      else if (!isTTSEnabled) console.log('[useTextToSpeech] Speak called but TTS is disabled.');
      else console.log('[useTextToSpeech] Speak called with empty text, skipping.');
      return;
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text) {
      console.log(`[useTextToSpeech] Speak called for the same text that is already being processed: "${text.substring(0,30)}...". Ignoring.`);
      return;
    }
    
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Cancelling previous speech for new request: "${text.substring(0,30)}..."`);
      await cancelCurrentSpeech(true); // Silent cancel
      // Brief pause to ensure cancellation is processed before starting new audio
      await new Promise(resolve => setTimeout(resolve, 100)); 
    }
    
    currentSpeechTextRef.current = text;
    setIsSpeakingState(true);
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${text.substring(0, 50)}..." for participant: ${participant}`);

    const voiceConfig = voiceMap[participant as Exclude<ParticipantRole, 'User'>] || voiceMap.System;

    const input: GenerateSpeechAudioInput = {
      text,
      languageCode: voiceConfig.languageCode,
      voiceName: voiceConfig.voiceName,
    };

    try {
      const result = await generateSpeechAudio(input);
      
      // Re-validate if this is still the intended speech after async operation
      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${text.substring(0,30)}..." was superseded or cancelled before audio data arrived. Ignoring.`);
        if (!isSpeakingStateRef.current) currentSpeechTextRef.current = null; // If speaking state is false ensure ref is also null
        return;
      }

      if (result.audioContentDataUri && result.audioContentDataUri.startsWith('data:audio/mp3;base64,')) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend. Starts with: ${result.audioContentDataUri.substring(0, 50)}...`);
        if (audioRef.current) {
          audioRef.current.src = result.audioContentDataUri;
          audioRef.current.play()
            .then(() => console.log('[useTextToSpeech] audioRef.play() initiated.'))
            .catch(err => {
              console.error('[useTextToSpeech] Error calling audioRef.current.play():', err);
              toast({
                title: "Audio Playback Error",
                description: `Could not start audio: ${err.message || 'Unknown error'}.`,
                variant: "destructive",
              });
              setIsSpeakingState(false);
              currentSpeechTextRef.current = null;
            });
        }
      } else {
        console.error('[useTextToSpeech] Failed to get valid audio content from backend.', result.errorMessage);
        toast({
          title: "Speech Synthesis Error",
          description: result.errorMessage || "Could not generate speech audio from backend.",
          variant: "destructive",
        });
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    } catch (error) {
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', error);
      toast({
        title: "Speech Flow Error",
        description: `Failed to process speech request: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    }
  }, [isTTSEnabled, toast, cancelCurrentSpeech]);

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState) { // If disabling TTS
        cancelCurrentSpeech();
      }
      return newState;
    });
  }, [cancelCurrentSpeech]);

  // Effect to show toast when TTS enabled/disabled
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure this only runs client-side
        // This effect is just for the toast, initial state is already true
        // We don't want to toast on initial mount
    }
  }, [isTTSEnabled, toast]);


  return {
    isTTSEnabled,
    isTTSSpeaking: isSpeakingState,
    ttsSpeak: speak,
    ttsCancel: cancelCurrentSpeech,
    toggleTTSEnabled,
  };
}
