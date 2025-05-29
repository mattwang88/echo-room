
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

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");

  // Memoize the onListeningChange callback
  const handleSttListeningChange = useCallback((listening: boolean) => {
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (!listening) {
      // When recording stops (by user, error, or naturally), reset baseTextForSpeech for the next interaction.
      // Note: baseTextForSpeech is primarily for building up the current response during an STT session.
      // If an error occurs or user stops, it's okay to clear, but final transcript should already be in currentUserResponse.
      // setBaseTextForSpeech(""); // Let's be cautious here, only clear if truly done.
    }
  }, [setIsRecording]);


  const {
    isListening: sttInternalIsListening,
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported,
    sttError,
    clearSTTError,
  } = useSpeechToText({
    onTranscript: (finalTranscriptSegment) => {
      console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
      // Append the final segment to the current base text
      const newText = baseTextForSpeech + (baseTextForSpeech ? " " : "") + finalTranscriptSegment;
      setCurrentUserResponse(newText);
      setBaseTextForSpeech(newText); // Update base for next potential segment in same continuous utterance
    },
    onInterimTranscript: (interim) => {
      // console.log("[MeetingSimulation] STT Interim transcript received:", interim);
      setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
    },
    onListeningChange: handleSttListeningChange, // Pass the memoized callback
  });

   useEffect(() => {
    if (sttError) {
      console.error("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
      // Toast notifications for STT errors are handled within useSpeechToText
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
        if (isRecording) { // If switching scenario while recording, stop it.
          sttStopListening();
        }
        clearSTTError(); 
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // sttStopListening, clearSTTError are stable

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
        console.log("[MeetingSimulation] Submit blocked. Response empty, no scenario, or AI thinking. Current response:", currentUserResponse, "AI thinking:", isAiThinking);
        return;
    }
    if (isRecording) { 
        console.log("[MeetingSimulation] Submit blocked. Still recording. Stopping recording first.");
        sttStopListening(); 
        toast({ title: "Recording Stopped", description: "Voice input stopped. Review and send your message.", variant: "default"});
        return;
    }

    const userMsg = currentUserResponse.trim();
    addMessage("User", userMsg);
    setCurrentUserResponse(""); 
    setBaseTextForSpeech("");    
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const contextForAI = scenario.objective; 
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map((msg, index) => {
        if (index === prev.length - 1 && msg.participant === 'User' && msg.text === userMsg && !msg.coachingFeedback) {
            return { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult };
        }
        return msg;
      }));

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
            }
        }

        if (agentPersona) {
          const singleAgentSimInput: SimulateSingleAgentResponseInput = {
            userResponse: userMsg,
            agentRole: agentToRespondRole as AgentRole, 
            agentPersona: agentPersona,
            scenarioObjective: contextForAI,
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

  const handleToggleRecording = () => {
    console.log(`[MeetingSimulation] handleToggleRecording called. Current isRecording state: ${isRecording}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }

    clearSTTError(); 

    if (isRecording) { 
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else {
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      setBaseTextForSpeech(currentUserResponse); // Capture current text before STT starts appending
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
    isSTTSupported,
    sttInternalIsListening, 
  };
}
