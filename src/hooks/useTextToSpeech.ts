"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

const voiceMap: Record<ParticipantRole, VoiceConfig> = {
  CTO: { voiceName: 'en-US-Neural2-D', languageCode: 'en-US' },
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' },
  Product: { voiceName: 'en-US-Neural2-I', languageCode: 'en-US' },
  HR: { voiceName: 'en-US-Wavenet-E', languageCode: 'en-US' },
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },
  User: { voiceName: '', languageCode: '' },
};

export function useTextToSpeech() {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [displayedSpeaker, setDisplayedSpeaker] = useState<ParticipantRole | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const isSpeakingStateRef = useRef(isSpeakingState);
  const currentSpeechTextRef = useRef<string | null>(null);
  const currentParticipantRef = useRef<ParticipantRole | null>(null);

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const handleAudioEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for text: "${currentSpeechTextRef.current ? currentSpeechTextRef.current.substring(0,30) : 'N/A'}..."`);
    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
       setIsSpeakingState(false);
       currentSpeechTextRef.current = null;
       currentParticipantRef.current = null;
       setDisplayedSpeaker(null);
    }
  }, [setIsSpeakingState, setDisplayedSpeaker]);

  const handleAudioError = useCallback((e: Event | string) => {
    if (!isMountedRef.current) return;
    let errorMessage = "Audio playback error.";
    let logFullError = true;

    if (e instanceof Event && e.target instanceof HTMLAudioElement && e.target.error) {
        const mediaError = e.target.error;
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event. Code: ${mediaError.code}, Message: ${mediaError.message}`, mediaError);
        switch (mediaError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = "Audio playback aborted.";
                logFullError = false; // Don't toast for aborts
                console.warn('[useTextToSpeech] Playback aborted.');
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = "A network error caused audio download to fail.";
                break;
            case MediaError.MEDIA_ERR_DECODE:
                errorMessage = "Audio playback failed due to a media decoding error.";
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = "The audio format is not supported.";
                break;
            default:
                errorMessage = `An unknown error occurred during audio playback. Code: ${mediaError.code}`;
        }
    } else if (typeof e === 'string') {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (string):`, e);
        errorMessage = e;
    } else {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (unknown type):`, e);
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        if (logFullError) {
            toast({
                title: "Audio Playback Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
        currentParticipantRef.current = null;
        setDisplayedSpeaker(null);
    }
  }, [toast, setIsSpeakingState, setDisplayedSpeaker]);

  useEffect(() => {
    isMountedRef.current = true;
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    if (currentAudioElement) {
      currentAudioElement.addEventListener('ended', handleAudioEnd);
      currentAudioElement.addEventListener('error', handleAudioError);
    }

    return () => {
      isMountedRef.current = false;
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
        try {
          if (!currentAudioElement.paused) {
            currentAudioElement.pause();
          }
          currentAudioElement.currentTime = 0;
          currentAudioElement.src = '';
          currentAudioElement.load(); // Force the audio element to reset
        } catch (error) {
          console.warn('[useTextToSpeech] Error during cleanup:', error);
        }
        console.log('[useTextToSpeech] Cleaned up audio element and listeners.');
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    };
  }, [handleAudioEnd, handleAudioError]);


  const memoizedCancel = useCallback(() => {
    console.log(`[useTextToSpeech] memoizedCancel called. isSpeakingStateRef: ${isSpeakingStateRef.current}`);
    if (isSpeakingStateRef.current && audioRef.current) {
      console.log('[useTextToSpeech] Cancelling speech: Pausing audio and resetting src.');
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current.load(); // Force the audio element to reset
      } catch (error) {
        console.warn('[useTextToSpeech] Error during audio cleanup:', error);
      }
    }
    if(isMountedRef.current) {
      setIsSpeakingState(false);
      setDisplayedSpeaker(null);
    }
    currentSpeechTextRef.current = null;
    currentParticipantRef.current = null;
  }, [setIsSpeakingState, setDisplayedSpeaker]);


  const memoizedSpeak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    console.log(`[useTextToSpeech DEBUG] memoizedSpeak called. Participant: ${participant}, Text: "${text.substring(0,30)}...", isSpeakingStateRef: ${isSpeakingStateRef.current}`);

    if (!text.trim() || participant === 'User') {
      console.log(`[useTextToSpeech] Speak called but condition not met: text="${text.substring(0,30)}...", participant=${participant}. Skipping.`);
      return;
    }
    
    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text && currentParticipantRef.current === participant) {
      console.log(`[useTextToSpeech] Speak called for the same text ("${text.substring(0,30)}...") and participant (${participant}) that is already being processed/spoken. IGNORING DUPLICATE ATTEMPT.`);
      return;
    }

    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Currently speaking ("${currentSpeechTextRef.current ? currentSpeechTextRef.current.substring(0,30) : 'N/A'}..."). Cancelling before speaking new text.`);
      memoizedCancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!isMountedRef.current) {
        console.log('[useTextToSpeech] Speak called but component unmounted. Aborting.');
        return;
    }

    currentSpeechTextRef.current = text;
    currentParticipantRef.current = participant;
    if(isMountedRef.current) {
      setIsSpeakingState(true);
      setDisplayedSpeaker(participant);
    }

    const voiceConfig = voiceMap[participant] || voiceMap.System;
    console.log(`[useTextToSpeech DEBUG] For participant: ${participant}, chosen voiceConfig: ${JSON.stringify(voiceConfig)}`);

    console.log(`[useTextToSpeech] Attempting to speak text via Google Cloud TTS flow: "${text.substring(0,50)}..." for participant: ${participant}`);
    
    const input: GenerateSpeechAudioInput = {
      text,
      voiceName: voiceConfig.voiceName,
      languageCode: voiceConfig.languageCode,
    };

    try {
      const { audioContentDataUri } = await generateSpeechAudio(input);

      if (!isMountedRef.current) {
        console.log('[useTextToSpeech] TTS audio received but component unmounted. Aborting playback.');
        if(isMountedRef.current) {
          setIsSpeakingState(false);
          setDisplayedSpeaker(null);
        }
        currentSpeechTextRef.current = null;
        currentParticipantRef.current = null;
        return;
      }
      
      if (currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant || !isSpeakingStateRef.current) {
          console.log(`[useTextToSpeech] TTS audio received for "${text.substring(0,30)}..." but current speech target has changed or speaking state is false. Discarding audio.`);
          if (isSpeakingStateRef.current) {
            if(isMountedRef.current) {
               setIsSpeakingState(false);
               setDisplayedSpeaker(null);
            }
          }
          currentSpeechTextRef.current = null;
          currentParticipantRef.current = null;
          return;
      }

      console.log(`[useTextToSpeech] Received audioContentDataUri from backend. Starts with: ${audioContentDataUri.substring(0, 50)}...`);
      if (audioRef.current) {
        audioRef.current.src = audioContentDataUri;
        console.log('[useTextToSpeech] audioRef.play() initiated.');
        await audioRef.current.play();
      } else {
          console.error('[useTextToSpeech] audioRef.current is null. Cannot play audio.');
          if(isMountedRef.current) {
            setIsSpeakingState(false);
            setDisplayedSpeaker(null);
          }
          currentSpeechTextRef.current = null;
          currentParticipantRef.current = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', errorMsg);
      toast({
        title: "Speech Generation Error",
        description: `Failed to get audio: ${errorMsg.substring(0, 100)}...`,
        variant: "destructive",
      });
      if(isMountedRef.current) {
        setIsSpeakingState(false);
        setDisplayedSpeaker(null);
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    }
  }, [toast, memoizedCancel, setIsSpeakingState, setDisplayedSpeaker]);

  const isTTSSupported = typeof Audio !== 'undefined'; 

  return {
    speak: memoizedSpeak,
    cancel: memoizedCancel,
    isSpeaking: isSpeakingState,
    isTTSSupported,
    currentSpeakingParticipant: displayedSpeaker,
  };
}

