
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseTextToSpeechReturn {
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isTTSSupported: boolean;
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  isTTSSpeaking: boolean; // Alias for isSpeaking, can be used if more explicit name preferred in consumer
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (isTTSSupported) {
      synthRef.current = window.speechSynthesis;
    } else {
      console.warn("Text-to-Speech not supported by this browser.");
    }
  }, [isTTSSupported]);

  const cancel = useCallback(() => {
    if (synthRef.current && isSpeakingState) {
      console.log("[useTextToSpeech] Cancelling speech.");
      synthRef.current.cancel();
      // onend will set isSpeakingState to false
    }
  }, [isSpeakingState]);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isTTSSupported || !synthRef.current || !isTTSEnabled) {
      if (isTTSEnabled && !isTTSSupported) {
         console.warn("[useTextToSpeech] Speak called but TTS not supported.");
      }
      return;
    }

    if (isSpeakingState) {
      // Cancel previous speech before starting new one
      cancel();
    }
    
    console.log(`[useTextToSpeech] Attempting to speak: "${text.substring(0,30)}..."`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      console.log("[useTextToSpeech] Speech started.");
      setIsSpeakingState(true);
    };

    utterance.onend = () => {
      console.log("[useTextToSpeech] Speech ended.");
      setIsSpeakingState(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("[useTextToSpeech] SpeechSynthesisUtterance.onerror", event);
      toast({
        title: "Speech Error",
        description: `Could not play audio: ${event.error}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      utteranceRef.current = null;
    };
    
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);

  }, [isTTSSupported, isTTSEnabled, cancel, toast, isSpeakingState]);

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingState) { // If disabling TTS and it's currently speaking
        cancel();
      }
      toast({
        title: "Text-to-Speech",
        description: newState ? "Enabled" : "Disabled",
      });
      return newState;
    });
  }, [isSpeakingState, cancel, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current && isSpeakingState) {
        console.log("[useTextToSpeech] Unmounting: Cancelling speech.");
        synthRef.current.cancel();
      }
    };
  }, [isSpeakingState]);

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
