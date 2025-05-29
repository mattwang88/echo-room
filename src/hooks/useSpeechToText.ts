
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
      console.warn("SpeechRecognition API not supported by this browser.");
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening even after a pause
    recognition.interimResults = true; // Get results while the user is still speaking
    recognition.lang = 'en-US'; // Set language

    recognition.onstart = () => {
      handleListeningChange(true);
      setSttError(null); // Clear previous errors
      console.log("Speech recognition started.");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      
      if (onInterimTranscript) {
        onInterimTranscript(currentInterim); 
      }

      if (finalTranscriptSegment.trim()) {
        onTranscript(finalTranscriptSegment.trim()); 
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "An unknown error occurred with speech recognition.";
      // https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error
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
          console.log("Speech recognition aborted by user or system.");
          // Usually, 'aborted' is user-initiated (e.g., clicking stop) or by the app calling .stop().
          // It's often not a "toastable" error unless unexpected.
          handleListeningChange(false); // Ensure state is updated
          return; // Don't toast for deliberate aborts
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
      
      console.error('Speech recognition error:', event.error, event.message);
      setSttError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended.");
      handleListeningChange(false); 
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop(); 
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]); // Dependencies carefully chosen

  const startListening = useCallback(() => {
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    if (recognitionRef.current && !isListening) { 
      try {
        setSttError(null); 
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("Error trying to start speech recognition:", e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') { // This can happen if permissions were just denied
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
          // This error means recognition.start() was called when it was already started or in an invalid state.
          // The isListening check should prevent this, but good to handle.
          console.warn("Speech recognition called in invalid state, possibly already listening.");
          // Don't toast for this if isListening is true, as it might be a rapid double-click.
          if (!isListening) { // Only toast if we thought it wasn't listening
             toast({ title: "Voice Input Error", description: "Could not start voice input due to an unexpected state. Please try again.", variant: "destructive" });
          }
        } else {
           toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        }
        setSttError(userMessage);
        handleListeningChange(false); 
      }
    }
  }, [isSTTSupported, isListening, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) { 
      recognitionRef.current.stop();
      // onend event will handle setting isListening to false
    }
  }, [isListening]);
  
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

    