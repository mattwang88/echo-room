
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

  const stableOnListeningChange = useCallback(onListeningChange || (() => {}), [onListeningChange]);

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(prevIsListening => {
      if (prevIsListening !== listening) {
        console.log(`[useSpeechToText] handleListeningChange: actual state change from ${prevIsListening} to ${listening}`);
        stableOnListeningChange(listening);
      }
      return listening;
    });
  }, [stableOnListeningChange]);

  useEffect(() => {
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] Effect: SpeechRecognition API not supported by this browser.");
      return;
    }

    console.log("[useSpeechToText] Effect: Initializing SpeechRecognition...");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening even after a pause in speech
    recognition.interimResults = true; // Get interim results as the user speaks
    recognition.lang = 'en-US';

    console.log("[useSpeechToText] Effect: SpeechRecognition instance created and configured.");

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition actually started.");
      setSttError(null); // Clear any previous errors on successful start
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
          errorMessage = "A network error occurred during speech recognition. Please check your connection.";
          break;
        case 'aborted':
          // This can happen if stopListening() is called, or if the browser aborts it for other reasons.
          // onend will handle setting listening state to false.
          console.log("[useSpeechToText] onerror: Speech recognition aborted (event.error: 'aborted').");
          // Do not toast for 'aborted' as it's often intentional.
          handleListeningChange(false); // Ensure state is false
          return; 
        case 'language-not-supported':
          errorMessage = "The specified language is not supported by the speech recognition service.";
          break;
        case 'service-not-allowed':
          errorMessage = "The speech recognition service is not allowed. This might be due to browser policies or settings.";
          break;
        case 'bad-grammar':
          errorMessage = "There was an error in the speech recognition grammar.";
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
      }
      
      console.error('[useSpeechToText] onerror: Speech recognition error:', event.error, event.message);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false); // Ensure listening state is false on error
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition actually ended.");
      // This is called when recognition stops, either by stop(), an error, or naturally.
      handleListeningChange(false);
    };

    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Cleanup: Aborting recognition and removing listeners.");
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); // Force stop
        recognitionRef.current = null;
      }
      setIsListening(currentIsListening => {
        if (currentIsListening) {
          stableOnListeningChange(false); 
        }
        return false;
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange, stableOnListeningChange]);


  const startListening = useCallback(() => {
    console.log("[useSpeechToText] startListening called. Current isListening state (from hook):", isListening);
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      setSttError("STT not supported by browser.");
      console.warn("[useSpeechToText] startListening: STT not supported.");
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        setSttError(null); // Clear previous errors
        // No need to call handleListeningChange(true) here; onstart will handle it.
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("[useSpeechToText] startListening: Error synchronously thrown by recognition.start():", e.name, e.message, e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
           // This can happen if start() is called while it's already started or starting.
           // The 'isListening' check should prevent this, but it's good to handle.
           userMessage = "Voice input is already active or in an invalid state. Please try restarting your browser or check microphone permissions.";
           console.warn("[useSpeechToText] startListening: InvalidStateError suggests recognition was already active or misconfigured.");
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false); // Ensure isListening is false if start fails
      }
    } else if (isListening) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListening' state. Ignoring.");
    } else if (!recognitionRef.current) {
        console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start.");
        toast({ title: "Voice Input Error", description: "Speech recognition component not initialized. Please refresh.", variant: "destructive" });
        handleListeningChange(false);
    }
  }, [isSTTSupported, isListening, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListening state (from hook): ${isListening}`);
    if (recognitionRef.current) {
        // Always try to stop if recognitionRef exists, even if isListening state seems false,
        // as the API might be in an active state that the hook's state doesn't reflect.
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.stop().");
        // Proactively update UI state. onend will confirm.
        if(isListening) { // Only call handleListeningChange if we believe we are listening.
            handleListeningChange(false); 
        }
        recognitionRef.current.stop(); // This should trigger the 'onend' event.
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
      // If recognitionRef is null, ensure our local state is also false.
      if(isListening) {
        handleListeningChange(false);
      }
    }
  }, [isListening, handleListeningChange]);

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
