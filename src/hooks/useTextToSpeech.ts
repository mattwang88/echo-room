
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
  isTTSSpeaking: boolean; // Added to match useMeetingSimulation's expectation
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false); // Default to false
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean>(isTTSEnabled); // Initialize with current state

  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (isTTSSupported) {
      synthRef.current = window.speechSynthesis;
      // Ensure any lingering speech is cancelled on mount or if synth becomes available
      if (synthRef.current && (synthRef.current.pending || synthRef.current.speaking)) {
        console.log("[useTextToSpeech] Cancelling speech on mount/synth ready.");
        synthRef.current.cancel();
        setIsSpeakingState(false); // Ensure state consistency
      }
    } else {
      console.warn("[useTextToSpeech] Text-to-Speech not supported by this browser.");
      if (isTTSEnabled) setIsTTSEnabled(false); // Disable if not supported
    }
  }, [isTTSSupported, isTTSEnabled]);

  const cancel = useCallback(() => {
    if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
      console.log("[useTextToSpeech] Cancelling speech via cancel().");
      synthRef.current.cancel(); // This should trigger onend eventually.
    }
    // We explicitly set isSpeakingState to false here for immediate UI feedback,
    // as onend might be delayed or not fire if cancel() is called abruptly.
    if (isSpeakingState) setIsSpeakingState(false);
    utteranceRef.current = null; // Clear the ref
  }, [isSpeakingState]);


  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isTTSSupported || !synthRef.current || !isTTSEnabled) {
      if (isTTSEnabled && !isTTSSupported) {
        console.warn("[useTextToSpeech] Speak called but TTS not supported.");
      } else if (!isTTSEnabled) {
        console.log("[useTextToSpeech] Speak called but TTS is not enabled.");
      }
      return;
    }

    // If already speaking, cancel the current utterance before starting a new one.
    if (synthRef.current.speaking || synthRef.current.pending) {
      console.log("[useTextToSpeech] Speech in progress. Cancelling previous before speaking new text.");
      cancel(); // Use our cancel function which also updates state
    }

    console.log(`[useTextToSpeech] Attempting to speak: "${text.substring(0, 30)}..."`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1; // Ensure volume is set

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
      } else if (event && typeof event === 'object' && Object.keys(event).length === 0 && event.constructor === Object) {
        detailedErrorMessage = "Speech synthesis failed with an empty/uninformative error event from the browser. This may indicate a problem with your browser's or OS's speech engine.";
      } else {
        detailedErrorMessage = "Speech synthesis failed. Please check browser console for more details if available, or review browser/OS speech settings.";
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
      setIsSpeakingState(false); // Ensure state is false on sync error
    }
  }, [isTTSSupported, isTTSEnabled, toast, cancel]); // Added cancel to dependencies

  useEffect(() => {
    // Only show toast if isTTSEnabled has actually changed from its previous state
    // and previousIsTTSEnabledRef.current is not undefined (to skip initial mount).
    if (previousIsTTSEnabledRef.current !== undefined && previousIsTTSEnabledRef.current !== isTTSEnabled) {
      toast({
        title: "Text-to-Speech",
        description: isTTSEnabled ? "Enabled" : "Disabled",
      });
    }
    previousIsTTSEnabledRef.current = isTTSEnabled; // Update the ref *after* checking
  }, [isTTSEnabled, toast]);


  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeakingState) { // If disabling and currently speaking
        cancel();
      }
      return newState;
    });
  }, [isSpeakingState, cancel]);

  // Cleanup effect to cancel speech if the component unmounts while speaking
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
    isTTSSpeaking: isSpeakingState, // Expose isTTSSpeaking based on isSpeakingState
  };
}
