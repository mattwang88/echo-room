"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole, Persona, AnalyzeResponseOutput } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
import { analyzeResponse, type AnalyzeResponseInput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech'; // Re-added
import { getAllUserPersonas } from '@/lib/userPersonas';

export function useMeetingSimulation(scenarioId: string | null) {
  const router = useRouter();
  const { toast } = useToast();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserResponse, setCurrentUserResponse] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [meetingEnded, setMeetingEnded] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentCoaching, setCurrentCoaching] = useState<AnalyzeResponseOutput | null>(null);
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(0);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // STT states
  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");

  // TTS states and functions - Re-added
  const { 
    ttsSpeak, 
    ttsCancel, 
    isTTSEnabled, 
    isTTSSpeaking, 
    toggleTTSEnabled 
  } = useTextToSpeech();

  const isMountedRef = useRef(true);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null);

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (listening && isTTSSpeaking) { // If STT starts and TTS is speaking
      console.log("[MeetingSimulation] STT started, cancelling active TTS.");
      ttsCancel();
    }
  }, [setIsRecording, isTTSSpeaking, ttsCancel]);

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
    setBaseTextForSpeech(prevBaseText => {
      const newCumulativeText = (prevBaseText ? prevBaseText + " " : "") + finalTranscriptSegment.trim();
      setCurrentUserResponse(newCumulativeText);
      return newCumulativeText;
    });
  }, [setCurrentUserResponse, setBaseTextForSpeech]);

  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
    const currentBase = baseTextForSpeech; // Use ref or state directly
    setCurrentUserResponse(currentBase + (currentBase ? " " : "") + interim);
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
      if (sttInternalIsListening) {
        sttStopListening();
      }
      ttsCancel(); // Cancel any TTS on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ttsCancel, sttStopListening are stable

  useEffect(() => {
    if (sttError) {
      console.warn("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
    }
  }, [sttError]);

  useEffect(() => {
    console.log(`[MeetingSimulation] Hook init/scenarioId change. isTTSEnabled initial value: ${isTTSEnabled}`);
    if (scenarioId) {
      console.log(`[MeetingSimulation] ScenarioID effect triggered. Current scenarioId: ${scenarioId}, initialMessageSpokenRef: ${initialMessageSpokenForScenarioIdRef.current}`);
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        if (initialMessageSpokenForScenarioIdRef.current !== scenarioId) {
          console.log(`[MeetingSimulation] New scenario detected (${scenarioId} !== ${initialMessageSpokenForScenarioIdRef.current}). Setting up scenario.`);
          setScenario(foundScenario);
          const initialMsg: Message = {
            id: Date.now().toString(),
            participant: foundScenario.initialMessage.participant,
            text: foundScenario.initialMessage.text,
            timestamp: Date.now(),
          };
          setMessages([initialMsg]);
          
          if (isTTSEnabled && initialMsg.text) {
            console.log(`[MeetingSimulation] Initial scenario setup: TTS is enabled. Speaking initial message: "${initialMsg.text.substring(0,30)}..."`);
            ttsSpeak(initialMsg.text, initialMsg.participant);
          } else {
            console.log(`[MeetingSimulation] Initial scenario setup: TTS is disabled or no initial text. Initial TTS enabled: ${isTTSEnabled}`);
          }
          
          initialMessageSpokenForScenarioIdRef.current = scenarioId;
          setCurrentTurn(0);
          setMeetingEnded(false);
          setCurrentCoaching(null);
          setCurrentUserResponse("");
          setBaseTextForSpeech("");
          setCurrentAgentIndex(0);
          if (isRecording) {
            sttStopListening();
          }
          clearSTTError(); 
        } else {
          console.log(`[MeetingSimulation] Scenario ${scenarioId} already processed for initial message. Skipping setup.`);
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (isMountedRef.current) router.push('/');
      }
    } else {
      setScenario(null);
      setMessages([]);
      initialMessageSpokenForScenarioIdRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast, isTTSEnabled, ttsSpeak]); // Added isTTSEnabled, ttsSpeak

  const addMessage = useCallback((participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput, participantName?: string) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      participantName,
      text,
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    };
    setMessages(prev => [...prev, newMessage]);

    if (participant !== 'User' && isTTSEnabled && text) {
      console.log(`[MeetingSimulation] Speaking message from ${participantName || participant}: "${text.substring(0,30)}..."`);
      ttsSpeak(text, participant);
    }
  }, [isTTSEnabled, ttsSpeak]);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current || !scenario) return;
    console.log("[MeetingSimulation] handleEndMeeting called.");
    if (isRecording) {
      sttStopListening();
    }
    ttsCancel(); // Cancel TTS on meeting end
    setMeetingEnded(true);
    const summaryData: MeetingSummaryData = {
      scenarioTitle: scenario.title,
      objective: scenario.objective,
      messages: messages,
    };
    try {
      localStorage.setItem('echoRoomMeetingSummary', JSON.stringify(summaryData));
      router.push(`/meeting/${scenario.id}/summary`);
    } catch (error) {
      console.error("Failed to save summary to localStorage:", error);
      toast({ title: "Error", description: "Could not save meeting summary.", variant: "destructive" });
    }
  }, [scenario, messages, router, toast, isRecording, sttStopListening, ttsCancel]); // Added ttsCancel

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) {
      if(isRecording) {
        toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
      }
      return;
    }
    if (isRecording) {
      sttStopListening();
      toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
      return; 
    }

    const userMsgText = currentUserResponse.trim();
    const userMessageId = Date.now().toString() + 'User' + Math.random(); 
    setMessages(prev => [...prev, {
      id: userMessageId,
      participant: 'User',
      text: userMsgText,
      timestamp: Date.now()
    }]);

    setCurrentUserResponse(""); 
    setBaseTextForSpeech(""); 
    setIsAiThinking(true);
    setCurrentCoaching(null); 

    try {
      const contextForAI = scenario.objective; 
      const coachingInput: AnalyzeResponseInput = { response: userMsgText, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsgText, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult }
          : msg
      ));

      const activeAgents = scenario.agentsInvolved;
      if (activeAgents && activeAgents.length > 0) {
        const agentToRespondRole = activeAgents[currentAgentIndex];
        let agentPersona = "";
        let agentName = "";
        
        // Find the persona details from the scenario's personaConfig
        const personaKey = `${agentToRespondRole.toLowerCase()}Persona`;
        agentPersona = scenario.personaConfig[personaKey] || `You are the ${agentToRespondRole}. Respond from this perspective.`;
        
        // Get the persona name from the personas list
        const matchingPersona = personas.find(p => p.role === agentToRespondRole);
        if (matchingPersona) {
          agentName = matchingPersona.name;
        }

        if (agentPersona) {
          const singleAgentSimInput: SimulateSingleAgentResponseInput = {
            userResponse: userMsgText,
            agentRole: agentToRespondRole as AgentRole, 
            agentPersona: agentPersona,
            scenarioObjective: contextForAI,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            addMessage(agentToRespondRole, agentResponse.agentFeedback, undefined, undefined, agentName);
          }
          setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length); 
        } else {
           console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.");
        handleEndMeeting();
      }

    } catch (error) {
      console.error("[MeetingSimulation] AI interaction error:", error);
      toast({ title: "AI Error", description: "An error occurred while processing your request.", variant: "destructive" });
      addMessage("System", "Sorry, I encountered an error. Please try again."); 
    } finally {
      if(isMountedRef.current) setIsAiThinking(false);
    }
  };

  const handleToggleRecording = () => {
    console.log(`[MeetingSimulation] handleToggleRecording called. Current isRecording state: ${isRecording}, browserSupportsSTT: ${browserSupportsSTT}`);
    if (!browserSupportsSTT) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    clearSTTError();

    if (isRecording) {
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else {
      if (isTTSSpeaking) { // If TTS is speaking when user tries to record
        console.log("[MeetingSimulation] User starting STT, cancelling active TTS.");
        ttsCancel();
      }
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      setBaseTextForSpeech(currentUserResponse); 
      sttStartListening();
    }
  };

  // Load personas on mount
  useEffect(() => {
    const userPersonas = getAllUserPersonas();
    setPersonas(userPersonas);
  }, []);

  return {
    scenario,
    messages,
    currentUserResponse,
    setCurrentUserResponse,
    isAiThinking,
    submitUserResponse,
    meetingEnded,
    handleEndMeeting,
    currentCoaching,
    // STT related
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening,
    // TTS related - Re-added
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking,
  };
}
