'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import type React from 'react';

interface ResponseInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ResponseInput({ value, onChange, onSubmit, isSending, disabled }: ResponseInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      <div className="flex items-center gap-2 bg-card p-2 rounded-lg shadow">
        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your response here... (Shift+Enter for new line)"
          className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none min-h-[60px]"
          rows={3}
          disabled={isSending || disabled}
          aria-label="Your response"
        />
        <Button onClick={onSubmit} disabled={isSending || disabled || !value.trim()} size="lg">
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Send response</span>
        </Button>
      </div>
    </div>
  );
}
