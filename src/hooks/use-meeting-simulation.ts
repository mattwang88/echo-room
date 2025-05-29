
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
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>("");
  const isMountedRef = useRef(true);

  const { 
    speak: ttsSpeak, 
    cancel: ttsCancel, 
    isTTSSupported, 
    isTTSEnabled, 
    toggleTTSEnabled,
    isTTSSpeaking
  } = useTextToSpeech();

  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (listening && isTTSEnabled && isTTSSpeaking) {
      console.log('[MeetingSimulation] STT started while TTS was speaking. Cancelling TTS.');
      ttsCancel(); 
    }
  }, [setIsRecording, isTTSEnabled, isTTSSpeaking, ttsCancel]);

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
    setBaseTextForSpeech(prev => {
      const newText = prev + (prev ? " " : "") + finalTranscriptSegment;
      setCurrentUserResponse(newText); // Update current user response for display
      return newText; // This updates baseTextForSpeech for the next segment
    });
  }, [setCurrentUserResponse]);

  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
    // console.log("[MeetingSimulation] STT Interim transcript received:", interim);
    setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]);

  const {
    isListening: sttInternalIsListening, // Renamed to avoid conflict if needed, though not directly used in this hook's return
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (isTTSEnabled && isTTSSpeaking) {
        ttsCancel();
      }
      if (isRecording) { // Use the isRecording state managed by this hook
        sttStopListening();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sttError) {
      console.error("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
      // Optionally, display a toast or handle the error in the UI if desired
      // toast({ title: "Voice Input Error", description: sttError, variant: "destructive" });
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
        
        if (isTTSEnabled) {
          console.log(`[MeetingSimulation] Initial scenario setup: TTS is enabled. Speaking initial message: "${initialMsg.text.substring(0,50)}..."`);
          ttsSpeak(initialMsg.text);
        } else {
          console.log(`[MeetingSimulation] Initial scenario setup: TTS is NOT enabled. Not speaking initial message.`);
        }

        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        setCurrentUserResponse("");
        setBaseTextForSpeech(""); // Reset base text for new scenario
        setCurrentAgentIndex(0); // Reset agent index
        if (isRecording) {
          console.log("[MeetingSimulation] Scenario changed while STT recording. Stopping STT.");
          sttStopListening();
        }
        clearSTTError(); // Clear any previous STT errors
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast, isTTSEnabled, ttsSpeak]); // isTTSEnabled and ttsSpeak are from useTextToSpeech

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

    if (participant !== 'User' && isTTSEnabled) {
      if (isRecording) { 
          console.log('[MeetingSimulation] addMessage: STT is recording, stopping STT before TTS speaks.');
          sttStopListening();
      }
      console.log(`[MeetingSimulation] addMessage: TTS is enabled. Speaking message from ${participant}: "${text.substring(0,50)}..."`);
      ttsSpeak(text);
    }
  }, [isTTSEnabled, ttsSpeak, isRecording, sttStopListening]);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current || !scenario) return;
    if (isRecording) {
      console.log("[MeetingSimulation] handleEndMeeting: Stopping STT recording if active.");
      sttStopListening();
    }
    if (isTTSEnabled && isTTSSpeaking) {
       console.log("[MeetingSimulation] handleEndMeeting: Cancelling TTS if speaking.");
      ttsCancel();
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
  }, [scenario, messages, router, toast, isRecording, sttStopListening, isTTSEnabled, isTTSSpeaking, ttsCancel]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) {
      if(isRecording) {
        toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
      }
      return;
    }
    if (isRecording) { // If user clicks send while still technically recording (e.g. STT didn't auto-stop fast enough)
      console.log("[MeetingSimulation] submitUserResponse: STT recording was active. Stopping it now.");
      sttStopListening();
      toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
      // Do not submit yet, let the user confirm the transcribed text.
      return;
    }

    const userMsg = currentUserResponse.trim();
    const userMessageId = Date.now().toString() + 'User' + Math.random();
     setMessages(prev => [...prev, {
      id: userMessageId,
      participant: 'User',
      text: userMsg,
      timestamp: Date.now()
    }]);

    setCurrentUserResponse("");
    setBaseTextForSpeech(""); // Important to reset base for next STT input
    setIsAiThinking(true);
    setCurrentCoaching(null);

    try {
      const contextForAI = scenario.objective;
      const coachingInput: AnalyzeResponseInput = { response: userMsg, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsg, context: contextForAI };
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
            // Default persona mapping for other scenarios
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
      if(isMountedRef.current) setIsAiThinking(false);
    }
  };

  const handleToggleRecording = () => {
    console.log(`[MeetingSimulation] handleToggleRecording called. Current isRecording state: ${isRecording}, isSTTSupported: ${isSTTSupported}`);
    if (!isSTTSupported) {
      toast({ title: "Unsupported Feature", description: "Speech-to-text is not available in your browser.", variant: "destructive"});
      return;
    }
    clearSTTError(); // Clear previous errors before attempting to toggle

    if (isRecording) {
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else {
      if (isTTSEnabled && isTTSSpeaking) {
        console.log('[MeetingSimulation] Mic button clicked while TTS speaking. Cancelling TTS.');
        ttsCancel(); // Stop TTS if it's speaking
      }
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      // Preserve current text if user starts speaking after typing
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
    isSTTSupported,
    sttInternalIsListening, // Expose this to show detailed STT state if needed by UI
    // TTS related
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSupported,
    isTTSSpeaking,
  };
}

