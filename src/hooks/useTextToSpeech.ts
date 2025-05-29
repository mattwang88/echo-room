
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
  const currentSpeechTextRef = useRef<string | null>(null);

  const isTTSSupported = true; 

  useEffect(() => {
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
        audioElement.src = ""; 
      }
      audioRef.current = null;
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
      audioRef.current.src = ""; 
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

    if (isSpeakingState) {
        if (currentSpeechTextRef.current === text) {
            console.log("[useTextToSpeech] Speak called with the same text already playing/requested.");
            return; 
        }
        console.log("[useTextToSpeech] Speech in progress. Cancelling previous before speaking new text.");
        cancel(); 
    }
    
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${text.substring(0, 50)}..."`); // Verification log
    setIsSpeakingState(true); 
    currentSpeechTextRef.current = text;

    try {
      const input: GenerateSpeechAudioInput = { text, languageCode };
      if (voiceName) input.voiceName = voiceName;
      
      const result = await generateSpeechAudio(input);
      
      if (currentSpeechTextRef.current !== text) {
        console.log("[useTextToSpeech] Speech request for different text completed, ignoring old result.");
        return;
      }

      if (result.audioContentDataUri && audioRef.current) {
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
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
      if(currentSpeechTextRef.current === text) { 
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
