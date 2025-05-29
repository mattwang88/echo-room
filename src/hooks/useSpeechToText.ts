
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string | null) => void;
}

interface UseSpeechToTextReturn {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  interimTranscript: string;
}

export function useSpeechToText({ 
  onTranscript,
  onListeningChange,
  onError 
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true; // Keep listening until explicitly stopped
      recognitionRef.current.interimResults = true; // Get interim results
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(currentInterim);
        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = event.error;
        if (event.error === 'no-speech') {
            errorMessage = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
            errorMessage = "Microphone problem. Please ensure it's working.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Permission to use microphone was denied.";
        }
        setError(errorMessage);
        if (onError) onError(errorMessage);
        setIsListening(false);
        if (onListeningChange) onListeningChange(false);
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        if (onListeningChange) onListeningChange(true);
        setError(null);
        if (onError) onError(null);
        setInterimTranscript("");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (onListeningChange) onListeningChange(false);
        // If it stops automatically and we want it to be continuous until stopListening is called,
        // we might need to restart it here under certain conditions, but for now, explicit stop is cleaner.
      };

    } else {
      setIsSupported(false);
      setError("Speech recognition not supported in this browser.");
      if (onError) onError("Speech recognition not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, onListeningChange, onError]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening || !recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error("Error starting recognition:", e);
      setError("Failed to start listening.");
      if (onError) onError("Failed to start listening.");
    }
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    if (!isSupported || !isListening || !recognitionRef.current) return;
    recognitionRef.current.stop();
  }, [isSupported, isListening]);

  return { startListening, stopListening, isListening, isSupported, error, interimTranscript };
}
