
import { MessageSquareText, Sparkle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GoogleEchoLogoProps extends HTMLAttributes<HTMLDivElement> {
  iconSize?: number;
  textSize?: string;
  googleTextSize?: string;
}

export function GoogleEchoLogo({ 
  className, 
  iconSize = 7, 
  textSize = "text-2xl",
  googleTextSize = "text-2xl",
  ...props 
}: GoogleEchoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="Google Echo logo" {...props}>
      {/* Simplified Google-like dots */}
      <div className="flex items-center gap-0.5">
        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
        <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
      </div>
      <span className={cn(googleTextSize, "font-bold text-gray-700")}>Google</span>
      <MessageSquareText className={cn(`h-${iconSize} w-${iconSize}`, "text-primary")} strokeWidth={2.5}/>
      <span className={cn(textSize, "font-bold text-foreground")}>Echo</span>
    </div>
  );
}
