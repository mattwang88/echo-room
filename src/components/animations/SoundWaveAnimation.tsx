
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
  const barClasses = cn(baseBarClasses, animationClass, "w-3"); // w-3 from previous adjustment

  return (
    <div
      className={cn(
        "flex items-end justify-center",
        "gap-2", // gap-2 from previous adjustment
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      {/* One Peak, One Valley Shape */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '0ms'}}></div>
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '100ms'}}></div>
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div> {/* Peak */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '300ms'}}></div>
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '400ms'}}></div> {/* Valley */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '500ms'}}></div>
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '600ms'}}></div>
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '700ms'}}></div>
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '800ms'}}></div>
    </div>
  );
}
