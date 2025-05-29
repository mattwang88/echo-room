
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';

interface UseTextToSpeechReturn {
  speak: (text: string, lang?: string, voiceName?: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isTTSSupported: boolean;
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  isTTSSpeaking: boolean; // Same as isSpeaking for this implementation
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS enabled by default

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean>(isTTSEnabled); // Initialize with default
  const currentSpeechTextRef = useRef<string | null>(null);
  const isSpeakingStateRef = useRef(isSpeakingState); // Ref to track current speaking state for async operations

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const isTTSSupported = true; // Assumed true as we use backend + HTML Audio

  useEffect(() => {
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event. Audio playback finished.");
      // Only set speaking to false if the ended audio was the one we intended to play.
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      } else {
        console.log("[useTextToSpeech] 'ended' event for an audio that wasn't the current speech task or was already cancelled.");
      }
    };

    const handleAudioError = (event: Event) => {
      console.warn("[useTextToSpeech] HTMLAudioElement 'error' event:", event);
      let errorMessage = "Audio playback failed.";
      if (audioElement && audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Audio playback was aborted.";
            // Often, we don't want to show a user-facing error toast for aborts caused by our own cancel()
            console.log("[useTextToSpeech] Audio error: Playback aborted (MEDIA_ERR_ABORTED). This might be due to a cancel() call.");
            // Only clear state if it was an active speech task
            if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
               setIsSpeakingState(false);
               currentSpeechTextRef.current = null;
            }
            return; // Don't show toast for deliberate aborts/cancels
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "A network error caused audio playback to fail.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "The audio could not be decoded.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "The audio format is not supported.";
            break;
          default:
            errorMessage = "An unknown error occurred during audio playback.";
        }
      }
      
      toast({
        title: "Speech Playback Error",
        description: errorMessage,
        variant: "destructive",
      });

      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    audioElement.addEventListener('error', handleAudioError);

    return () => {
      audioElement.removeEventListener('ended', handleAudioEnd);
      audioElement.removeEventListener('error', handleAudioError);
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [toast]);


  useEffect(() => {
    // Only toast if there was a change from a previously defined state.
    if (previousIsTTSEnabledRef.current !== isTTSEnabled) {
      toast({
        title: "Text-to-Speech",
        description: isTTSEnabled ? "Enabled (Google Cloud TTS)" : "Disabled",
      });
    }
    previousIsTTSEnabledRef.current = isTTSEnabled;
  }, [isTTSEnabled, toast]);

  const cancel = useCallback(() => {
    console.log("[useTextToSpeech] cancel() called.");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear source to stop download/streaming
      console.log("[useTextToSpeech] Audio playback cancelled (paused and src cleared).");
    }
    if (isSpeakingStateRef.current) { // Use ref for current state check
      setIsSpeakingState(false);
    }
    currentSpeechTextRef.current = null; // Clear the ref for the text that was being spoken
  }, []); // No dependencies, relies on refs for current state

  const speak = useCallback(async (text: string, languageCode: string = 'en-US', voiceName?: string) => {
    if (!isTTSEnabled) {
      console.log("[useTextToSpeech] Speak called but TTS is not enabled.");
      return;
    }
    if (!audioRef.current) {
        console.error("[useTextToSpeech] Audio element not initialized. Cannot speak.");
        return;
    }

    console.log(`[useTextToSpeech] Received speak request for: "${text.substring(0, 50)}..."`);

    // If already speaking, cancel the current speech.
    // cancel() will set isSpeakingStateRef.current to false via setIsSpeakingState.
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Currently speaking (or processing). Cancelling previous speech task for "${(currentSpeechTextRef.current || "").substring(0,30)}..." before starting new one for "${text.substring(0,30)}...".`);
      cancel();
      // Wait a brief moment for the cancellation and state updates to propagate.
      // This helps prevent race conditions with the HTMLAudioElement.
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Set the text we intend to process and speak now.
    currentSpeechTextRef.current = text;
    setIsSpeakingState(true); // Signal that we are now processing THIS new request.

    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${text.substring(0, 50)}..." (currentSpeechTextRef: "${(currentSpeechTextRef.current||"").substring(0,50)}...")`);

    try {
      const input: GenerateSpeechAudioInput = { text, languageCode };
      if (voiceName) input.voiceName = voiceName;
      
      const result = await generateSpeechAudio(input);
      
      // CRITICAL CHECK: After await, ensure this speech request is still the active one
      // and we are still supposed to be in a "speaking" state.
      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${text.substring(0,30)}..." is no longer current or speaking was cancelled during fetch. Current text ref: "${(currentSpeechTextRef.current || "null").substring(0,30)}", isSpeakingRef: ${isSpeakingStateRef.current}. Ignoring old/cancelled result.`);
        // If !isSpeakingStateRef.current, it means cancel() was called for this specific text or globally.
        // If currentSpeechTextRef.current !== text, it means a newer speak() call has already updated the intent.
        // In either case, if isSpeakingStateRef.current is false, ensure our component state matches.
        // If isSpeakingStateRef.current is true but text doesn't match, the newer speak call is in charge.
        if(!isSpeakingStateRef.current){
             setIsSpeakingState(false); // ensure react state is false if ref is false.
        }
        return;
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend for "${text.substring(0,30)}...". First 100 chars: ${result.audioContentDataUri.substring(0,100)}`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        console.log("[useTextToSpeech] audioRef.play() initiated.");
      } else {
        console.error("[useTextToSpeech] No valid audioContentDataUri received from backend or audioRef is null for text:", text.substring(0,50));
        throw new Error("No audio content received from backend for Google Cloud TTS.");
      }
    } catch (error: any) {
      console.error(`[useTextToSpeech] Error in speak function for text "${text.substring(0,50)}...":`, error);
      toast({
        title: "Speech Synthesis Error",
        description: `Cloud TTS failed: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      // Only reset speaking state if this specific request (matching currentSpeechTextRef) failed
      // AND we were still in a speaking state for this text.
      if(currentSpeechTextRef.current === text && isSpeakingStateRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancel]); // `cancel` is stable.

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingStateRef.current) { // If disabling TTS while it's speaking
        console.log("[useTextToSpeech] TTS disabled while speaking. Cancelling current speech.");
        cancel();
      }
      return newState;
    });
  }, [cancel]); // `cancel` is stable


  return {
    speak,
    cancel,
    isSpeaking: isSpeakingState,
    isTTSSupported,
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking: isSpeakingState, // In this Google Cloud TTS model, isSpeaking and isTTSSpeaking are effectively the same
  };
}

    