
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AgentIcon, getAgentName, getAgentColor } from '@/components/icons/AgentIcons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ChatMessageProps {
  message: Message;
  scenarioId?: string; // Added scenarioId
}

export function ChatMessage({ message, scenarioId }: ChatMessageProps) {
  const isUser = message.participant === 'User';
  const agentName = getAgentName(message.participant, scenarioId);
  const agentColor = getAgentColor(message.participant, scenarioId);

  return (
    <div className={cn("flex items-end gap-2 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 self-start">
          <AgentIcon role={message.participant} scenarioId={scenarioId} className="h-8 w-8" />
          <AvatarFallback>{agentName.substring(0, 2)}</AvatarFallback>
        </Avatar>
      )}
      <Card className={cn(
        "max-w-md md:max-w-lg lg:max-w-xl rounded-xl shadow-md",
        isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground",
        isUser ? "rounded-br-none" : "rounded-bl-none"
      )}>
        <CardContent className="p-3">
          {!isUser && <p className={`text-xs font-semibold mb-1 ${agentColor}`}>{agentName}</p>}
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </CardContent>
        <CardFooter className="px-3 py-1 text-xs flex justify-between items-center">
          <span className={isUser ? "text-primary-foreground/80" : "text-muted-foreground"}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          {message.semanticEvaluation?.score !== undefined && (
            <Badge variant={message.semanticEvaluation.score > 0.7 ? "default" : (message.semanticEvaluation.score > 0.4 ? "secondary" : "destructive")} 
                   className="ml-2 bg-accent text-accent-foreground">
              Score: {(message.semanticEvaluation.score * 100).toFixed(0)}%
            </Badge>
          )}
        </CardFooter>
      </Card>
      {isUser && (
         <Avatar className="h-8 w-8 self-start">
          <AgentIcon role={message.participant} scenarioId={scenarioId} className="h-8 w-8" />
          <AvatarFallback>{agentName.substring(0, 2)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
