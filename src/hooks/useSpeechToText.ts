
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
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
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
        console.error('Speech recognition error:', event.error, event.message);
        let errorMessage = event.message || event.error;
        if (event.error === 'no-speech') {
            errorMessage = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
            errorMessage = "Microphone problem. Ensure it's connected and permission is granted.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Permission to use microphone was denied or has not been granted. Please check your browser's site settings.";
        } else if (event.error === 'network') {
            errorMessage = "Network error during speech recognition.";
        }
        setError(errorMessage);
        if (onError) onError(errorMessage);
        // The browser usually handles stopping recognition on critical errors.
        // onend will fire to set isListening to false.
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
      };

    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [onTranscript, onListeningChange, onError]);


  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = "Speech recognition not supported in this browser.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }
    if (isListening) {
      return;
    }
    if (!recognitionRef.current) {
      const errorMsg = "Speech recognition component not ready.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Clear previous state before attempting to start
    setError(null);
    if (onError) onError(null);
    setInterimTranscript("");

    try {
      recognitionRef.current.start();
      // isListening will be set to true by the 'onstart' event handler
    } catch (e: any) {
      console.error("Error calling recognition.start():", e);
      let userFriendlyError = "Failed to start listening. Please ensure microphone permissions are granted.";
      if (e.name === 'InvalidStateError') {
          userFriendlyError = "Cannot start listening now, speech recognition might already be active or in an invalid state.";
      } else if (e.name === 'NotAllowedError') {
           userFriendlyError = "Microphone access was denied. Please enable it in your browser settings.";
      }
      setError(userFriendlyError);
      if (onError) onError(userFriendlyError);
      setIsListening(false); // Ensure listening is false if start() throws
      if (onListeningChange) onListeningChange(false);
    }
  }, [isSupported, isListening, onError, onListeningChange, recognitionRef]);

  const stopListening = useCallback(() => {
    if (!isSupported || !isListening || !recognitionRef.current) return;
    try {
        recognitionRef.current.stop();
        // isListening will be set to false by the 'onend' event handler
    } catch (e: any) {
        console.error("Error calling recognition.stop():", e);
    }
  }, [isSupported, isListening, recognitionRef]);

  return { startListening, stopListening, isListening, isSupported, error, interimTranscript };
}
