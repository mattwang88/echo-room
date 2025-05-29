
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
    // Let useSpeechToText handle toasts if not supported, when onToggleRecording is called.
    if (onToggleRecording) {
      onToggleRecording();
    }
  };
  
  const getPlaceholderText = () => {
    if (isRecording) return "Listening... Click mic to stop.";
    if (isSTTSupported) return "Type your response or click the mic to speak...";
    return "Type your response... (Voice input not supported by browser)";
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
          disabled={isSending || disabled || isRecording} // Disable textarea while recording as well
          aria-label="Your response"
        />
        <div className="flex flex-col space-y-1 flex-shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSubmit}
                  disabled={isSending || disabled || !value.trim() || isRecording } 
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Send response"
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

          {/* Always render the mic button structure, style depends on isRecording */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={handleMicClick}
                  // Disable mic button if sending message or if main component is disabled
                  disabled={isSending || disabled} 
                  className="h-9 w-9"
                  aria-label={isRecording ? "Stop recording" : (isSTTSupported ? "Start recording" : "Voice input not supported")}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                 <p>{isRecording ? "Stop recording" : (isSTTSupported ? "Start recording" : "Voice input not supported")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
