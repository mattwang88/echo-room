
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
import { analyzeResponse, type AnalyzeResponseInput, type AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText';

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

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");

  const isMountedRef = useRef(true);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null);

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
  }, [setIsRecording]);

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
    const currentBase = baseTextForSpeech;
    setCurrentUserResponse(currentBase + (currentBase ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]);


  const {
    isListening: sttInternalIsListening, // This is the internal state from useSpeechToText
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
        console.log("[MeetingSimulation] Unmounting: Stopping STT recording.");
        sttStopListening();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sttStopListening is stable

  useEffect(() => {
    if (sttError) {
      console.warn("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
      // Potentially show a toast here if desired, but useSpeechToText already shows one for critical errors
    }
  }, [sttError]);

  useEffect(() => {
    console.log(`[MeetingSimulation] Initializing simulation hook.`);
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
          console.log(`[MeetingSimulation] Initial scenario message added. Participant: ${initialMsg.participant}`);
          
          initialMessageSpokenForScenarioIdRef.current = scenarioId;
          setCurrentTurn(0);
          setMeetingEnded(false);
          setCurrentCoaching(null);
          setCurrentUserResponse("");
          setBaseTextForSpeech("");
          setCurrentAgentIndex(0);
          if (isRecording) { // if previous scenario was recording
            console.log("[MeetingSimulation] Scenario changed while STT recording. Stopping STT.");
            sttStopListening();
          }
          clearSTTError(); // Clear any errors from previous STT sessions
        } else {
          console.log(`[MeetingSimulation] Scenario ${scenarioId} already processed for initial message. Skipping setup.`);
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (isMountedRef.current) router.push('/');
      }
    } else {
      console.log("[MeetingSimulation] No scenarioId provided on init or change.");
      // Reset if scenarioId becomes null
      setScenario(null);
      setMessages([]);
      initialMessageSpokenForScenarioIdRef.current = null; // Allow re-init if a scenarioId is later provided
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // sttStopListening, clearSTTError are stable

  const addMessage = useCallback((participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      text,
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current || !scenario) return;
    console.log("[MeetingSimulation] handleEndMeeting called.");
    if (isRecording) {
      console.log("[MeetingSimulation] handleEndMeeting: Stopping STT recording if active.");
      sttStopListening();
    }
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
  }, [scenario, messages, router, toast, isRecording, sttStopListening]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) {
      if(isRecording) {
        toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
      }
      return;
    }
    if (isRecording) {
      // This case should ideally be prevented by disabling send button while recording
      console.log("[MeetingSimulation] submitUserResponse: STT recording was active. Stopping it now.");
      sttStopListening();
      toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
      return; // Don't submit yet, let user confirm after STT stops
    }

    const userMsgText = currentUserResponse.trim();
    const userMessageId = Date.now().toString() + 'User' + Math.random(); // Unique ID for the user message
     setMessages(prev => [...prev, {
      id: userMessageId,
      participant: 'User',
      text: userMsgText,
      timestamp: Date.now()
    }]);

    setCurrentUserResponse(""); // Clear input after adding message
    setBaseTextForSpeech(""); // Clear base text for speech
    setIsAiThinking(true);
    setCurrentCoaching(null); // Reset coaching for new response

    try {
      const contextForAI = scenario.objective; // Use scenario objective as context
      const coachingInput: AnalyzeResponseInput = { response: userMsgText, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsgText, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      // Update the specific user message with feedback
      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult }
          : msg
      ));

      const activeAgents = scenario.agentsInvolved;
      if (activeAgents && activeAgents.length > 0) {
        const agentToRespondRole = activeAgents[currentAgentIndex];
        let agentPersona = "";
        
        // Specific persona logic for different scenarios and roles
        if (scenario.id === 'manager-1on1' && agentToRespondRole === 'Product') {
            agentPersona = scenario.personaConfig.productPersona;
        } else if (scenario.id === 'job-resignation' && agentToRespondRole === 'HR') {
             agentPersona = scenario.personaConfig.hrPersona;
        } else {
            // General persona mapping
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
            agentRole: agentToRespondRole as AgentRole, // Cast as AgentRole, ensure it's not 'User' or 'System'
            agentPersona: agentPersona,
            scenarioObjective: contextForAI,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            addMessage(agentToRespondRole, agentResponse.agentFeedback);
          }
          setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length); // Cycle to the next agent
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
      addMessage("System", "Sorry, I encountered an error. Please try again."); // Inform user
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
    clearSTTError(); // Clear any previous errors before starting/stopping

    if (isRecording) {
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else {
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      // When starting recording, preserve current text field content as base
      setBaseTextForSpeech(currentUserResponse); 
      sttStartListening();
    }
  };

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
    sttInternalIsListening, // Expose for diagnostic UI if needed
  };
}
