
'use client';

import { useEffect, useRef } from 'react';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { MeetingHeader } from './MeetingHeader';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { CoachingPanel } from './CoachingPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';

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
    currentCoaching,
    // STT related
    isRecording,
    handleToggleRecording,
    isSTTSupported,
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

  // DiagnosticBar removed as TTS is not present
  // const DiagnosticBar = () => ( ... );


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
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-h-screen">
        <MeetingHeader
          scenario={scenario}
          onEndMeeting={handleEndMeeting}
        />

        {/* Optional: A simplified diagnostic bar for STT if needed for debugging */}
        <div className="p-1 bg-yellow-100 text-yellow-800 text-xs text-center border-b border-yellow-300 text-[10px] leading-tight">
          STT Supported: {isSTTSupported ? 'Yes' : 'No'} | Recording: {isRecording ? 'Yes' : 'No'}
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} scenarioId={scenarioId} />
            ))}
            {isAiThinking && messages[messages.length-1]?.participant === 'User' && (
              <div className="flex items-end gap-2 mb-4 justify-start">
                 <Skeleton className="h-8 w-8 rounded-full" />
                <div className="max-w-md p-3 rounded-xl rounded-bl-none shadow-md bg-card">
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
          disabled={meetingEnded}
          // STT Props
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          isSTTSupported={isSTTSupported}
        />
      </div>

      {/* Coaching Panel - visible on larger screens */}
      <aside className="w-full md:w-1/3 lg:w-1/4 border-l bg-card max-h-screen overflow-y-auto hidden md:block">
         <CoachingPanel feedback={currentCoaching} isAiThinking={isAiThinking && messages[messages.length-1]?.participant === 'User'} />
      </aside>
    </div>
  );
}
