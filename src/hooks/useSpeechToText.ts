
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

  // Memoize onListeningChange to ensure stable identity for dependencies
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

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition actually started.");
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
        onInterimTranscript(currentInterim);
      }

      if (finalTranscriptSegment.trim()) {
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
          console.log("[useSpeechToText] onerror: Speech recognition aborted. This is often normal when stopListening is explicitly called.");
          // onend should handle setting isListening to false.
          // If it was listening, onend will set it false. If it wasn't, this is fine.
          handleListeningChange(false); // Proactively set, onend will confirm
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
      handleListeningChange(false); 
    };

    recognition.onend = () => {
      console.log("[useSpeechToText] onend: Recognition actually ended.");
      // This is the most reliable place to set isListening to false.
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
      // Ensure state is false on unmount if it was listening
      // This is a fallback; onend should ideally handle it.
      // Directly using setIsListening here to avoid callback complexities during unmount.
      setIsListening(currentIsListening => {
        if (currentIsListening) {
          stableOnListeningChange(false); // Notify parent if it was listening
        }
        return false;
      });
    };
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange, stableOnListeningChange]);


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
        setSttError(null);
        recognitionRef.current.start();
        // onstart will call handleListeningChange(true)
      } catch (e: any) {
        console.error("[useSpeechToText] startListening: Error calling recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
           userMessage = "Voice input is already active or in an invalid state. Please try again shortly.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        handleListeningChange(false); // Ensure isListening is false if start fails
      }
    } else if (isListening) {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListening' state.");
    }
  }, [isSTTSupported, isListening, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListening state: ${isListening}`);
    if (recognitionRef.current) {
        if (isListening) { // Check the hook's current state before attempting to stop
            console.log("[useSpeechToText] stopListening: Attempting to call recognition.stop().");
            handleListeningChange(false); // Proactively update state for faster UI feedback
            recognitionRef.current.stop(); // This should trigger the 'onend' event.
        } else {
            console.warn("[useSpeechToText] stopListening: Called but not in 'isListening' state according to hook state. Attempting stop anyway.");
            // If UI is out of sync, still try to stop hardware/API if it might be active
            recognitionRef.current.abort(); // Use abort for a more forceful stop if state is uncertain
            handleListeningChange(false); // Ensure state is false
        }
    } else {
      console.warn("[useSpeechToText] stopListening: Called but recognitionRef.current is null.");
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
