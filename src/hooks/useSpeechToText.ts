
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
  const [sttError, setSttError] = useState<string | null>(null); // Renamed from 'error' to avoid conflict if used in consuming component
  // const [interimTranscriptState, setInterimTranscriptState] = useState(''); // This internal state is not strictly needed if prop callbacks are used directly
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const _handleListeningChange = useCallback((listening: boolean) => {
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

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      _handleListeningChange(true);
      // setInterimTranscriptState(''); 
      setSttError(null); 
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
      
      // setInterimTranscriptState(currentInterim);
      if (onInterimTranscript) {
        onInterimTranscript(currentInterim); 
      }

      if (finalTranscriptSegment.trim()) {
        onTranscript(finalTranscriptSegment.trim()); 
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "An unknown error occurred with speech recognition.";
      if (event.error === 'no-speech') {
        errorMessage = "No speech was detected. Please try speaking again.";
      } else if (event.error === 'audio-capture') {
        errorMessage = "Microphone problem. Ensure it's connected and enabled.";
      } else if (event.error === 'not-allowed') {
        errorMessage = "Permission to use the microphone was denied. Please enable it in your browser's site settings.";
      } else if (event.error === 'network') {
        errorMessage = "A network error occurred during speech recognition.";
      } else if (event.error === 'aborted') {
        // Usually, 'aborted' is user-initiated (e.g., clicking stop) or by the app calling .stop().
        // It's often not a "toastable" error unless unexpected.
        // For now, we'll log it. If it happens unexpectedly, then we might toast.
        console.log("Speech recognition aborted.", event.message);
        // errorMessage = "Speech input was aborted."; // Potentially too noisy if user clicks stop.
      }
      
      console.error('Speech recognition error:', event.error, event.message);
      if (event.error !== 'aborted') { // Avoid toasting for deliberate stops if they manifest as 'aborted' error
        setSttError(errorMessage);
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      _handleListeningChange(false);
    };

    recognition.onend = () => {
      _handleListeningChange(false); 
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
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, _handleListeningChange]);

  const startListening = useCallback(() => {
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    if (recognitionRef.current && !isListening) { 
      try {
        setSttError(null); 
        // setInterimTranscriptState('');
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("Error trying to start speech recognition:", e);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError') {
          userMessage = "Voice input is already active or in an invalid state.";
        }
        setSttError(userMessage);
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        _handleListeningChange(false); 
      }
    }
  }, [isSTTSupported, isListening, toast, _handleListeningChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) { 
      recognitionRef.current.stop();
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
    // interimTranscript: interimTranscriptState, // No longer exposing this directly, rely on callbacks
    clearSTTError,
  };
}
