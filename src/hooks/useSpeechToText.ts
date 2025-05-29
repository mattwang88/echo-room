
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

export function useSpeechToText({
  onTranscript,
  onInterimTranscript,
  onListeningChange
}: UseSpeechToTextOptions) {
  const { toast } = useToast();
  const [isListeningState, setIsListeningState] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening);
      }
      return newIsListening;
    });
  }, [onListeningChange]);

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] Effect: SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Effect: Initializing SpeechRecognition instance.");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null);
      handleListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // console.log("[useSpeechToText] onresult: Received result event.");
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentInterim.trim() && onInterimTranscript) {
        // console.log("[useSpeechToText] onresult: Interim transcript:", currentInterim);
        onInterimTranscript(currentInterim);
      }

      if (finalTranscriptSegment.trim()) {
        console.log("[useSpeechToText] onresult: Final transcript segment:", finalTranscriptSegment.trim());
        onTranscript(finalTranscriptSegment.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "An unknown error occurred with speech recognition.";
      switch (event.error) {
        case 'no-speech': errorMessage = "No speech was detected."; break;
        case 'audio-capture': errorMessage = "Microphone problem. Ensure it's connected and enabled."; break;
        case 'not-allowed': errorMessage = "Permission to use microphone denied. Please enable in browser settings."; break;
        case 'network': errorMessage = "Network error during speech recognition."; break;
        case 'aborted': console.log("[useSpeechToText] onerror: Recognition aborted (e.g. by stop() or API error)."); handleListeningChange(false); return;
        default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      console.error('[useSpeechToText] onerror:', event.error, event.message, "Full event:", event);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false);
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition service actually ended.");
      handleListeningChange(false);
    };

    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Effect Cleanup: Aborting recognition and removing listeners. Current isListeningState:", isListeningStateRef.current);
        // Prevent calling abort if it's not actually listening or already stopping.
        // The onend event should handle setting isListeningState to false reliably.
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); // Force stop
        recognitionRef.current = null;
      }
      // handleListeningChange(false); // Let onend handle this; redundant if abort triggers onend.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, onListeningChange]); // onListeningChange is now expected to be stable

  // Keep a ref to isListeningState to avoid stale closures in cleanup
  const isListeningStateRef = useRef(isListeningState);
  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current isListeningState: ${isListeningStateRef.current}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }

    if (recognitionRef.current && !isListeningStateRef.current) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        setSttError(null);
        recognitionRef.current.start();
        // isListeningState will be set to true by the 'onstart' event handler
      } catch (e: any) {
        console.error("[useSpeechToText] Error synchronously thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser settings.";
        else if (e.name === 'InvalidStateError') {
            console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might already be active or misconfigured. Forcing abort.");
            recognitionRef.current.abort(); // Attempt to reset its state
            userMessage = "Voice input is in an unexpected state. Retrying may work, or refresh the page.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false);
      }
    } else if (isListeningStateRef.current) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState'. Ignoring.");
    } else if (!recognitionRef.current) {
        console.error("[useSpeechToText] startListening: recognitionRef.current is null. Speech recognition not initialized. Please refresh.");
        toast({ title: "Voice Input Error", description: "Speech recognition not initialized. Please refresh the page.", variant: "destructive" });
        handleListeningChange(false);
    }
  }, [isSTTSupported, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListeningState: ${isListeningStateRef.current}`);
    if (recognitionRef.current && isListeningStateRef.current) {
      try {
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.stop().");
        recognitionRef.current.stop(); // This should trigger the 'onend' event.
        // handleListeningChange(false); // Proactively set for faster UI, onend will confirm.
      } catch (e: any) {
        console.error("[useSpeechToText] Error during recognition.stop():", e.name, e.message);
        // If stop fails, try abort as a fallback
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
        handleListeningChange(false); // Ensure state is false
      }
    } else if (!isListeningStateRef.current) {
        console.warn("[useSpeechToText] stopListening: Called but not in 'isListeningState'.");
    } else if (!recognitionRef.current) {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
      handleListeningChange(false);
    }
  }, [handleListeningChange]);

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening: isListeningState,
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
