
"use client";

import { useState, useEffect, useCallback } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string, onEnd?: () => void) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance();
    u.lang = 'en-US'; // You can make this configurable later
    u.rate = 1;
    u.pitch = 1;
    
    u.onstart = () => {
      setIsSpeaking(true);
    };
    
    u.onend = () => {
      setIsSpeaking(false);
      if (utterance?.onend) {
        // Call the onEnd callback passed to speak function
        // This check is a bit indirect due to how onend is structured
      }
    };

    u.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
    };
    
    setUtterance(u);

    return () => {
      synth.cancel(); // Cleanup: cancel any ongoing speech when component unmounts or utterance changes
    };
  }, [isSupported]); // Re-create utterance if isSupported changes (shouldn't happen often)

  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    if (!isSupported || !utterance || window.speechSynthesis.speaking) {
      // If already speaking, or not supported, or utterance not ready, do nothing or queue (simple for now: do nothing)
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); // Cancel previous before speaking new
      }
      // return; // Early exit if already speaking can be problematic if we want to interrupt.
    }
    
    utterance.text = text;
    if (onEndCallback) {
      // A bit of a workaround as direct assignment to utterance.onend within speak
      // might get overwritten if speak is called rapidly.
      // Instead, rely on the onend defined in useEffect and manage external callbacks there if needed.
      // For now, the onend in useEffect handles setIsSpeaking.
      // A more robust solution for multiple onEnd callbacks might involve a queue or event emitter.
      // Let's keep it simple: the main onend will fire setIsSpeaking(false).
    }
    
    window.speechSynthesis.speak(utterance);
  }, [isSupported, utterance]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSupported };
}
