
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface ResponseInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
  startRecording?: () => void; // Kept for type safety, will be undefined if reverted
  stopRecording?: () => void;  // Kept for type safety
  isRecording?: boolean;       // Kept for type safety
  isSTTSupported?: boolean;    // Kept for type safety
  interimTranscript?: string;  // Kept for type safety
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled) { // Removed isRecording check for reversion
        onSubmit();
      }
    }
  };

  const handleMicClick = () => {
    // This logic will effectively be dormant if STT is not supported or hooks are reverted
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
  
  // Reverted displayValue logic
  const displayValue = value; 
  const canSubmit = !isSending && !disabled && value.trim(); // Reverted canSubmit logic

  return (
    <div className="p-4 border-t bg-background sticky bottom-0" data-testid="response-input-container">
      <div className="flex items-end gap-2 bg-card p-3 rounded-xl shadow-md" data-testid="response-input-inner-container">
        <Textarea
          value={displayValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={"Type your response (Shift+Enter for new line)"} // Reverted placeholder
          className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2 min-h-[40px] max-h-[150px] overflow-y-auto leading-tight"
          rows={1}
          disabled={isSending || disabled } // Reverted disabled logic
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

          {/* Mic button section is conditionally rendered based on STT support / reverted logic might hide it if props are undefined */}
          {/* For full reversion, this button might not have existed or had different logic */}
          {isSTTSupported && startRecording && stopRecording && (
             <Button
              data-testid="mic-button"
              onClick={handleMicClick}
              disabled={isSending || disabled} 
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              title={isRecording ? "Stop recording" : "Start recording"}
              className="h-9 w-9"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
            </Button>
          )}
        </div>
      </div>
       {/* Reverted interim transcript display */}
    </div>
  );
}
