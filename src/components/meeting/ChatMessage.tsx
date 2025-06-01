
import type { Message } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { AgentIcon, getAgentName, getAgentColor } from '@/components/icons/AgentIcons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: Message;
  scenarioId?: string; // Added scenarioId
}

export function ChatMessage({ message, scenarioId }: ChatMessageProps) {
  const isUser = message.participant === 'User';
  const agentName = getAgentName(message.participant, scenarioId);
  const agentColor = getAgentColor(message.participant, scenarioId);
  const showAvatarForParticipant = !isUser && message.participant !== 'System';

  return (
    <div className={cn("flex items-end gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
      {showAvatarForParticipant && (
        <Avatar className="h-8 w-8 self-start">
          <AgentIcon role={message.participant} scenarioId={scenarioId} className="h-8 w-8" />
        </Avatar>
      )}
      <Card className={cn(
        "max-w-md md:max-w-lg lg:max-w-xl rounded-xl shadow-md",
        isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground",
        isUser ? "rounded-br-none" : "rounded-bl-none",
        !showAvatarForParticipant && !isUser ? "ml-10" : "" // Add margin if no avatar for non-user, non-system
      )}>
        <CardContent className="p-3">
          {!isUser && <p className={`text-xs font-semibold mb-1 ${agentColor}`}>{agentName}</p>}
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </CardContent>
        <CardFooter className="px-3 py-1 text-xs flex justify-between items-center">
          <span className={isUser ? "text-primary-foreground/80" : "text-muted-foreground"}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </CardFooter>
      </Card>
      {isUser && (
         <Avatar className="h-8 w-8 self-start">
          <AgentIcon role={message.participant} scenarioId={scenarioId} className="h-8 w-8" />
        </Avatar>
      )}
    </div>
  );
}
