
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void; // Callback for when listening state changes
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

  // Ref to keep track of the latest isListeningState for callbacks
  const isListeningStateRef = useRef(isListeningState);
  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Memoized handler to update internal state and call the prop callback
  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      // Only log and call prop if state actually changes to avoid redundant calls/logs
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        if (onListeningChange) { // Check if the prop is provided
            onListeningChange(newIsListening);
        }
      }
      return newIsListening;
    });
  }, [onListeningChange]); // Dependency: onListeningChange prop

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] Effect: SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Effect: Initializing SpeechRecognition instance.");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening even after a pause in speech
    recognition.interimResults = true; // Get results as they are being processed
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null); // Clear previous errors
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
      // Specific error handling
      if (event.error === 'aborted') {
        console.log("[useSpeechToText] onerror: Recognition aborted (e.g., by stopListening or API error).");
        // No toast needed for user-initiated abort or programmatic abort.
        handleListeningChange(false); // Ensure state is false
        return; // Don't show a generic error toast for abort.
      }
      switch (event.error) {
        case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
        case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
        case 'not-allowed': errorMessage = "Permission to use the microphone was denied. Please enable it in your browser settings."; break;
        case 'network': errorMessage = "A network error occurred during speech recognition. Please check your connection."; break;
        default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      console.error('[useSpeechToText] onerror:', event.error, event.message, "Full event:", event);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false); // Ensure listening state is false on error
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition service actually ended.");
      handleListeningChange(false); // This is the primary place to set listening to false
    };

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Effect Cleanup: Aborting recognition and removing listeners. Current isListeningState:", isListeningStateRef.current);
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        // Only abort if the instance exists and we believe it might be active.
        // The onend or onerror should handle the state, but this is a safeguard.
        if (isListeningStateRef.current) {
           recognitionRef.current.abort();
        }
        recognitionRef.current = null;
      }
    };
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]); // handleListeningChange is stable if onListeningChange prop is stable


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current isListeningState from ref: ${isListeningStateRef.current}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }
    
    setSttError(null); // Clear previous errors before trying to start

    if (recognitionRef.current && !isListeningStateRef.current) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
        // isListeningState will be set to true by the 'onstart' event handler
      } catch (e: any) {
        console.error("[useSpeechToText] Error synchronously thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser settings.";
        else if (e.name === 'InvalidStateError') {
            console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might already be active or misconfigured. Attempting abort to reset.");
            if (recognitionRef.current) recognitionRef.current.abort(); // Attempt to reset its state
            userMessage = "Voice input is in an unexpected state. Please try clicking the mic again.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false); // Ensure state is false if start fails
      }
    } else if (isListeningStateRef.current) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState' (according to ref). Ignoring.");
    } else if (!recognitionRef.current) {
        console.error("[useSpeechToText] startListening: recognitionRef.current is null. Speech recognition not initialized. This might happen if STT is not supported or after component unmount. Please refresh.");
        toast({ title: "Voice Input Error", description: "Speech recognition not initialized. Please refresh the page or ensure your browser is supported.", variant: "destructive" });
        handleListeningChange(false); // Ensure UI reflects not listening
    }
  }, [isSTTSupported, toast, handleListeningChange]); // handleListeningChange is stable

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListeningState from ref: ${isListeningStateRef.current}`);
    if (recognitionRef.current) {
      if (isListeningStateRef.current) { // Check if it *thinks* it's listening
        try {
          console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort().");
          recognitionRef.current.abort(); // Use abort() for a more forceful stop
          // The 'onerror' with 'aborted' or 'onend' handler should set isListeningState to false.
        } catch (e: any) {
          console.error("[useSpeechToText] Error during recognition.abort():", e.name, e.message);
          handleListeningChange(false); // Ensure state is false if abort() throws
        }
      } else {
        console.warn("[useSpeechToText] stopListening: Called but not in 'isListeningState' (according to ref). Recognition might have already stopped or failed to start.");
        // If we think we are not listening, but user clicks stop, ensure the state is truly false.
        handleListeningChange(false); 
      }
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
      handleListeningChange(false); // Ensure UI reflects not listening
    }
  }, [handleListeningChange]); // handleListeningChange is stable

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening: isListeningState, // The reactive state for UI
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
