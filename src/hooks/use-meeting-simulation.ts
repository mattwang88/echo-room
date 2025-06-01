
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech';

export function useMeetingSimulation(scenarioId: string | null) {
  const router = useRouter();
  const { toast } = useToast();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserResponse, setCurrentUserResponse] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [meetingEnded, setMeetingEnded] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(0);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null);
  const initialMessageTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");
  const [intentToSubmitAfterStop, setIntentToSubmitAfterStop] = useState(false);

  const { speak: ttsSpeak, cancel: ttsCancel, isSpeaking: isTTSSpeaking, currentSpeakingParticipant: ttsCurrentSpeaker } = useTextToSpeech();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (initialMessageTimeoutIdRef.current) {
        clearTimeout(initialMessageTimeoutIdRef.current);
      }
    };
  }, []);

  const addMessage = useCallback((participant: ParticipantRole, text: string, isAgentResponse: boolean = false) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);

    if (isAgentResponse && participant !== 'User') {
        console.log(`[MeetingSimulation] Initiating TTS for ${participant}'s message: "${text.substring(0,30)}..."`);
        ttsSpeak(text, participant);
    }
  }, [setMessages, ttsSpeak]);

  const handleEndMeeting = useCallback(() => {
    setMeetingEnded(true);
    if (!scenario) return;
    console.log('[MeetingSimulation] Ending meeting.');

    if (isRecording) {
      console.log('[MeetingSimulation] Stopping STT due to meeting end.');
      // sttStopListening will be called by unmount or explicit stop
    }
    console.log('[MeetingSimulation] Cancelling any ongoing TTS due to meeting end.');
    ttsCancel();

    const summaryData: MeetingSummaryData = {
      scenarioTitle: scenario.title,
      objective: scenario.objective,
      messages: messages,
    };
    try {
      localStorage.setItem('echoRoomMeetingSummary', JSON.stringify(summaryData));
      router.push(`/meeting/${scenario.id}/summary`);
    } catch (error) {
      console.error("[MeetingSimulation] Failed to save summary to localStorage:", error);
      toast({ title: "Error", description: "Could not save meeting summary.", variant: "destructive" });
    }
  }, [scenario, messages, router, toast, isRecording, ttsCancel, setMeetingEnded]);


  const submitUserResponse = useCallback(async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) {
      return;
    }

    const userMsgText = currentUserResponse.trim();
    addMessage('User', userMsgText);

    if(isMountedRef.current) {
      setCurrentUserResponse("");
      setBaseTextForSpeech("");
      setIsAiThinking(true);
    }
    
    console.log('[MeetingSimulation] User submitted response. Cancelling any ongoing TTS.');
    ttsCancel();

    try {
      console.time("simulateSingleAgentResponse");
      const activeAgents = scenario.agentsInvolved;
      if (activeAgents && activeAgents.length > 0) {
        const agentToRespondRole = activeAgents[currentAgentIndex];
        let agentPersona = "";
        
        if (scenario.id === 'manager-1on1' && agentToRespondRole === 'Product') {
            agentPersona = scenario.personaConfig.productPersona;
        } else if (scenario.id === 'job-resignation' && agentToRespondRole === 'HR') {
             agentPersona = scenario.personaConfig.hrPersona;
        } else {
            switch (agentToRespondRole) {
                case 'CTO': agentPersona = scenario.personaConfig.ctoPersona; break;
                case 'Finance': agentPersona = scenario.personaConfig.financePersona; break;
                case 'Product': agentPersona = scenario.personaConfig.productPersona; break;
                case 'HR': agentPersona = scenario.personaConfig.hrPersona; break;
                default: console.warn(`[MeetingSimulation] Unknown agent role in scenario: ${agentToRespondRole}`);
            }
        }

        if (agentPersona) {
          const singleAgentSimInput: SimulateSingleAgentResponseInput = {
            userResponse: userMsgText,
            agentRole: agentToRespondRole as AgentRole,
            agentPersona: agentPersona,
            scenarioObjective: scenario.objective,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            addMessage(agentToRespondRole, agentResponse.agentFeedback, true);
          }
          if(isMountedRef.current) setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length);
        } else {
           console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }
      console.timeEnd("simulateSingleAgentResponse");

      if(isMountedRef.current) setCurrentTurn(prev => prev + 1);
      const nextTurn = currentTurn + 1;
      if (scenario.maxTurns && nextTurn >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.", true);
        handleEndMeeting();
      }

    } catch (error) {
      console.error("[MeetingSimulation] AI interaction error:", error);
      toast({ title: "AI Error", description: "An error occurred while processing your request.", variant: "destructive" });
      addMessage("System", "Sorry, I encountered an error. Please try again.", true);
    } finally {
      if(isMountedRef.current) setIsAiThinking(false);
    }
  }, [
    currentUserResponse, scenario, isAiThinking, addMessage, setCurrentUserResponse,
    setBaseTextForSpeech, setIsAiThinking, ttsCancel, currentAgentIndex, setCurrentAgentIndex,
    currentTurn, setCurrentTurn, handleEndMeeting, toast
  ]);

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    const wasRecording = isRecording; 
    setIsRecording(listening);
    // This function is primarily to update `isRecording`. Auto-submit logic is handled in useEffect.
  }, [setIsRecording, isRecording]); 

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Final Transcript Segment Received: "${finalTranscriptSegment}"`);
    setBaseTextForSpeech(prevBaseText => {
      const newCumulativeText = (prevBaseText ? prevBaseText + " " : "") + finalTranscriptSegment.trim();
      setCurrentUserResponse(newCumulativeText);
      return newCumulativeText;
    });
  }, [setCurrentUserResponse, setBaseTextForSpeech]);

  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
    setCurrentUserResponse(prev => baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim.trim());
  }, [baseTextForSpeech, setCurrentUserResponse]);

  const {
    isListening: sttInternalIsListening,
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported: browserSupportsSTT,
    sttError,
    clearSTTError,
  } = useSpeechToText({
    onTranscript: handleSttTranscript,
    onInterimTranscript: handleSttInterimTranscript,
    onListeningChange: handleSttListeningChange,
  });

  useEffect(() => {
    if (sttError && isMountedRef.current) {
      console.warn("[MeetingSimulation] STT Error from hook:", sttError);
    }
  }, [sttError]);

  useEffect(() => {
    console.log(`[MeetingSimulation] ScenarioID effect. ID: ${scenarioId}, Current scenario: ${scenario?.id}`);
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        if (!scenario || scenario.id !== scenarioId) {
          console.log(`[MeetingSimulation] Loading scenario for ID: ${scenarioId}`);
          if(isMountedRef.current) {
            // Clear any pending timeout for a previous initial message
            if (initialMessageTimeoutIdRef.current) {
              clearTimeout(initialMessageTimeoutIdRef.current);
              initialMessageTimeoutIdRef.current = null;
            }

            setScenario(foundScenario);
            const initialMsgForState: Message = {
              id: Date.now().toString(),
              participant: foundScenario.initialMessage.participant,
              text: foundScenario.initialMessage.text,
              timestamp: Date.now(),
            };
            setMessages([initialMsgForState]);
            setCurrentTurn(0);
            setMeetingEnded(false);
            setCurrentUserResponse("");
            setBaseTextForSpeech("");
            setCurrentAgentIndex(0);
            setIntentToSubmitAfterStop(false);
            if (isRecording) { 
              sttStopListening();
            }
            ttsCancel(); 
            clearSTTError();
            
            const textToSpeak = foundScenario.initialMessage.text;
            const participantToSpeak = foundScenario.initialMessage.participant;

            console.log(`[MeetingSimulation] Decision point for initial message: text available: ${!!textToSpeak}`);
            if (textToSpeak && initialMessageSpokenForScenarioIdRef.current !== scenarioId) {
               console.log(`[MeetingSimulation] Initial scenario setup: Scheduling initial message speak for scenario ${scenarioId}: "${textToSpeak.substring(0,30)}..."`);
               
               initialMessageTimeoutIdRef.current = setTimeout(() => {
                if (isMountedRef.current && 
                    scenario && scenario.id === scenarioId && // Ensure current scenario matches the one we scheduled for
                    initialMessageSpokenForScenarioIdRef.current !== scenarioId) { // Ensure it hasn't been marked "spoken" by another path
                  
                  console.log(`[MeetingSimulation] Timeout fired: Speaking initial message for scenario ${scenarioId}.`);
                  ttsSpeak(textToSpeak, participantToSpeak);
                  initialMessageSpokenForScenarioIdRef.current = scenarioId; // Mark as "spoken" for this scenario
                } else {
                  console.log(`[MeetingSimulation] Timeout fired, but conditions to speak initial message for ${scenarioId} no longer met.`);
                }
                initialMessageTimeoutIdRef.current = null; // Clear ref after execution
              }, 50); // 50ms delay
            } else {
                console.log(`[MeetingSimulation] Initial message for ${scenarioId} already marked as spoken, or TTS disabled, or no text.`);
            }
          }
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (initialMessageTimeoutIdRef.current) {
            clearTimeout(initialMessageTimeoutIdRef.current);
            initialMessageTimeoutIdRef.current = null;
        }
        if (isMountedRef.current) router.push('/');
      }
    } else if (!scenarioId && scenario) { 
      console.log('[MeetingSimulation] scenarioId is null, resetting scenario state.');
      if (initialMessageTimeoutIdRef.current) {
        clearTimeout(initialMessageTimeoutIdRef.current);
        initialMessageTimeoutIdRef.current = null;
      }
      if(isMountedRef.current) setScenario(null);
      if(isMountedRef.current) setMessages([]);
      initialMessageSpokenForScenarioIdRef.current = null;
      ttsCancel();
      if (isRecording) sttStopListening();
    }

    return () => {
      if (initialMessageTimeoutIdRef.current) {
        clearTimeout(initialMessageTimeoutIdRef.current);
        initialMessageTimeoutIdRef.current = null;
      }
      // Other cleanup calls like ttsCancel(), sttStopListening() should be here if they are
      // exclusively tied to this effect's lifecycle rather than specific conditions like `isRecording`.
      // For instance, `ttsCancel()` might be relevant if navigating away while an initial message is scheduled.
      // The original placement of ttsCancel() and sttStopListening() inside the `if(isMountedRef.current)` block
      // when scenarioId becomes active or is reset is specific to those state transitions.
      // A general cleanup for `ttsCancel()` might be good if TTS could be active from this effect.
    };
  }, [scenarioId, router, toast, isRecording, sttStopListening, clearSTTError, scenario, ttsSpeak, ttsCancel, setCurrentUserResponse, setMessages, setScenario, setMeetingEnded, setCurrentTurn, setCurrentAgentIndex, setBaseTextForSpeech]);


  const handleToggleRecording = () => {
    if (!browserSupportsSTT) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    clearSTTError();
    console.log(`[MeetingSimulation] handleToggleRecording called. Current isRecording state: ${isRecording}, isSTTSupported: ${browserSupportsSTT}`);

    if (isRecording) {
      console.log('[MeetingSimulation] Calling sttStopListening() from useSpeechToText. Setting intent to submit.');
      setIntentToSubmitAfterStop(true);
      sttStopListening();
    } else {
      console.log('[MeetingSimulation] Starting STT, cancelling any ongoing TTS.');
      setIntentToSubmitAfterStop(false); // Clear any previous intent
      ttsCancel();
      if(isMountedRef.current) setBaseTextForSpeech(currentUserResponse); 
      console.log('[MeetingSimulation] Calling sttStartListening() from useSpeechToText.');
      sttStartListening();
    }
  };

  useEffect(() => {
    // This effect handles auto-submission after recording stops.
    if (!isRecording && intentToSubmitAfterStop) {
      console.log("[MeetingSimulation] useEffect detected isRecording is false and intentToSubmitAfterStop is true.");
      if (currentUserResponse.trim()) {
        console.log("[MeetingSimulation] Calling submitUserResponse due to intent after STT stop.");
        submitUserResponse();
      } else {
        console.log("[MeetingSimulation] STT stopped with intent to submit, but currentUserResponse is empty. Not submitting.");
      }
      if (isMountedRef.current) {
        setIntentToSubmitAfterStop(false); // Reset the flag
      }
    }
  }, [isRecording, intentToSubmitAfterStop, currentUserResponse, submitUserResponse]);


  return {
    scenario,
    messages,
    currentUserResponse,
    setCurrentUserResponse,
    isAiThinking,
    submitUserResponse,
    meetingEnded,
    handleEndMeeting,
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening, 
    isTTSSpeaking, 
    currentSpeakingParticipant: ttsCurrentSpeaker,
  };
}

