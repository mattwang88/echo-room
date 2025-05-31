
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { MeetingHeader } from './MeetingHeader';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { getAgentName } from '@/components/icons/AgentIcons';
import { cn } from '@/lib/utils';
import type { ParticipantRole } from '@/lib/types';

interface MeetingInterfaceProps {
  scenarioId: string;
}

export function MeetingInterface({ scenarioId }: MeetingInterfaceProps) {
  const {
    scenario,
    messages,
    currentUserResponse,
    setCurrentUserResponse,
    isAiThinking,
    submitUserResponse,
    meetingEnded,
    handleEndMeeting,
    isRecording,
    handleToggleRecording,
    isSTTSupported,
    isTTSSpeaking,
    currentSpeakingParticipant,
  } = useMeetingSimulation(scenarioId);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [currentSpeakerImageSrc, setCurrentSpeakerImageSrc] = useState("/images/avatars/default_user.jpg");
  const [currentSpeakerImageAlt, setCurrentSpeakerImageAlt] = useState("User avatar");
  const [currentSpeakerImageAiHint, setCurrentSpeakerImageAiHint] = useState("person speaking");

  const getAvatarProps = (participant: ParticipantRole | null, currentScenarioId: string) => {
    let src = "/images/avatars/default_user.jpg"; // Default for user or when no AI is speaking
    let alt = "User avatar";
    let aiHint = "person speaking"; // Default AI hint

    if (participant && participant !== 'User') {
      const agentName = getAgentName(participant, currentScenarioId);
      alt = `${agentName} avatar`;

      // Ensure you have these .jpg files in public/images/avatars/
      // e.g., cto.jpg, finance.jpg, product.jpg, hr.jpg, manager.jpg, system.jpg
      switch (participant) {
        case 'CTO':
          src = "/images/avatars/cto.jpg";
          aiHint = "tech executive";
          break;
        case 'Finance':
          src = "/images/avatars/finance.jpg";
          aiHint = "finance professional";
          break;
        case 'Product':
          if (currentScenarioId === 'manager-1on1') {
            src = "/images/avatars/manager.jpg";
            aiHint = "manager";
          } else {
            src = "/images/avatars/product.jpg";
            aiHint = "product manager";
          }
          break;
        case 'HR':
          src = "/images/avatars/hr.jpg";
          aiHint = "hr representative";
          break;
        case 'System':
          src = "/images/avatars/system.jpg";
          aiHint = "system icon";
          break;
        default:
          // Fallback for any other agent role not explicitly listed in switch,
          // but still passes `participant && participant !== 'User'`
          src = "/images/avatars/default_avatar.jpg"; // Fallback for unknown agents
          alt = "Agent avatar";
          aiHint = "professional person";
      }
    }
    return { src, alt, aiHint };
  };

  const handleImageError = () => {
    const currentSrc = currentSpeakerImageSrc; // Capture current value to avoid issues with state updates
    console.warn(`[MeetingInterface] Image error for src: ${currentSrc}`);

    if (currentSrc.startsWith("https://placehold.co/")) {
      console.error("[MeetingInterface] Fallback placeholder image also failed to load.");
      return; // Already a placeholder, do nothing more
    }

    // If default_user.jpg failed, go to a user-specific placeholder
    if (currentSrc === "/images/avatars/default_user.jpg") {
      console.log("[MeetingInterface] Fallback for default_user.jpg to placeholder.");
      setCurrentSpeakerImageSrc("https://placehold.co/256x256.png?text=User");
      setCurrentSpeakerImageAlt("Fallback placeholder user avatar");
      setCurrentSpeakerImageAiHint("placeholder avatar");
    } 
    // If a specific agent image (e.g., cto.jpg, but NOT default_avatar.jpg) failed, try default_avatar.jpg
    else if (currentSrc.startsWith("/images/avatars/") && currentSrc !== "/images/avatars/default_avatar.jpg") {
      console.log(`[MeetingInterface] Falling back from ${currentSrc} to /images/avatars/default_avatar.jpg`);
      setCurrentSpeakerImageSrc("/images/avatars/default_avatar.jpg");
      setCurrentSpeakerImageAlt("Default agent avatar");
      setCurrentSpeakerImageAiHint("professional person");
    } 
    // If default_avatar.jpg itself failed, go to an agent-specific placeholder
    else if (currentSrc === "/images/avatars/default_avatar.jpg") {
      console.log("[MeetingInterface] Fallback for default_avatar.jpg to placeholder.");
      setCurrentSpeakerImageSrc("https://placehold.co/256x256.png?text=Agent");
      setCurrentSpeakerImageAlt("Fallback placeholder agent avatar");
      setCurrentSpeakerImageAiHint("placeholder avatar");
    } else {
      // Catch-all for any other unhandled local image error, go to a generic placeholder
      // This case should ideally not be hit if paths are well-defined.
      console.log(`[MeetingInterface] Generic fallback for unrecognized local src ${currentSrc} to placeholder.`);
      setCurrentSpeakerImageSrc("https://placehold.co/256x256.png?text=Avatar");
      setCurrentSpeakerImageAlt("Fallback placeholder avatar");
      setCurrentSpeakerImageAiHint("placeholder avatar");
    }
  };

  useEffect(() => {
    if (isTTSSpeaking && currentSpeakingParticipant && currentSpeakingParticipant !== 'User') {
      const { src, alt, aiHint } = getAvatarProps(currentSpeakingParticipant, scenarioId);
      setCurrentSpeakerImageSrc(src);
      setCurrentSpeakerImageAlt(alt);
      setCurrentSpeakerImageAiHint(aiHint);
    } else {
      // Default to user avatar when no AI is speaking or if it's the user
      const { src, alt, aiHint } = getAvatarProps(null, scenarioId); // Pass null to get default_user props
      setCurrentSpeakerImageSrc(src);
      setCurrentSpeakerImageAlt(alt);
      setCurrentSpeakerImageAiHint(aiHint);
    }
  }, [isTTSSpeaking, currentSpeakingParticipant, scenarioId]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


  const DiagnosticBar = () => {
    const speakerName = currentSpeakingParticipant ? getAgentName(currentSpeakingParticipant, scenarioId) : null;
    const showSpeakerInfo = speakerName && speakerName.toLowerCase() !== 'none';

    return (
      <div className="p-1 bg-yellow-100 text-yellow-700 text-xs text-center border-b border-yellow-300 text-[10px] leading-tight">
        STT Supported: {isSTTSupported ? 'Yes' : 'No'} |
        Recording: {isRecording ? 'Yes' : 'No'} |
        TTS Speaking: {isTTSSpeaking ? 'Yes' : 'No'}
        {showSpeakerInfo && ` | Current Speaker: ${speakerName}`}
      </div>
    );
  };


  if (!scenario && !meetingEnded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Logo className="mb-4" />
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-3/4 mb-8" />
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <MeetingHeader
        scenario={scenario}
        onEndMeeting={handleEndMeeting}
      />
      <DiagnosticBar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30">
            <Image
              key={currentSpeakerImageSrc}
              src={currentSpeakerImageSrc}
              alt={currentSpeakerImageAlt}
              width={256}
              height={256}
              className={cn(
                'rounded-full object-cover transition-transform duration-200 ease-in-out',
                isTTSSpeaking && 'animate-breathing'
              )}
              data-ai-hint={currentSpeakerImageAiHint}
              priority
              onError={handleImageError}
            />
          {isTTSSpeaking && currentSpeakingParticipant && currentSpeakingParticipant !== 'User' && (
            <p className="mt-6 text-xl font-semibold text-foreground animate-pulse">
              {getAgentName(currentSpeakingParticipant, scenarioId)} speaking
              <span className="animate-ellipsis"></span>
            </p>
          )}
        </div>

        <Card className="w-[350px] md:w-[450px] lg:w-[500px] flex flex-col border-l bg-card text-card-foreground rounded-none shadow-none">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  scenarioId={scenarioId}
                />
              ))}
              {isAiThinking && messages[messages.length-1]?.participant === 'User' && (
                <div className="flex items-end gap-2 mb-4 justify-start">
                  <Skeleton className="h-8 w-8 rounded-full self-start" />
                  <div className="max-w-md p-3 rounded-xl rounded-bl-none shadow-md bg-muted">
                    <span className="text-sm italic text-muted-foreground">
                        Thinking
                      <span className="animate-ellipsis"></span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <ResponseInput
            value={currentUserResponse}
            onChange={(e) => setCurrentUserResponse(e.target.value)}
            onSubmit={submitUserResponse}
            isSending={isAiThinking}
            disabled={meetingEnded || isTTSSpeaking}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            isSTTSupported={isSTTSupported}
          />
        </Card>
      </div>
    </div>
  );
}
