
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import type React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ResponseInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
  // STT Props
  isRecording?: boolean;
  onToggleRecording?: () => void;
  isSTTSupported?: boolean;
  interimTranscript?: string;
}

export function ResponseInput({ 
  value, 
  onChange, 
  onSubmit, 
  isSending, 
  disabled,
  isRecording,
  onToggleRecording,
  isSTTSupported,
  interimTranscript
}: ResponseInputProps) {
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const showSendButton = value.trim() && !isRecording;
  const showMicButton = !value.trim() || isRecording;

  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-end gap-2 bg-card p-2 rounded-lg shadow-md">
        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : (isSTTSupported ? "Type or click mic to speak..." : "Type your response...")}
          className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[60px] max-h-[150px] scrollbar-thin"
          rows={1} // Start with 1 row, grows with content
          disabled={isSending || disabled || isRecording}
          aria-label="Your response"
        />
        <div className="flex flex-col space-y-1 flex-shrink-0">
          {isSTTSupported && onToggleRecording && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={isRecording ? "destructive" : "outline"} 
                    size="icon" 
                    onClick={onToggleRecording} 
                    disabled={isSending || disabled}
                    className="h-9 w-9"
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRecording ? "Stop recording" : "Start recording"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            onClick={onSubmit} 
            disabled={isSending || disabled || !value.trim() || isRecording} 
            size="icon"
            className="h-9 w-9"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send response</span>
          </Button>
        </div>
      </div>
      {isRecording && interimTranscript && (
        <p className="text-xs text-muted-foreground pt-1 pl-1">
          <em>{interimTranscript}</em>
        </p>
      )}
      {!isSTTSupported && (
         <p className="text-xs text-destructive pt-1 pl-1">
          Voice input not supported by your browser.
        </p>
      )}
    </div>
  );
}
