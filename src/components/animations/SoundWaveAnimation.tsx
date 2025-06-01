
'use client';

import { cn } from '@/lib/utils';

interface SoundWaveAnimationProps {
  width?: number;
  height?: number;
  className?: string;
  isAnimating?: boolean; // Added prop to control animation
}

export function SoundWaveAnimation({ width = 256, height = 256, className, isAnimating = true }: SoundWaveAnimationProps) {
  const baseBarClasses = "bg-primary rounded-full";
  const animationClass = isAnimating ? "animate-sound-wave" : "";
  // Increased width from w-3 to w-4
  const barClasses = cn(baseBarClasses, animationClass, "w-4");

  return (
    <div
      className={cn(
        "flex items-end justify-center gap-1.5", // items-end for bottom alignment, increased gap
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      <div className={cn(barClasses, "h-1/3")} style={{animationDelay: '0ms'}}></div>
      <div className={cn(barClasses, "h-2/3")} style={{animationDelay: '150ms'}}></div>
      <div className={cn(barClasses, "h-full")} style={{animationDelay: '300ms'}}></div>
      <div className={cn(barClasses, "h-2/3")} style={{animationDelay: '450ms'}}></div>
      <div className={cn(barClasses, "h-1/3")} style={{animationDelay: '600ms'}}></div>
    </div>
  );
}
