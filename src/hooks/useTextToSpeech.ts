
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { generateSpeechAudio, type GenerateSpeechAudioInput } from '@/ai/flows/generate-speech-audio-flow';
import type { ParticipantRole, AgentRole, VoiceConfig, VoiceGender } from '@/lib/types';

const maleVoices: VoiceConfig[] = [
  { voiceName: 'en-US-Neural2-D', languageCode: 'en-US', gender: 'male' },
  { voiceName: 'en-US-Neural2-A', languageCode: 'en-US', gender: 'male' },
  { voiceName: 'en-US-Neural2-J', languageCode: 'en-US', gender: 'male' },
  { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US', gender: 'male' },
];

const femaleVoices: VoiceConfig[] = [
  { voiceName: 'en-US-Neural2-C', languageCode: 'en-US', gender: 'female' },
  { voiceName: 'en-US-Neural2-E', languageCode: 'en-US', gender: 'female' },
  { voiceName: 'en-US-Neural2-F', languageCode: 'en-US', gender: 'female' },
  { voiceName: 'en-US-Wavenet-F', languageCode: 'en-US', gender: 'female' },
];

const systemVoice: VoiceConfig = { voiceName: 'en-US-Wavenet-D', languageCode: 'en-US', gender: 'neutral' }; // Wavenet-D is often perceived as male, but we'll mark neutral for System

// VoiceMap for specific non-random roles if ever needed, currently unused for AI agents
const specificRoleVoiceMap: Partial<Record<AgentRole, VoiceConfig>> = {
  // Example: Manager: { voiceName: 'en-US-Neural2-A', languageCode: 'en-US', gender: 'male' },
};


export function useTextToSpeech() {
  const { toast } = useToast();
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [currentSpeakingRole, setCurrentSpeakingRole] = useState<ParticipantRole | null>(null);
  const [currentSpeakingGender, setCurrentSpeakingGender] = useState<VoiceGender | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const isSpeakingStateRef = useRef(isSpeakingState);
  const currentSpeechTextRef = useRef<string | null>(null);
  const currentParticipantRef = useRef<ParticipantRole | null>(null);

  useEffect(() => {
    isSpeakingStateRef.current = isSpeakingState;
  }, [isSpeakingState]);

  const handleAudioEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
       setIsSpeakingState(false);
       currentSpeechTextRef.current = null;
       currentParticipantRef.current = null;
       setCurrentSpeakingRole(null);
       setCurrentSpeakingGender(null);
    }
  }, [setIsSpeakingState, setCurrentSpeakingRole, setCurrentSpeakingGender]);

  const handleAudioError = useCallback((e: Event | string) => {
    if (!isMountedRef.current) return;
    let errorMessage = "Audio playback error.";
    let logAsError = true;

    if (e instanceof Event && e.target instanceof HTMLAudioElement && e.target.error) {
        const mediaError = e.target.error;
        const currentSrcUsedByPlayer = (e.target as HTMLAudioElement).currentSrc || (e.target as HTMLAudioElement).src; 
        
        const isLikelyCancellationError =
            mediaError.code === 1 || 
            (mediaError.code === 4 && 
                (
                    !currentSrcUsedByPlayer ||
                    (currentSrcUsedByPlayer && !currentSrcUsedByPlayer.startsWith('data:audio/')) ||
                    (mediaError.message && mediaError.message.includes("Empty src attribute")) 
                )
            );

        if (isLikelyCancellationError) {
            logAsError = false; 
        }

        if (logAsError) {
            console.error(`[useTextToSpeech] HTMLAudioElement 'error' event. Code: ${mediaError.code}, Message: ${mediaError.message}, Current Player Src: "${currentSrcUsedByPlayer}"`, mediaError);
        } else {
            console.warn(`[useTextToSpeech] HTMLAudioElement 'error' event (likely cancellation-related). Code: ${mediaError.code}, Message: ${mediaError.message}, Current Player Src: "${currentSrcUsedByPlayer}"`, mediaError);
        }
        
        switch (mediaError.code) {
            case 1: 
                errorMessage = "Audio playback aborted.";
                break;
            case 2: 
                errorMessage = "A network error caused audio download to fail.";
                break;
            case 3: 
                errorMessage = "Audio playback failed due to a media decoding error.";
                break;
            case 4: 
                if (!currentSrcUsedByPlayer || (currentSrcUsedByPlayer && !currentSrcUsedByPlayer.startsWith('data:audio/'))) {
                  errorMessage = "Audio source was empty or invalid, possibly due to cancellation.";
                } else if (mediaError.message && mediaError.message.includes("Empty src attribute")) {
                  errorMessage = "Audio source processing failed (reported as empty/invalid by browser), possibly due to cancellation or malformed data.";
                }
                 else {
                  errorMessage = "The audio format is not supported or the source is invalid.";
                }
                break;
            default:
                errorMessage = `An unknown error occurred during audio playback. Code: ${mediaError.code}`;
        }
    } else if (typeof e === 'string') {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (string):`, e);
        errorMessage = e;
        logAsError = true; 
    } else {
        console.error(`[useTextToSpeech] HTMLAudioElement 'error' event (unknown type):`, e);
        logAsError = true; 
    }

    if (isSpeakingStateRef.current && currentSpeechTextRef.current) {
        if (logAsError) { 
            toast({
                title: "Audio Playback Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
        setIsSpeakingState(false);
        currentSpeechTextRef.current = null;
        currentParticipantRef.current = null;
        setCurrentSpeakingRole(null);
        setCurrentSpeakingGender(null);
    }
  }, [toast, setIsSpeakingState, setCurrentSpeakingRole, setCurrentSpeakingGender]);

  useEffect(() => {
    isMountedRef.current = true;
    audioRef.current = new Audio();
    const currentAudioElement = audioRef.current;

    if (currentAudioElement) {
      currentAudioElement.addEventListener('ended', handleAudioEnd);
      currentAudioElement.addEventListener('error', handleAudioError);
    }

    return () => {
      isMountedRef.current = false;
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('ended', handleAudioEnd);
        currentAudioElement.removeEventListener('error', handleAudioError);
        try {
          if (!currentAudioElement.paused) {
            currentAudioElement.pause();
          }
          currentAudioElement.currentTime = 0;
          currentAudioElement.src = '';
          currentAudioElement.load(); 
        } catch (error) {
          console.warn('[useTextToSpeech] Error during audio cleanup on unmount:', error);
        }
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    };
  }, [handleAudioEnd, handleAudioError]);


  const memoizedCancel = useCallback(() => {
    if (isSpeakingStateRef.current && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current.load(); 
      } catch (error) {
        console.warn('[useTextToSpeech] Error during audio cancel operation:', error);
      }
    }
    if(isMountedRef.current) {
      setIsSpeakingState(false);
      setCurrentSpeakingRole(null);
      setCurrentSpeakingGender(null);
    }
    currentSpeechTextRef.current = null;
    currentParticipantRef.current = null;
  }, [setIsSpeakingState, setCurrentSpeakingRole, setCurrentSpeakingGender]);


  const memoizedSpeak = useCallback(async (text: string, participant: ParticipantRole = 'System') => {
    if (!text.trim() || participant === 'User') {
      return;
    }
    
    if (isSpeakingStateRef.current && currentSpeechTextRef.current === text && currentParticipantRef.current === participant) {
      return;
    }

    if (isSpeakingStateRef.current) {
      memoizedCancel();
      await new Promise(resolve => setTimeout(resolve, 100)); 
    }
    
    if (!isMountedRef.current) return;

    currentSpeechTextRef.current = text;
    currentParticipantRef.current = participant;
    if(isMountedRef.current) {
      setIsSpeakingState(true);
      setCurrentSpeakingRole(participant);
    }
    
    let selectedVoiceConfig: VoiceConfig;

    if (participant === 'System') {
        selectedVoiceConfig = systemVoice;
    } else if (specificRoleVoiceMap[participant as AgentRole]) {
        selectedVoiceConfig = specificRoleVoiceMap[participant as AgentRole]!;
    } else {
        // Random selection for other AI agents
        const randomGender = Math.random() < 0.5 ? 'male' : 'female';
        const voiceList = randomGender === 'male' ? maleVoices : femaleVoices;
        if (voiceList.length > 0) {
            selectedVoiceConfig = voiceList[Math.floor(Math.random() * voiceList.length)];
        } else { // Fallback if a gender list is empty
            selectedVoiceConfig = systemVoice; 
        }
    }
    
    if(isMountedRef.current) {
        setCurrentSpeakingGender(selectedVoiceConfig.gender);
    }
    
    const input: GenerateSpeechAudioInput = {
      text,
      voiceName: selectedVoiceConfig.voiceName,
      languageCode: selectedVoiceConfig.languageCode,
    };

    try {
      const { audioContentDataUri } = await generateSpeechAudio(input);

      if (!isMountedRef.current || currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant || !isSpeakingStateRef.current) {
          if (isSpeakingStateRef.current && isMountedRef.current) { 
             setIsSpeakingState(false);
             setCurrentSpeakingRole(null);
             setCurrentSpeakingGender(null);
          }
          if (currentSpeechTextRef.current !== text || currentParticipantRef.current !== participant) {
            currentSpeechTextRef.current = null;
            currentParticipantRef.current = null;
          }
          return;
      }

      if (audioRef.current) {
        audioRef.current.src = audioContentDataUri;
        await audioRef.current.play();
      } else {
          if(isMountedRef.current) {
            setIsSpeakingState(false);
            setCurrentSpeakingRole(null);
            setCurrentSpeakingGender(null);
          }
          currentSpeechTextRef.current = null;
          currentParticipantRef.current = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useTextToSpeech] Error calling generateSpeechAudio flow:', errorMsg);
      toast({
        title: "Speech Generation Error",
        description: `Failed to get audio: ${errorMsg.substring(0, 100)}...`,
        variant: "destructive",
      });
      if(isMountedRef.current) {
        setIsSpeakingState(false);
        setCurrentSpeakingRole(null);
        setCurrentSpeakingGender(null);
      }
      currentSpeechTextRef.current = null;
      currentParticipantRef.current = null;
    }
  }, [toast, memoizedCancel, setIsSpeakingState, setCurrentSpeakingRole, setCurrentSpeakingGender]);

  const isTTSSupported = typeof Audio !== 'undefined'; 

  return {
    speak: memoizedSpeak,
    cancel: memoizedCancel,
    isSpeaking: isSpeakingState,
    isTTSSupported,
    currentSpeakingRole,
    currentSpeakingGender,
  };
}
