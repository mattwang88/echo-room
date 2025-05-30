
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
  disabled?: boolean; // General disabled state for the input (e.g., meeting ended)
  // STT Props, synchronized from useMeetingSimulation
  isRecording?: boolean;
  onToggleRecording?: () => void;
  isSTTSupported?: boolean;
}

export function ResponseInput({
  value,
  onChange,
  onSubmit,
  isSending,
  disabled, // This is the overall disabled state (e.g. meetingEnded)
  isRecording,
  onToggleRecording,
  isSTTSupported,
}: ResponseInputProps) {

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Allow submission only if not sending, not globally disabled, value is present, AND not currently recording.
      if (!isSending && !disabled && value.trim() && !isRecording) {
        onSubmit();
      }
    }
  };

  const handleMicClick = () => {
    if (onToggleRecording) {
      onToggleRecording();
    }
  };

  const getPlaceholderText = () => {
    if (isRecording) return "Listening... Click mic again to stop.";
    if (isSTTSupported) return "Type your response or click the mic to speak...";
    return "Type your response... (Voice input not supported by your browser)";
  };

  // Textarea is disabled if globally disabled, OR if STT is supported AND currently recording.
  const isTextareaDisabled = disabled || (isSTTSupported && isRecording);
  // Send button is disabled if textarea is disabled, or sending, or no value, or recording.
  const isSendButtonDisabled = isTextareaDisabled || isSending || !value.trim() || (isSTTSupported && isRecording);
  // Mic button is disabled if globally disabled or sending (but not just because STT isn't supported - click should give toast then).
  const isMicButtonDisabled = disabled || isSending;


  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-end gap-2 bg-card p-2 rounded-lg shadow-md">
        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[60px] max-h-[150px] scrollbar-thin bg-transparent"
          rows={1} // Start with 1 row, it will auto-grow based on Tailwind/CSS setup if configured
          disabled={isTextareaDisabled}
          aria-label="Your response"
        />
        <div className="flex flex-col space-y-1 flex-shrink-0" data-testid="response-buttons-wrapper">
          {/* Send Button */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSubmit}
                  disabled={isSendButtonDisabled}
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
                <p>{isSendButtonDisabled ? (isRecording ? "Stop recording to send" : "Type a message to send") : "Send response (Enter)"}</p>
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
                  disabled={isMicButtonDisabled} 
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
    </div>
  );
}
