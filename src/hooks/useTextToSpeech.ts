
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
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // Default to true
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const previousIsTTSEnabledRef = useRef<boolean | undefined>();


  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (isTTSSupported) {
      synthRef.current = window.speechSynthesis;
      // Clean up any speech that might be ongoing if the page was reloaded
      // or if the hook is re-initialized.
      if (synthRef.current && (synthRef.current.pending || synthRef.current.speaking)) {
        console.log("[useTextToSpeech] Effect: Cancelling speech on mount/synth ready if already speaking/pending.");
        synthRef.current.cancel();
        setIsSpeakingState(false); // Ensure state is reset
      }
    } else {
      console.warn("[useTextToSpeech] Effect: Text-to-Speech not supported by this browser.");
      // If TTS is not supported, it should not be enabled.
      if (isTTSEnabled) setIsTTSEnabled(false); 
    }
  // isTTSEnabled should not be a dependency here, as this effect is about initial setup.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTTSSupported]);

  const cancel = useCallback(() => {
    if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
      console.log("[useTextToSpeech] Cancelling speech via cancel().");
      synthRef.current.cancel(); // This will trigger onend or onerror (with 'canceled') for the current utterance
    }
    // It's important to set isSpeakingState to false here,
    // as the onend/onerror might not fire immediately or reliably across all browsers
    // after a programmatic cancel.
    if (isSpeakingState) setIsSpeakingState(false);
    utteranceRef.current = null; // Clear the reference to the utterance
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

    // If speech is already in progress, cancel it before starting new speech.
    // This is important to prevent overlapping audio and to ensure fresh state.
    if (synthRef.current.speaking || synthRef.current.pending) {
      console.log("[useTextToSpeech] Speech in progress. Cancelling previous before speaking new text.");
      cancel(); // This should ideally reset isSpeakingState to false
    }

    console.log(`[useTextToSpeech] Attempting to speak: "${text.substring(0, 30)}..."`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1; // Consider making rate adjustable
    utterance.volume = 1; // Ensure volume is max

    utterance.onstart = () => {
      console.log("[useTextToSpeech] Speech onstart event.");
      setIsSpeakingState(true);
    };

    utterance.onend = () => {
      console.log("[useTextToSpeech] Speech onend event.");
      // Check if this utterance is still the active one, to prevent old onend events from interfering
      if (utteranceRef.current === utterance) {
        setIsSpeakingState(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // Log the raw event object to see its structure if it's behaving unexpectedly
      console.warn("[useTextToSpeech] Raw SpeechSynthesisUtterance.onerror event object:", event);

      // If the error is 'canceled' or 'interrupted', it's often due to our own programmatic cancel().
      // In this case, we don't want to show a user-facing error toast.
      if (event.error === 'canceled' || event.error === 'interrupted') {
        console.log(`[useTextToSpeech] Speech utterance was '${event.error}'. This is often due to cancellation of previous speech. Not showing user-facing error toast.`);
        // Ensure state is consistent if this utterance was the active one
        if (utteranceRef.current === utterance) {
          setIsSpeakingState(false);
          utteranceRef.current = null;
        }
        return; 
      }

      let detailedErrorMessage = "An unknown error occurred with speech synthesis.";
      if (event && event.error) {
        detailedErrorMessage = `Speech synthesis error code: ${event.error}.`;
      } else if (event && typeof event === 'object' && Object.keys(event).length === 0 && event.constructor === Object) {
        // Handle cases where the event object might be empty
        detailedErrorMessage = "Speech synthesis failed with an empty/uninformative error event from the browser. This may indicate a problem with your browser's or OS's speech engine.";
      } else {
        detailedErrorMessage = "Speech synthesis failed. Please check browser console for more details if available, or review browser/OS speech settings.";
      }

      toast({
        title: "Speech Error",
        description: `Could not play audio. ${detailedErrorMessage}`,
        variant: "destructive",
      });
      
      if (utteranceRef.current === utterance) {
        setIsSpeakingState(false);
        utteranceRef.current = null;
      }
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
      setIsSpeakingState(false); // Ensure state is false if speak() call itself fails
    }
  }, [isTTSSupported, isTTSEnabled, toast, cancel]); // cancel is a dependency of speak

  useEffect(() => {
    // This effect is only for showing a toast when TTS is toggled by the user.
    // It should not run on initial mount if isTTSEnabled is already true.
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
        // If disabling TTS while it's speaking, cancel the speech.
        cancel();
      }
      return newState;
    });
  }, [isSpeakingState, cancel]); // cancel is a dependency here

  // Cleanup effect to cancel speech if the component unmounts while speaking.
  useEffect(() => {
    return () => {
      if (synthRef.current && (synthRef.current.speaking || synthRef.current.pending)) {
        console.log("[useTextToSpeech] Unmounting: Cancelling speech.");
        // Don't call the `cancel` callback here as it might have dependencies
        // on state that is being unmounted. Directly use synth.cancel().
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
    isTTSSpeaking: isSpeakingState, // Provide isTTSSpeaking for clarity in consuming components
  };
}

