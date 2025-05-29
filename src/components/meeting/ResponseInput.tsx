
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';

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
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled && !isRecording) {
        onSubmit();
      }
    }
  };

  const handleMicClick = () => {
    if (isRecording && stopRecording) {
      stopRecording();
    } else if (!isRecording && startRecording) {
      startRecording();
    }
  };

  const displayValue = isRecording && interimTranscript ? `${value} ${interimTranscript}`.trim() : value;


  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-start gap-2 bg-card p-2 rounded-lg shadow">
        <Textarea
          value={displayValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : (isSTTSupported ? "Type your response or use the mic (Shift+Enter for new line)" : "Type your response (Shift+Enter for new line)")}
          className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[60px]"
          rows={3}
          disabled={isSending || disabled || (isRecording && !!interimTranscript)} 
          aria-label="Your response"
        />
        <div className="flex flex-col gap-2">
          {/* Mic button logic starts here */}
          {startRecording && stopRecording && ( 
            isSTTSupported ? (
              <Button 
                onClick={handleMicClick} 
                disabled={isSending || disabled} 
                size="icon" 
                variant={isRecording ? "destructive" : "outline"}
                title={isRecording ? "Stop recording" : "Start recording"}
                className="h-10 w-10"
              >
                {isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
                <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
              </Button>
            ) : (
              // Displayed if STT is not supported
              <div 
                className="flex items-center justify-center h-10 w-10 rounded-md border border-input bg-background cursor-not-allowed" 
                title="Speech-to-text is not supported in your browser."
                aria-label="Speech-to-text not supported"
              >
                <MicOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )
          )}
          {/* Mic button logic ends here */}
          <Button 
            onClick={onSubmit} 
            disabled={isSending || disabled || !value.trim() || isRecording} 
            size="icon"
            title="Send response"
            className="h-10 w-10"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="sr-only">Send response</span>
          </Button>
        </div>
      </div>
       {isRecording && interimTranscript && (
        <p className="text-xs text-muted-foreground mt-1 italic pl-1">Listening: {interimTranscript}</p>
      )}
       {isRecording && !interimTranscript && !value &&(
         <p className="text-xs text-muted-foreground mt-1 italic pl-1">Listening...</p>
       )}
    </div>
  );
}
