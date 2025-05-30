
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole, AgentRole, AnalyzeResponseOutput, EvaluateSemanticSkillOutput } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateSingleAgentResponse, type SimulateSingleAgentResponseInput } from '@/ai/flows/simulate-single-agent-response';
// analyzeResponse and evaluateSemanticSkill are no longer called here
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
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(0);
  // currentCoaching is removed as coaching happens on the summary page

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");

  const isMountedRef = useRef(true);
  const initialMessageSpokenForScenarioIdRef = useRef<string | null>(null);

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    setIsRecording(listening);
  }, [setIsRecording]); // setIsRecording is stable

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    setBaseTextForSpeech(prevBaseText => {
      const newCumulativeText = (prevBaseText ? prevBaseText + " " : "") + finalTranscriptSegment.trim();
      setCurrentUserResponse(newCumulativeText);
      return newCumulativeText;
    });
  }, [setCurrentUserResponse, setBaseTextForSpeech]); // setCurrentUserResponse is stable

  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
     // Use a more stable way to construct current response with interim results
     setCurrentUserResponse(prev => baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]); // setCurrentUserResponse is stable

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
    };
  }, [sttInternalIsListening, sttStopListening]);

  useEffect(() => {
    if (sttError && isMountedRef.current) {
      // Errors are already toasted within useSpeechToText
      console.warn("[MeetingSimulation] STT Error from hook:", sttError);
    }
  }, [sttError]);

  useEffect(() => {
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        if (!scenario || scenario.id !== scenarioId) {
          setScenario(foundScenario);
          const initialMsg: Message = {
            id: Date.now().toString(),
            participant: foundScenario.initialMessage.participant,
            text: foundScenario.initialMessage.text,
            timestamp: Date.now(),
          };
          setMessages([initialMsg]);
          setCurrentTurn(0);
          setMeetingEnded(false);
          setCurrentUserResponse("");
          setBaseTextForSpeech("");
          setCurrentAgentIndex(0);
          if (isRecording) {
            sttStopListening();
          }
          clearSTTError();
          initialMessageSpokenForScenarioIdRef.current = null;
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        if (isMountedRef.current) router.push('/');
      }
    } else {
      setScenario(null);
      setMessages([]);
    }
  }, [scenarioId, router, toast, isRecording, sttStopListening, clearSTTError, scenario]);

  const addMessage = useCallback((participant: ParticipantRole, text: string) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      text,
      timestamp: Date.now(),
      // coachingFeedback and semanticEvaluation will be added on the summary page
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current) return;
    setMeetingEnded(true); // Set this first
    if (!scenario) return;

    if (isRecording) {
      sttStopListening();
    }

    const summaryData: MeetingSummaryData = {
      scenarioTitle: scenario.title,
      objective: scenario.objective,
      messages: messages, // Messages will not have feedback yet
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
    // Add user message without feedback
    addMessage('User', userMsgText);

    setCurrentUserResponse("");
    setBaseTextForSpeech("");
    setIsAiThinking(true);

    try {
      // Removed calls to analyzeResponse and evaluateSemanticSkill

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
    if (!browserSupportsSTT) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    clearSTTError();

    if (isRecording) {
      sttStopListening();
    } else {
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
    // currentCoaching removed
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening,
  };
}
