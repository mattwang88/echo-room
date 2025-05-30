
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
  const isMountedRef = useRef(true);
  const isListeningStateRef = useRef(isListeningState); // Ref to track the latest listening state

  // Refs for managing auto-restart logic
  const userExplicitlyStoppedRef = useRef(true);
  const intendedToListenRef = useRef(false);

  // Refs for callback props to ensure stability of the main useEffect
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const onListeningChangeRef = useRef(onListeningChange);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onInterimTranscriptRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    onListeningChangeRef.current = onListeningChange;
  }, [onListeningChange]);


  useEffect(() => {
    isListeningStateRef.current = isListeningState;
  }, [isListeningState]);

  const handleListeningChange = useCallback((newIsListening: boolean) => {
    if (!isMountedRef.current) return;
    setIsListeningState(prevState => {
      if (prevState !== newIsListening) {
        console.log(`[useSpeechToText] State Update: isListening changing from ${prevState} to ${newIsListening}`);
        if (onListeningChangeRef.current) {
          onListeningChangeRef.current(newIsListening);
        }
      }
      return newIsListening;
    });
  }, []); // onListeningChangeRef is used inside, which is stable

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
    recognition.interimResults = !!onInterimTranscriptRef.current; // Check ref
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      console.log("[useSpeechToText] onstart: Recognition service actually started.");
      setSttError(null);
      handleListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;
      // console.log("[useSpeechToText] onresult: Received result event.");
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else if (onInterimTranscriptRef.current) {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (currentInterim.trim() && onInterimTranscriptRef.current) {
        // console.log("[useSpeechToText] onresult: Interim transcript:", currentInterim);
        onInterimTranscriptRef.current(currentInterim);
      }
      if (finalTranscriptSegment.trim()) {
        console.log("[useSpeechToText] onresult: Final transcript segment:", finalTranscriptSegment.trim());
        onTranscriptRef.current(finalTranscriptSegment.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;
      let errorMessage = "An unknown error occurred with speech recognition.";
      
      console.warn(`[useSpeechToText] onerror: error code: ${event.error}, message: ${event.message}. User explicitly stopped: ${userExplicitlyStoppedRef.current}. Intended to listen: ${intendedToListenRef.current}`);

      if (event.error === 'aborted' || event.error === 'canceled') {
        console.warn(`[useSpeechToText] onerror: Recognition ${event.error}. User explicitly stopped: ${userExplicitlyStoppedRef.current}.`);
        // This will be handled by onend, or if it's an explicit stop, userExplicitlyStoppedRef is true
      } else {
         switch (event.error) {
          case 'no-speech': errorMessage = "No speech was detected. Please try speaking again."; break;
          case 'audio-capture': errorMessage = "Microphone problem. Please ensure it's connected and enabled."; break;
          case 'not-allowed': errorMessage = "Permission to use the microphone was denied or revoked. Please check browser & OS site settings."; break;
          case 'network': errorMessage = "A network error occurred during speech recognition."; break;
          default: errorMessage = `Speech recognition error: ${event.error || 'unknown'}. ${event.message || ''}`;
        }
        console.error('[useSpeechToText] onerror Full Details:', event);
        setSttError(errorMessage);
        toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
      }
      
      intendedToListenRef.current = false;
      handleListeningChange(false); 
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      const wasListeningBeforeOnEnd = isListeningStateRef.current; 
      console.log(`[useSpeechToText] onend: Recognition service actually ended. User explicitly stopped: ${userExplicitlyStoppedRef.current}, Intended to listen: ${intendedToListenRef.current}, Was listening before onEnd: ${wasListeningBeforeOnEnd}`);
      
      const shouldBeListening = intendedToListenRef.current && !userExplicitlyStoppedRef.current;
      
      handleListeningChange(false); // Always set to false when a session ends

      if (isMountedRef.current && shouldBeListening && recognitionRef.current) {
        console.log("[useSpeechToText] onend: Auto-restarting recognition as it may have ended prematurely.");
        try {
          recognitionRef.current.start();
          // onstart will call handleListeningChange(true) if successful
        } catch (e: any) {
          console.error("[useSpeechToText] onend: Error trying to auto-restart recognition:", e.name, e.message);
          setSttError(`Failed to auto-restart voice input: ${e.message}`);
          intendedToListenRef.current = false;
        }
      } else {
         intendedToListenRef.current = false; // Ensure intent is cleared if not restarting
      }
    };

    return () => {
      isMountedRef.current = false;
      console.log("[useSpeechToText] Effect Cleanup: Aborting recognition and removing listeners.");
      if (recognitionRef.current) {
        intendedToListenRef.current = false; 
        userExplicitlyStoppedRef.current = true; 
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.abort(); // Use abort for cleanup
        } catch (e: any) {
           console.warn("[useSpeechToText] Effect Cleanup: Error during recognition.abort():", e.name, e.message);
        }
        recognitionRef.current = null;
      }
      handleListeningChange(false); 
    };
  // Main useEffect should only depend on things that fundamentally change the setup
  // onTranscript, onInterimTranscript, onListeningChange are now handled by refs and their own effects
  }, [isSTTSupported, toast, handleListeningChange]); // handleListeningChange is memoized


  const startListening = useCallback(() => {
    console.log(`[useSpeechToText] startListening called. Current isListeningState (ref): ${isListeningStateRef.current}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      const msg = "Speech-to-text is not available in your browser.";
      toast({ title: "Unsupported Feature", description: msg, variant: "destructive"});
      setSttError(msg);
      return;
    }
    
    if (!recognitionRef.current) {
      console.error("[useSpeechToText] startListening: recognitionRef.current is null. Cannot start. This might indicate an initialization issue.");
      toast({ title: "Voice Input Error", description: "Speech recognition service not ready. Try refreshing or check console.", variant: "destructive" });
      handleListeningChange(false);
      return;
    }

    setSttError(null);
    intendedToListenRef.current = true;
    userExplicitlyStoppedRef.current = false;

    if (!isListeningStateRef.current) { // Check ref for current listening state
      try {
        console.log("[useSpeechToText] startListening: Attempting to call recognition.start().");
        recognitionRef.current.start();
        // onstart will call handleListeningChange(true)
      } catch (e: any) {
        console.error("[useSpeechToText] Error SYNCHRONOUSLY thrown by recognition.start():", e.name, e.message);
        let userMessage = "Could not start voice input. Please try again.";
        if (e.name === 'NotAllowedError') userMessage = "Microphone permission denied. Please enable it in browser/OS site settings.";
        else if (e.name === 'InvalidStateError') {
          userMessage = "Voice input is in an unexpected state. It might be trying to start again too quickly. Click mic again.";
          // Attempt to reset more forcefully if InvalidStateError
           if(recognitionRef.current) recognitionRef.current.abort();
        }
        
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
    console.log(`[useSpeechToText] stopListening called. Current isListeningState (ref): ${isListeningStateRef.current}`);
    
    intendedToListenRef.current = false;
    userExplicitlyStoppedRef.current = true;

    if (recognitionRef.current) {
      console.log("[useSpeechToText] stopListening: recognitionRef.current exists.");
      if (isListeningStateRef.current) { // Check ref
        console.log("[useSpeechToText] stopListening: Attempting to call recognition.abort().");
        recognitionRef.current.abort(); // Using abort as it's more forceful and should trigger onend/onerror
      } else {
        console.warn("[useSpeechToText] stopListening: Called but was not in isListeningState (ref). Forcing state to false via handleListeningChange.");
      }
      handleListeningChange(false); // Proactively update state, onend will confirm
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

