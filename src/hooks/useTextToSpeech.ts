
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
  isTTSSpeaking: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean | undefined>();
  const currentSpeechTextRef = useRef<string | null>(null); // To track the text for the current/latest speak request

  // For Google Cloud TTS via backend, "supported" means the browser can play <audio>
  // and the backend flow is implemented. The browser's SpeechSynthesisAPI is not used here.
  const isTTSSupported = true;

  useEffect(() => {
    // Initialize Audio element
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event. Audio playback finished.");
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };

    const handleAudioError = (event: Event) => {
      console.warn("[useTextToSpeech] HTMLAudioElement 'error' event:", event);
      // Check if the error is due to an empty src, which can happen after cancel()
      if (audioElement.src && audioElement.src !== window.location.href) { // window.location.href is what an empty src defaults to for reporting
        toast({
          title: "Speech Playback Error",
          description: "Could not play the synthesized audio. The audio element reported an error.",
          variant: "destructive",
        });
      }
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    audioElement.addEventListener('error', handleAudioError);

    return () => {
      audioElement.removeEventListener('ended', handleAudioEnd);
      audioElement.removeEventListener('error', handleAudioError);
      if (audioElement) {
        audioElement.pause();
        audioElement.src = ""; // Clear source
      }
    };
  }, [toast]);


  useEffect(() => {
    if (previousIsTTSEnabledRef.current !== undefined && previousIsTTSEnabledRef.current !== isTTSEnabled) {
      toast({
        title: "Text-to-Speech",
        description: isTTSEnabled ? "Enabled (Google Cloud TTS)" : "Disabled",
      });
    }
    previousIsTTSEnabledRef.current = isTTSEnabled;
  }, [isTTSEnabled, toast]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      // Setting src to "" is important to stop any ongoing download/streaming and to allow a new src to be set cleanly.
      // It might trigger an 'error' event on the audio element if it was loading, which handleAudioError handles.
      audioRef.current.src = "";
      console.log("[useTextToSpeech] Audio playback cancelled (paused and src cleared).");
    }
    // This state update is crucial and should happen regardless of audioRef.current state
    // as it signals the intent to stop.
    if (isSpeakingState) {
      setIsSpeakingState(false);
    }
    currentSpeechTextRef.current = null; // Clear the ref for the text being spoken
  }, [isSpeakingState]);

  const speak = useCallback(async (text: string, languageCode: string = 'en-US', voiceName?: string) => {
    if (!isTTSEnabled) {
      console.log("[useTextToSpeech] Speak called but TTS is not enabled.");
      return;
    }
    if (!audioRef.current) {
        console.error("[useTextToSpeech] Audio element not initialized. Cannot speak.");
        return;
    }

    // If already speaking, and it's a different text, cancel the current one.
    // If it's the same text, we might not need to do anything if it's already playing or requested.
    if (isSpeakingState) {
        if (currentSpeechTextRef.current === text) {
            console.log("[useTextToSpeech] Speak called with the exact same text that is currently being processed/played. Ignoring redundant request.");
            return;
        }
        console.log(`[useTextToSpeech] New speech request for "${text.substring(0,30)}..." while already speaking "${(currentSpeechTextRef.current || "").substring(0,30)}...". Cancelling previous.`);
        cancel(); // Cancel ongoing speech before starting new
    }
    
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${text.substring(0, 50)}..."`);
    setIsSpeakingState(true);
    currentSpeechTextRef.current = text; // Set the current text being processed

    try {
      const input: GenerateSpeechAudioInput = { text, languageCode };
      if (voiceName) input.voiceName = voiceName;
      
      const result = await generateSpeechAudio(input); // Call to Genkit flow
      
      // Check if the request is still the current one (user might have cancelled or requested new speech)
      if (currentSpeechTextRef.current !== text) {
        console.log(`[useTextToSpeech] Backend responded for text "${text.substring(0,30)}...", but current request is for "${(currentSpeechTextRef.current || "nothing").substring(0,30)}...". Ignoring old result.`);
        return;
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend. First 100 chars: ${result.audioContentDataUri.substring(0,100)}`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        // isSpeakingState remains true. 'ended' or 'error' event on audioRef will set it to false.
        console.log("[useTextToSpeech] audioRef.play() initiated.");
      } else {
        console.error("[useTextToSpeech] No valid audioContentDataUri received from backend or audioRef is null.");
        throw new Error("No audio content received from backend for Google Cloud TTS.");
      }
    } catch (error: any) {
      console.error("[useTextToSpeech] Error in speak function (calling Genkit flow or playing audio):", error);
      toast({
        title: "Speech Synthesis Error",
        description: `Cloud TTS failed: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      // Only reset speaking state if this specific request failed and wasn't superseded by another call to speak() or cancel()
      if(currentSpeechTextRef.current === text) {
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancel, isSpeakingState]);


  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingState) { // If disabling TTS while it's speaking
        cancel();
      }
      return newState;
    });
  }, [isSpeakingState, cancel]);


  return {
    speak,
    cancel,
    isSpeaking: isSpeakingState,
    isTTSSupported, // Always true for this Google Cloud TTS based approach.
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking: isSpeakingState,
  };
}
