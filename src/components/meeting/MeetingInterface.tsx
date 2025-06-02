
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
import type { ParticipantRole, AgentRole, VoiceGender } from '@/lib/types';
import { SoundWaveAnimation } from '@/components/animations/SoundWaveAnimation';


interface MeetingInterfaceProps {
  scenarioId: string;
}

// Updated avatar paths based on user's new filenames and format
const maleAvatarPaths = [
    '/images/males/M-1.jpg',
    '/images/males/M-2.jpg',
    '/images/males/M-3.jpg',
    '/images/males/M-4.jpg',
    '/images/males/M-5.jpg',
];
const femaleAvatarPaths = [
    '/images/females/F-1.jpg',
    '/images/females/F-2.jpg',
    '/images/females/F-3.jpg',
    '/images/females/F-4.jpg',
    '/images/females/F-5.jpg',
];
const neutralAvatarPath = 'https://placehold.co/256x256/cccccc/e0e0e0.png';


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
    currentSpeakingRole,
    currentSpeakingGender,
    personas,
    isTTSEnabled,
    toggleTTS,
  } = useMeetingSimulation(scenarioId);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentDisplayAvatarPath, setCurrentDisplayAvatarPath] = useState<string | null>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    console.log(`[AvatarDebug] Effect triggered. isTTSSpeaking: ${isTTSSpeaking}, currentSpeakingRole: ${currentSpeakingRole}, currentSpeakingGender: ${currentSpeakingGender}`);
    if (isTTSSpeaking && currentSpeakingRole && currentSpeakingRole !== 'User' && currentSpeakingRole !== 'System') {
      let chosenPath: string | null = null;
      if (currentSpeakingGender === 'male' && maleAvatarPaths.length > 0) {
        const randomIndex = Math.floor(Math.random() * maleAvatarPaths.length);
        chosenPath = maleAvatarPaths[randomIndex];
        console.log(`[AvatarDebug] Male avatar selected. List length: ${maleAvatarPaths.length}, Chosen: ${chosenPath}`);
      } else if (currentSpeakingGender === 'female' && femaleAvatarPaths.length > 0) {
        const randomIndex = Math.floor(Math.random() * femaleAvatarPaths.length);
        chosenPath = femaleAvatarPaths[randomIndex];
        console.log(`[AvatarDebug] Female avatar selected. List length: ${femaleAvatarPaths.length}, Chosen: ${chosenPath}`);
      } else {
        chosenPath = neutralAvatarPath; 
        console.log(`[AvatarDebug] Neutral/default avatar selected for gender '${currentSpeakingGender}' or empty list: ${chosenPath}`);
      }
      setCurrentDisplayAvatarPath(chosenPath);
      console.log(`[AvatarDebug] setCurrentDisplayAvatarPath called with: ${chosenPath}`);

    } else if (isTTSSpeaking && currentSpeakingRole === 'System') {
      setCurrentDisplayAvatarPath(neutralAvatarPath); 
      console.log(`[AvatarDebug] System speaking, using neutral avatar: ${neutralAvatarPath}`);
    } else if (!isTTSSpeaking) {
      setCurrentDisplayAvatarPath(null);
      console.log(`[AvatarDebug] Not speaking or User is speaking. Cleared currentDisplayAvatarPath.`);
    }
  }, [isTTSSpeaking, currentSpeakingRole, currentSpeakingGender]);


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

  const getAvatarAiHint = () => {
    if (!currentDisplayAvatarPath) return "placeholder avatar";
    if (currentDisplayAvatarPath === neutralAvatarPath) return "system icon";
    if (maleAvatarPaths.includes(currentDisplayAvatarPath)) return "male professional";
    if (femaleAvatarPaths.includes(currentDisplayAvatarPath)) return "female professional";
    return "professional person";
  }


  const isMicButtonDisabled = !meetingActive || !browserSupportsSTT || meetingEnded || isTTSSpeaking || isAiThinking;
  const isEndMeetingButtonDisabled = meetingEnded;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30 relative">
           <div className="absolute top-4 left-1/2 -translate-x-1/2 w-auto max-w-[90%] z-20">
            {meetingActive && isRecording && !isTTSSpeaking && (
              <div className="bg-primary/80 text-primary-foreground px-4 py-2 rounded-lg shadow-md text-center">
                <p className="text-sm font-semibold animate-pulse">
                  You are speaking
                  <span className="animate-ellipsis"></span>
                </p>
              </div>
            )}
            {meetingActive && isTTSSpeaking && currentSpeakingRole && currentSpeakingRole !== 'User' && (
               <div className="bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg shadow-md text-center">
                <p className="text-sm font-semibold animate-pulse">
                  {getAgentName(currentSpeakingRole, scenarioId)} speaking
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

          {meetingActive && isRecording ? (
            <SoundWaveAnimation width={512} height={256} isAnimating={true} />
          ) : meetingActive && currentDisplayAvatarPath ? (
            <Image
              key={currentDisplayAvatarPath || 'default-avatar-key'}
              src={currentDisplayAvatarPath}
              alt={currentSpeakingRole ? `${getAgentName(currentSpeakingRole, scenarioId)} avatar` : "Agent avatar"}
              width={256}
              height={256}
              className="rounded-full object-cover animate-breathing shadow-xl"
              data-ai-hint={getAvatarAiHint()}
              onError={(e) => {
                console.error(`[AvatarDebug] Error loading avatar. Attempted src: ${(e.target as HTMLImageElement).src}. Event:`, e);
              }}
            />
          ) : meetingActive ? (
            <SoundWaveAnimation width={512} height={256} isAnimating={false} />
          ) : !meetingEnded ? (
            <div className="flex flex-col items-center text-center">
                <PlayCircle className="h-32 w-32 text-primary/30 mb-4" />
                <p className="text-xl text-muted-foreground">Click "Start Meeting" in the chat to begin.</p>
            </div>
          ) : (
             <AlertTriangle className="h-32 w-32 text-destructive/70 mb-4" />
          )}

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
            disabled={meetingEnded || isTTSSpeaking || !meetingActive}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            isSTTSupported={browserSupportsSTT}
          />
        </Card>
      </div>
    </div>
  );
}
