
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';

interface UseTextToSpeechReturn {
  speak: (text: string, lang?: string, voiceName?: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isTTSSupported: boolean; // For Google Cloud TTS, this is effectively always true if browser can play audio
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  isTTSSpeaking: boolean; // Same as isSpeaking for this implementation
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // TTS enabled by default

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean>(isTTSEnabled);
  const currentSpeechTextRef = useRef<string | null>(null); // To track which text is currently being processed/spoken
  const isSpeakingStateRef = useRef(isSpeakingState); // Ref to get latest isSpeakingState in async callbacks

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const isTTSSupported = true; // Using Google Cloud TTS via backend, so frontend support is about playing <audio>

  useEffect(() => {
    console.log("[useTextToSpeech] Initializing Audio element and event listeners.");
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event. Audio playback finished.");
      // Only update state if this was the audio we intended to play
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null; // Clear the current text ref
      } else {
        console.log("[useTextToSpeech] 'ended' event for an audio that wasn't the current speech task or was already cancelled.");
      }
    };

    const handleAudioError = (event: Event) => {
      const audioElementOnError = event.target as HTMLAudioElement;
      console.warn("[useTextToSpeech] HTMLAudioElement 'error' event:", event, "Audio Error Code:", audioElementOnError?.error?.code);
      let errorMessage = "Audio playback failed.";
      let wasAborted = false;

      if (audioElementOnError && audioElementOnError.error) {
        switch (audioElementOnError.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Audio playback was aborted.";
            wasAborted = true;
            console.log("[useTextToSpeech] Audio error: Playback aborted (MEDIA_ERR_ABORTED). This might be due to a cancel() call or new speech request.");
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "A network error caused audio playback to fail.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "The audio could not be decoded.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "The audio format is not supported by your browser.";
            break;
          default:
            errorMessage = `An unknown error occurred during audio playback (Code: ${audioElementOnError.error.code}).`;
        }
      }

      if (!wasAborted) { // Only show toast for actual errors, not programmatic cancellations
        toast({
          title: "Speech Playback Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    audioElement.addEventListener('error', handleAudioError);

    return () => {
      console.log("[useTextToSpeech] Cleaning up Audio element and event listeners.");
      audioElement.removeEventListener('ended', handleAudioEnd);
      audioElement.removeEventListener('error', handleAudioError);
      if (audioElement) {
        audioElement.pause();
        audioElement.removeAttribute('src'); // More effective than src = "" for some browsers
        audioElement.load(); // Resets the audio element
      }
    };
  }, [toast]);

  useEffect(() => {
    if (typeof previousIsTTSEnabledRef.current === 'boolean' && previousIsTTSEnabledRef.current !== isTTSEnabled) {
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
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      console.log("[useTextToSpeech] Audio playback cancelled (paused, src removed, loaded).");
    }
    if (isSpeakingStateRef.current) { // Use ref to check current actual speaking state
      setIsSpeakingState(false);
    }
    currentSpeechTextRef.current = null; // Always clear the ref on cancel
  }, []);


  const speak = useCallback(async (text: string, languageCode: string = 'en-US', voiceName?: string) => {
    if (!isTTSEnabled) {
      console.log("[useTextToSpeech] Speak called but TTS is not enabled.");
      return;
    }
    if (!audioRef.current) {
      console.error("[useTextToSpeech] Audio element not initialized. Cannot speak.");
      return;
    }

    const currentTextToSpeak = text; // Capture the text for this specific call
    console.log(`[useTextToSpeech] speak() called for: "${currentTextToSpeak.substring(0, 50)}..."`);

    // If already speaking, cancel the current speech and wait a bit before starting the new one
    if (isSpeakingStateRef.current) {
      console.log(`[useTextToSpeech] Currently speaking/processing "${(currentSpeechTextRef.current || "").substring(0, 30)}...". Cancelling before starting new speech for "${currentTextToSpeak.substring(0, 30)}...".`);
      cancel();
      // Introduce a small delay to allow the browser to process the cancellation
      // and for state updates to potentially flush.
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    currentSpeechTextRef.current = currentTextToSpeak; // Set the text that is now being processed
    setIsSpeakingState(true); // Signal that we are starting the speaking process

    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${currentTextToSpeak.substring(0, 50)}..." (currentSpeechTextRef: "${(currentSpeechTextRef.current || "").substring(0, 50)}...")`);
    
    try {
      const input: GenerateSpeechAudioInput = { text: currentTextToSpeak, languageCode };
      if (voiceName) input.voiceName = voiceName;
      
      const result = await generateSpeechAudio(input);
      
      // Critical check: Is this speech request still the current one AND are we still supposed to be speaking?
      if (currentSpeechTextRef.current !== currentTextToSpeak || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${currentTextToSpeak.substring(0, 30)}..." is no longer current or speaking was cancelled during fetch. Current text ref: "${(currentSpeechTextRef.current || "null").substring(0, 30)}", isSpeakingRef: ${isSpeakingStateRef.current}. Ignoring old/cancelled result.`);
        if (!isSpeakingStateRef.current) {
          setIsSpeakingState(false); // Sync React state if ref is false
        }
        return; // Do not proceed to play
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend for "${currentTextToSpeak.substring(0, 30)}...". Starts with: ${result.audioContentDataUri.substring(0, 100)}`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        console.log("[useTextToSpeech] audioRef.play() initiated for:", currentTextToSpeak.substring(0, 30));
      } else {
        console.error("[useTextToSpeech] No valid audioContentDataUri received from backend or audioRef is null for text:", currentTextToSpeak.substring(0, 50));
        throw new Error("No audio content received from backend for Google Cloud TTS.");
      }
    } catch (error: any) {
      console.error(`[useTextToSpeech] Error in speak function for text "${currentTextToSpeak.substring(0, 50)}...":`, error);
      toast({
        title: "Speech Synthesis Error",
        description: `Cloud TTS failed: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      // Only reset state if this error pertains to the currently intended speech
      if (currentSpeechTextRef.current === currentTextToSpeak && isSpeakingStateRef.current) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancel]); // cancel is memoized

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingStateRef.current) { // if turning OFF and currently speaking
        console.log("[useTextToSpeech] TTS disabled while speaking. Cancelling current speech.");
        cancel(); // cancel current speech
      }
      return newState;
    });
  }, [cancel]); // cancel is memoized

  return {
    speak,
    cancel,
    isSpeaking: isSpeakingState,
    isTTSSupported,
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking: isSpeakingState, // Exposing isSpeakingState directly for this purpose
  };
}
