
import { MessageSquareText } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  iconSize?: number;
  textSize?: string;
}

// This component might be replaced by GoogleEchoLogo or used elsewhere.
// Keeping its original simpler form for now.
export function Logo({ className, iconSize = 8, textSize = "text-2xl", ...props }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="EchoRoom logo" {...props}>
      <MessageSquareText className={`h-${iconSize} w-${iconSize} text-primary`} strokeWidth={2.5}/>
      <span className={`${textSize} font-bold text-foreground`}>EchoRoom</span>
    </div>
  );
}

