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
import { PhoneOff, Mic, MicOff, PlayCircle, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
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
    meetingActive,
    handleMeetingAction,
    handleEndMeeting,
    isRecording,
    handleToggleRecording,
    isSTTSupported: browserSupportsSTT,
    isTTSSpeaking,
    currentSpeakingParticipant,
    personas,
    isTTSEnabled,
    toggleTTS,
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

  const isMicButtonDisabled = !meetingActive || !browserSupportsSTT || meetingEnded || isTTSSpeaking || isAiThinking;
  const isEndMeetingButtonDisabled = meetingEnded; // Can always end meeting, unless already ended.

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30 relative">
           {/* Speaker / Recording Status Banner */}
           <div className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[90%]">
            {meetingActive && isRecording && !isTTSSpeaking && (
              <div className="bg-primary/80 text-primary-foreground px-4 py-2 rounded-lg shadow-md text-center">
                <p className="text-sm font-semibold animate-pulse">
                  You are speaking
                  <span className="animate-ellipsis"></span>
                </p>
              </div>
            )}
            {meetingActive && isTTSSpeaking && currentSpeakingParticipant && currentSpeakingParticipant !== 'User' && (
               <div className="bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg shadow-md text-center">
                <p className="text-sm font-semibold animate-pulse">
                  {getAgentName(currentSpeakingParticipant, scenarioId)} speaking
                  <span className="animate-ellipsis"></span>
                </p>
              </div>
            )}
            {!meetingActive && !meetingEnded && (
                 <div className="bg-muted px-4 py-2 rounded-lg shadow-md text-center">
                    <p className="text-sm font-semibold text-muted-foreground">
                        Meeting has not started yet.
                    </p>
                </div>
            )}
          </div>


          {/* Central Visual Area */}
          {meetingActive && isRecording ? (
            <SoundWaveAnimation width={512} height={256} isAnimating={true} />
          ) : meetingActive && speakingAgentAvatar ? (
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
                (e.target as HTMLImageElement).src = "https://placehold.co/256x256.png";
                (e.target as HTMLImageElement).setAttribute('data-ai-hint', 'placeholder avatar');
              }}
            />
          ) : meetingActive ? ( // Meeting active but no one speaking and not recording
            <SoundWaveAnimation width={512} height={256} isAnimating={false} />
          ) : !meetingEnded ? ( // Meeting not active, not ended (waiting for start)
            <div className="flex flex-col items-center text-center">
                <PlayCircle className="h-32 w-32 text-primary/30 mb-4" />
                <p className="text-xl text-muted-foreground">Click "Start Meeting" in the chat to begin.</p>
            </div>
          ) : ( // Meeting ended
             <AlertTriangle className="h-32 w-32 text-destructive/70 mb-4" />
          )}

          {/* Buttons Area */}
          <div className="flex items-center justify-center gap-4 mt-20">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "accent"}
              onClick={handleToggleRecording}
              disabled={isMicButtonDisabled}
              className="rounded-full shadow-lg hover:scale-105 transition-transform h-16 w-16"
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </Button>
            <Button
              type="button"
              variant={isTTSEnabled ? "default" : "secondary"}
              onClick={toggleTTS}
              className="rounded-full shadow-lg hover:scale-105 transition-transform h-16 w-16"
              aria-label={isTTSEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
            >
              {isTTSEnabled ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEndMeeting}
              disabled={isEndMeetingButtonDisabled}
              className="rounded-full shadow-lg hover:scale-105 transition-transform h-16 w-16"
              aria-label="End Meeting"
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
          </div>

           {meetingEnded && !isTTSSpeaking && (
             <p className="mt-4 text-lg text-muted-foreground">Meeting ended. Loading report...</p>
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
                  onMessageAction={handleMeetingAction}
                  personas={personas}
                />
              ))}
              {meetingActive && isAiThinking && messages[messages.length-1]?.participant === 'User' && (
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
            disabled={meetingEnded || isTTSSpeaking || !meetingActive} // Disable if meeting not active
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            isSTTSupported={browserSupportsSTT}
          />
        </Card>
      </div>
    </div>
  );
}
