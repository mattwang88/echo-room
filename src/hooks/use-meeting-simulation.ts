
"use client";

import { useState, useEffect, useCallback } from 'react';
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

  // Speech-to-Text
  const [isRecording, setIsRecording] = useState(false);
  // baseTextForSpeech stores text that was in the input *before* STT started for the current utterance,
  // or the accumulated final transcript of the current multi-segment utterance.
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");

  const {
    isListening: sttIsListening,
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported,
    sttError, // We can observe this if needed, but useSpeechToText handles toasts
    clearSTTError,
  } = useSpeechToText({
    onTranscript: (finalTranscriptSegment) => {
      console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
      const newText = baseTextForSpeech + (baseTextForSpeech ? " " : "") + finalTranscriptSegment;
      setCurrentUserResponse(newText);
      setBaseTextForSpeech(newText); // Update base for next potential segment in same utterance
    },
    onInterimTranscript: (interim) => {
      // console.log("[MeetingSimulation] STT Interim transcript received:", interim);
      setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
    },
    onListeningChange: (listening) => {
      console.log("[MeetingSimulation] STT Listening state changed from hook:", listening);
      setIsRecording(listening);
      if (!listening && sttIsListening) {
        // This case means the hook reported it stopped, but our local sttIsListening was still true.
        // This might happen if onListeningChange is called slightly before sttIsListening from the hook updates.
        // It's mostly for logging; setIsRecording(listening) is the key action.
        console.log("[MeetingSimulation] STT hook reported stop, local sttIsListening was true.");
      }
      // When recording actually stops (listening becomes false), we don't clear currentUserResponse here.
      // It holds the final transcript. baseTextForSpeech will be reset when a new recording starts.
    }
  });

   // Effect to monitor sttError from the hook if needed for additional logic
   useEffect(() => {
    if (sttError) {
      console.error("[MeetingSimulation] Observed STT Error from hook:", sttError);
      // Toast is already handled by useSpeechToText hook for most errors
    }
  }, [sttError]);


  useEffect(() => {
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        setScenario(foundScenario);
        setMessages([{
          id: Date.now().toString(),
          participant: foundScenario.initialMessage.participant,
          text: foundScenario.initialMessage.text,
          timestamp: Date.now(),
        }]);
        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        setCurrentUserResponse("");
        setBaseTextForSpeech("");
        setCurrentAgentIndex(0);
        clearSTTError(); // Clear any lingering STT errors from previous sessions/scenarios
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // clearSTTError is stable

  const addMessage = (participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      text,
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
    if (sttIsListening) sttStopListening(); // Use sttIsListening from hook
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
  }, [scenario, messages, router, toast, sttIsListening, sttStopListening]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking || isRecording) { // isRecording is local state
        console.log("[MeetingSimulation] Submit blocked. Response:", currentUserResponse, "AI thinking:", isAiThinking, "Recording:", isRecording);
        return;
    }

    const userMsg = currentUserResponse.trim();
    addMessage("User", userMsg);
    setCurrentUserResponse("");
    setBaseTextForSpeech(""); // Reset for next text input or STT
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: scenario.objective || "General Discussion" };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: scenario.objective || "General Discussion" };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map((msg, index) => {
        if (index === prev.length -1 && msg.participant === 'User' && msg.text === userMsg) {
            return { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult };
        }
        return msg;
      }));


      const activeAgents = scenario.agentsInvolved;
      if (activeAgents && activeAgents.length > 0) {
        const agentToRespondRole = activeAgents[currentAgentIndex];
        let agentPersona = "";

        // Determine persona based on scenario and role
        if (scenario.id === 'manager-1on1' && agentToRespondRole === 'Product') {
          agentPersona = scenario.personaConfig.productPersona;
        } else if (scenario.id === 'job-resignation' && agentToRespondRole === 'HR') {
           agentPersona = scenario.personaConfig.hrPersona;
        }else { // Default persona mapping
          switch (agentToRespondRole) {
            case 'CTO': agentPersona = scenario.personaConfig.ctoPersona; break;
            case 'Finance': agentPersona = scenario.personaConfig.financePersona; break;
            case 'Product': agentPersona = scenario.personaConfig.productPersona; break;
            case 'HR': agentPersona = scenario.personaConfig.hrPersona; break;
          }
        }

        if (agentPersona) {
          const singleAgentSimInput: SimulateSingleAgentResponseInput = {
            userResponse: userMsg,
            agentRole: agentToRespondRole as AgentRole,
            agentPersona: agentPersona,
            scenarioObjective: scenario.objective || "General Discussion",
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
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    // This effect ensures isRecording (local state) is in sync with sttIsListening (from hook)
    // This is a bit redundant if onListeningChange directly calls setIsRecording, but acts as a safeguard/logger
    if (isRecording !== sttIsListening) {
      console.log(`[MeetingSimulation] Syncing isRecording (${isRecording}) with sttIsListening (${sttIsListening})`);
      setIsRecording(sttIsListening);
    }
  }, [sttIsListening, isRecording]);


  const handleToggleRecording = () => {
    console.log("[MeetingSimulation] handleToggleRecording called. Current sttIsListening:", sttIsListening, "isRecording (local):", isRecording);
    if (sttIsListening) { // Use sttIsListening as the source of truth for current recording state
      sttStopListening();
    } else {
      if (!isSTTSupported) {
        // Toast is handled by useSpeechToText if startListening is called when not supported
        console.warn("[MeetingSimulation] STT not supported, cannot start recording.");
        return;
      }
      clearSTTError();
      // Capture the current text field content to prepend to the STT result
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
    isRecording: sttIsListening, // Expose sttIsListening directly as isRecording
    handleToggleRecording,
    isSTTSupported,
  };
}
