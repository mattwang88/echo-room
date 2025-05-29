
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
  isRecording?: boolean; // This will be true if STT is active
  onToggleRecording?: () => void;
  isSTTSupported?: boolean;
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
}: ResponseInputProps) {

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled && value.trim() && !isRecording) {
        onSubmit();
      }
    }
  };

  const handleMicClick = () => {
    // The useSpeechToText hook handles the toast if not supported when onToggleRecording calls startListening.
    if (onToggleRecording) {
      onToggleRecording();
    }
  };

  const getPlaceholderText = () => {
    if (isRecording) return "Listening... Click mic to stop.";
    if (isSTTSupported) return "Type your response or click the mic to speak...";
    return "Type your response... (Voice input not supported by your browser)";
  }

  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-end gap-2 bg-card p-2 rounded-lg shadow-md">
        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[60px] max-h-[150px] scrollbar-thin bg-transparent"
          rows={1}
          disabled={isSending || disabled || (isSTTSupported && isRecording)} // Disable textarea if STT is supported and actively recording.
          aria-label="Your response"
        />
        <div className="flex flex-col space-y-1 flex-shrink-0" data-testid="response-buttons-wrapper">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSubmit}
                  disabled={isSending || disabled || !value.trim() || isRecording}
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Send response"
                  data-testid="send-button"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send response (Enter)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Microphone Button */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={handleMicClick}
                  disabled={isSending || disabled} // Only disable if sending or globally disabled
                  className="h-9 w-9"
                  aria-label={isRecording ? "Stop recording" : (isSTTSupported ? "Start recording" : "Voice input not supported by browser")}
                  data-testid="mic-button"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                 <p>{isRecording ? "Stop recording" : (isSTTSupported ? "Start recording" : "Voice input not supported by browser")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
       {/* Diagnostic message for STT support, can be removed or conditionally rendered */}
      {/* <div className="text-xs text-muted-foreground pt-1 text-center">
        STT Supported: {isSTTSupported ? 'Yes' : 'No'} | Recording: {isRecording ? 'Yes' : 'No'}
      </div> */}
    </div>
  );
}
