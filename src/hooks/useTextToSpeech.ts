
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
      if (synthRef.current.pending || synthRef.current.speaking) {
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
    }
    if (isSpeakingState) setIsSpeakingState(false);
  }, [isSpeakingState]);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isTTSSupported || !synthRef.current || !isTTSEnabled) {
      if (isTTSEnabled && !isTTSSupported) {
        console.warn("[useTextToSpeech] Speak called but TTS not supported or not enabled.");
      }
      return;
    }

    if (synthRef.current.speaking || synthRef.current.pending) {
      console.log("[useTextToSpeech] Cancelling previous speech before speaking new text.");
      synthRef.current.cancel();
    }

    console.log(`[useTextToSpeech] Attempting to speak: "${text.substring(0, 30)}..."`);
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

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // Log the raw event object to see its structure if it's behaving unexpectedly
      console.error("[useTextToSpeech] Raw SpeechSynthesisUtterance.onerror event object:", event);

      let detailedErrorMessage = "An unknown error occurred with speech synthesis.";
      if (event && event.error) {
        detailedErrorMessage = `Speech synthesis error code: ${event.error}.`;
      } else {
        // This case handles if event.error is undefined, which might happen if the 'event' object is empty or malformed.
        detailedErrorMessage = "Speech synthesis failed. Please check browser console for more details if available.";
      }

      toast({
        title: "Speech Error",
        description: `Could not play audio. ${detailedErrorMessage}`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    try {
      synthRef.current.speak(utterance);
    } catch (error: any) {
      console.error("[useTextToSpeech] Error calling synth.speak:", error);
      toast({
        title: "Speech Error",
        description: `Failed to initiate speech synthesis: ${error.message || 'Unknown reason'}.`,
        variant: "destructive",
      });
      setIsSpeakingState(false);
    }
  }, [isTTSSupported, isTTSEnabled, toast, setIsSpeakingState]);

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
      return newState;
    });
  }, [isSpeakingState, cancel]);

  useEffect(() => {
    return () => {
      if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
        console.log("[useTextToSpeech] Unmounting: Cancelling speech.");
        synthRef.current.cancel();
      }
    };
  }, []);

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
