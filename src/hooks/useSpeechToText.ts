
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
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscriptState] = useState('');
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
      setError("Speech-to-Text is not supported in this browser.");
      console.warn("SpeechRecognition API not supported.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      handleListeningChange(true);
      setInterimTranscriptState('');
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      
      setInterimTranscriptState(currentInterim);
      if (onInterimTranscript) {
        onInterimTranscript(currentInterim);
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = "An unknown error occurred with speech recognition.";
      if (event.error === 'no-speech') {
        errorMessage = "No speech was detected. Microphone might be muted or setup incorrectly.";
      } else if (event.error === 'audio-capture') {
        errorMessage = "Microphone problem. Ensure it's connected and enabled.";
      } else if (event.error === 'not-allowed') {
        errorMessage = "Permission to use microphone was denied. Please enable it in your browser settings.";
      } else if (event.error === 'network') {
        errorMessage = "Network error during speech recognition.";
      }
      console.error('Speech recognition error', event);
      setError(errorMessage);
      toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      handleListeningChange(false);
    };

    recognition.onend = () => {
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
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]);

  const startListening = useCallback(() => {
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    if (recognitionRef.current && !isListening) {
      try {
        setInterimTranscriptState('');
        setError(null);
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("Error starting speech recognition:", e);
        let userMessage = "Could not start voice input.";
        if (e.name === 'NotAllowedError') {
          userMessage = "Microphone permission denied. Please enable it in browser settings.";
        } else if (e.name === 'InvalidStateError' && isListening) {
          // Already listening, do nothing or stop first
          return;
        }
        setError(userMessage);
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        handleListeningChange(false);
      }
    }
  }, [isSTTSupported, isListening, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, startListening, stopListening, error, isSTTSupported, interimTranscript };
}
