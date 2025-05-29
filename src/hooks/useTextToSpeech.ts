
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
  isTTSSpeaking: boolean; 
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean | undefined>();
  
  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (isTTSSupported) {
      synthRef.current = window.speechSynthesis;
      // Ensure pending utterances are cleared if synth becomes available or on re-initialization (though deps are stable)
      if(synthRef.current.pending || synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    } else {
      console.warn("[useTextToSpeech] Text-to-Speech not supported by this browser.");
    }
  }, [isTTSSupported]);

  const cancel = useCallback(() => {
    if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
      console.log("[useTextToSpeech] Cancelling speech.");
      synthRef.current.cancel(); 
      // Note: onend will typically handle setIsSpeakingState(false)
    }
    // If cancel is called and onend doesn't fire (e.g. no utterance was active), ensure state is false
    if (isSpeakingState) setIsSpeakingState(false); 
  }, [isSpeakingState]);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isTTSSupported || !synthRef.current || !isTTSEnabled) {
      if (isTTSEnabled && !isTTSSupported) {
         console.warn("[useTextToSpeech] Speak called but TTS not supported or not enabled.");
      }
      return;
    }

    // Cancel any currently speaking or pending utterances before starting a new one.
    if (synthRef.current.speaking || synthRef.current.pending) {
        console.log("[useTextToSpeech] Cancelling previous speech before speaking new text.");
        synthRef.current.cancel(); 
        // onend of the cancelled utterance should set isSpeakingState to false
    }
    
    console.log(`[useTextToSpeech] Attempting to speak: "${text.substring(0,30)}..."`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      console.log("[useTextToSpeech] Speech onstart event.");
      setIsSpeakingState(true);
    };

    utterance.onend = () => {
      console.log("[useTextToSpeech] Speech onend event.");
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
    try {
      synthRef.current.speak(utterance);
    } catch (error) {
      console.error("[useTextToSpeech] Error calling synth.speak:", error);
      toast({
        title: "Speech Error",
        description: "Failed to initiate speech synthesis.",
        variant: "destructive",
      });
      setIsSpeakingState(false);
    }

  }, [isTTSSupported, isTTSEnabled, toast, setIsSpeakingState]); // Removed cancel from deps to avoid cycle, added setIsSpeakingState

  // Effect to show toast when isTTSEnabled changes, after the initial render
  useEffect(() => {
    if (previousIsTTSEnabledRef.current !== undefined && previousIsTTSEnabledRef.current !== isTTSEnabled) {
      toast({
        title: "Text-to-Speech",
        description: isTTSEnabled ? "Enabled" : "Disabled",
      });
    }
    previousIsTTSEnabledRef.current = isTTSEnabled;
  }, [isTTSEnabled, toast]);

  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingState) { 
        cancel();
      }
      // Toast call moved to useEffect
      return newState;
    });
  }, [isSpeakingState, cancel]); // Removed toast from deps as it's handled in useEffect

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
        console.log("[useTextToSpeech] Unmounting: Cancelling speech.");
        synthRef.current.cancel();
      }
    };
  }, []); // Empty dependency array for unmount cleanup

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
