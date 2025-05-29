
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
  onListeningChange // This prop MUST be memoized by the parent component
}: UseSpeechToTextOptions) {
  const { toast } = useToast();
  const [isListeningState, setIsListeningState] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Ref to ensure callbacks use the latest isListeningState
  const isListeningStateRef = useRef(isListeningState);
  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Memoized handler to update internal state and call the prop callback
  // This internal handleListeningChange is stable because onListeningChange (prop) should be stable
  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening); // Call the memoized prop
      }
      return newIsListening;
    });
  }, [onListeningChange]); // Depends on the memoized onListeningChange prop

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] Effect: SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Effect: Initializing/Re-initializing SpeechRecognition instance.");
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
      if (event.error === 'aborted') {
        // This can happen if abort() is called, or if the service self-terminates unexpectedly
        console.warn("[useSpeechToText] onerror: Recognition aborted (event.error: 'aborted'). This might be user-initiated or due to an API issue. Message:", event.message);
        // If abort() was called programmatically, onListeningChange(false) should have already been called or will be by onend.
        // If it's an unexpected abort, ensure the state is false.
        handleListeningChange(false); 
        return; 
      }
      switch (event.error) {
        case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
        case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
        case 'not-allowed': errorMessage = "Permission to use the microphone was denied or has been revoked. Please enable it in your browser and OS settings."; break;
        case 'network': errorMessage = "A network error occurred during speech recognition. Please check your connection."; break;
        default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      console.error('[useSpeechToText] onerror:', event.error, event.message, "Full event:", event);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false);
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition service actually ended. Current isListeningStateRef:", isListeningStateRef.current);
      // This is the definitive place to set listening to false when the service truly stops.
      // It handles cases where stop is called, or if recognition stops by itself (e.g. long silence, though continuous is true).
      handleListeningChange(false);
    };

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Effect Cleanup: Aborting recognition and removing listeners. Current isListeningState from ref:", isListeningStateRef.current);
        // Detach all event handlers to prevent memory leaks or calls on unmounted components
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        
        // Only abort if we believe it's still active or to ensure it's cleaned up.
        // The onend or onerror should ideally handle the state, but this is a safeguard.
        try {
            if(isListeningStateRef.current) { // Check ref for most current state before aborting
                console.log("[useSpeechToText] Effect Cleanup: Calling recognition.abort() as isListeningStateRef.current is true.");
                recognitionRef.current.abort();
            } else {
                console.log("[useSpeechToText] Effect Cleanup: Skipping recognition.abort() as isListeningStateRef.current is false.");
            }
        } catch (e: any) {
            console.warn("[useSpeechToText] Effect Cleanup: Error during recognition.abort():", e.name, e.message);
        }
        recognitionRef.current = null; // Release the instance
      } else {
        console.log("[useSpeechToText] Effect Cleanup: recognitionRef.current is already null.");
      }
    };
  // IMPORTANT: onListeningChange, onTranscript, onInterimTranscript props MUST be memoized by the parent.
  // toast is stable from its hook. isSTTSupported changes only on mount.
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange, onListeningChange]);


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current isListeningState from ref: ${isListeningStateRef.current}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }
    
    if (!recognitionRef.current) {
      console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start. This might happen if effect cleanup ran prematurely or STT not supported/initialized.");
      toast({ title: "Voice Input Error", description: "Speech recognition service not ready. Please try again or refresh.", variant: "destructive" });
      handleListeningChange(false); // Ensure UI reflects not listening
      return;
    }

    setSttError(null); 

    if (!isListeningStateRef.current) { // Check ref to avoid race conditions
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
        // isListeningState will be set to true by the 'onstart' event handler
      } catch (e: any) {
        console.error("[useSpeechToText] Error SYNCHRONOUSLY thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser/OS settings.";
        else if (e.name === 'InvalidStateError') {
            console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might be in an unexpected state. Aborting to reset if possible.");
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (abortErr) { console.warn("Error aborting on InvalidStateError:", abortErr); }
            }
            userMessage = "Voice input is in an unexpected state. It has been reset. Please try clicking the mic again.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false);
      }
    } else {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState' (according to ref). Ignoring call to start().");
    }
  }, [isSTTSupported, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListeningState from ref: ${isListeningStateRef.current}`);
    if (!recognitionRef.current) {
      console.warn("[useSpeechToText] stopListening: recognitionRef.current is null. Cannot stop. Ensuring isListening state is false.");
      handleListeningChange(false);
      return;
    }

    if (isListeningStateRef.current) { // Only try to abort if we think it's listening
      try {
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort().");
        recognitionRef.current.abort(); // abort() is more forceful. It should trigger 'onerror' with 'aborted' or 'onend'.
        // We don't proactively set isListeningState to false here anymore,
        // instead, we rely on the 'onend' or 'onerror' (for 'aborted' case) event handlers to do that.
        // This makes the state reflect the true state of the recognition service.
        // However, if those events don't fire, the state will remain true.
        // Adding a proactive call here for immediate UI feedback and as a safeguard
        // handleListeningChange(false); // This provides quicker UI feedback.
      } catch (e: any) {
        console.error("[useSpeechToText] Error during recognition.abort():", e.name, e.message);
        // If abort throws, force state to false as a recovery attempt.
        handleListeningChange(false);
      }
    } else {
      console.warn("[useSpeechToText] stopListening: Called but not in 'isListeningState' (according to ref). Recognition might have already stopped or failed to start. Forcing listening state to false.");
      handleListeningChange(false); 
    }
  }, [handleListeningChange]);

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


    