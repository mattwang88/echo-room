
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';
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

  const getAvatarProps = useCallback((participant: ParticipantRole | null, currentScenarioId: string) => {
    let src = "/images/avatars/default_user.jpg";
    let alt = "User avatar";
    let aiHint = "person speaking";

    if (participant && participant !== 'User' && participant !== 'System') {
      const agentName = getAgentName(participant, currentScenarioId);
      alt = `${agentName} avatar`;
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
        default:
          src = "/images/avatars/default_avatar.jpg";
          alt = "Agent avatar";
          aiHint = "professional person";
      }
    } else if (participant === 'System') {
        src = "/images/avatars/system.jpg";
        alt = "System avatar";
        aiHint = "system icon";
    }
    return { src, alt, aiHint };
  }, []);
  
  const handleImageError = useCallback(() => {
    const currentSrc = currentSpeakerImageSrc;
    console.warn(`[MeetingInterface] Image error for src: ${currentSrc}`);

    if (currentSrc === "/images/avatars/default_user.jpg") {
        setCurrentSpeakerImageSrc("https://placehold.co/256x256.png");
        setCurrentSpeakerImageAlt("Fallback placeholder user avatar");
        setCurrentSpeakerImageAiHint("placeholder avatar");
    } else if (currentSrc === "/images/avatars/default_avatar.jpg") {
        setCurrentSpeakerImageSrc("https://placehold.co/256x256.png");
        setCurrentSpeakerImageAlt("Fallback placeholder agent avatar");
        setCurrentSpeakerImageAiHint("placeholder avatar");
    } else if (currentSrc.startsWith("/images/avatars/") && currentSrc !== "/images/avatars/default_avatar.jpg") {
        setCurrentSpeakerImageSrc("/images/avatars/default_avatar.jpg");
        setCurrentSpeakerImageAlt("Default agent avatar");
        setCurrentSpeakerImageAiHint("professional person");
    } else if (currentSrc.startsWith("https://placehold.co/")) {
      console.error("[MeetingInterface] Placeholder image also failed.");
    }
  }, [currentSpeakerImageSrc]);


  useEffect(() => {
    if (!scenarioId) return; 

    const { src, alt, aiHint } = getAvatarProps(currentSpeakingParticipant, scenarioId);
    if (src !== currentSpeakerImageSrc) {
      setCurrentSpeakerImageSrc(src);
      setCurrentSpeakerImageAlt(alt);
      setCurrentSpeakerImageAiHint(aiHint);
    }
  }, [currentSpeakingParticipant, scenarioId, getAvatarProps, currentSpeakerImageSrc]);


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
          
          <Button
            variant="destructive"
            onClick={handleEndMeeting}
            className="mt-20 rounded-lg shadow-lg hover:scale-105 transition-transform h-16 w-52"
            aria-label="End Meeting"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

           {meetingEnded && !isTTSSpeaking && (
             <p className="mt-4 text-lg text-muted-foreground">Meeting has ended.</p>
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
