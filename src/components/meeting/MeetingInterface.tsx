
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
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { getAgentName } from '@/components/icons/AgentIcons';
import { cn } from '@/lib/utils';
import type { ParticipantRole, AgentRole } from '@/lib/types';
import { SoundWaveAnimation } from '@/components/animations/SoundWaveAnimation';


interface MeetingInterfaceProps {
  scenarioId: string;
}

interface AgentAvatarConfig {
    src: string;
    alt: string;
    aiHint: string;
}

const agentAvatarMap: Record<AgentRole, AgentAvatarConfig> = {
    CTO: { src: "/images/avatars/cto.jpg", alt: "CTO avatar", aiHint: "tech executive" },
    Finance: { src: "/images/avatars/finance.jpg", alt: "Finance head avatar", aiHint: "finance professional" },
    Product: { src: "/images/avatars/product.jpg", alt: "Product head avatar", aiHint: "product manager" },
    HR: { src: "/images/avatars/hr.jpg", alt: "HR representative avatar", aiHint: "hr representative" },
};
const managerAvatar: AgentAvatarConfig = { src: "/images/avatars/manager.jpg", alt: "Manager avatar", aiHint: "manager" };


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

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


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

  const getSpeakingAgentAvatar = (): AgentAvatarConfig | null => {
    if (!isTTSSpeaking || !currentSpeakingParticipant || currentSpeakingParticipant === 'User' || currentSpeakingParticipant === 'System') {
      return null;
    }
    if (scenarioId === 'manager-1on1' && currentSpeakingParticipant === 'Product') {
      return managerAvatar;
    }
    return agentAvatarMap[currentSpeakingParticipant as AgentRole] || null;
  };

  const speakingAgentAvatar = getSpeakingAgentAvatar();

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30">
          {isRecording ? (
            <SoundWaveAnimation width={256} height={256} isAnimating={true} />
          ) : speakingAgentAvatar ? (
            <Image
              key={speakingAgentAvatar.src}
              src={speakingAgentAvatar.src}
              alt={speakingAgentAvatar.alt}
              width={256}
              height={256}
              className="rounded-full object-cover animate-breathing"
              data-ai-hint={speakingAgentAvatar.aiHint}
              priority
              onError={(e) => {
                console.warn(`Error loading avatar for ${currentSpeakingParticipant}: ${speakingAgentAvatar.src}`);
                // Fallback to a placeholder if the specific agent avatar fails
                (e.target as HTMLImageElement).src = "https://placehold.co/256x256.png";
                (e.target as HTMLImageElement).setAttribute('data-ai-hint', 'placeholder avatar');
              }}
            />
          ) : (
            // Idle state - show SoundWaveAnimation but not animating
            <SoundWaveAnimation width={256} height={256} isAnimating={false} />
          )}

          {isRecording && !isTTSSpeaking && (
            <p className="mt-6 text-xl font-semibold text-foreground animate-pulse">
              You are speaking
              <span className="animate-ellipsis"></span>
            </p>
          )}
          {isTTSSpeaking && currentSpeakingParticipant && currentSpeakingParticipant !== 'User' && (
            <p className="mt-6 text-xl font-semibold text-foreground animate-pulse">
              {getAgentName(currentSpeakingParticipant, scenarioId)} speaking
              <span className="animate-ellipsis"></span>
            </p>
          )}


          <div className="flex items-center justify-center gap-4 mt-20">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "accent"}
              onClick={handleToggleRecording}
              disabled={!isSTTSupported || meetingEnded || isTTSSpeaking || isAiThinking}
              className="rounded-full shadow-lg hover:scale-105 transition-transform h-16 w-16"
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEndMeeting}
              className="rounded-full shadow-lg hover:scale-105 transition-transform h-16 w-16"
              aria-label="End Meeting"
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
          </div>

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
                  <div className={cn(
                      "max-w-md p-3 rounded-xl rounded-bl-none shadow-md bg-muted",
                  )}>
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
