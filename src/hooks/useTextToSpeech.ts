
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
  CTO: { voiceName: 'en-US-Neural2-D', languageCode: 'en-US' }, // Male, Neural2
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Female, WaveNet
  Product: { voiceName: 'en-US-Neural2-I', languageCode: 'en-US' }, // Male, Neural2
  HR: { voiceName: 'en-US-Wavenet-E', languageCode: 'en-US' },     // Female, WaveNet
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },  // Male, WaveNet (for system messages)
  User: { voiceName: '', languageCode: '' }, // User messages are not spoken
};

export function useTextToSpeech() {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const isSpeakingStateRef = useRef(isSpeakingState);
  const currentSpeechTextRef = useRef<string | null>(null);
  const currentParticipantRef = useRef<ParticipantRole | null>(null);

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  useEffect(() => {
    isMountedRef.current = true;
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    const handleAudioEnd = () => {
      if (!isMountedRef.current) return;
      console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for text: "${currentSpeechTextRef.current ? currentSpeechTextRef.current.substring(0,30) : 'N/A'}..."`);
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
         setIsSpeakingState(false);
         currentSpeechTextRef.current = null;
         currentParticipantRef.current = null;
      }
    };

    const handleAudioError = (e: Event | string) => {
      if (!isMountedRef.current) return;
      console.error(`[useTextToSpeech] HTMLAudioElement 'error' event:`, e);
      const target = e.target as HTMLAudioElement;
      let errorMessage = "Audio playback error.";
      if (target && target.error) {
        switch (target.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Audio playback aborted.";
            // Don't toast for aborts, as these can be intentional (e.g., user cancels)
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
            errorMessage = "An unknown error occurred during audio playback.";
        }
      }
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        if(errorMessage !== "Audio playback aborted.") { // Only toast for non-abort errors
          toast({
            title: "Audio Playback Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
        currentParticipantRef.current = null;
      }
    };

    if (currentAudioElement) {
      currentAudioElement.addEventListener('ended', handleAudioEnd);
      currentAudioElement.addEventListener('error', handleAudioError);
    }

    return () => {
      isMountedRef.current = false;
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
        if (!currentAudioElement.paused) {
          currentAudioElement.pause();
        }
        currentAudioElement.src = ''; // Release the audio source
        console.log('[useTextToSpeech] Cleaned up audio element and listeners.');
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    };
  }, [toast]);


  const memoizedCancel = useCallback(() => {
    console.log(`[useTextToSpeech] memoizedCancel called. isSpeakingStateRef: ${isSpeakingStateRef.current}`);
    if (isSpeakingStateRef.current && audioRef.current) {
      console.log('[useTextToSpeech] Cancelling speech: Pausing audio and resetting src.');
      audioRef.current.pause();
      audioRef.current.src = ''; // This should effectively stop playback and release resources
    }
    // Ensure state is reset even if audio wasn't actively playing but was about to
    if(isMountedRef.current) setIsSpeakingState(false);
    currentSpeechTextRef.current = null;
    currentParticipantRef.current = null;
  }, []);


  const memoizedSpeak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!text.trim() || participant === 'User') {
      console.log(`[useTextToSpeech] Speak called but condition not met: text="${text.substring(0,30)}...", participant=${participant}. Skipping.`);
      return;
    }
    
    // Check if already trying to speak the exact same thing for the same participant
    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text && currentParticipantRef.current === participant) {
      console.log(`[useTextToSpeech] Speak called for the same text ("${text.substring(0,30)}...") and participant (${participant}) that is already being processed/spoken. IGNORING DUPLICATE ATTEMPT.`);
      return;
    }

    // If currently speaking something else, cancel it first.
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Currently speaking ("${currentSpeechTextRef.current ? currentSpeechTextRef.current.substring(0,30) : 'N/A'}..."). Cancelling before speaking new text.`);
      memoizedCancel();
      // Add a small delay to ensure the cancel operation completes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!isMountedRef.current) {
        console.log('[useTextToSpeech] Speak called but component unmounted. Aborting.');
        return;
    }

    currentSpeechTextRef.current = text;
    currentParticipantRef.current = participant;
    if(isMountedRef.current) setIsSpeakingState(true);

    console.log(`[useTextToSpeech] Attempting to speak text via Google Cloud TTS flow: "${text.substring(0,50)}..." for participant: ${participant}`);
    const voiceConfig = voiceMap[participant] || voiceMap.System;

    const input: GenerateSpeechAudioInput = {
      text,
      voiceName: voiceConfig.voiceName,
      languageCode: voiceConfig.languageCode,
    };

    try {
      const { audioContentDataUri } = await generateSpeechAudio(input);

      if (!isMountedRef.current) {
        console.log('[useTextToSpeech] TTS audio received but component unmounted. Aborting playback.');
        if(isMountedRef.current) setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
        currentParticipantRef.current = null;
        return;
      }
      
      // Double check if this is still the intended speech text and if we should still be speaking
      if (currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant || !isSpeakingStateRef.current) {
          console.log(`[useTextToSpeech] TTS audio received for "${text.substring(0,30)}..." but current speech target has changed or speaking state is false. Discarding audio.`);
          // State might have already been set to false by a rapid cancel call.
          if (isSpeakingStateRef.current) { // Only reset if it thinks it's still speaking
            if(isMountedRef.current) setIsSpeakingState(false);
          }
          currentSpeechTextRef.current = null; // Clear refs if this audio is not to be played
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
          if(isMountedRef.current) setIsSpeakingState(false);
          currentSpeechTextRef.current = null;
          currentParticipantRef.current = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', errorMsg);
      toast({
        title: "Speech Generation Error",
        description: `Failed to get audio: ${errorMsg.substring(0, 100)}...`, // Truncate long backend errors
        variant: "destructive",
      });
      if(isMountedRef.current) setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    }
  }, [toast, memoizedCancel]);

  // Since TTS is always on, isTTSEnabled is effectively true.
  // isTTSSupported indicates if the mechanism (browser can play audio, backend reachable) is usable.
  const isTTSSupported = typeof Audio !== 'undefined'; 

  return {
    speak: memoizedSpeak,
    cancel: memoizedCancel,
    isSpeaking: isSpeakingState,
    isTTSSupported, // Indicates if the TTS mechanism can work (browser can play audio)
  };
}
