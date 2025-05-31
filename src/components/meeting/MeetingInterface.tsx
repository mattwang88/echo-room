
'use client';

import { useEffect, useRef } from 'react';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { MeetingHeader } from './MeetingHeader';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AgentIcon, getAgentName, getAgentColor } from '@/components/icons/AgentIcons';
import { UserCircle2, MessageCircleQuestion } from 'lucide-react'; // Changed from MessageSquareText to UserCircle2
import { cn } from '@/lib/utils';


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
    currentSpeakingParticipant, // Get current speaker
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
      TTS Speaking: {isTTSSpeaking ? `Yes (${getAgentName(currentSpeakingParticipant || 'System', scenarioId)})` : 'No'}
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

  // Determine if a specific agent/system avatar should be shown
  const showSpeakerAvatar = currentSpeakingParticipant && currentSpeakingParticipant !== 'User';


  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <MeetingHeader
        scenario={scenario}
        onEndMeeting={handleEndMeeting}
      />
      <DiagnosticBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Main Content Area */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-muted/30">
          {showSpeakerAvatar ? (
            <AgentIcon
              role={currentSpeakingParticipant!}
              scenarioId={scenarioId}
              className={cn(
                'h-64 w-64 transition-all duration-100 ease-in-out',
                isTTSSpeaking && 'animate-subtle-shake scale-105'
              )}
            />
          ) : (
            <UserCircle2
              className={cn(
                'h-64 w-64 text-muted-foreground/20 transition-all duration-100 ease-in-out',
                // Animate if TTS is playing, even for the default avatar
                isTTSSpeaking && 'animate-subtle-shake scale-105'
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
          {/* Removed CardHeader for "In-Session Messages" */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  scenarioId={scenarioId}
                  isTTSSpeaking={isTTSSpeaking}
                  currentSpeakingParticipant={currentSpeakingParticipant}
                  isCurrentlySpeaking={isTTSSpeaking && currentSpeakingParticipant === msg.participant && msg.participant !== 'User'}
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
