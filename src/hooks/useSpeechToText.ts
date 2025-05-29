
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
  const isListeningStateRef = useRef(isListeningState); // Ref to track the latest listening state for async handlers
  const isMountedRef = useRef(true);

  // Refs for managing auto-restart logic
  const userExplicitlyStoppedRef = useRef(true); // Start as true, meaning user has not yet started
  const intendedToListenRef = useRef(false);    // Start as false, user does not intend to listen yet

  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  const handleListeningChange = useCallback((newIsListening: boolean) => {
    if (!isMountedRef.current) return;
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening);
      }
      return newIsListening;
    });
  }, [onListeningChange]);

  const isSTTSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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

    recognition.continuous = true; 
    recognition.interimResults = !!onInterimTranscript;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null);
      // userExplicitlyStoppedRef is managed by start/stop
      // intendedToListenRef is managed by start/stop
      handleListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;
      console.log("[useSpeechToText] onresult: Received result event.");
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else if (onInterimTranscript) {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentInterim.trim() && onInterimTranscript) {
        console.log("[useSpeechToText] onresult: Interim transcript:", currentInterim);
        onInterimTranscript(currentInterim);
      }
      if (finalTranscriptSegment.trim()) {
        console.log("[useSpeechToText] onresult: Final transcript segment:", finalTranscriptSegment.trim());
        onTranscript(finalTranscriptSegment.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;
      let errorMessage = "An unknown error occurred with speech recognition.";
      
      console.warn(`[useSpeechToText] onerror: error code: ${event.error}, message: ${event.message}. User explicitly stopped: ${userExplicitlyStoppedRef.current}. Intended to listen: ${intendedToListenRef.current}`);

      if (event.error === 'aborted') {
        // This usually means recognition.abort() was called, or browser aborted it.
        // We let onend handle state updates for aborts typically.
        // If it wasn't an explicit user stop, it might try to auto-restart in onend.
        console.warn(`[useSpeechToText] onerror: Recognition aborted. User explicitly stopped: ${userExplicitlyStoppedRef.current}. Message: ${event.message}`);
      } else {
         switch (event.error) {
          case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
          case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
          case 'not-allowed': errorMessage = "Permission to use the microphone was denied or revoked. Please check browser & OS settings."; break;
          case 'network': errorMessage = "A network error occurred during speech recognition."; break;
          default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
        }
        console.error('[useSpeechToText] onerror Full Details:', event);
        setSttError(errorMessage);
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      
      intendedToListenRef.current = false; // Any significant error should stop the intent to listen/restart
      handleListeningChange(false); 
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      const wasListeningBeforeOnEnd = isListeningStateRef.current; 
      console.log(`[useSpeechToText] onend: Recognition service actually ended. User explicitly stopped: ${userExplicitlyStoppedRef.current}, Intended to listen: ${intendedToListenRef.current}, Was listening before onEnd: ${wasListeningBeforeOnEnd}`);
      
      handleListeningChange(false);

      // Auto-restart logic
      if (isMountedRef.current && !userExplicitlyStoppedRef.current && intendedToListenRef.current && recognitionRef.current) {
        // Only restart if it was actively listening or intended to be, and not explicitly stopped by user.
        // wasListeningBeforeOnEnd check helps prevent restart if it stopped due to an error that already set listening to false.
        console.log("[useSpeechToText] onend: Auto-restarting recognition as it may have ended prematurely.");
        try {
          recognitionRef.current.start();
          // onstart will call handleListeningChange(true) if successful
        } catch (e: any) {
          console.error("[useSpeechToText] onend: Error trying to auto-restart recognition:", e.name, e.message);
          setSttError(`Failed to auto-restart voice input: ${e.message}`);
          intendedToListenRef.current = false; // Stop intending to listen if restart fails
        }
      } else {
        // If not auto-restarting, ensure intent is false.
         intendedToListenRef.current = false;
      }
    };

    return () => {
      isMountedRef.current = false;
      intendedToListenRef.current = false; 
      userExplicitlyStoppedRef.current = true; 

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
       handleListeningChange(false); // Ensure state is false on unmount
    };
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, handleListeningChange]);


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. isSTTSupported: ${isSTTSupported}, recognitionRef.current exists: ${!!recognitionRef.current}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }
    
    if (!recognitionRef.current) {
      console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start.");
      toast({ title: "Voice Input Error", description: "Speech recognition service not ready. Try again or refresh.", variant: "destructive" });
      handleListeningChange(false);
      return;
    }

    setSttError(null);
    intendedToListenRef.current = true;
    userExplicitlyStoppedRef.current = false;

    if (!isListeningStateRef.current) {
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("[useSpeechToText] Error SYNCHRONOUSLY thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser/OS settings.";
        else if (e.name === 'InvalidStateError') userMessage = "Voice input is in an unexpected state. Click mic again.";
        
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        intendedToListenRef.current = false;
        handleListeningChange(false);
      }
    } else {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState' (ref). Ignoring call to start().");
    }
  }, [isSTTSupported, toast, handleListeningChange]);

  const stopListening = useCallback(() => {
    console.log(`[useSpeechToText] stopListening called. Current isListeningState from ref: ${isListeningStateRef.current}`);
    
    intendedToListenRef.current = false;
    userExplicitlyStoppedRef.current = true;

    if (recognitionRef.current) {
      console.log("[useSpeechToText] stopListening: recognitionRef.current exists.");
      if (isListeningStateRef.current) {
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort().");
        recognitionRef.current.abort();
      } else {
        console.warn("[useSpeechToText] stopListening: Called but was not in isListeningState (from ref). Forcing state to false.");
        // If not listening, but stop is called, ensure state is false.
        // This can happen if onend fired first and set listening to false.
      }
      // Proactively update listening state. `onend` or `onerror` will also call this.
      handleListeningChange(false); 
    } else {
      console.warn("[useSpeechToText] stopListening: recognitionRef is null. Forcing listening state to false.");
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
