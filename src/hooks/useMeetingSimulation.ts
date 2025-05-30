
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, MeetingSummaryData, ParticipantRole } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateAiAgents, type SimulateAiAgentsInput } from '@/ai/flows/simulate-ai-agents';
import { analyzeResponse, type AnalyzeResponseInput, type AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from './useSpeechToText'; // Added

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
  const [currentSpeakingParticipant, setCurrentSpeakingParticipant] = useState<ParticipantRole | null>(null);

  // Speech-to-Text state and handlers
  const [isRecording, setIsRecording] = useState(false);
  const [sttInterimTranscript, setSttInterimTranscript] = useState("");

  const { 
    isListening: sttIsListening, 
    startListening: sttStartListening, 
    stopListening: sttStopListening, 
    isSTTSupported,
    interimTranscript: sttHookInterimTranscript,
  } = useSpeechToText({
    onTranscript: (transcript) => {
      setCurrentUserResponse(prev => (prev ? prev + " " : "") + transcript);
      setSttInterimTranscript(""); // Clear interim when final transcript is received
    },
    onInterimTranscript: (interim) => {
      setSttInterimTranscript(interim);
    },
    onListeningChange: (listening) => {
      setIsRecording(listening);
      if (!listening) { // If stopped listening, clear interim transcript display
        setSttInterimTranscript("");
      }
    }
  });

  useEffect(() => {
    setIsRecording(sttIsListening);
  }, [sttIsListening]);

  useEffect(() => {
    setSttInterimTranscript(sttHookInterimTranscript);
  }, [sttHookInterimTranscript]);


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
        setCurrentSpeakingParticipant(foundScenario.initialMessage.participant);
        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        setCurrentUserResponse("");
        setIsRecording(false);
        setSttInterimTranscript("");
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [scenarioId, router, toast]);

  const addMessage = (participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    setCurrentSpeakingParticipant(participant);
    setMessages(prev => [...prev, { 
      id: Date.now().toString() + participant + Math.random(), 
      participant, 
      text, 
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    }]);
  };

  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
    if (isRecording) sttStopListening(); // Stop recording if meeting ends
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

    addMessage("User", currentUserResponse);
    const userMsg = currentUserResponse;
    setCurrentUserResponse("");
    setIsAiThinking(true);
    setCurrentCoaching(null); 

    try {
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: scenario.objective };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);
      
      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: scenario.objective };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map(msg => 
        msg.text === userMsg && msg.participant === "User" && !msg.coachingFeedback && msg.id === messages[messages.length-1].id // target the last added user message
        ? {...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult} 
        : msg
      ));
      
      const agentSimInput: SimulateAiAgentsInput = {
        proposal: userMsg, 
        ctoPersona: scenario.personaConfig.ctoPersona,
        financePersona: scenario.personaConfig.financePersona,
        productPersona: scenario.personaConfig.productPersona,
        hrPersona: scenario.personaConfig.hrPersona,
      };
      const agentResponses = await simulateAiAgents(agentSimInput);

      const activeAgents = scenario.agentsInvolved;
      if (activeAgents.includes('CTO') && agentResponses.ctoFeedback) {
        addMessage('CTO', agentResponses.ctoFeedback);
      }
      if (activeAgents.includes('Finance') && agentResponses.financeFeedback) {
        addMessage('Finance', agentResponses.financeFeedback);
      }
      if (activeAgents.includes('Product') && agentResponses.productFeedback) {
        addMessage('Product', agentResponses.productFeedback);
      }
      if (activeAgents.includes('HR') && agentResponses.hrFeedback) {
        addMessage('HR', agentResponses.hrFeedback);
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.");
        handleEndMeeting(); // This will also stop recording if active
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
      // Safegaurd handled in submitUserResponse
    }
  }, [currentTurn, scenario, meetingEnded, handleEndMeeting]);


  const handleToggleRecording = () => {
    if (isRecording) {
      sttStopListening();
    } else {
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
    isSTTSupported,
    sttInterimTranscript,
    // TTS related (used by MeetingInterface to show who is speaking)
    currentSpeakingParticipant,
  };
}
