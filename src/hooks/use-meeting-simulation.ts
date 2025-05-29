
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

  // Speech-to-Text (STT) states
  const [isRecording, setIsRecording] = useState(false);
  const [baseTextForSpeech, setBaseTextForSpeech] = useState<string>(""); // Used to append STT results to existing text

  // Text-to-Speech (TTS) states and functions from useTextToSpeech hook
  const { 
    isTTSEnabled, 
    toggleTTSEnabled, 
    speak: ttsSpeak, 
    cancelCurrentSpeech: ttsCancel,
    isTTSSpeaking 
  } = useTextToSpeech();
  
  const isMountedRef = useRef(true);

  // Memoized callback for STT listening state changes
  const handleSttListeningChange = useCallback((listening: boolean) => {
    if (!isMountedRef.current) return;
    console.log(`[MeetingSimulation] STT Listening state changed via callback: ${listening}. Updating isRecording.`);
    setIsRecording(listening);
    if (listening && isTTSSpeaking) { 
      console.log("[MeetingSimulation] STT started while TTS speaking. Cancelling TTS.");
      ttsCancel();
    }
  }, [setIsRecording, isTTSSpeaking, ttsCancel]);

  const handleSttTranscript = useCallback((finalTranscriptSegment: string) => {
    if (!isMountedRef.current) return;
    console.log("[MeetingSimulation] STT Final Transcript Segment Received:", finalTranscriptSegment);
    setBaseTextForSpeech(prevBaseText => {
      const newCumulativeText = (prevBaseText ? prevBaseText + " " : "") + finalTranscriptSegment.trim();
      setCurrentUserResponse(newCumulativeText); // Update main input with cumulative text
      return newCumulativeText; // Return new base for next segment
    });
  }, [setCurrentUserResponse, setBaseTextForSpeech]);


  const handleSttInterimTranscript = useCallback((interim: string) => {
    if (!isMountedRef.current) return;
    // console.log("[MeetingSimulation] STT Interim transcript received:", interim);
    // console.log("[MeetingSimulation] Base text for speech before interim update:", baseTextForSpeech);
    setCurrentUserResponse(baseTextForSpeech + (baseTextForSpeech ? " " : "") + interim);
  }, [baseTextForSpeech, setCurrentUserResponse]);


  const {
    isListening: sttInternalIsListening, // This is the actual listening state from the hook
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
      console.log("[MeetingSimulation] Unmounting: Cancelling any active TTS.");
      ttsCancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sttInternalIsListening, sttStopListening, ttsCancel removed to simplify, refs manage their state

  useEffect(() => {
    if (sttError) {
      // STT errors are toasted within useSpeechToText, so just log here if needed
      console.warn("[MeetingSimulation] Observed STT Error from useSpeechToText hook:", sttError);
    }
  }, [sttError]);
  
  useEffect(() => {
    console.log(`[MeetingSimulation] Initializing. TTS is currently ${isTTSEnabled ? 'enabled' : 'disabled'}.`);
  }, [isTTSEnabled]); 

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
        console.log(`[MeetingSimulation] Initial scenario setup. Initial message participant: ${initialMsg.participant}, text: "${initialMsg.text.substring(0,50)}..."`);
        
        if (isTTSEnabled) {
          console.log(`[MeetingSimulation] Initial scenario setup: TTS is enabled. Speaking initial message.`);
          ttsSpeak(initialMsg.text, initialMsg.participant);
        } else {
          console.log("[MeetingSimulation] Initial scenario setup: TTS is disabled. Not speaking initial message.");
        }
        
        setCurrentTurn(0);
        setMeetingEnded(false);
        setCurrentCoaching(null);
        setCurrentUserResponse("");
        setBaseTextForSpeech("");
        setCurrentAgentIndex(0);
        if (isRecording) { // isRecording from this hook's state
          console.log("[MeetingSimulation] Scenario changed while STT recording. Stopping STT.");
          sttStopListening(); // Call the stop function from the hook
        }
        clearSTTError();
      } else {
        toast({ title: "Error", description: "Scenario not found.", variant: "destructive" });
        router.push('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, router, toast]); // isTTSEnabled and ttsSpeak removed here to prevent re-trigger on TTS toggle. initialSpeak is handled.

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

    // Speak the message if it's not from the user and TTS is enabled
    if (participant !== 'User' && isTTSEnabled) {
      console.log(`[MeetingSimulation] addMessage: Speaking message from ${participant}: "${text.substring(0,50)}..."`);
      ttsSpeak(text, participant);
    }
  }, [isTTSEnabled, ttsSpeak]);

  const handleEndMeeting = useCallback(() => {
    if (!isMountedRef.current || !scenario) return;
    if (isRecording) {
      console.log("[MeetingSimulation] handleEndMeeting: Stopping STT recording if active.");
      sttStopListening();
    }
    ttsCancel(); // Cancel any ongoing speech
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
  }, [scenario, messages, router, toast, isRecording, sttStopListening, ttsCancel]);

  const submitUserResponse = async () => {
    if (!currentUserResponse.trim() || !scenario || isAiThinking) {
      if(isRecording) {
        toast({ title: "Still Recording", description: "Please stop recording before sending your message.", variant: "default"});
      }
      return;
    }
    // This check is critical: if STT is active, stop it first
    if (isRecording) { // isRecording from this hook's state
      console.log("[MeetingSimulation] submitUserResponse: STT recording was active. Stopping it now.");
      sttStopListening(); // This should set isRecording to false via the callback
      toast({ title: "Recording Stopped", description: "Voice input stopped. Please review and send your message.", variant: "default"});
      return; // User should review and click send again if needed
    }
    
    ttsCancel(); // Cancel any TTS before user submits, to prevent overlap if AI responds quickly

    const userMsgText = currentUserResponse.trim();
    const userMessageId = Date.now().toString() + 'User' + Math.random();
     setMessages(prev => [...prev, {
      id: userMessageId,
      participant: 'User',
      text: userMsgText,
      timestamp: Date.now()
    }]);

    setCurrentUserResponse("");
    setBaseTextForSpeech(""); // Clear base text after submission
    setIsAiThinking(true);
    setCurrentCoaching(null); // Clear previous coaching

    try {
      const contextForAI = scenario.objective; // Make sure scenario.objective is defined
      const coachingInput: AnalyzeResponseInput = { response: userMsgText, context: contextForAI };
      const coachingResult = await analyzeResponse(coachingInput);
      setCurrentCoaching(coachingResult);

      const semanticInput: EvaluateSemanticSkillInput = { responseText: userMsgText, context: contextForAI };
      const semanticResult = await evaluateSemanticSkill(semanticInput);

      // Update the user's message with feedback
      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, coachingFeedback: coachingResult, semanticEvaluation: semanticResult }
          : msg
      ));

      const activeAgents = scenario.agentsInvolved;
      if (activeAgents && activeAgents.length > 0) {
        const agentToRespondRole = activeAgents[currentAgentIndex];
        let agentPersona = "";
        
        // Special persona handling for specific scenarios if needed
        if (scenario.id === 'manager-1on1' && agentToRespondRole === 'Product') {
            agentPersona = scenario.personaConfig.productPersona; // Manager persona
        } else if (scenario.id === 'job-resignation' && agentToRespondRole === 'HR') {
             agentPersona = scenario.personaConfig.hrPersona; // Specific HR resignation persona
        } else {
            // General persona lookup
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
            agentRole: agentToRespondRole as AgentRole, // Cast if sure
            agentPersona: agentPersona,
            scenarioObjective: contextForAI,
          };
          const agentResponse = await simulateSingleAgentResponse(singleAgentSimInput);
          if (agentResponse && agentResponse.agentFeedback) {
            addMessage(agentToRespondRole, agentResponse.agentFeedback); // addMessage will handle TTS
          }
          // Cycle to the next agent for the next turn
          setCurrentAgentIndex(prev => (prev + 1) % activeAgents.length);
        } else {
           console.warn(`[MeetingSimulation] No persona found for agent role: ${agentToRespondRole} in scenario ${scenario.id}`);
        }
      }

      setCurrentTurn(prev => prev + 1);
      if (scenario.maxTurns && currentTurn + 1 >= scenario.maxTurns) {
        addMessage("System", "The meeting time is up. This session has now concluded."); // addMessage will handle TTS
        handleEndMeeting();
      }

    } catch (error) {
      console.error("[MeetingSimulation] AI interaction error:", error);
      toast({ title: "AI Error", description: "An error occurred while processing your request.", variant: "destructive" });
      addMessage("System", "Sorry, I encountered an error. Please try again."); // addMessage will handle TTS
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
    clearSTTError(); // Clear any previous STT errors

    if (isRecording) { // If currently recording, stop it
      console.log("[MeetingSimulation] Calling sttStopListening() from useSpeechToText.");
      sttStopListening();
    } else { // If not recording, start it
      if (isTTSSpeaking) { 
        console.log("[MeetingSimulation] STT requested while TTS speaking. Cancelling TTS first.");
        ttsCancel();
      }
      console.log("[MeetingSimulation] Calling sttStartListening() from useSpeechToText.");
      // Set base text for STT to append to any existing typed text
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
    isRecording, // This is the state managed by useMeetingSimulation, updated by STT hook's callback
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    sttInternalIsListening, // Exposing for MeetingInterface diagnostic bar
    // TTS related
    isTTSEnabled,
    toggleTTSEnabled,
    isTTSSpeaking,
  };
}
