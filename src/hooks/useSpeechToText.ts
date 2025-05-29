
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void; // Required callback
}

export function useSpeechToText({
  onTranscript,
  onInterimTranscript,
  onListeningChange
}: UseSpeechToTextOptions) {
  const { toast } = useToast();
  const [isListeningState, setIsListeningState] = useState(false); // Internal state
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Stable callback for notifying parent about listening state changes
  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] handleListeningChange: actual state change from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening); // Notify parent
      }
      return newIsListening;
    });
  }, [onListeningChange]);

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Initializing SpeechRecognition instance.");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening even after pauses
    recognition.interimResults = true; // Get results as they are being processed
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition service started.");
      setSttError(null);
      handleListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log("[useSpeechToText] onresult: Received result event.");
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
        console.log("[useSpeechToText] onresult: Interim transcript:", currentInterim);
        onInterimTranscript(currentInterim);
      }

      if (finalTranscriptSegment.trim()) {
        console.log("[useSpeechToText] onresult: Final transcript segment:", finalTranscriptSegment.trim());
        onTranscript(finalTranscriptSegment.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "An unknown error occurred with speech recognition.";
      // More detailed error messages
      switch (event.error) {
        case 'no-speech':
          errorMessage = "No speech was detected. Please try speaking again.";
          break;
        case 'audio-capture':
          errorMessage = "Microphone problem. Ensure it's connected, enabled, and not in use by another application.";
          break;
        case 'not-allowed':
          errorMessage = "Permission to use the microphone was denied or not granted. Please enable it in your browser's site settings.";
          break;
        case 'network':
          errorMessage = "A network error occurred. Please check your connection.";
          break;
        case 'aborted':
          console.log("[useSpeechToText] onerror: Recognition aborted (often intentional via stop() or API error).");
          // onend will handle setting listening state to false.
          handleListeningChange(false); // Ensure state is false on abort.
          return; // Don't toast for aborted.
        case 'language-not-supported':
          errorMessage = "The specified language is not supported.";
          break;
        case 'service-not-allowed':
          errorMessage = "Speech recognition service is not allowed by the browser (e.g., due to policy).";
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      console.error('[useSpeechToText] onerror:', event.error, event.message, "Full event:", event);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false);
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition service ended.");
      handleListeningChange(false);
    };

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Cleanup: Aborting recognition and removing listeners.");
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); // More forceful stop
        recognitionRef.current = null;
      }
      // Ensure listening state is false on unmount if it was somehow true
      handleListeningChange(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]); // handleListeningChange is stable

  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current internal isListeningState: ${isListeningState}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      console.warn("[useSpeechToText] startListening: STT not supported.");
      return;
    }

    if (recognitionRef.current && !isListeningState) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        setSttError(null); // Clear previous errors
        recognitionRef.current.start();
        // isListeningState will be set to true by the 'onstart' event handler via handleListeningChange
      } catch (e: any) {
        console.error("[useSpeechToText] Error synchronously thrown by recognition.start():", e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
           // This can happen if start() is called when recognition is already active or in a bad state
           console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might already be active or misconfigured. Attempting to abort and ensure clean state.");
           recognitionRef.current.abort(); // Try to reset
           userMessage = "Voice input is in an unexpected state. Please try again.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false); // Ensure isListening is false if start fails
      }
    } else if (isListeningState) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState'. Ignoring.");
    } else if (!recognitionRef.current) {
        console.error("[useSpeechToText] startListening: recognitionRef.current is null. Speech recognition not initialized. Please refresh.");
        toast({ title: "Voice Input Error", description: "Speech recognition not initialized. Please refresh the page.", variant: "destructive" });
        handleListeningChange(false); // Ensure state consistency
    }
  }, [isSTTSupported, isListeningState, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current internal isListeningState: ${isListeningState}`);
    if (recognitionRef.current) {
        // Proactively update state for faster UI feedback if needed,
        // but onend is the more reliable source of truth for actual stop.
        // handleListeningChange(false); // Let onend handle this for consistency with other stop reasons
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.stop().");
        recognitionRef.current.stop(); // This should trigger the 'onend' event.
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
      handleListeningChange(false); // Ensure state is false if recognition object is missing
    }
  }, [isListeningState, handleListeningChange]);

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening: isListeningState, // Expose the internal state
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
