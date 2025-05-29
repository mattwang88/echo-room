
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';

interface UseTextToSpeechReturn {
  speak: (text: string, lang?: string, voiceName?: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isTTSSupported: boolean; // Will always be true as it relies on backend
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  isTTSSpeaking: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // Default to true
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean | undefined>();
  const currentSpeechTextRef = useRef<string | null>(null); // To track what's currently meant to be spoken

  // Since we're using a backend service, TTS is "supported" if the flow can be called.
  const isTTSSupported = true; 

  useEffect(() => {
    // Create a persistent audio element
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] Audio onended event.");
      setIsSpeakingState(false);
      currentSpeechTextRef.current = null;
    };

    const handleAudioError = (event: Event) => {
      console.warn("[useTextToSpeech] Audio onerror event:", event);
      toast({
        title: "Speech Playback Error",
        description: "Could not play the synthesized audio.",
        variant: "destructive",
      });
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
        audioElement.src = ""; // Clean up
      }
      audioRef.current = null;
    };
  }, [toast]);


  useEffect(() => {
    if (previousIsTTSEnabledRef.current !== undefined && previousIsTTSEnabledRef.current !== isTTSEnabled) {
      toast({
        title: "Text-to-Speech",
        description: isTTSEnabled ? "Enabled using Google Cloud TTS" : "Disabled",
      });
    }
    previousIsTTSEnabledRef.current = isTTSEnabled;
  }, [isTTSEnabled, toast]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear source to stop download/playback
      console.log("[useTextToSpeech] Audio playback cancelled.");
    }
    if (isSpeakingState) {
      setIsSpeakingState(false);
    }
    currentSpeechTextRef.current = null;
  }, [isSpeakingState]);

  const speak = useCallback(async (text: string, languageCode: string = 'en-US', voiceName?: string) => {
    if (!isTTSEnabled) {
      console.log("[useTextToSpeech] Speak called but TTS is not enabled.");
      return;
    }
    if (!audioRef.current) {
        console.error("[useTextToSpeech] Audio element not available.");
        return;
    }

    // If already speaking something else, cancel it first.
    // If trying to speak the same text, do nothing (or maybe restart if desired)
    if (isSpeakingState) {
        if (currentSpeechTextRef.current === text) {
            console.log("[useTextToSpeech] Speak called with the same text already playing.");
            return; // Or audioRef.current.play() if paused and want to resume
        }
        console.log("[useTextToSpeech] Speech in progress. Cancelling previous before speaking new text.");
        cancel(); // This sets isSpeakingState to false
    }
    
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS: "${text.substring(0, 30)}..."`);
    setIsSpeakingState(true); // Set speaking state optimistically
    currentSpeechTextRef.current = text;

    try {
      const input: GenerateSpeechAudioInput = { text, languageCode };
      if (voiceName) input.voiceName = voiceName;
      
      const result = await generateSpeechAudio(input);
      
      // Check if this speech request is still the active one
      if (currentSpeechTextRef.current !== text) {
        console.log("[useTextToSpeech] Speech request for different text completed, ignoring.");
        // isSpeakingState should have been reset by a subsequent call's cancel() or direct cancel()
        return;
      }

      if (result.audioContentDataUri && audioRef.current) {
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        // isSpeakingState remains true, will be set to false by 'ended' or 'error' event, or by cancel()
      } else {
        throw new Error("No audio content received from backend.");
      }
    } catch (error: any) {
      console.error("[useTextToSpeech] Error calling generateSpeechAudio flow or playing audio:", error);
      toast({
        title: "Speech Synthesis Error",
        description: `Could not synthesize or play audio: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      // Ensure speaking state is false if an error occurs before or during play
      if(currentSpeechTextRef.current === text) { // Only reset if this was the active request
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancel, isSpeakingState]);


  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingState) { 
        cancel();
      }
      return newState;
    });
  }, [isSpeakingState, cancel]);

  return {
    speak,
    cancel,
    isSpeaking: isSpeakingState,
    isTTSSupported,
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking: isSpeakingState,
  };
}
