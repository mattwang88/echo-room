
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

  const { speak, cancel, isSpeaking, isSupported: isTTSSupported } = useTextToSpeech();
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(false);

  const toggleTTS = useCallback(() => {
    if (!isTTSSupported) {
      toast({ title: "Text-to-Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
      setIsTTSEnabled(false);
      return;
    }
    setIsTTSEnabled(prev => {
      const newState = !prev;
      if (!newState && isSpeaking) {
        cancel(); // If turning TTS off and it's speaking, cancel it.
      }
      return newState;
    });
  }, [isTTSSupported, isSpeaking, cancel, toast]);

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
  }, [scenarioId, router, toast]); // speak, isTTSEnabled, isTTSSupported removed from deps to avoid re-speaking initial message on toggle


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
      if (isSpeaking) cancel(); // Cancel previous if any
      speak(text);
    }
  }, [isTTSEnabled, speak, isTTSSupported, isSpeaking, cancel]);


  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
    if (isSpeaking) cancel(); // Stop any ongoing speech
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
  }, [scenario, messages, router, toast, isSpeaking, cancel]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) return;

    if (isSpeaking) cancel(); // Stop AI speech if user submits response

    // Add user message immediately to the UI
    const userText = currentUserResponse;
    // We need to use the functional form of setMessages if addMessage is not stable enough due to dependencies
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

      const [coachingResult, semanticResult] = await Promise.all([coachingInput, semanticResultPromise]);
      
      setCurrentCoaching(coachingResult as AnalyzeResponseOutput); // Cast because it could be input type

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

      // Sequentially add agent messages to allow TTS to play them one by one if enabled
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
        // A short delay can help TTS distinguish messages if they come too fast
        // await new Promise(resolve => setTimeout(resolve, 250)); 
        addMessage(turn.role, turn.feedback);
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.");
        handleEndMeeting(); // This will also cancel speech
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
    // This effect ensures that TTS is cancelled if the component unmounts while speaking.
    return () => {
      if (isSpeaking) {
        cancel();
      }
    };
  }, [isSpeaking, cancel]);


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
  };
}
