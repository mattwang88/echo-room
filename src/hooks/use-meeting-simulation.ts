
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
  // const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null); // For TTS, not currently used

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
    // Get the latest baseTextForSpeech using a functional update for setCurrentUserResponse
    setCurrentUserResponse(prevResponse => {
        // Determine what part of prevResponse is the "base" before any previous interim
        // This assumes baseTextForSpeech is the text *before* any current recording's interim/final parts.
        return baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim;
    });
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
      if (sttInternalIsListening) { // Use the direct state from the hook for cleanup
        sttStopListening();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sttStopListening is stable

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
          setCurrentCoaching(null);
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
    setMeetingEnded(true); // Set meeting ended state first
    console.log("[MeetingSimulation] handleEndMeeting called.");
    if (isRecording) {
      sttStopListening();
    }
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
  }, [scenario, messages, router, toast, isRecording, sttStopListening, setMeetingEnded]);

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
      console.time("analyzeResponse");
      const contextForAI = scenario.objective;
      const coachingInput: AnalyzeResponseInput = { response: userMsgText, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);
      console.timeEnd("analyzeResponse");

      console.time("evaluateSemanticSkill");
      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsgText, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);
      console.timeEnd("evaluateSemanticSkill");

      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult }
          : msg
      ));

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
            scenarioObjective: contextForAI,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            console.log(`[MeetingSimulation] Initiating addMessage (and subsequent TTS) for ${agentToRespondRole} at ${Date.now()}`);
            addMessage(agentToRespondRole, agentResponse.agentFeedback);
          }
          setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length);
        } else {
           console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }
      console.timeEnd("simulateSingleAgentResponse");

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
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
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
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening, // Exposing for diagnostic bar if needed, actual state used by UI is isRecording
  };
}
