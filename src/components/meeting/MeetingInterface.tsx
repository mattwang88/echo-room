
'use client';

import { useEffect, useRef } from 'react';
import { useMeetingSimulation } from '@/hooks/use-meeting-simulation';
import { MeetingHeader } from './MeetingHeader';
import { ChatMessage } from './ChatMessage';
import { ResponseInput } from './ResponseInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Card components for panel header

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
    currentSpeakingParticipant, // Get current speaking participant
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
      TTS Speaking: {isTTSSpeaking ? `Yes (${currentSpeakingParticipant || 'Agent'})` : 'No'}
    </div>
  );


  if (!scenario && !meetingEnded) {
    // Full page skeleton for initial loading
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

      <div className="flex flex-1 overflow-hidden"> {/* Main container for two-column layout */}
        {/* Left Panel (Main Content Area - Placeholder) */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-2 text-foreground">Scenario Context</h2>
          {scenario ? (
            <Card className="shadow">
              <CardHeader>
                <CardTitle>{scenario.title}</CardTitle>
                <CardDescription><strong>Objective:</strong> {scenario.objective}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This area can be used to display shared documents, presentation slides, or participant video feeds in a full application.
                  The chat panel is now on the right.
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">Loading scenario details...</p>
          )}
           <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold text-md mb-2 text-muted-foreground">About this View</h3>
            <p className="text-sm text-muted-foreground">
              The panel on the right contains the interactive chat with AI agents.
              Use the input field at the bottom of the chat panel to send your messages.
            </p>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="w-[350px] md:w-[400px] flex flex-col border-l bg-card text-card-foreground">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">In-Session Messages</CardTitle>
            <CardDescription className="text-xs">Messages with AI agents will appear here.</CardDescription>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  scenarioId={scenarioId} 
                  isTTSSpeaking={isTTSSpeaking && currentSpeakingParticipant === msg.participant}
                  currentSpeakingParticipant={currentSpeakingParticipant}
                />
              ))}
              {isAiThinking && messages[messages.length-1]?.participant === 'User' && (
                <div className="flex items-end gap-2 mb-4 justify-start">
                  <Skeleton className="h-8 w-8 rounded-full" />
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
        </div>
      </div>
    </div>
  );
}
