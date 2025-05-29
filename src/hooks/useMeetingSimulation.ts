
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, AgentRole, MeetingSummaryData, ParticipantRole } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateAiAgents, type SimulateAiAgentsInput } from '@/ai/flows/simulate-ai-agents';
import { analyzeResponse, type AnalyzeResponseInput, type AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from './useTextToSpeech';
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

  const { speak, cancel: cancelTTS, isSpeaking: isTTSSpeaking, isSupported: isTTSSupported } = useTextToSpeech();
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(false);

  const handleTranscript = useCallback((transcript: string) => {
    setCurrentUserResponse(prev => prev ? prev + " " + transcript : transcript);
  }, []);

  const handleSTTListeningChange = (listening: boolean) => {
    // Can use this for UI updates if needed, e.g. global listening indicator
  };
  
  const handleSTTError = useCallback((error: string | null) => {
    if (error) {
      toast({ title: "Speech Recognition Error", description: error, variant: "destructive" });
    }
  }, [toast]);

  const { 
    startListening: startSTTListening, 
    stopListening: stopSTTListening, 
    isListening: isSTTListening, 
    isSupported: isSTTSupported,
    interimTranscript, 
  } = useSpeechToText({ 
    onTranscript: handleTranscript,
    onListeningChange: handleSTTListeningChange,
    onError: handleSTTError,
  });

  const toggleTTS = useCallback(() => {
    if (!isTTSSupported) {
      toast({ title: "Text-to-Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
      setIsTTSEnabled(false);
      return;
    }
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isTTSSpeaking) {
        cancelTTS(); 
      }
      return newState;
    });
  }, [isTTSSupported, isTTSSpeaking, cancelTTS, toast]);

  useEffect(() => {
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        setScenario(foundScenario);
        const initialMsg = {
          id: Date.now().toString(),
          participant: foundScenario.initialMessage.participant,
          text: foundScenario.initialMessage.text,
          timestamp: Date.now(),
        };
        setMessages([initialMsg]);
        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        if (isTTSEnabled && isTTSSupported && initialMsg.participant !== 'User') {
          speak(initialMsg.text);
        }
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [scenarioId, router, toast]); 


  const addMessage = useCallback((participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    const newMessage: Message = { 
      id: Date.now().toString() + participant + Math.random(), 
      participant, 
      text, 
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (isTTSEnabled && participant !== 'User' && isTTSSupported) {
      if (isTTSSpeaking) cancelTTS(); 
      speak(text);
    }
  }, [isTTSEnabled, speak, isTTSSupported, isTTSSpeaking, cancelTTS]);


  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
    if (isTTSSpeaking) cancelTTS(); 
    if (isSTTListening) stopSTTListening();
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
  }, [scenario, messages, router, toast, isTTSSpeaking, cancelTTS, isSTTListening, stopSTTListening]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) return;

    if (isTTSSpeaking) cancelTTS();
    if (isSTTListening) stopSTTListening();


    const userText = currentUserResponse;
    setMessages(prev => [...prev, { 
      id: Date.now().toString() + "User" + Math.random(), 
      participant: "User", 
      text: userText, 
      timestamp: Date.now(),
    }]);
    
    setCurrentUserResponse("");
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const coachingInput: AnalyzeResponseInput = { response: userText, context: scenario.objective };
      const coachingResultPromise = analyzeResponse(coachingInput);
      
      const semanticInput: EvaluateSemanticSkillInput = { responseText: userText, context: scenario.objective };
      const semanticResultPromise = evaluateSemanticSkill(semanticInput);

      // The promises return the input types, changed to AnalyzeResponseOutput and EvaluateSemanticSkillOutput
      const [coachingResult, semanticResult] = await Promise.all([coachingResultPromise, semanticResultPromise]);
      
      setCurrentCoaching(coachingResult as AnalyzeResponseOutput); 

      setMessages(prev => prev.map(msg => 
        (msg.text === userText && msg.participant === "User" && !msg.coachingFeedback) 
        ? {...msg, coachingFeedback: coachingResult as AnalyzeResponseOutput, semanticEvaluation: semanticResult as EvaluateSemanticSkillOutput} 
        : msg
      ));
      
      const agentSimInput: SimulateAiAgentsInput = {
        proposal: userText,
        ctoPersona: scenario.personaConfig.ctoPersona,
        financePersona: scenario.personaConfig.financePersona,
        productPersona: scenario.personaConfig.productPersona,
        hrPersona: scenario.personaConfig.hrPersona,
      };
      const agentResponses = await simulateAiAgents(agentSimInput);

      const agentTurns: { role: AgentRole, feedback: string }[] = [];
      if (scenario.agentsInvolved.includes('CTO') && agentResponses.ctoFeedback) {
        agentTurns.push({role: 'CTO', feedback: agentResponses.ctoFeedback});
      }
      if (scenario.agentsInvolved.includes('Finance') && agentResponses.financeFeedback) {
         agentTurns.push({role: 'Finance', feedback: agentResponses.financeFeedback});
      }
      if (scenario.agentsInvolved.includes('Product') && agentResponses.productFeedback) {
         agentTurns.push({role: 'Product', feedback: agentResponses.productFeedback});
      }
      if (scenario.agentsInvolved.includes('HR') && agentResponses.hrFeedback) {
         agentTurns.push({role: 'HR', feedback: agentResponses.hrFeedback});
      }

      for (const turn of agentTurns) {
        addMessage(turn.role, turn.feedback);
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
    return () => {
      if (isTTSSpeaking) {
        cancelTTS();
      }
      if (isSTTListening) {
        stopSTTListening();
      }
    };
  }, [isTTSSpeaking, cancelTTS, isSTTListening, stopSTTListening]);


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
    isTTSEnabled,
    toggleTTS,
    isTTSSupported,
    startSTTListening,
    stopSTTListening,
    isSTTListening,
    isSTTSupported,
    interimTranscript,
  };
}

