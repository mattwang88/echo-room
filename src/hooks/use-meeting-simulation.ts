"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole, Persona, AnalyzeResponseOutput, MessageAction } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
import { analyzeResponse, type AnalyzeResponseInput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech'; // Re-added
import { getAllUserPersonas } from '@/lib/userPersonas';
import { getLearningMode, setLearningMode } from '@/lib/userSettings';
import { detectReferencedAgent } from '@/lib/utils';

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
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(true);
  const [isLearningMode, setIsLearningMode] = useState<boolean>(false);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null); 
  const isMountedRef = useRef(true);

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");
  const [intentToSubmitAfterStop, setIntentToSubmitAfterStop] = useState(false);

  const { speak: ttsSpeak, cancel: ttsCancel, isSpeaking: isTTSSpeaking, currentSpeakingRole: ttsCurrentSpeaker } = useTextToSpeech();

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

  // Load personas on mount
  useEffect(() => {
    const userPersonas = getAllUserPersonas();
    setPersonas(userPersonas);
  }, []);

  // Load learning mode state on mount
  useEffect(() => {
    setIsLearningMode(getLearningMode());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (sttError) {
      console.warn("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
    }
  }, [sttError]);

  useEffect(() => {
    console.log(`[MeetingSimulation] ScenarioID effect. ID: ${scenarioId}, Current scenario: ${scenario?.id}`);
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      console.log(`[MeetingSimulation] Finding scenario for ID: ${scenarioId}. Found: ${!!foundScenario}`);
      if (foundScenario) {
        // Only reset if the scenario ID has actually changed or no scenario is loaded
        if (!scenario || scenario.id !== scenarioId) {
          console.log(`[MeetingSimulation] Loading scenario for ID: ${scenarioId}`);
          setScenario(foundScenario);
          const initialMsg: Message = {
            id: Date.now().toString(),
            participant: foundScenario.initialMessage.participant,
            text: foundScenario.initialMessage.text,
            timestamp: Date.now(),
          };
          setMessages([initialMsg]);
          
          // Reset other states
          setCurrentTurn(0);
          setMeetingEnded(false);
          setCurrentUserResponse("");
          setBaseTextForSpeech("");
          setCurrentAgentIndex(0);
          if (isRecording) { // Use state 'isRecording'
            sttStopListening();
          }
          clearSTTError();
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (isMountedRef.current) router.push('/');
      }
    } else {
      // If scenarioId becomes null (e.g., navigating away), reset the scenario
      setScenario(null);
      setMessages([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // Dependencies kept minimal, other resets happen inside the effect

  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp'>) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + messageData.participant + Math.random(),
      ...messageData,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);

    // Only speak if TTS is enabled
    if (isTTSEnabled && meetingActive && messageData.participant !== 'User' && !messageData.action) {
      if (scenario && initialMessageSpokenForScenarioIdRef.current === scenario.id && 
          !(messageData.text === scenario.initialMessage.text && messageData.participant === scenario.initialMessage.participant)) {
            console.log(`[MeetingSimulation] AddMessage (subsequent): Attempting TTS. Participant: ${messageData.participant}, Text: "${messageData.text.substring(0,30)}..."`);
            ttsSpeak(messageData.text, messageData.participant);
      } else if (scenario && initialMessageSpokenForScenarioIdRef.current !== scenario.id) {
        console.log(`[MeetingSimulation] AddMessage: TTS for initial message likely handled by handleMeetingAction. Participant: ${messageData.participant}, Text: "${messageData.text.substring(0,30)}..."`);
      } else {
        console.log(`[MeetingSimulation] AddMessage: TTS condition not fully met or already handled for initial message. Participant: ${messageData.participant}, Active: ${meetingActive}, InitialMsgRef: ${initialMessageSpokenForScenarioIdRef.current}, Text: "${messageData.text.substring(0,30)}..."`);
      }
    } else if (messageData.participant !== 'User') {
      console.log(`[MeetingSimulation] AddMessage: SKIPPING TTS (standard). Participant: ${messageData.participant}, Active: ${meetingActive}, Has Action: ${!!messageData.action}, Text: "${messageData.text.substring(0,30)}..."`);
    }
  }, [setMessages, ttsSpeak, meetingActive, scenario, isTTSEnabled]);


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
         // Add the message to the display
         addMessage({ 
          participant: actualInitialMessage.participant,
          text: actualInitialMessage.text,
        });
        
        // Only speak if TTS is enabled
        if (isTTSEnabled) {
          console.log(`[MeetingSimulation] handleMeetingAction: Explicitly attempting TTS for initial message. Participant: ${actualInitialMessage.participant}, Text: "${actualInitialMessage.text.substring(0,30)}..."`);
          ttsSpeak(actualInitialMessage.text, actualInitialMessage.participant);
        }
        
        initialMessageSpokenForScenarioIdRef.current = scenario.id; 
      }
    }
  }, [scenario, addMessage, setMeetingActive, ttsSpeak, isTTSEnabled]);


  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
    console.log('[MeetingSimulation] Ending meeting.');

    if (isRecording) {
      console.log('[MeetingSimulation] Stopping STT due to meeting end.');
      sttStopListening();
    }

    // Cancel any ongoing TTS and ensure cleanup
    console.log('[MeetingSimulation] Cancelling any ongoing TTS due to meeting end.');
    ttsCancel();
    
    // Add a small delay to ensure TTS cleanup is complete before state changes
    setTimeout(() => {
      if (!isMountedRef.current) return;
      
      setMeetingEnded(true);
      setMeetingActive(false);
      setIsTTSEnabled(false); // Disable TTS when meeting ends

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
    }, 200); // Increased delay to ensure cleanup
  }, [scenario, messages, router, toast, isRecording, ttsCancel, setMeetingEnded, setMeetingActive, sttStopListening]);


  const submitUserResponse = useCallback(async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking || !meetingActive) { 
      return;
    }

    const userMsgText = currentUserResponse.trim();
    
    // Analyze user's message for uncertainty or confusion
    const userMessageAnalysis = {
      containsQuestion: userMsgText.includes('?'),
      containsUncertainty: /\b(?:not sure|unsure|confused|don't know|don't understand|maybe|perhaps|possibly)\b/i.test(userMsgText),
      isShort: userMsgText.split(' ').length < 5,
      containsHesitation: /\b(?:um|uh|er|well|like|kind of|sort of)\b/i.test(userMsgText),
    };

    setMessages(prev => [...prev, { 
      id: Date.now().toString() + 'User' + Math.random(), 
      participant: 'User', 
      text: userMsgText, 
      timestamp: Date.now() 
    }]);

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
        // --- AGENT DETECTION LOGIC ---
        const referencedAgent = detectReferencedAgent(userMsgText, activeAgents, personas);
        let agentRolesToRespond: string[];
        if (referencedAgent) {
          agentRolesToRespond = [referencedAgent];
        } else {
          agentRolesToRespond = [activeAgents[currentAgentIndex]];
        }
        for (const agentToRespondRole of agentRolesToRespond) {
          let agentPersona = "";
          const personaKey = `${agentToRespondRole.toLowerCase().replace(/\s+/g, '')}Persona`;
          agentPersona = scenario.personaConfig[personaKey] || `You are the ${agentToRespondRole}. Respond from this perspective.`;
          // Find persona name if available
          let agentPersonaName: string | undefined = undefined;
          if (personas && personas.length > 0) {
            const foundPersona = personas.find(p => p.role === agentToRespondRole);
            if (foundPersona) agentPersonaName = foundPersona.name;
          }
          if (agentPersona) {
            // Enhance the user's message with analysis for learning mode
            const enhancedUserMessage = isLearningMode 
              ? `${userMsgText}\n\n[User State Analysis: ${JSON.stringify(userMessageAnalysis)}]`
              : userMsgText;
            const singleAgentSimInput: SimulateSingleAgentResponseInput = {
              userResponse: enhancedUserMessage,
              agentRole: agentToRespondRole as AgentRole,
              agentPersona: agentPersona,
              scenarioObjective: scenario.objective,
              isLearningMode,
              internalDocs: "", // The function will read this from file internally
              agentPersonaName,
              meetingContext: {
                messageHistory: messages,
                otherAgents: activeAgents
                  .filter(role => role !== agentToRespondRole)
                  .map(role => {
                    const personaKey = `${role.toLowerCase().replace(/\s+/g, '')}Persona`;
                    const persona = scenario.personaConfig[personaKey] || `You are the ${role}. Respond from this perspective.`;
                    const foundPersona = personas?.find(p => p.role === role);
                    return {
                      role,
                      name: foundPersona?.name,
                      persona,
                    };
                  }),
              },
            };
            const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
            if (agentResponse && agentResponse.agentFeedback) {
              addMessage({
                participant: agentToRespondRole,
                text: agentResponse.agentFeedback,
                participantName: agentPersonaName,
              });
            }
          } else {
            console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
          }
        }
        // Only increment agent index if not a direct reference (i.e., round-robin mode)
        if (!referencedAgent && isMountedRef.current) setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length);
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
    currentTurn, setCurrentTurn, handleEndMeeting, toast, setMessages, isLearningMode, personas
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
              action: { type: 'button', label: 'Start Meeting', actionKey: 'INITIATE_MEETING_START', disabled: false }
            };
            // This message has an action, so addMessage's TTS logic will skip it.
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
      if (currentUserResponse.trim() && meetingActive) { 
        submitUserResponse();
      }
      if (isMountedRef.current) {
        setIntentToSubmitAfterStop(false); 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isRecording, intentToSubmitAfterStop, currentUserResponse, submitUserResponse, meetingActive]);

  const toggleTTS = useCallback(() => {
    // Cancel any ongoing TTS before changing the state
    if (isTTSSpeaking) {
      console.log('[MeetingSimulation] Cancelling ongoing TTS due to toggle');
      ttsCancel();
      // Add a small delay to ensure TTS cleanup is complete
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsTTSEnabled(prev => !prev);
        }
      }, 200); // Increased delay to ensure cleanup
    } else {
      setIsTTSEnabled(prev => !prev);
    }
  }, [isTTSSpeaking, ttsCancel]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (isTTSSpeaking) {
        console.log('[MeetingSimulation] Cleaning up TTS on unmount');
        ttsCancel();
      }
    };
  }, [isTTSSpeaking, ttsCancel]);

  // Update learning mode state when it changes
  const handleSetLearningMode = useCallback((enabled: boolean) => {
    setIsLearningMode(enabled);
    setLearningMode(enabled);
    toast({
      title: enabled ? "Learning Mode Enabled" : "Learning Mode Disabled",
      description: enabled 
        ? "Personas will now act as teachers, providing guidance and education."
        : "Personas will now act as regular meeting participants.",
    });
  }, [toast]);

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
    currentSpeakingRole: ttsCurrentSpeaker,
    personas,
    isTTSEnabled,
    toggleTTS,
    isLearningMode,
    setIsLearningMode: handleSetLearningMode,
  };
}

