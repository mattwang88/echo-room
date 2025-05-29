
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

  const [isRecording, setIsRecording] = useState(false); // Local state reflecting STT active status
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>(""); // Text before STT starts for current utterance

  const {
    isListening: sttIsListening, // isListening from the hook
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported,
    sttError,
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
      // This is the callback from useSpeechToText hook when its internal isListening state changes.
      // We use this to update our local isRecording state.
      console.log("[MeetingSimulation] STT Listening state changed from hook:", listening);
      setIsRecording(listening);
      if (!listening) {
        // Optional: if you want to clear baseTextForSpeech only when recording fully stops
        // setBaseTextForSpeech(""); // Or handle this when starting a new recording
      }
    }
  });

   useEffect(() => {
    if (sttError) {
      console.error("[MeetingSimulation] Observed STT Error from hook:", sttError);
      // Toast is handled by useSpeechToText hook for most errors like permissions etc.
      // but we could add more specific toasts here if needed for app-level context.
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
        setIsRecording(false); // Ensure recording state is reset
        clearSTTError(); 
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
    if (isRecording) { // Use local isRecording which should reflect sttIsListening
      console.log("[MeetingSimulation] handleEndMeeting: Stopping STT recording.");
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
    if (!currentUserResponse.trim() || !scenario || isAiThinking || isRecording) { 
        console.log("[MeetingSimulation] Submit blocked. Response:", currentUserResponse, "AI thinking:", isAiThinking, "Recording:", isRecording);
        if(isRecording) {
          toast({ title: "Recording Active", description: "Please stop recording before sending.", variant: "default"});
        }
        return;
    }

    const userMsg = currentUserResponse.trim();
    addMessage("User", userMsg);
    setCurrentUserResponse("");
    setBaseTextForSpeech(""); 
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: scenario.objective || "General Discussion" };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: scenario.objective || "General Discussion" };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map((msg, index) => {
        // Ensure we target the correct recently added user message
        if (index === prev.length -1 && msg.participant === 'User' && msg.text === userMsg && !msg.coachingFeedback) {
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
            // default: console.warn(`[MeetingSimulation] No default persona mapping for agent role: ${agentToRespondRole}`);
          }
        }

        if (agentPersona) {
          const singleAgentSimInput: SimulateSingleAgentResponseInput = {
            userResponse: userMsg,
            agentRole: agentToRespondRole as AgentRole, // Cast as AgentRole if certain
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
           // Maybe add a generic system message if an agent can't respond?
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

  const handleToggleRecording = () => {
    console.log("[MeetingSimulation] handleToggleRecording called. Current isRecording (local state):", isRecording, "sttIsListening (hook state):", sttIsListening);
    if (isRecording) { // Use local isRecording, which should be synced with sttIsListening
      sttStopListening();
    } else {
      if (!isSTTSupported) {
        toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
        return;
      }
      clearSTTError();
      // Capture the current text field content to prepend to the STT result
      // This ensures if user types then speaks, text is not lost.
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
    isRecording, // Expose local isRecording state, which is updated by onListeningChange
    handleToggleRecording,
    isSTTSupported,
  };
}
