
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

// Using high-quality WaveNet voices for all roles, ensuring they are distinct
const voiceMap: Record<Exclude<ParticipantRole, 'User'>, VoiceConfig> = {
  CTO: { voiceName: 'en-US-Wavenet-A', languageCode: 'en-US' },     // Changed to WaveNet Male
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Stays WaveNet Female
  Product: { voiceName: 'en-US-Wavenet-B', languageCode: 'en-US' }, // Changed to WaveNet Male (distinct from CTO)
  HR: { voiceName: 'en-US-Wavenet-E', languageCode: 'en-US' },       // Changed to WaveNet Female (distinct from Finance)
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },   // Changed to WaveNet Male
};

export function useTextToSpeech() {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSpeakingStateRef = useRef(isSpeakingState);
  const currentSpeechTextRef = useRef<string | null>(null); // To track the text of the current utterance

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const handleAudioEnd = useCallback(() => {
    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
      console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for text: "${currentSpeechTextRef.current.substring(0,70)}..."`);
    } else {
      // console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event. No current speech text or not in speaking state.`);
    }
    setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
  }, []);

  const handleAudioError = useCallback((e: Event) => {
    const audioElement = e.target as HTMLAudioElement;
    let errorDetails = "Unknown audio playback error.";
    let errorType = "Unknown";

    if (audioElement.error) {
        errorDetails = `Code: ${audioElement.error.code}, Message: ${audioElement.error.message || 'No message'}`;
        errorType = audioElement.error.code.toString();
    }
    console.warn(`[useTextToSpeech] HTMLAudioElement 'error' event:`, errorDetails, e);

    const isAborted = errorType === String(MediaError.MEDIA_ERR_ABORTED); // MEDIA_ERR_ABORTED is code 4

    if (isSpeakingStateRef.current && currentSpeechTextRef.current && !isAborted) {
        toast({
          title: "Audio Playback Error",
          description: `Could not play speech: ${errorDetails}. Check console.`,
          variant: "destructive",
        });
    } else if (isAborted) {
        console.log("[useTextToSpeech] Audio playback aborted, likely due to cancellation. No toast shown.");
    }
    setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
  }, [toast]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = handleAudioEnd;
      audioRef.current.onerror = handleAudioError;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Clear the source
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };
  }, [handleAudioEnd, handleAudioError]); // Dependencies ensure handlers are updated if they change


  const memoizedCancel = useCallback(async (isSilent = false) => {
    if (!isSilent) console.log('[useTextToSpeech] memoizedCancel called.');
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
         if (!isSilent) console.log('[useTextToSpeech] Paused current audio playback.');
      }
      // Setting src to empty string and calling load is a more robust way to stop and reset
      audioRef.current.removeAttribute('src'); // More robust than src = "" for some browsers
      audioRef.current.load(); // Resets the audio element and aborts loading
    }
    currentSpeechTextRef.current = null; // Clear the ref immediately
    setIsSpeakingState(false); // Ensure state is set to false
  }, []);


  const memoizedSpeak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log('[useTextToSpeech] Speak called for User, skipping TTS.');
      else if (!isTTSEnabled) console.log('[useTextToSpeech] Speak called but TTS is disabled.');
      else console.log('[useTextToSpeech] Speak called with empty text, skipping.');
      return;
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text) {
      console.log(`[useTextToSpeech] Speak called for the same text that is already being processed: "${text.substring(0,70)}...". Ignoring.`);
      return;
    }

    // If already speaking, cancel previous speech and wait a moment
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Cancelling previous speech for new text request: "${text.substring(0,70)}..."`);
      await memoizedCancel(true); // Pass true for silent cancel
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow cancellation to process
    }

    currentSpeechTextRef.current = text; // Set the text that we are *trying* to speak
    setIsSpeakingState(true);
    console.log(`[useTextToSpeech] Attempting to speak text via Google Cloud TTS flow: "${text.substring(0, 70)}..." for participant: ${participant}`);

    const voiceConfig = voiceMap[participant as Exclude<ParticipantRole, 'User'>] || voiceMap.System;

    const input: GenerateSpeechAudioInput = {
      text: text, // Sending plain text
      languageCode: voiceConfig.languageCode,
      voiceName: voiceConfig.voiceName,
    };

    try {
      const result = await generateSpeechAudio(input);

      // Check if this speech request is still the current one and if we should still be speaking
      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for text "${text.substring(0,70)}..." was superseded or cancelled before audio data arrived. Ignoring.`);
        // If not speaking, ensure currentSpeechTextRef is cleared if it matches,
        // otherwise it might have been for a different (now stale) request.
        if (!isSpeakingStateRef.current) currentSpeechTextRef.current = null; 
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
                description: `Could not start audio: ${err instanceof Error ? err.message : String(err)}.`,
                variant: "destructive",
              });
              setIsSpeakingState(false);
              currentSpeechTextRef.current = null; // Clear on playback error
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
        currentSpeechTextRef.current = null; // Clear on synthesis error
      }
    } catch (error) {
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', error);
      toast({
        title: "Speech Flow Error",
        description: `Failed to process speech request: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null; // Clear on flow error
    }
  }, [isTTSEnabled, toast, memoizedCancel]);

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState) { // If disabling TTS
        memoizedCancel();
      }
      return newState;
    });
  }, [memoizedCancel]);

  useEffect(() => {
    // This effect is for the toast notification for TTS enable/disable
    // To avoid "update during render" issues if toast is called too early.
    const timeoutId = setTimeout(() => {
      // console.log(`[useTextToSpeech] TTS is now ${isTTSEnabled ? 'enabled' : 'disabled'}.`);
      // Toast notifications for enable/disable can be noisy, so commented out for now.
      // User can see the button state.
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isTTSEnabled]);


  return {
    isTTSEnabled,
    isTTSSpeaking: isSpeakingState,
    ttsSpeak: memoizedSpeak,
    ttsCancel: memoizedCancel,
    toggleTTSEnabled,
  };
}

