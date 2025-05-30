
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

// Using high-quality Neural2 or WaveNet voices for all roles
const voiceMap: Record<Exclude<ParticipantRole, 'User'>, VoiceConfig> = {
  CTO: { voiceName: 'en-US-Neural2-J', languageCode: 'en-US' },     // Male, Neural2
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Female, WaveNet
  Product: { voiceName: 'en-US-Neural2-A', languageCode: 'en-US' }, // Male, Neural2
  HR: { voiceName: 'en-US-Neural2-F', languageCode: 'en-US' },       // Female, Neural2
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },   // Male, WaveNet (Default/System)
};

export function useTextToSpeech() {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isSpeakingStateRef = useRef(isSpeakingState);
  const currentSpeechTextRef = useRef<string | null>(null); // To track what's currently being spoken or fetched (now SSML)

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const handleAudioEnd = useCallback(() => {
    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
      console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for SSML: "${currentSpeechTextRef.current.substring(0,70)}..."`);
    } else {
      console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event.`);
    }
    setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
  }, []);

  const handleAudioError = useCallback((e: Event) => {
    const audioElement = e.target as HTMLAudioElement;
    let errorDetails = "Unknown audio playback error.";
    if (audioElement.error) {
        errorDetails = `Code: ${audioElement.error.code}, Message: ${audioElement.error.message}`;
    }
    console.warn(`[useTextToSpeech] HTMLAudioElement 'error' event:`, errorDetails, e);
    
    const isAborted = audioElement.error?.code === MediaError.MEDIA_ERR_ABORTED;

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
        audioRef.current.src = ""; 
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
    setIsSpeakingState(false); 
    currentSpeechTextRef.current = null; 
  }, []);


  const memoizedSpeak = useCallback(async (ssmlText: string, participant: ParticipantRole = 'System') => {
    if (!isTTSEnabled || !ssmlText.trim() || participant === 'User') {
      if (participant === 'User') console.log('[useTextToSpeech] Speak called for User, skipping TTS.');
      else if (!isTTSEnabled) console.log('[useTextToSpeech] Speak called but TTS is disabled.');
      else console.log('[useTextToSpeech] Speak called with empty SSML, skipping.');
      return;
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current === ssmlText) {
      console.log(`[useTextToSpeech] Speak called for the same SSML that is already being processed: "${ssmlText.substring(0,70)}...". Ignoring.`);
      return;
    }
    
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Cancelling previous speech for new SSML request: "${ssmlText.substring(0,70)}..."`);
      await memoizedCancel(true); 
      await new Promise(resolve => setTimeout(resolve, 100)); 
    }
    
    currentSpeechTextRef.current = ssmlText;
    setIsSpeakingState(true);
    console.log(`[useTextToSpeech] Attempting to speak SSML via Google Cloud TTS flow: "${ssmlText.substring(0, 70)}..." for participant: ${participant}`);

    const voiceConfig = voiceMap[participant as Exclude<ParticipantRole, 'User'>] || voiceMap.System;

    const input: GenerateSpeechAudioInput = {
      ssmlText,
      languageCode: voiceConfig.languageCode,
      voiceName: voiceConfig.voiceName,
    };

    try {
      const result = await generateSpeechAudio(input);
      
      if (currentSpeechTextRef.current !== ssmlText || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for SSML "${ssmlText.substring(0,70)}..." was superseded or cancelled before audio data arrived. Ignoring.`);
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
        console.error('[useTextToSpeech] Failed to get valid audio content from backend for SSML.', result.errorMessage);
        toast({
          title: "Speech Synthesis Error",
          description: result.errorMessage || "Could not generate speech audio from backend for SSML.",
          variant: "destructive",
        });
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    } catch (error) {
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow with SSML:', error);
      toast({
        title: "Speech Flow Error",
        description: `Failed to process SSML speech request: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    }
  }, [isTTSEnabled, toast, memoizedCancel]);

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState) { 
        memoizedCancel();
      }
      return newState;
    });
  }, [memoizedCancel]);

  useEffect(() => {
    // This effect is just for the toast, initial state is already true
    // We don't want to toast on initial mount
    const initialRender = currentSpeechTextRef.current === null && !isSpeakingState; // Heuristic for initial render
    if (!initialRender && typeof window !== 'undefined') {
        // This toast was causing issues with "update during render"
        // toast({
        //   title: "Text-to-Speech",
        //   description: isTTSEnabled ? "Enabled" : "Disabled",
        // });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTTSEnabled, toast]);


  return {
    isTTSEnabled,
    isTTSSpeaking: isSpeakingState,
    ttsSpeak: memoizedSpeak,
    ttsCancel: memoizedCancel,
    toggleTTSEnabled,
  };
}
