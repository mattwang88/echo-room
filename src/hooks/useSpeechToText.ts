
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

export function useSpeechToText({
  onTranscript,
  onInterimTranscript,
  onListeningChange,
}: UseSpeechToTextOptions) {
  const { toast } = useToast();
  const [isListeningState, setIsListeningState] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const isListeningStateRef = useRef(isListeningState);
  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  const isMountedRef = useRef(true);
  const userExplicitlyStoppedRef = useRef(false);
  const intendedToListenRef = useRef(false); // Tracks user's explicit intent to listen

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening);
      }
      return newIsListening;
    });
  }, [onListeningChange]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isSTTSupported) {
      console.warn("[useSpeechToText] Effect: SpeechRecognition API not supported.");
      return;
    }

    console.log("[useSpeechToText] Effect: Initializing SpeechRecognition instance.");
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening through pauses
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null);
      userExplicitlyStoppedRef.current = false; // Reset this if it starts
      // intendedToListenRef is set by startListening()
      handleListeningChange(true);
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
      if (event.error === 'aborted') {
        console.warn("[useSpeechToText] onerror: Recognition aborted. This might be user-initiated or an API issue. Message:", event.message);
        // If user explicitly stopped, userExplicitlyStoppedRef will be true.
        // If aborted for other reasons, intendedToListenRef might still be true, but onend will handle it.
      } else {
         switch (event.error) {
          case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
          case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
          case 'not-allowed': errorMessage = "Permission to use the microphone was denied or revoked. Please enable it in your browser/OS settings."; break;
          case 'network': errorMessage = "A network error occurred during speech recognition. Please check your connection."; break;
          default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
        }
        console.error('[useSpeechToText] onerror:', event.error, event.message, "Full event:", event);
        setSttError(errorMessage);
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      intendedToListenRef.current = false; // Any error should stop the intent to listen
      handleListeningChange(false);
    };

    recognition.onend = () => {
      const wasListeningBeforeOnEnd = isListeningStateRef.current; 
      console.log(`[useSpeechToText] onend: Recognition service actually ended. userExplicitlyStopped: ${userExplicitlyStoppedRef.current}, intendedToListen: ${intendedToListenRef.current}, wasListeningBeforeOnEnd: ${wasListeningBeforeOnEnd}`);
      
      handleListeningChange(false); // Recognition has ended, so update state

      if (isMountedRef.current && !userExplicitlyStoppedRef.current && intendedToListenRef.current && wasListeningBeforeOnEnd && recognitionRef.current) {
        // If recognition ended, but user didn't explicitly stop it AND they intended to be listening AND it was actually listening before this onEnd
        console.log("[useSpeechToText] onend: Auto-restarting recognition as it may have ended prematurely.");
        try {
          recognitionRef.current.start();
          // isListening will be set to true again by 'onstart' if successful.
          // userExplicitlyStoppedRef remains false, intendedToListenRef remains true.
        } catch (e: any) {
          console.error("[useSpeechToText] onend: Error trying to auto-restart recognition:", e.name, e.message);
          intendedToListenRef.current = false; // Stop intending to listen if restart fails
        }
      } else {
        // If not auto-restarting (e.g., user stopped it, or it wasn't intended to be listening), ensure intent is false.
        if (!userExplicitlyStoppedRef.current) { // If it wasn't an explicit stop, but we are not restarting, clear intent.
             intendedToListenRef.current = false;
        }
      }
    };

    return () => {
      isMountedRef.current = false;
      intendedToListenRef.current = false; 
      userExplicitlyStoppedRef.current = true; // Ensure no restart on unmount
      if (recognitionRef.current) {
        console.log("[useSpeechToText] Effect Cleanup: Aborting recognition and removing listeners.");
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.abort();
        } catch (e: any) {
          console.warn("[useSpeechToText] Effect Cleanup: Error during recognition.abort():", e.name, e.message);
        }
        recognitionRef.current = null;
      }
    };
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
      console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start.");
      toast({ title: "Voice Input Error", description: "Speech recognition service not ready. Please try again or refresh.", variant: "destructive" });
      handleListeningChange(false);
      return;
    }

    setSttError(null);
    intendedToListenRef.current = true;      // User intends to listen
    userExplicitlyStoppedRef.current = false; // User has not explicitly stopped yet

    if (!isListeningStateRef.current) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("[useSpeechToText] Error SYNCHRONOUSLY thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it.";
        else if (e.name === 'InvalidStateError') {
             console.warn("[useSpeechToText] startListening: InvalidStateError - recognition might be in an unexpected state.");
             userMessage = "Voice input is in an unexpected state. Please try clicking the mic again.";
        }
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        intendedToListenRef.current = false; // Failed to start, so clear intent
        handleListeningChange(false);
      }
    } else {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState'. Ignoring call to start().");
    }
  }, [isSTTSupported, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListeningState from ref: ${isListeningStateRef.current}`);
    
    intendedToListenRef.current = false;      // User no longer intends to listen
    userExplicitlyStoppedRef.current = true; // User is explicitly stopping

    if (!recognitionRef.current) {
      console.warn("[useSpeechToText] stopListening: recognitionRef.current is null. Ensuring listening state is false.");
      handleListeningChange(false);
      return;
    }

    if (isListeningStateRef.current) { 
      try {
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort().");
        recognitionRef.current.abort(); 
        // State will be set to false by onend or onerror('aborted')
      } catch (e: any) {
        console.error("[useSpeechToText] Error during recognition.abort():", e.name, e.message);
        handleListeningChange(false); // Force state update if abort fails
      }
    } else {
      console.warn("[useSpeechToText] stopListening: Called but not in 'isListeningState'. Forcing listening state to false if needed.");
      handleListeningChange(false); 
    }
  }, [handleListeningChange]);

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening: isListeningState,
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}
