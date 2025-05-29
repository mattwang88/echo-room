
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
    if (!startRecording || !stopRecording) return; // Should not happen if props are correctly passed

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const displayValue = isRecording && interimTranscript ? `${value} ${interimTranscript}`.trim() : value;
  const canSubmit = !isSending && !disabled && value.trim() && !isRecording;

  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-end gap-2 bg-card p-3 rounded-xl shadow-md">
        <Textarea
          value={displayValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : (isSTTSupported ? "Type or use mic (Shift+Enter for new line)" : "Type your response (Shift+Enter for new line)")}
          className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2 min-h-[40px] max-h-[150px] overflow-y-auto leading-tight"
          rows={1}
          disabled={isSending || disabled || (isRecording && !!interimTranscript)}
          aria-label="Your response"
        />
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button
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

          {/* Microphone Button Section - always render interactive style */}
          {typeof startRecording === 'function' && typeof stopRecording === 'function' && (
            <Button
              onClick={handleMicClick}
              disabled={isSending || disabled} // Still disabled if sending or overall input is disabled
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              title={
                !isSTTSupported 
                  ? "Speech-to-text not supported in your browser" 
                  : isRecording 
                    ? "Stop recording" 
                    : "Start recording"
              }
              className="h-9 w-9"
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                // Show Mic icon. If not supported, clicking it will trigger error via startRecording.
                <Mic className="h-4 w-4" /> 
              )}
              <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
            </Button>
          )}
        </div>
      </div>
       {(isRecording && interimTranscript && !value) && (
        <p className="text-xs text-muted-foreground mt-1 italic pl-1">Listening: {interimTranscript}</p>
      )}
       {(isRecording && !interimTranscript && !value) && (
         <p className="text-xs text-muted-foreground mt-1 italic pl-1">Listening...</p>
       )}
    </div>
  );
}
