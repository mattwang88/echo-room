"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario, Message, AgentRole, MeetingSummaryData, ParticipantRole } from '@/lib/types';
import { getScenarioById } from '@/lib/scenarios';
import { simulateAiAgents, type SimulateAiAgentsInput } from '@/ai/flows/simulate-ai-agents';
import { analyzeResponse, type AnalyzeResponseInput, type AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import { evaluateSemanticSkill, type EvaluateSemanticSkillInput, type EvaluateSemanticSkillOutput } from '@/ai/flows/semantic-skill-evaluation';
import { useToast } from "@/hooks/use-toast";

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
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [scenarioId, router, toast]);

  const addMessage = (participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    setMessages(prev => [...prev, { 
      id: Date.now().toString() + participant, 
      participant, 
      text, 
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    }]);
  };

  const handleEndMeeting = useCallback(() => {
    if (!scenario) return;
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
  }, [scenario, messages, router, toast]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) return;

    addMessage("User", currentUserResponse);
    const userMsg = currentUserResponse;
    setCurrentUserResponse("");
    setIsAiThinking(true);
    setCurrentCoaching(null); // Clear previous coaching

    try {
      // 1. Real-time Coaching
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: scenario.objective };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);
      
      // 2. Semantic Skill Evaluation
      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: scenario.objective };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      // Update last user message with feedback (optional, or store differently)
      setMessages(prev => prev.map(msg => msg.text === userMsg && msg.participant === "User" && !msg.coachingFeedback 
        ? {...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult} 
        : msg
      ));
      
      // 3. AI Agent Simulation
      // For simplicity, let's assume all involved agents respond in one go via simulateAiAgents
      const agentSimInput: SimulateAiAgentsInput = {
        proposal: userMsg, // User's latest response acts as the proposal
        ctoPersona: scenario.personaConfig.ctoPersona,
        financePersona: scenario.personaConfig.financePersona,
        productPersona: scenario.personaConfig.productPersona,
        hrPersona: scenario.personaConfig.hrPersona,
      };
      const agentResponses = await simulateAiAgents(agentSimInput);

      if (scenario.agentsInvolved.includes('CTO') && agentResponses.ctoFeedback) {
        addMessage('CTO', agentResponses.ctoFeedback);
      }
      if (scenario.agentsInvolved.includes('Finance') && agentResponses.financeFeedback) {
        addMessage('Finance', agentResponses.financeFeedback);
      }
      if (scenario.agentsInvolved.includes('Product') && agentResponses.productFeedback) {
        addMessage('Product', agentResponses.productFeedback);
      }
      if (scenario.agentsInvolved.includes('HR') && agentResponses.hrFeedback) {
        addMessage('HR', agentResponses.hrFeedback);
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
        // This condition might already be handled in submitUserResponse,
        // but as a safeguard or if turns increment differently.
        // addMessage("System", "The meeting time is up. This session has now concluded.");
        // handleEndMeeting();
    }
  }, [currentTurn, scenario, meetingEnded, handleEndMeeting]);


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
  };
}
