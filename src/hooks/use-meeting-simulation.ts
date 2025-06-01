
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole, MessageAction } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech';

const START_MEETING_PROMPT_ID = 'system-start-meeting-prompt';

export function useMeetingSimulation(scenarioId: string | null) {
  const router = useRouter();
  const { toast } = useToast();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserResponse, setCurrentUserResponse] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [meetingEnded, setMeetingEnded] = useState<boolean>(false);
  const [meetingActive, setMeetingActive] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(0);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");
  const [intentToSubmitAfterStop, setIntentToSubmitAfterStop] = useState(false);

  // Initialize hooks that provide functions used by callbacks earlier
  const { speak: ttsSpeak, cancel: ttsCancel, isSpeaking: isTTSSpeaking, currentSpeakingParticipant: ttsCurrentSpeaker } = useTextToSpeech();

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    setIsRecording(listening);
  }, [setIsRecording]);

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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp'>) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + messageData.participant + Math.random(),
      ...messageData,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);

    if (meetingActive && messageData.participant !== 'User' && messageData.participant !== 'System' && !messageData.action) {
        console.log(`[MeetingSimulation] Initiating TTS for ${messageData.participant}'s message: "${messageData.text.substring(0,30)}..."`);
        ttsSpeak(messageData.text, messageData.participant);
    } else if (meetingActive && messageData.participant === 'System' && initialMessageSpokenForScenarioIdRef.current === scenario?.id && !messageData.action) {
       console.log(`[MeetingSimulation DEBUG] Initiating TTS for System's actual initial message: "${messageData.text.substring(0,30)}..."`);
       ttsSpeak(messageData.text, messageData.participant);
    }
  }, [setMessages, ttsSpeak, meetingActive, scenario]);


  const handleMeetingAction = useCallback((messageId: string, actionKey: string) => {
    if (!isMountedRef.current || !scenario) return;

    if (actionKey === 'INITIATE_MEETING_START') {
      console.log('[MeetingSimulation] Starting meeting...');
      setMeetingActive(true);

      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, text: "Meeting started. Please wait for the first speaker or begin when ready.", action: undefined }
            : msg
        )
      );
      
      const actualInitialMessage = scenario.initialMessage;
      if (actualInitialMessage) {
         addMessage({
          participant: actualInitialMessage.participant,
          text: actualInitialMessage.text,
        });
        initialMessageSpokenForScenarioIdRef.current = scenario.id;
      }
    }
  }, [scenario, addMessage]);


  const handleEndMeeting = useCallback(() => {
    setMeetingEnded(true);
    setMeetingActive(false); 
    if (!scenario) return;
    console.log('[MeetingSimulation] Ending meeting.');

    if (isRecording) {
      console.log('[MeetingSimulation] Stopping STT due to meeting end.');
      sttStopListening();
    }
    console.log('[MeetingSimulation] Cancelling any ongoing TTS due to meeting end.');
    ttsCancel();

    const summaryData: MeetingSummaryData = {
      scenarioTitle: scenario.title,
      objective: scenario.objective,
      messages: messages.filter(msg => msg.id !== START_MEETING_PROMPT_ID), 
    };
    try {
      localStorage.setItem('echoRoomMeetingSummary', JSON.stringify(summaryData));
      router.push(`/meeting/${scenario.id}/summary`);
    } catch (error) {
      console.error("[MeetingSimulation] Failed to save summary to localStorage:", error);
      toast({ title: "Error", description: "Could not save meeting summary.", variant: "destructive" });
    }
  }, [scenario, messages, router, toast, isRecording, ttsCancel, setMeetingEnded, setMeetingActive, sttStopListening]);


  const submitUserResponse = useCallback(async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking || !meetingActive) { 
      return;
    }

    const userMsgText = currentUserResponse.trim();
    addMessage({participant: 'User', text: userMsgText});

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
                default: agentPersona = `You are the ${agentToRespondRole}. Respond from this perspective.`;
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
            addMessage({participant: agentToRespondRole, text: agentResponse.agentFeedback});
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
        addMessage({participant: "System", text: "The meeting time is up. This session has now concluded."});
        handleEndMeeting();
      }

    } catch (error) {
      console.error("[MeetingSimulation] AI interaction error:", error);
      toast({ title: "AI Error", description: "An error occurred while processing your request.", variant: "destructive" });
      addMessage({participant: "System", text: "Sorry, I encountered an error. Please try again."});
    } finally {
      if(isMountedRef.current) setIsAiThinking(false);
    }
  }, [
    currentUserResponse, scenario, isAiThinking, addMessage, setCurrentUserResponse, meetingActive,
    setBaseTextForSpeech, setIsAiThinking, ttsCancel, currentAgentIndex, setCurrentAgentIndex,
    currentTurn, setCurrentTurn, handleEndMeeting, toast
  ]);


  useEffect(() => {
    if (sttError && isMountedRef.current) {
      console.warn("[MeetingSimulation] STT Error from hook:", sttError);
    }
  }, [sttError]);

  useEffect(() => {
    console.log(`[MeetingSimulation] ScenarioID effect. ID: ${scenarioId}, Current scenario state: ${scenario?.id}`);
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        if (!scenario || scenario.id !== foundScenario.id) {
          console.log(`[MeetingSimulation] Loading new scenario for ID: ${scenarioId}`);
          if(isMountedRef.current) {
            setScenario(foundScenario);
            setMeetingActive(false); 
            
            const startPromptMessage: Message = {
              id: START_MEETING_PROMPT_ID,
              participant: 'System',
              text: 'Click the button below to start the meeting.',
              timestamp: Date.now(),
              action: { type: 'button', label: 'Start Meeting', actionKey: 'INITIATE_MEETING_START' }
            };
            setMessages([startPromptMessage]);
            
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
            initialMessageSpokenForScenarioIdRef.current = null; 
          }
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (isMountedRef.current) router.push('/');
      }
    } else if (!scenarioId && scenario) { 
      console.log('[MeetingSimulation] scenarioId is null, resetting scenario state.');
      if(isMountedRef.current) setScenario(null);
      if(isMountedRef.current) setMessages([]);
      setMeetingActive(false);
      initialMessageSpokenForScenarioIdRef.current = null;
      ttsCancel();
      if (isRecording) sttStopListening();
    }
  // Dependencies like `ttsSpeak` are stable due to useCallback in their respective hooks
  // `sttStopListening`, `clearSTTError` are also stable from `useSpeechToText`
  // `scenario` is included to re-evaluate if the direct `scenario` object changes identity, though ID is primary driver.
  }, [scenarioId, router, toast, isRecording, scenario, ttsCancel, sttStopListening, clearSTTError]);


  const handleToggleRecording = () => {
    if (!meetingActive) { 
       toast({ title: "Meeting Not Started", description: "Please start the meeting before recording your response.", variant: "default"});
      return;
    }
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
      setIntentToSubmitAfterStop(false); 
      ttsCancel();
      if(isMountedRef.current) setBaseTextForSpeech(currentUserResponse); 
      console.log('[MeetingSimulation] Calling sttStartListening() from useSpeechToText.');
      sttStartListening();
    }
  };

  useEffect(() => {
    if (!isRecording && intentToSubmitAfterStop) {
      console.log("[MeetingSimulation] useEffect detected isRecording is false and intentToSubmitAfterStop is true.");
      if (currentUserResponse.trim() && meetingActive) { 
        console.log("[MeetingSimulation] Calling submitUserResponse due to intent after STT stop.");
        submitUserResponse();
      } else {
        console.log("[MeetingSimulation] STT stopped with intent to submit, but currentUserResponse is empty or meeting not active. Not submitting.");
      }
      if (isMountedRef.current) {
        setIntentToSubmitAfterStop(false); 
      }
    }
  }, [isRecording, intentToSubmitAfterStop, currentUserResponse, submitUserResponse, meetingActive]);


  return {
    scenario,
    messages,
    currentUserResponse,
    setCurrentUserResponse,
    isAiThinking,
    submitUserResponse,
    meetingEnded,
    meetingActive, 
    handleMeetingAction, 
    handleEndMeeting,
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening, 
    isTTSSpeaking, 
    currentSpeakingParticipant: ttsCurrentSpeaker,
  };
}

