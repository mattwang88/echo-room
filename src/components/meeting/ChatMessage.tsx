import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  scenarioId?: string;
}

export function ChatMessage({ message, scenarioId }: ChatMessageProps) {
  const isUser = message.participant === 'User';
  const isSystem = message.participant === 'System';
  const displayName = message.participantName || message.participant;
  const displayRole = isUser ? 'You' : isSystem ? 'System' : message.participant;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{displayName}</span>
          {!isUser && !isSystem && (
            <span className="text-sm text-muted-foreground">({displayRole})</span>
          )}
        </div>
        <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : isSystem 
              ? 'bg-muted text-muted-foreground'
              : 'bg-secondary text-secondary-foreground'
        }`}>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        {message.coachingFeedback && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>{message.coachingFeedback.overallFeedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}
