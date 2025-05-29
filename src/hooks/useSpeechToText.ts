
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export function useSpeechToText({
  onTranscript,
  onInterimTranscript,
  onListeningChange
}: UseSpeechToTextOptions) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Stable callback for onListeningChange
  const stableOnListeningChange = useCallback(onListeningChange || (() => {}), [onListeningChange]);

  // Centralized function to update isListening state and call the callback
  const updateListeningState = useCallback((newIsListeningState: boolean) => {
    setIsListening(prevIsListening => {
      if (prevIsListening !== newIsListeningState) {
        console.log(`[useSpeechToText] Broadcasting listening state change: ${newIsListeningState}`);
        stableOnListeningChange(newIsListeningState);
      }
      return newIsListeningState;
    });
  }, [stableOnListeningChange]);
  

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Initializing SpeechRecognition...");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition service started.");
      setSttError(null);
      updateListeningState(true);
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
          console.log("[useSpeechToText] onerror: Recognition aborted (often intentional via stop()).");
          // onend will handle setting listening state to false.
          updateListeningState(false); // Ensure state is false.
          return; 
        case 'language-not-supported':
          errorMessage = "The specified language is not supported.";
          break;
        case 'service-not-allowed':
          errorMessage = "Speech recognition service is not allowed by the browser.";
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      
      console.error('[useSpeechToText] onerror:', event.error, event.message);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      updateListeningState(false);
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition service ended.");
      updateListeningState(false);
    };

    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Cleanup: Aborting recognition and removing listeners.");
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); // Force stop any active recognition
        recognitionRef.current = null;
      }
       // Ensure listening state is false on cleanup if it was somehow true
      updateListeningState(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, updateListeningState]); // stableOnListeningChange is not needed as updateListeningState depends on it


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] Attempting to start listening. isSTTSupported: ${isSTTSupported}, Current isListening (hook state): ${isListening}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      console.warn("[useSpeechToText] startListening: STT not supported.");
      return;
    }

    if (recognitionRef.current && !isListening) { // Check internal isListening state
      try {
        console.log("[useSpeechToText] Calling recognition.start().");
        setSttError(null); // Clear previous errors
        recognitionRef.current.start();
        // updateListeningState(true) will be called by onstart event handler
      } catch (e: any) {
        console.error("[useSpeechToText] Error synchronously thrown by recognition.start():", e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
           userMessage = "Voice input is already active or in an invalid state. Please refresh or check permissions.";
           console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might already be active or misconfigured.");
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        updateListeningState(false); // Ensure isListening is false if start fails
      }
    } else if (isListening) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListening' state. Ignoring.");
    } else if (!recognitionRef.current) {
        console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start. Please refresh.");
        toast({ title: "Voice Input Error", description: "Speech recognition not initialized. Please refresh.", variant: "destructive" });
        updateListeningState(false);
    }
  }, [isSTTSupported, isListening, toast, updateListeningState]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] Attempting to stop listening. Current isListening (hook state): ${isListening}`);
    if (recognitionRef.current) {
        console.log("[useSpeechToText] Calling recognition.stop().");
        // Proactively update UI state. onend will confirm.
        // updateListeningState(false); // Moved to onend for more accurate state based on API events
        recognitionRef.current.stop(); // This should trigger the 'onend' event.
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
      // If recognitionRef is null, ensure our local state is also false.
      updateListeningState(false);
    }
  }, [updateListeningState]); // isListening removed as it's checked inside

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening, // This is the hook's internal state
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
