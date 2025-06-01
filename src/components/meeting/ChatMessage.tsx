
import type { Message, MessageAction } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { AgentIcon, getAgentName, getAgentColor } from '@/components/icons/AgentIcons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Play } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  scenarioId?: string;
  onMessageAction?: (messageId: string, actionKey: string) => void;
}

export function ChatMessage({ message, scenarioId, onMessageAction }: ChatMessageProps) {
  const isUser = message.participant === 'User';
  const agentName = getAgentName(message.participant, scenarioId);
  const agentColor = getAgentColor(message.participant, scenarioId);

  const handleActionClick = () => {
    if (message.action && onMessageAction && !message.action.disabled) {
      onMessageAction(message.id, message.action.actionKey);
    }
  };

  return (
    <div className={cn("flex items-end gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
      <Card className={cn(
        "max-w-md md:max-w-lg lg:max-w-xl rounded-xl shadow-md",
        isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground",
        isUser ? "rounded-br-none" : "rounded-bl-none"
      )}>
        <CardContent className="p-3">
          {!isUser && message.participant !== 'System' && <p className={`text-xs font-semibold mb-1 ${agentColor}`}>{agentName}</p>}
          {message.participant === 'System' && <p className={`text-xs font-semibold mb-1 ${agentColor}`}>{agentName}</p>}
          
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          
          {message.action && message.action.type === 'button' && (
            <Button
              onClick={handleActionClick}
              disabled={message.action.disabled}
              className="mt-2 w-full"
              variant="default" 
              size="sm"
            >
              <Play className="mr-2 h-4 w-4" /> {/* Using Play icon for start */}
              {message.action.label}
            </Button>
          )}
        </CardContent>
        <CardFooter className="px-3 py-1 text-xs flex justify-between items-center">
          <span className={isUser ? "text-primary-foreground/80" : "text-muted-foreground"}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
