
'use client';

import { cn } from '@/lib/utils';

interface SoundWaveAnimationProps {
  width?: number;
  height?: number;
  className?: string;
  isAnimating?: boolean;
}

export function SoundWaveAnimation({ width = 512, height = 256, className, isAnimating = true }: SoundWaveAnimationProps) {
  const baseBarClasses = "bg-primary rounded-full";
  const animationClass = isAnimating ? "animate-sound-wave" : "";
  // Width is w-3, gap is now increased
  const barClasses = cn(baseBarClasses, animationClass, "w-3");

  return (
    <div
      className={cn(
        "flex items-end justify-center",
        "gap-1.5", // Increased gap from gap-1 to gap-1.5
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      <div className={cn(barClasses, "h-1/4")} style={{animationDelay: '0ms'}}></div>
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '100ms'}}></div>
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div>
      <div className={cn(barClasses, "h-4/5")} style={{animationDelay: '300ms'}}></div>
      <div className={cn(barClasses, "h-full")} style={{animationDelay: '400ms'}}></div>
      <div className={cn(barClasses, "h-4/5")} style={{animationDelay: '500ms'}}></div>
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '600ms'}}></div>
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '700ms'}}></div>
      <div className={cn(barClasses, "h-1/4")} style={{animationDelay: '800ms'}}></div>
    </div>
  );
}

