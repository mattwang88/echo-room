
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

// Using high-quality voices for all roles, ensuring they are distinct
const voiceMap: Record<Exclude<ParticipantRole, 'User'>, VoiceConfig> = {
  CTO: { voiceName: 'en-US-Neural2-D', languageCode: 'en-US' },     // Changed to Neural2 Male
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Stays WaveNet Female
  Product: { voiceName: 'en-US-Neural2-I', languageCode: 'en-US' }, // Changed to Neural2 Male
  HR: { voiceName: 'en-US-Wavenet-E', languageCode: 'en-US' },       // Stays WaveNet Female (distinct from Finance)
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },   // Stays WaveNet Male
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
    }
    setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
  }, []);

  const handleAudioError = useCallback((e: Event) => {
    const audioElement = e.target as HTMLAudioElement;
    let errorDetails = "Unknown audio playback error.";
    let errorType = "Unknown";
    let isAborted = false;

    if (audioElement.error) {
        errorDetails = `Code: ${audioElement.error.code}, Message: ${audioElement.error.message || 'No message'}`;
        errorType = audioElement.error.code.toString();
        // MEDIA_ERR_ABORTED is code 4, MEDIA_ERR_SRC_NOT_SUPPORTED might also imply cancellation
        if (audioElement.error.code === MediaError.MEDIA_ERR_ABORTED) {
          isAborted = true;
        }
    }
    console.warn(`[useTextToSpeech] HTMLAudioElement 'error' event:`, errorDetails, e);

    // Only show toast if it's not an abort error and we were trying to speak
    if (!isAborted && isSpeakingStateRef.current && currentSpeechTextRef.current) {
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
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };
  }, [handleAudioEnd, handleAudioError]);


  const memoizedCancel = useCallback(async (isSilent = false) => {
    if (!isSilent) console.log('[useTextToSpeech] memoizedCancel called.');
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
         if (!isSilent) console.log('[useTextToSpeech] Paused current audio playback.');
      }
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    currentSpeechTextRef.current = null;
    setIsSpeakingState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Cancelling previous speech for new text request: "${text.substring(0,70)}..."`);
      await memoizedCancel(true);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    currentSpeechTextRef.current = text;
    setIsSpeakingState(true);
    console.log(`[useTextToSpeech] Attempting to speak text via Google Cloud TTS flow: "${text.substring(0, 70)}..." for participant: ${participant}`);

    const voiceConfig = voiceMap[participant as Exclude<ParticipantRole, 'User'>] || voiceMap.System;

    const input: GenerateSpeechAudioInput = {
      text: text,
      languageCode: voiceConfig.languageCode,
      voiceName: voiceConfig.voiceName,
    };

    try {
      const result = await generateSpeechAudio(input);

      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for text "${text.substring(0,70)}..." was superseded or cancelled before audio data arrived. Ignoring.`);
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
              currentSpeechTextRef.current = null;
            });
        }
      } else {
        const errorMsg = result.errorMessage || "Could not generate speech audio from backend.";
        console.error('[useTextToSpeech] Failed to get valid audio content from backend.', errorMsg);
        toast({
          title: "Speech Synthesis Error",
          description: errorMsg,
          variant: "destructive",
        });
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', errorMsg);
      toast({
        title: "Speech Flow Error",
        description: `Failed to process speech request: ${errorMsg}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
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
    const timeoutId = setTimeout(() => {
      // console.log(`[useTextToSpeech] TTS is now ${isTTSEnabled ? 'enabled' : 'disabled'}.`);
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
