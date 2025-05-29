
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

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening);
    if (onListeningChange) {
      onListeningChange(listening);
    }
  }, [onListeningChange]);

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
      console.log("[useSpeechToText] onstart: Recognition actually started.");
      setSttError(null); // Clear previous errors
      handleListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log("[useSpeechToText] onresult: Received result event.", event);
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentInterim.trim()) {
        console.log("[useSpeechToText] onresult: Interim transcript:", currentInterim);
        if (onInterimTranscript) {
          onInterimTranscript(currentInterim);
        }
      }

      if (finalTranscriptSegment.trim()) {
        console.log("[useSpeechToText] onresult: Final transcript segment:", finalTranscriptSegment);
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
          console.log("[useSpeechToText] onerror: Speech recognition aborted by user or system.");
          // Aborted often also triggers 'onend', so state change will be handled there.
          // No need to toast for 'aborted' usually.
          break; // Don't toast for aborted, it's often user-initiated (e.g. calling stop)
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
      if (event.error !== 'aborted') { // Only toast for actual errors, not user-aborts
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      handleListeningChange(false); // Ensure listening state is false on any error
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition actually ended.");
      handleListeningChange(false); // This is the primary place to set listening to false
    };

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Cleanup: Stopping recognition and removing listeners.");
        recognitionRef.current.abort(); // Use abort for forceful stop during cleanup
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
    };
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]);

  const startListening = useCallback(() => {
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
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("[useSpeechToText] startListening: Error calling recognition.start():", e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError' && isListening) {
           console.warn("[useSpeechToText] startListening: recognition.start() called while already listening (InvalidStateError). State out of sync?");
           // This case should ideally not happen if isListening state is correct.
           // No toast here, as it might be a quick race condition. onstart should eventually set it.
        } else if (e.name === 'InvalidStateError') {
           console.warn("[useSpeechToText] startListening: recognition.start() called in invalid state (e.g. already started or stopped).");
           toast({ title: "Voice Input Error", description: "Could not start voice input due to an unexpected state. Refreshing might help.", variant: "destructive" });
        } else {
           toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        }
        setSttError(userMessage);
        handleListeningChange(false); // Ensure isListening is false if start fails
      }
    } else if (isListening) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListening' state.");
    } else {
        console.warn("[useSpeechToText] startListening: Called but recognitionRef.current is null.");
    }
  }, [isSTTSupported, isListening, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log("[useSpeechToText] stopListening: Attempting to call recognition.stop().");
      recognitionRef.current.stop(); // This should trigger the 'onend' event
    } else if (!isListening) {
      console.warn("[useSpeechToText] stopListening: Called but not in 'isListening' state.");
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
    }
  }, [isListening]); // isListening is the state from this hook

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
