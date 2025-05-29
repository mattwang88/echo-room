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
  // To prevent race conditions or speaking stale text if a new request comes in while one is fetching
  const currentSpeechJobIdRef = useRef<number>(0); 
  const isSpeakingStateRef = useRef(isTTSSpeaking); // Ref to get current speaking state in async contexts

  useEffect(() => {
    isSpeakingStateRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  useEffect(() => {
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current; 

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event.");
      // Only set speaking to false if this was the active job
      if (isSpeakingStateRef.current) {
         setIsTTSSpeakingState(false);
      }
    };

    const handleAudioError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement)?.error;
      if (mediaError && mediaError.code === MediaError.MEDIA_ERR_ABORTED) {
        console.warn("[useTextToSpeech] HTMLAudioElement playback aborted (likely intentional cancellation).");
      } else {
        console.error("[useTextToSpeech] HTMLAudioElement 'error' event:", e, mediaError);
        toast({
          title: "Audio Playback Error",
          description: `Could not play audio. Code: ${mediaError?.code}, Message: ${mediaError?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
       // Only set speaking to false if this was the active job
      if (isSpeakingStateRef.current) {
        setIsTTSSpeakingState(false);
      }
    };

    currentAudioElement.addEventListener('ended', handleAudioEnd);
    currentAudioElement.addEventListener('error', handleAudioError);

    return () => {
      console.log("[useTextToSpeech] Cleanup: Pausing audio and removing listeners.");
      currentAudioElement.pause();
      currentAudioElement.removeAttribute('src'); 
      currentAudioElement.load(); 
      currentAudioElement.removeEventListener('ended', handleAudioEnd);
      currentAudioElement.removeEventListener('error', handleAudioError);
    };
  }, [toast]);

  const cancelCurrentSpeech = useCallback(() => {
    console.log("[useTextToSpeech] cancelCurrentSpeech called.");
    currentSpeechJobIdRef.current += 1; 
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (isSpeakingStateRef.current) { 
        setIsTTSSpeakingState(false);
    }
  }, []); 

  const speak = useCallback(async (text: string, participant?: string) => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log("[useTextToSpeech] Speak called for User, skipping.");
      else if (!isTTSEnabled) console.log("[useTextToSpeech] Speak called but TTS is disabled.");
      else console.log("[useTextToSpeech] Speak called with empty text, skipping.");
      return;
    }
    
    // If already speaking, cancel and wait briefly.
    // This uses isSpeakingStateRef.current to get the most up-to-date value.
    if (isSpeakingStateRef.current) {
        console.log("[useTextToSpeech] Already speaking, cancelling previous speech.");
        cancelCurrentSpeech(); 
        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for cancellation
    }


    const jobId = ++currentSpeechJobIdRef.current; 
    console.log(`[useTextToSpeech] Starting speech job ${jobId} for text: "${text.substring(0,30)}..."`);
    setIsTTSSpeakingState(true);

    try {
      console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow (Job ${jobId}): "${text.substring(0,50)}..."`);
      const input: GenerateSpeechAudioInput = { text }; // Using default voice/lang from flow
      const result = await generateSpeechAudio(input);

      if (currentSpeechJobIdRef.current !== jobId) {
        console.log(`[useTextToSpeech] Speech job ${jobId} was cancelled or superseded while fetching audio. Aborting play.`);
        if (isSpeakingStateRef.current) setIsTTSSpeakingState(false); 
        return;
      }

      if (result && result.audioContentDataUri && audioRef.current) {
        console.log(`[useTextToSpeech] Job ${jobId}: Received audioContentDataUri. Starts with: ${result.audioContentDataUri.substring(0, 70)}...`);
        audioRef.current.src = result.audioContentDataUri;
        await audioRef.current.play();
        console.log(`[useTextToSpeech] Job ${jobId}: audioRef.play() initiated.`);
      } else {
        throw new Error("No audio content received or audio element not ready.");
      }
    } catch (error) {
      console.error(`[useTextToSpeech] Job ${jobId}: Error in speak function:`, error);
      if (currentSpeechJobIdRef.current === jobId) { // Only show error if this job wasn't cancelled
        toast({
          title: "Text-to-Speech Error",
          description: `Could not play speech: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
        setIsTTSSpeakingState(false);
      } else {
         console.log(`[useTextToSpeech] Job ${jobId}: Error occurred, but job was already cancelled. Suppressing toast.`);
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
      // Optional: Add toast notification for enable/disable confirmation here if desired
      // e.g., toast({ title: `Text-to-Speech ${newState ? 'Enabled' : 'Disabled'}` });
      return newState;
    });
  }, [cancelCurrentSpeech]);

  return {
    isTTSEnabled,
    toggleTTSEnabled,
    speak,
    cancelCurrentSpeech,
    isTTSSpeaking,
    isTTSSupported: true, // We assume the backend flow makes it "supported" by the app
  };
}
