'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';

interface UseTextToSpeechReturn {
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  speak: (text: string, participant?: string) => void;
  cancelCurrentSpeech: () => void;
  isTTSSpeaking: boolean;
  isTTSSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true); // Enabled by default
  const [isTTSSpeaking, setIsTTSSpeakingState] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingStateRef = useRef(isTTSSpeaking);
  const currentSpeechTextRef = useRef<string | null>(null); // To track what's currently intended to be spoken
  const initialLoadDoneRef = useRef(false); // To manage toast for initial enable state

  useEffect(() => {
    isSpeakingStateRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  useEffect(() => {
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event for text:", currentSpeechTextRef.current);
      if (isSpeakingStateRef.current) {
         setIsTTSSpeakingState(false);
      }
      currentSpeechTextRef.current = null;
    };

    const handleAudioError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement)?.error;
      const currentText = currentSpeechTextRef.current;
      currentSpeechTextRef.current = null; // Clear current text on error

      if (mediaError && (mediaError.code === MediaError.MEDIA_ERR_ABORTED || mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && mediaError.message?.includes("empty"))) {
        console.warn(`[useTextToSpeech] HTMLAudioElement playback ${mediaError.code === MediaError.MEDIA_ERR_ABORTED ? 'aborted' : 'source empty'} (likely intentional cancellation or no audio data). Text was: "${currentText ? currentText.substring(0,30) + '...' : 'N/A'}"`);
      } else {
        console.error("[useTextToSpeech] HTMLAudioElement 'error' event:", e, mediaError);
        toast({
          title: "Audio Playback Error",
          description: `Could not play audio for "${currentText ? currentText.substring(0,30) + '...' : 'message'}". Code: ${mediaError?.code}, Message: ${mediaError?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
      if (isSpeakingStateRef.current) {
        setIsTTSSpeakingState(false);
      }
    };

    currentAudioElement.addEventListener('ended', handleAudioEnd);
    currentAudioElement.addEventListener('error', handleAudioError);

    return () => {
      console.log("[useTextToSpeech] Cleanup: Pausing audio and removing listeners.");
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.removeAttribute('src');
        currentAudioElement.load(); // Reset the audio element
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
      }
      currentSpeechTextRef.current = null;
    };
  }, [toast]);


  const cancelCurrentSpeech = useCallback(() => {
    console.log("[useTextToSpeech] cancelCurrentSpeech called for text:", currentSpeechTextRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); // Important to prevent playing stale audio
      audioRef.current.load(); // Reset
    }
    if (isSpeakingStateRef.current) {
        setIsTTSSpeakingState(false);
    }
    currentSpeechTextRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, participant?: string) => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log("[useTextToSpeech] Speak called for User, skipping.");
      else if (!isTTSEnabled) console.log("[useTextToSpeech] Speak called but TTS is disabled.");
      else console.log("[useTextToSpeech] Speak called with empty text, skipping.");
      return;
    }

    // If already speaking, cancel and wait briefly for the cancellation to process.
    if (isSpeakingStateRef.current) {
        console.log("[useTextToSpeech] Speak called while already speaking. Cancelling previous speech:", currentSpeechTextRef.current);
        cancelCurrentSpeech();
        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay
    }
    
    // Check again if TTS is still enabled after potential delay
    if (!isTTSEnabled) {
        console.log("[useTextToSpeech] TTS was disabled during cancellation delay. Aborting new speech.");
        return;
    }

    currentSpeechTextRef.current = text; // Set what we intend to speak
    setIsTTSSpeakingState(true);
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow: "${text.substring(0,50)}..."`);

    try {
      const input: GenerateSpeechAudioInput = { text };
      const result = await generateSpeechAudio(input);

      // Crucially, check if this is still the text we want to speak and if we are still in speaking mode
      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${text.substring(0,30)}..." was superseded or cancelled while fetching. Aborting play.`);
        if (isSpeakingStateRef.current && currentSpeechTextRef.current !== text) {
          // If we are still 'speaking' but for a *different* text, don't turn off speaking state yet.
          // This case should be rare with the improved cancellation.
        } else {
          setIsTTSSpeakingState(false);
        }
        return;
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Received audioContentDataUri from backend. Starts with: ${result.audioContentDataUri.substring(0, 70)}... Attempting to play.`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        console.log(`[useTextToSpeech] audioRef.play() initiated for "${text.substring(0,30)}..."`);
      } else {
        throw new Error("No audio content received from backend or audio element not ready.");
      }
    } catch (error) {
      console.error(`[useTextToSpeech] Error in speak function for text "${text.substring(0,30)}...":`, error);
      if (currentSpeechTextRef.current === text && isSpeakingStateRef.current) { // Only show error if this job wasn't cancelled and still intended to speak
        toast({
          title: "Text-to-Speech Error",
          description: `Could not play speech: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
        setIsTTSSpeakingState(false); // Ensure speaking state is false on error for this specific job
        currentSpeechTextRef.current = null;
      }
    }
  }, [isTTSEnabled, toast, cancelCurrentSpeech]);


  const toggleTTSEnabled = useCallback(() => {
    setIsTTSEnabled(prev => {
      const newState = !prev;
      console.log(`[useTextToSpeech] TTS enabled state toggled to: ${newState}`);
      if (!newState) {
        cancelCurrentSpeech();
      }
      // Only toast if initial load is done, to prevent toast on first render
      if (initialLoadDoneRef.current) {
        toast({ title: `Text-to-Speech ${newState ? 'Enabled' : 'Disabled'}` });
      }
      return newState;
    });
  }, [cancelCurrentSpeech, toast]);

  useEffect(() => {
    initialLoadDoneRef.current = true;
  }, []);


  return {
    isTTSEnabled,
    toggleTTSEnabled,
    speak,
    cancelCurrentSpeech,
    isTTSSpeaking,
    isTTSSupported: true, // Assumes backend and audio playback are supported
  };
}
