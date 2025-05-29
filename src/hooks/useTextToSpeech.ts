
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

// Define specific voices for each role
const voiceMap: Partial<Record<ParticipantRole, VoiceConfig>> = {
  CTO: { voiceName: 'en-US-Neural2-J', languageCode: 'en-US' },      // Male, Neural2
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' },  // Female, Wavenet
  Product: { voiceName: 'en-US-Neural2-A', languageCode: 'en-US' },  // Male, Neural2 (Upgraded from Standard)
  HR: { voiceName: 'en-US-Neural2-F', languageCode: 'en-US' },        // Female, Neural2
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' },   // Default/System voice, Male Wavenet
};

// Fallback voice if a role-specific voice isn't found or for general use
const defaultVoiceConfig: VoiceConfig = { voiceName: 'en-US-Neural2-A', languageCode: 'en-US' }; // Using a Neural2 voice as default

interface UseTextToSpeechReturn {
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  speak: (text: string, participant?: ParticipantRole) => void;
  cancelCurrentSpeech: () => void;
  isTTSSpeaking: boolean;
  isTTSSupported: boolean; // Represents if the overall TTS mechanism is enabled/available
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS enabled by default
  const [isTTSSpeaking, setIsTTSSpeakingState] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingStateRef = useRef(isTTSSpeaking);
  const currentSpeechTextRef = useRef<string | null>(null); // To track which text is currently being spoken or fetched
  const initialLoadDoneRef = useRef(false);


  useEffect(() => {
    isSpeakingStateRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  useEffect(() => {
    // Initialize Audio element
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    const handleAudioEnd = () => {
      const endedText = currentSpeechTextRef.current;
      console.log(`[useTextToSpeech] HTMLAudioElement 'ended' event for text (approx): "${endedText ? endedText.substring(0,30) + '...' : 'N/A'}"`);
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
         setIsTTSSpeakingState(false);
      }
      currentSpeechTextRef.current = null; // Clear the ref once done
    };

    const handleAudioError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement)?.error;
      const erroredText = currentSpeechTextRef.current;
      currentSpeechTextRef.current = null; // Clear ref on error

      // Error code 4 (MEDIA_ERR_ABORTED) usually means playback was stopped intentionally (e.g., by cancelCurrentSpeech)
      if (mediaError && (mediaError.code === MediaError.MEDIA_ERR_ABORTED)) {
        console.warn(`[useTextToSpeech] HTMLAudioElement playback aborted (likely intentional cancellation). Text was: "${erroredText ? erroredText.substring(0,30) + '...' : 'N/A'}"`);
      } else {
        console.error("[useTextToSpeech] HTMLAudioElement 'error' event:", e, mediaError);
        toast({
          title: "Audio Playback Error",
          description: `Could not play audio for "${erroredText ? erroredText.substring(0,30) + '...' : 'message'}". Code: ${mediaError?.code}, Message: ${mediaError?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
      if (isSpeakingStateRef.current) { // Only update state if it was supposed to be speaking
        setIsTTSSpeakingState(false);
      }
    };

    currentAudioElement.addEventListener('ended', handleAudioEnd);
    currentAudioElement.addEventListener('error', handleAudioError);

    return () => {
      console.log("[useTextToSpeech] Cleanup: Pausing audio, removing src, and removing listeners.");
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.removeAttribute('src'); // Important to prevent playing old audio
        currentAudioElement.load(); // Reset the audio element
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
      }
      currentSpeechTextRef.current = null;
    };
  }, [toast]);


  const cancelCurrentSpeech = useCallback(() => {
    const textBeingCancelled = currentSpeechTextRef.current;
    console.log("[useTextToSpeech] cancelCurrentSpeech called for text (approx):", textBeingCancelled ? textBeingCancelled.substring(0,30) + '...' : 'N/A');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); 
      audioRef.current.load(); // Reset
    }
    // Only change speaking state if it's currently true
    if (isSpeakingStateRef.current) {
        setIsTTSSpeakingState(false);
    }
    currentSpeechTextRef.current = null; // Ensure this is cleared
  }, []); // No dependencies, relies on refs

  const speak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log("[useTextToSpeech] Speak called for User, skipping.");
      else if (!isTTSEnabled) console.log("[useTextToSpeech] Speak called but TTS is disabled.");
      else console.log("[useTextToSpeech] Speak called with empty text, skipping.");
      return;
    }

    // If already speaking, cancel the current speech and wait a moment for it to fully stop.
    if (isSpeakingStateRef.current) {
        console.log("[useTextToSpeech] Speak called while already speaking. Cancelling previous speech (approx):", currentSpeechTextRef.current?.substring(0,30) + '...');
        cancelCurrentSpeech();
        // Brief delay to allow the audio element to fully process the stop/reset before starting new audio.
        // This can help prevent overlaps or errors on some browsers.
        await new Promise(resolve => setTimeout(resolve, 150)); 
    }
    
    // Re-check if TTS is still enabled after the potential delay (in case it was toggled off)
    if (!isTTSEnabled) {
        console.log("[useTextToSpeech] TTS was disabled during cancellation delay. Aborting new speech.");
        return;
    }

    currentSpeechTextRef.current = text; // Set the text that is NOW intended to be spoken
    setIsTTSSpeakingState(true);
    
    const selectedVoice = voiceMap[participant] || defaultVoiceConfig;
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow for ${participant}. Voice: ${selectedVoice.voiceName}, Lang: ${selectedVoice.languageCode}. Text: "${text.substring(0,50)}..."`);

    try {
      const input: GenerateSpeechAudioInput = { 
        text,
        voiceName: selectedVoice.voiceName,
        languageCode: selectedVoice.languageCode,
      };
      const result = await generateSpeechAudio(input);

      // Critical check: Is this still the text we want to speak? Has it been cancelled or superseded?
      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${text.substring(0,30)}..." was superseded or cancelled while fetching audio. Aborting play.`);
        // If isSpeakingStateRef is false but currentSpeechTextRef is this text, it implies cancel was called for this specific text.
        // If currentSpeechTextRef is different, another speak call has taken precedence.
        if (isSpeakingStateRef.current && currentSpeechTextRef.current !== text) {
           // A new speak call is active, do nothing to its state.
        } else {
           setIsTTSSpeakingState(false); // This request is no longer active.
        }
        return;
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend. Starts with: ${result.audioContentDataUri.substring(0, 70)}... Attempting to play.`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        console.log(`[useTextToSpeech] audioRef.play() initiated for "${text.substring(0,30)}..."`);
      } else {
        throw new Error("No audio content received from backend or audio element not ready.");
      }
    } catch (error) {
      console.error(`[useTextToSpeech] Error in speak function for text "${text.substring(0,30)}...":`, error);
      // Only update state and show toast if this specific speech task was the one that failed
      if (currentSpeechTextRef.current === text && isSpeakingStateRef.current) {
        toast({
          title: "Text-to-Speech Error",
          description: `Could not generate or play speech: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
        setIsTTSSpeakingState(false); 
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancelCurrentSpeech]); // cancelCurrentSpeech is memoized


  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      console.log(`[useTextToSpeech] TTS enabled state toggled to: ${newState}`);
      if (!newState) { // If disabling TTS
        cancelCurrentSpeech();
      }
      return newState;
    });
  }, [cancelCurrentSpeech]);

  useEffect(() => {
    if (initialLoadDoneRef.current) { // Avoid toast on initial mount if default is true
        toast({ title: `Text-to-Speech ${isTTSEnabled ? 'Enabled' : 'Disabled'}` });
    }
  }, [isTTSEnabled, toast]);

  // Set initialLoadDoneRef to true after the first render
  useEffect(() => {
    initialLoadDoneRef.current = true;
  }, []);


  return {
    isTTSEnabled,
    toggleTTSEnabled,
    speak,
    cancelCurrentSpeech,
    isTTSSpeaking,
    isTTSSupported: true, // Assumes the backend flow is the primary TTS mechanism
  };
}

