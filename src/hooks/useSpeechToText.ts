
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseSpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void; // Callback for listening state changes
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
  const isMountedRef = useRef(true); // Track if component is mounted

  // Refs for managing auto-restart logic
  const userExplicitlyStoppedRef = useRef(false);
  const intendedToListenRef = useRef(false);

  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  // This is the callback that will be invoked by SpeechRecognition events or direct calls
  // It ensures the parent (useMeetingSimulation) is notified of listening state changes.
  const handleListeningChange = useCallback((newIsListening: boolean) => {
    setIsListeningState(prevState => {
      // Only call the prop and log if the state actually changes
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        onListeningChange(newIsListening); // Notify parent
      }
      return newIsListening;
    });
  }, [onListeningChange]); // Dependency on the stable prop from parent

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
    recognition.interimResults = !!onInterimTranscript; // Only request interim if handler is provided
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null);
      userExplicitlyStoppedRef.current = false; // Reset if it starts successfully
      // intendedToListenRef is set by startListening()
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
      
      if (event.error === 'aborted') {
        // This can happen if userExplicitlyStoppedRef is true (via abort()) or if the browser/service aborts it.
        // The onend handler will usually follow, which then updates the listening state.
        console.warn(`[useSpeechToText] onerror: Recognition aborted. User explicitly stopped: ${userExplicitlyStoppedRef.current}. Message: ${event.message}`);
        // No toast for user-initiated aborts usually. onend will handle state.
      } else {
         switch (event.error) {
          case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
          case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
          case 'not-allowed': errorMessage = "Permission to use the microphone was denied or revoked. Please check browser & OS settings."; break;
          case 'network': errorMessage = "A network error occurred during speech recognition."; break;
          default: errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
        }
        console.error('[useSpeechToText] onerror:', event.error, event.message);
        setSttError(errorMessage);
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      intendedToListenRef.current = false; // Any error should stop the intent to listen/restart
      handleListeningChange(false); // Ensure listening state is false on error
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      const wasListeningBeforeOnEnd = isListeningStateRef.current; // Capture state before updating
      console.log(`[useSpeechToText] onend: Recognition service actually ended. User explicitly stopped: ${userExplicitlyStoppedRef.current}, Intended to listen: ${intendedToListenRef.current}, Was listening before onEnd: ${wasListeningBeforeOnEnd}`);
      
      handleListeningChange(false); // Update listening state as recognition has ended

      // Auto-restart logic
      if (isMountedRef.current && !userExplicitlyStoppedRef.current && intendedToListenRef.current && wasListeningBeforeOnEnd && recognitionRef.current) {
        console.log("[useSpeechToText] onend: Auto-restarting recognition as it may have ended prematurely.");
        try {
          recognitionRef.current.start();
          // isListening will be set to true again by 'onstart' if successful.
        } catch (e: any) {
          console.error("[useSpeechToText] onend: Error trying to auto-restart recognition:", e.name, e.message);
          intendedToListenRef.current = false; // Stop intending to listen if restart fails
        }
      } else {
        // If not auto-restarting (e.g., user stopped it, or it wasn't intended to be listening), ensure intent is false.
        if (!userExplicitlyStoppedRef.current) { 
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
          recognitionRef.current.abort(); // Use abort for forceful cleanup
        } catch (e: any) {
           console.warn("[useSpeechToText] Effect Cleanup: Error during recognition.abort():", e.name, e.message);
        }
        recognitionRef.current = null;
      }
    };
  // Dependencies: `onListeningChange` is memoized in the parent. `onTranscript` and `onInterimTranscript` are also memoized.
  // `toast` from useToast is stable. `isSTTSupported` is stable after initial check.
  }, [isSTTSupported, onTranscript, onInterimTranscript, toast, onListeningChange]);


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current isListeningState (from ref): ${isListeningStateRef.current}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }
    
    if (!recognitionRef.current) {
      console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start. This might be a timing issue or Effect not run.");
      toast({ title: "Voice Input Error", description: "Speech recognition service not ready. Try again or refresh.", variant: "destructive" });
      handleListeningChange(false); // Ensure state is false
      return;
    }

    setSttError(null);
    intendedToListenRef.current = true;
    userExplicitlyStoppedRef.current = false;

    if (!isListeningStateRef.current) { // Check ref to avoid race condition with state
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
        // `onstart` will call `handleListeningChange(true)`
      } catch (e: any) {
        console.error("[useSpeechToText] Error SYNCHRONOUSLY thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser/OS settings.";
        else if (e.name === 'InvalidStateError') userMessage = "Voice input is in an unexpected state. Click mic again.";
        
        toast({ title: "Voice Input Error", description: userMessage, variant: "destructive" });
        setSttError(userMessage);
        intendedToListenRef.current = false;
        handleListeningChange(false); // Failed to start, ensure state is false
      }
    } else {
        console.warn("[useSpeechToText] startListening: Called but already in 'isListeningState' (ref). Ignoring call to start().");
    }
  }, [isSTTSupported, toast, handleListeningChange]); // handleListeningChange is stable

  const stopListening = useCallback(() => {
    const currentListeningState = isListeningStateRef.current;
    console.log(`[useSpeechToText] stopListening called. Current isListeningState (from ref): ${currentListeningState}`);
    
    intendedToListenRef.current = false; // User no longer intends to listen (important for auto-restart)
    userExplicitlyStoppedRef.current = true; // User is explicitly stopping

    if (recognitionRef.current) {
      console.log("[useSpeechToText] stopListening: recognitionRef.current exists.");
      if (currentListeningState) { // Only try to abort if the ref indicates it was listening
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort() as currentListeningState is true.");
        recognitionRef.current.abort();
      } else {
        console.warn("[useSpeechToText] stopListening: Called but was not in isListeningState (currentListeningState from ref is false).");
      }
      // Forcefully update listening state IMMEDIATELY.
      // The onend/onerror handlers will also call this, which is fine as handleListeningChange is idempotent.
      // This makes the UI more responsive to the stop action.
      console.log("[useSpeechToText] stopListening: Proactively calling handleListeningChange(false).");
      handleListeningChange(false);
    } else {
      console.warn("[useSpeechToText] stopListening: recognitionRef is null. Forcing listening state to false.");
      handleListeningChange(false); // Ensure state is false if no recognition object
    }
  }, [handleListeningChange]); // handleListeningChange is stable

  const clearSTTError = useCallback(() => {
    setSttError(null);
  }, []);

  return {
    isListening: isListeningState, // The state variable for UI
    startListening,
    stopListening,
    sttError,
    isSTTSupported,
    clearSTTError,
  };
}

    