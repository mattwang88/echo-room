
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole } from '@/lib/types';

interface VoiceConfig {
  voiceName: string;
  languageCode: string;
}

const voiceMap: Partial<Record<ParticipantRole, VoiceConfig>> = {
  CTO: { voiceName: 'en-US-Neural2-J', languageCode: 'en-US' }, // Male, Neural2
  Finance: { voiceName: 'en-US-Wavenet-C', languageCode: 'en-US' }, // Female, Wavenet
  Product: { voiceName: 'en-US-Standard-B', languageCode: 'en-US' }, // Male, Standard
  HR: { voiceName: 'en-US-Neural2-F', languageCode: 'en-US' }, // Female, Neural2
  System: { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' }, // Default/System voice
};

const defaultVoice: VoiceConfig = { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US' }; // Male, Wavenet

interface UseTextToSpeechReturn {
  isTTSEnabled: boolean;
  toggleTTSEnabled: () => void;
  speak: (text: string, participant?: ParticipantRole) => void;
  cancelCurrentSpeech: () => void;
  isTTSSpeaking: boolean;
  isTTSSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { toast } = useToast();
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isTTSSpeaking, setIsTTSSpeakingState] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingStateRef = useRef(isTTSSpeaking);
  const currentSpeechTextRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    isSpeakingStateRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  useEffect(() => {
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    const handleAudioEnd = () => {
      console.log("[useTextToSpeech] HTMLAudioElement 'ended' event for text:", currentSpeechTextRef.current?.substring(0,30) + '...');
      if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
         setIsTTSSpeakingState(false);
      }
      currentSpeechTextRef.current = null;
    };

    const handleAudioError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement)?.error;
      const currentText = currentSpeechTextRef.current;
      currentSpeechTextRef.current = null; 

      // Error code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) can also occur if abort() is called on an empty source.
      // Error code 2 (MEDIA_ERR_NETWORK) and 3 (MEDIA_ERR_DECODE) are more serious.
      if (mediaError && (mediaError.code === MediaError.MEDIA_ERR_ABORTED)) {
        console.warn(`[useTextToSpeech] HTMLAudioElement playback aborted (likely intentional cancellation). Text was: "${currentText ? currentText.substring(0,30) + '...' : 'N/A'}"`);
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
        currentAudioElement.load(); 
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
      }
      currentSpeechTextRef.current = null;
    };
  }, [toast]);


  const cancelCurrentSpeech = useCallback(() => {
    const textBeingCancelled = currentSpeechTextRef.current;
    console.log("[useTextToSpeech] cancelCurrentSpeech called for text:", textBeingCancelled ? textBeingCancelled.substring(0,30) + '...' : 'N/A');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); 
      audioRef.current.load(); 
    }
    if (isSpeakingStateRef.current) {
        setIsTTSSpeakingState(false);
    }
    currentSpeechTextRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!isTTSEnabled || !text.trim() || participant === 'User') {
      if (participant === 'User') console.log("[useTextToSpeech] Speak called for User, skipping.");
      else if (!isTTSEnabled) console.log("[useTextToSpeech] Speak called but TTS is disabled.");
      else console.log("[useTextToSpeech] Speak called with empty text, skipping.");
      return;
    }

    if (isSpeakingStateRef.current) {
        console.log("[useTextToSpeech] Speak called while already speaking. Cancelling previous speech:", currentSpeechTextRef.current?.substring(0,30) + '...');
        cancelCurrentSpeech();
        await new Promise(resolve => setTimeout(resolve, 150)); 
    }
    
    if (!isTTSEnabled) {
        console.log("[useTextToSpeech] TTS was disabled during cancellation delay. Aborting new speech.");
        return;
    }

    currentSpeechTextRef.current = text; 
    setIsTTSSpeakingState(true);
    
    const selectedVoiceConfig = voiceMap[participant] || defaultVoice;
    console.log(`[useTextToSpeech] Attempting to speak via Google Cloud TTS flow for ${participant}. Voice: ${selectedVoiceConfig.voiceName}, Lang: ${selectedVoiceConfig.languageCode}. Text: "${text.substring(0,50)}..."`);

    try {
      const input: GenerateSpeechAudioInput = { 
        text,
        voiceName: selectedVoiceConfig.voiceName,
        languageCode: selectedVoiceConfig.languageCode,
      };
      const result = await generateSpeechAudio(input);

      if (currentSpeechTextRef.current !== text || !isSpeakingStateRef.current) {
        console.log(`[useTextToSpeech] Speech request for "${text.substring(0,30)}..." was superseded or cancelled while fetching. Aborting play.`);
        if (isSpeakingStateRef.current && currentSpeechTextRef.current !== text) {
           // No change to isSpeakingState, another task is active.
        } else if (isSpeakingStateRef.current && currentSpeechTextRef.current === text) {
           // This implies current text is this one, but speaking state became false. Unlikely.
        } else {
           setIsTTSSpeakingState(false); // Cancelled or superseded entirely
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
      if (currentSpeechTextRef.current === text && isSpeakingStateRef.current) {
        toast({
          title: "Text-to-Speech Error",
          description: `Could not play speech: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
        setIsTTSSpeakingState(false); 
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
      return newState;
    });
  }, [cancelCurrentSpeech]);

  useEffect(() => {
    if (initialLoadDoneRef.current && isTTSEnabled !== undefined) { // Check if isTTSEnabled is defined to avoid toast on initial mount if undefined
        toast({ title: `Text-to-Speech ${isTTSEnabled ? 'Enabled' : 'Disabled'}` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTTSEnabled]);

  useEffect(() => {
    initialLoadDoneRef.current = true;
  }, []);


  return {
    isTTSEnabled,
    toggleTTSEnabled,
    speak,
    cancelCurrentSpeech,
    isTTSSpeaking,
    isTTSSupported: true, 
  };
}
