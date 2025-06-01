
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
  User: { voiceName: '', languageCode: '' }, // User voice is not synthesized
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
    let logAsError = true;

    if (e instanceof Event && e.target instanceof HTMLAudioElement && e.target.error) {
        const mediaError = e.target.error;
        const currentSrcUsedByPlayer = (e.target as HTMLAudioElement).currentSrc || (e.target as HTMLAudioElement).src; 
        
        // Determine if this is likely a benign error due to cancellation or specific known issues
        const isLikelyCancellationError =
            mediaError.code === 1 || // MEDIA_ERR_ABORTED
            (mediaError.code === 4 && // MEDIA_ERR_SRC_NOT_SUPPORTED
                (
                    !currentSrcUsedByPlayer ||
                    (currentSrcUsedByPlayer && !currentSrcUsedByPlayer.startsWith('data:audio/')) ||
                    (mediaError.message && mediaError.message.includes("Empty src attribute")) // Check for specific message
                )
            );

        if (isLikelyCancellationError) {
            logAsError = false; 
        }

        if (logAsError) {
            console.error(`[useTextToSpeech] HTMLAudioElement 'error' event. Code: ${mediaError.code}, Message: ${mediaError.message}, Current Player Src: "${currentSrcUsedByPlayer}"`, mediaError);
        } else {
            console.warn(`[useTextToSpeech] HTMLAudioElement 'error' event (likely cancellation-related). Code: ${mediaError.code}, Message: ${mediaError.message}, Current Player Src: "${currentSrcUsedByPlayer}"`, mediaError);
        }
        
        switch (mediaError.code) {
            case 1: // MEDIA_ERR_ABORTED
                errorMessage = "Audio playback aborted.";
                break;
            case 2: // MEDIA_ERR_NETWORK
                errorMessage = "A network error caused audio download to fail.";
                break;
            case 3: // MEDIA_ERR_DECODE
                errorMessage = "Audio playback failed due to a media decoding error.";
                break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                if (!currentSrcUsedByPlayer || (currentSrcUsedByPlayer && !currentSrcUsedByPlayer.startsWith('data:audio/'))) {
                  errorMessage = "Audio source was empty or invalid, possibly due to cancellation.";
                } else if (mediaError.message && mediaError.message.includes("Empty src attribute")) {
                  errorMessage = "Audio source processing failed (reported as empty/invalid by browser), possibly due to cancellation or malformed data.";
                }
                 else {
                  errorMessage = "The audio format is not supported or the source is invalid.";
                }
                break;
            default:
                errorMessage = `An unknown error occurred during audio playback. Code: ${mediaError.code}`;
        }
    } else if (typeof e === 'string') {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (string):`, e);
        errorMessage = e;
        logAsError = true; 
    } else {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (unknown type):`, e);
        logAsError = true; 
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        if (logAsError) { // Only toast if it's not a likely cancellation error
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
          currentAudioElement.load(); 
        } catch (error) {
          console.warn('[useTextToSpeech] Error during audio cleanup on unmount:', error);
        }
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    };
  }, [handleAudioEnd, handleAudioError]);


  const memoizedCancel = useCallback(() => {
    if (isSpeakingStateRef.current && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current.load(); 
      } catch (error) {
        console.warn('[useTextToSpeech] Error during audio cancel operation:', error);
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
    if (!text.trim() || participant === 'User') {
      return;
    }
    
    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text && currentParticipantRef.current === participant) {
      return;
    }

    if (isSpeakingStateRef.current) {
      memoizedCancel();
      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for cancel to take effect
    }
    
    if (!isMountedRef.current) return;

    currentSpeechTextRef.current = text;
    currentParticipantRef.current = participant;
    if(isMountedRef.current) {
      setIsSpeakingState(true);
      setDisplayedSpeaker(participant);
    }

    const voiceConfig = voiceMap[participant] || voiceMap.System;
    
    const input: GenerateSpeechAudioInput = {
      text,
      voiceName: voiceConfig.voiceName,
      languageCode: voiceConfig.languageCode,
    };

    try {
      const { audioContentDataUri } = await generateSpeechAudio(input);

      if (!isMountedRef.current || currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant || !isSpeakingStateRef.current) {
          if (isSpeakingStateRef.current && isMountedRef.current) { // Only reset if it was speaking and still mounted
             setIsSpeakingState(false);
             setDisplayedSpeaker(null);
          }
          // Clear refs if the target changed before audio loaded, or if unmounted
          if (currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant) {
            currentSpeechTextRef.current = null;
            currentParticipantRef.current = null;
          }
          return;
      }

      if (audioRef.current) {
        audioRef.current.src = audioContentDataUri;
        await audioRef.current.play();
      } else {
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

