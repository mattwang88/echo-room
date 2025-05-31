
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { MeetingHeader } from './MeetingHeader';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Removed CardContent as it's not used here
import { AgentIcon, getAgentName } from '@/components/icons/AgentIcons';
import { UserCircle2 } from 'lucide-react';
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const DiagnosticBar = () => (
    <div className="p-1 bg-yellow-100 text-yellow-700 text-xs text-center border-b border-yellow-300 text-[10px] leading-tight">
      STT Supported: {isSTTSupported ? 'Yes' : 'No'} |
      Recording: {isRecording ? 'Yes' : 'No'} |
      TTS Speaking: {isTTSSpeaking ? `Yes (${getAgentName(currentSpeakingParticipant || 'System', scenarioId)})` : 'No'} |
      Current Speaker: {currentSpeakingParticipant || 'None'}
    </div>
  );


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

  const showSpeakerImage = currentSpeakingParticipant && currentSpeakingParticipant !== 'User';

  const getAvatarProps = (participant: ParticipantRole | null, currentScenarioId: string) => {
    // TODO: Replace placeholder URLs below with paths to your actual avatar images.
    // Suggested structure: public/images/avatars/agent-name.png
    // Example: '/images/avatars/cto.png'
    let src = "https://placehold.co/256x256.png?text=Default"; // Fallback default image
    let alt = "Speaking avatar";
    let aiHint = "person";

    if (participant) {
      const agentName = getAgentName(participant, currentScenarioId);
      alt = `${agentName} avatar`;

      switch (participant) {
        case 'CTO':
          src = "https://placehold.co/256x256.png?text=CTO"; // Replace with e.g., /images/avatars/cto.png
          aiHint = "tech executive";
          break;
        case 'Finance':
          src = "https://placehold.co/256x256.png?text=Finance"; // Replace with e.g., /images/avatars/finance.png
          aiHint = "finance professional";
          break;
        case 'Product':
          if (currentScenarioId === 'manager-1on1') {
            src = "https://placehold.co/256x256.png?text=Manager"; // Replace with e.g., /images/avatars/manager.png
            aiHint = "manager";
          } else {
            src = "https://placehold.co/256x256.png?text=Product"; // Replace with e.g., /images/avatars/product.png
            aiHint = "product manager";
          }
          break;
        case 'HR':
          src = "https://placehold.co/256x256.png?text=HR"; // Replace with e.g., /images/avatars/hr.png
          aiHint = "hr representative";
          break;
        case 'System':
          src = "https://placehold.co/256x256.png?text=System"; // Replace with e.g., /images/avatars/system.png or use an icon
          aiHint = "system icon";
          break;
        // 'User' will use UserCircle2, so no specific image path here.
      }
    }
    return { src, alt, aiHint };
  };
  
  const { src: speakerImageSrc, alt: speakerImageAlt, aiHint: speakerImageAiHint } = getAvatarProps(currentSpeakingParticipant, scenarioId);


  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <MeetingHeader
        scenario={scenario}
        onEndMeeting={handleEndMeeting}
      />
      <DiagnosticBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Avatar Display */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30">
          {showSpeakerImage ? (
             <Image
                src={speakerImageSrc}
                alt={speakerImageAlt}
                width={256}
                height={256}
                className={cn(
                  'rounded-full object-cover transition-transform duration-200 ease-in-out',
                  isTTSSpeaking && 'animate-breathing'
                )}
                data-ai-hint={speakerImageAiHint}
                priority
              />
          ) : (
            <UserCircle2
              className={cn(
                'h-64 w-64 text-muted-foreground/20 transition-transform duration-200 ease-in-out',
                isTTSSpeaking && 'animate-breathing' 
              )}
              strokeWidth={1.5}
            />
          )}
          {isTTSSpeaking && currentSpeakingParticipant && currentSpeakingParticipant !== 'User' && (
            <p className="mt-6 text-xl font-semibold text-foreground animate-pulse">
              {getAgentName(currentSpeakingParticipant, scenarioId)} speaking
              <span className="animate-ellipsis"></span>
            </p>
          )}
        </div>

        {/* Right Panel - Chat Area */}
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
