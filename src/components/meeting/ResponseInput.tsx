
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useEffect } from 'react';

interface ResponseInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
  startRecording?: () => void;
  stopRecording?: () => void;
  isRecording?: boolean;
  isSTTSupported?: boolean;
  interimTranscript?: string;
}

export function ResponseInput({
  value,
  onChange,
  onSubmit,
  isSending,
  disabled,
  startRecording,
  stopRecording,
  isRecording,
  isSTTSupported,
  interimTranscript
}: ResponseInputProps) {
  const { toast } = useToast();

  useEffect(() => {
    console.log('[ResponseInput Props Check]', {
      isSTTSupported,
      isRecording,
      startRecordingExists: typeof startRecording === 'function',
      stopRecordingExists: typeof stopRecording === 'function',
    });
  }, [isSTTSupported, isRecording, startRecording, stopRecording]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled && !isRecording) {
        onSubmit();
      }
    }
  };

  const handleMicClick = () => {
    if (!isSTTSupported) {
      toast({
        title: "Speech-to-Text Not Supported",
        description: "Your browser does not currently support the Web Speech API for voice input.",
        variant: "destructive",
      });
      return;
    }
    if (!startRecording || !stopRecording) {
      toast({
        title: "Error",
        description: "Voice input functions are not available.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const displayValue = isRecording && interimTranscript ? `${value} ${interimTranscript}`.trim() : value;
  const canSubmit = !isSending && !disabled && value.trim() && !isRecording;

  return (
    <div className="p-4 border-t bg-background sticky bottom-0" data-testid="response-input-container">
      <div className="flex items-end gap-2 bg-card p-3 rounded-xl shadow-md" data-testid="response-input-inner-container">
        <Textarea
          value={displayValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : (isSTTSupported ? "Type or use mic (Shift+Enter for new line)" : "Type your response (Shift+Enter for new line)")}
          className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2 min-h-[40px] max-h-[150px] overflow-y-auto leading-tight"
          rows={1}
          disabled={isSending || disabled || (isRecording && !!interimTranscript)}
          aria-label="Your response"
          data-testid="response-textarea"
        />
        <div className="flex flex-col gap-1.5 flex-shrink-0" data-testid="response-buttons-wrapper">
          <Button
            data-testid="send-button"
            onClick={onSubmit}
            disabled={!canSubmit}
            size="icon"
            title="Send response"
            className="h-9 w-9"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send response</span>
          </Button>

          {/* Simplified Microphone Button for Debugging */}
          <Button
            data-testid="mic-button-debug"
            onClick={handleMicClick}
            disabled={isSending || disabled || !isSTTSupported} // Disable if not supported
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            title={
              !isSTTSupported 
                ? "Speech-to-text not supported. Click for details." 
                : isRecording 
                  ? "Stop recording" 
                  : "Start recording"
            }
            className="h-9 w-9"
          >
            {isRecording ? 'Stop' : 'Mic'} {/* Simple Text Instead of Icon */}
            <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
          </Button>
        </div>
      </div>
       {(isRecording && interimTranscript && !value) && (
        <p className="text-xs text-muted-foreground mt-1 italic pl-1" data-testid="interim-transcript-display-1">Listening: {interimTranscript}</p>
      )}
       {(isRecording && !interimTranscript && !value) && (
         <p className="text-xs text-muted-foreground mt-1 italic pl-1" data-testid="interim-transcript-display-2">Listening...</p>
       )}
    </div>
  );
}
