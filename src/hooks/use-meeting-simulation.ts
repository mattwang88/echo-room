
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  // baseTextForSpeech stores the content of currentUserResponse AT THE MOMENT recording starts.
  // It's used to correctly append new speech segments (interim or final) to pre-existing typed text.
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>(""); 
  const isMountedRef = useRef(true);

  // Memoized callback for STT listening state changes
  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (!listening) {
      // If listening stops, it implies the current speech utterance is complete (or was cancelled).
      // We might want to re-evaluate baseTextForSpeech for the *next* recording session.
      // For now, baseTextForSpeech is updated primarily by onTranscript or when starting a new recording.
    }
  }, [setIsRecording]); // setIsRecording is stable from useState

  // Memoized callback for final STT transcript segments
  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
    // Append the final segment to the base text established at the start of this speech session
    // And also update baseTextForSpeech to this new combined text, so subsequent final segments in the same utterance append correctly.
    setBaseTextForSpeech(prevBaseText => {
      const newCumulativeText = (prevBaseText ? prevBaseText + " " : "") + finalTranscriptSegment.trim();
      setCurrentUserResponse(newCumulativeText);
      return newCumulativeText; 
    });
  }, [setCurrentUserResponse, setBaseTextForSpeech]); // Stable dependencies

  // Memoized callback for interim STT transcripts
  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
    // Append the current interim transcript to the base text established at the start of this speech session
    // This should use the 'baseTextForSpeech' that was set when recording started for this utterance.
    setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]); // baseTextForSpeech here should be stable during one recording session.
                                                  // setCurrentUserResponse is stable.

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
        console.log("[MeetingSimulation] Unmounting: Stopping STT recording.");
        sttStopListening();
      }
    };
  }, [sttInternalIsListening, sttStopListening]);

  useEffect(() => {
    if (sttError) {
      console.warn("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
      // Toast is handled by useSpeechToText
    }
  }, [sttError]);

  useEffect(() => {
    if (scenarioId) {
      const foundScenario = getScenarioById(scenarioId);
      if (foundScenario) {
        setScenario(foundScenario);
        const initialMsg: Message = {
          id: Date.now().toString(),
          participant: foundScenario.initialMessage.participant,
          text: foundScenario.initialMessage.text,
          timestamp: Date.now(),
        };
        setMessages([initialMsg]);
        console.log(`[MeetingSimulation] Initial scenario setup. Initial message: "${initialMsg.text.substring(0,50)}..."`);
        
        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        setCurrentUserResponse("");
        setBaseTextForSpeech(""); 
        setCurrentAgentIndex(0); 
        if (isRecording) { 
          console.log("[MeetingSimulation] Scenario changed while STT recording. Stopping STT.");
          sttStopListening(); // This will also set isRecording to false via callback
        }
        clearSTTError(); 
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // Dependencies that re-initialize scenario

  const addMessage = useCallback((participant: ParticipantRole, text: string, coachingFeedback?: AnalyzeResponseOutput, semanticEvaluation?: EvaluateSemanticSkillOutput) => {
    if (!isMountedRef.current) return;
    const newMessage: Message = {
      id: Date.now().toString() + participant + Math.random(),
      participant,
      text,
      timestamp: Date.now(),
      coachingFeedback,
      semanticEvaluation,
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current || !scenario) return;
    if (isRecording) { // Check local isRecording state
      console.log("[MeetingSimulation] handleEndMeeting: Stopping STT recording if active.");
      sttStopListening(); // This will also set isRecording to false via callback
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
      if(isRecording) { // Check local isRecording state
        toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
      }
      return;
    }
    if (isRecording) { // Check local isRecording state
      console.log("[MeetingSimulation] submitUserResponse: STT recording was active. Stopping it now.");
      sttStopListening(); // This will set isRecording to false via callback
      toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
      return; 
    }

    const userMsgText = currentUserResponse.trim();
    const userMessageId = Date.now().toString() + 'User' + Math.random();
     setMessages(prev => [...prev, {
      id: userMessageId,
      participant: 'User',
      text: userMsgText,
      timestamp: Date.now()
    }]);

    setCurrentUserResponse("");
    setBaseTextForSpeech(""); 
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const contextForAI = scenario.objective;
      const coachingInput: AnalyzeResponseInput = { response: userMsgText, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsgText, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult }
          : msg
      ));

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
            agentRole: agentToRespondRole as AgentRole, // Cast is safe here due to activeAgents check
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
           // Potentially add a system message or skip agent turn if persona is missing
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
      if(isMountedRef.current) setIsAiThinking(false);
    }
  };

  const handleToggleRecording = () => {
    console.log(`[MeetingSimulation] handleToggleRecording called. Current isRecording state: ${isRecording}, browserSupportsSTT: ${browserSupportsSTT}`);
    if (!browserSupportsSTT) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    clearSTTError(); 

    if (isRecording) {
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else {
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      // Set baseTextForSpeech to current text field content when starting a new recording session
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
    // STT related
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT, 
    sttInternalIsListening, // For diagnostic UI
  };
}

    