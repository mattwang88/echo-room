
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
  const barClasses = cn(baseBarClasses, animationClass, "w-3"); // w-3 for thickness

  return (
    <div
      className={cn(
        "flex items-center justify-center", // items-center for vertical centering
        "gap-2", // gap-2 for separation
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      {/* Symmetrical "W" pattern with 13 bars, adjusted heights */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '0ms'}}></div>    {/* Bar 1 (Outer Left) */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '100ms'}}></div>   {/* Bar 2 */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div>   {/* Bar 3 (Rising) */}
      <div className={cn(barClasses, "h-4/5")} style={{animationDelay: '300ms'}}></div>   {/* Bar 4 (Peak 1) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '400ms'}}></div>   {/* Bar 5 (Falling) */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '500ms'}}></div>   {/* Bar 6 (New bar next to valley) */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '600ms'}}></div>   {/* Bar 7 (Central Valley - modified height) */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '700ms'}}></div>   {/* Bar 8 (New bar next to valley) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '800ms'}}></div>   {/* Bar 9 (Rising) */}
      <div className={cn(barClasses, "h-4/5")} style={{animationDelay: '900ms'}}></div>   {/* Bar 10 (Peak 2) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '1000ms'}}></div>  {/* Bar 11 (Falling) */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '1100ms'}}></div>  {/* Bar 12 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '1200ms'}}></div>  {/* Bar 13 (Outer Right) */}
    </div>
  );
}
