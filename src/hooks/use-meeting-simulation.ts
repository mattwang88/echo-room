
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

  // Memoize the onListeningChange callback for STT
  const handleSttListeningChange = useCallback((listening: boolean) => {
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (!listening) {
      // Optional: if you want to do something specific when recording hard stops (e.g. not by user clicking stop but by an error or natural end)
      // setBaseTextForSpeech(""); // Reset base text if continuous speech is not a primary concern after stop
    }
  }, [setIsRecording]); // setIsRecording is stable

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
    const newText = baseTextForSpeech + (baseTextForSpeech ? " " : "") + finalTranscriptSegment;
    setCurrentUserResponse(newText);
    setBaseTextForSpeech(newText); // Update base for next potential segment in same continuous utterance
  }, [baseTextForSpeech, setCurrentUserResponse, setBaseTextForSpeech]);

  const handleSttInterimTranscript = useCallback((interim: string) => {
    // console.log("[MeetingSimulation] STT Interim transcript received:", interim);
    setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]);


  const {
    isListening: sttInternalIsListening, // This is the raw listening state from the hook
    startListening: sttStartListening,
    stopListening: sttStopListening,
    isSTTSupported,
    sttError,
    clearSTTError,
  } = useSpeechToText({
    onTranscript: handleSttTranscript,
    onInterimTranscript: handleSttInterimTranscript,
    onListeningChange: handleSttListeningChange,
  });

   useEffect(() => {
    // This effect ensures that if the sttInternalIsListening state (from the hook) changes,
    // our local isRecording state is synchronized. This is a bit redundant if onListeningChange always fires
    // correctly, but acts as a safeguard.
    if (sttInternalIsListening !== isRecording) {
      // console.log(`[MeetingSimulation] Syncing isRecording (${isRecording}) with sttInternalIsListening (${sttInternalIsListening}) from hook.`);
      // setIsRecording(sttInternalIsListening);
    }
  }, [sttInternalIsListening, isRecording]);


  useEffect(() => {
    if (sttError) {
      console.error("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
      // Toast notifications for STT errors are now primarily handled within useSpeechToText
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
        if (isRecording) { 
          console.log("[MeetingSimulation] Scenario changed while recording. Stopping STT.");
          sttStopListening();
        }
        clearSTTError(); 
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // sttStopListening & clearSTTError are stable from useCallback

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
        console.warn("[MeetingSimulation] Submit blocked. Response empty, no scenario, or AI thinking. Current response:", currentUserResponse, "AI thinking:", isAiThinking, "Is Recording:", isRecording);
        if(isRecording) {
          toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
        }
        return;
    }
    // This redundant check is because the button's disabled state might have a slight delay if isRecording updates slowly.
    if (isRecording) { 
        console.warn("[MeetingSimulation] Submit blocked because isRecording is still true. Forcing STT stop.");
        sttStopListening(); 
        toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
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
        
        // Specific persona handling for scenarios like 'manager-1on1' or 'job-resignation'
        if (scenario.id === 'manager-1on1' && agentToRespondRole === 'Product') {
            agentPersona = scenario.personaConfig.productPersona; // Manager persona
        } else if (scenario.id === 'job-resignation' && agentToRespondRole === 'HR') {
             agentPersona = scenario.personaConfig.hrPersona; // HR persona for resignation
        } else {
            // Default persona lookup
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
            agentRole: agentToRespondRole as AgentRole, // Cast as AgentRole, assuming system/user won't be in activeAgents
            agentPersona: agentPersona,
            scenarioObjective: contextForAI,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            addMessage(agentToRespondRole, agentResponse.agentFeedback);
          }
          setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length); // Cycle through agents
        } else {
           console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded.");
        handleEndMeeting(); // This will also stop recording if active
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

    clearSTTError(); // Clear any previous STT errors

    if (isRecording) { // If currently recording, then stop
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else { // If not recording, then start
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      // Capture current text before STT starts appending.
      // This ensures if user types then speaks, it appends correctly.
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
    // STT related, `isRecording` is the synchronized state
    isRecording, 
    handleToggleRecording,
    isSTTSupported,
    sttInternalIsListening, // Expose for debugging if needed, but UI should use `isRecording`
  };
}

    