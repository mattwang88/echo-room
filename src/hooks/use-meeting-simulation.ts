
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
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>(""); 

  const {
    isListening: sttIsListening,
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported,
    sttError, 
    clearSTTError,
  } = useSpeechToText({
    onTranscript: (finalTranscriptSegment) => {
      console.log("[MeetingSimulation] STT Final Transcript Segment:", finalTranscriptSegment);
      const newText = baseTextForSpeech + (baseTextForSpeech ? " " : "") + finalTranscriptSegment;
      setCurrentUserResponse(newText);
      setBaseTextForSpeech(newText); 
    },
    onInterimTranscript: (interim) => {
       console.log("[MeetingSimulation] STT Interim transcript received:", interim);
      setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
    },
    onListeningChange: (listening) => {
      setIsRecording(listening);
      if (!listening) {
        // When recording stops, the current user response is already set from onTranscript/onInterimTranscript.
        // We might want to reset baseTextForSpeech here *if* we intend each recording session to be completely fresh,
        // or keep it if we want to allow pausing and resuming speech into the same text.
        // For now, let's clear it to make each recording session discrete after it stops.
        setBaseTextForSpeech(""); 
      }
    }
  });

  useEffect(() => {
    if (sttError) {
      console.error("STT Error in useMeetingSimulation:", sttError);
      // Toast is already handled in useSpeechToText
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
        setIsRecording(false);
        setBaseTextForSpeech("");
        setCurrentAgentIndex(0);
        clearSTTError();
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // Removed clearSTTError from deps as it's stable

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
    if (isRecording) sttStopListening();
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
    if (!currentUserResponse.trim() || !scenario || isAiThinking || isRecording) return;

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
        // Ensure we are targeting the correct user message that was just added.
        // Check against a unique ID or a combination of text and timestamp if IDs are not set before this.
        // For simplicity, assuming the last message that is 'User' and matches text is the one.
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
        } else { // Default persona mapping
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
           console.warn(`No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.");
        handleEndMeeting();
      }

    } catch (error) {
      console.error("AI interaction error:", error);
      toast({ title: "AI Error", description: "An error occurred while processing your request.", variant: "destructive" });
      addMessage("System", "Sorry, I encountered an error. Please try again.");
    } finally {
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    if (scenario?.maxTurns && currentTurn >= scenario.maxTurns && !meetingEnded) {
      // This check is primarily handled within submitUserResponse after turn increment
    }
  }, [currentTurn, scenario, meetingEnded, handleEndMeeting]);


  const handleToggleRecording = () => {
    if (sttIsListening) { 
      sttStopListening();
    } else {
      if (!isSTTSupported) {
        // Toast is already handled in useSpeechToText's startListening if not supported
        return;
      }
      clearSTTError(); 
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
    isRecording: sttIsListening, // Use sttIsListening directly
    handleToggleRecording,
    isSTTSupported,
  };
}
