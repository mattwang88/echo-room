
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
  const barClasses = cn(baseBarClasses, animationClass, "w-3");

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        "gap-2", 
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      {/* Symmetrical "W" pattern with 11 bars: L, L, M, H, M, L (center), M, H, M, L, L */}
      {/* Adjusted heights: peaks are h-full, intermediate are h-3/5, lowest are h-1/5 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '0ms'}}></div>    {/* Bar 1 (Outer Left) */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '100ms'}}></div>   {/* Bar 2 */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div>   {/* Bar 3 (Rising - Taller) */}
      <div className={cn(barClasses, "h-full")} style={{animationDelay: '300ms'}}></div>   {/* Bar 4 - Peak 1 (Tallest) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '400ms'}}></div>   {/* Bar 5 (Falling - Taller) */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '500ms'}}></div>   {/* Bar 6 - Central Valley (Lowest) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '600ms'}}></div>   {/* Bar 7 (Rising - Taller) */}
      <div className={cn(barClasses, "h-full")} style={{animationDelay: '700ms'}}></div>   {/* Bar 8 - Peak 2 (Tallest) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '800ms'}}></div>   {/* Bar 9 (Falling - Taller) */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '900ms'}}></div>   {/* Bar 10 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '1000ms'}}></div>  {/* Bar 11 (Outer Right) */}
    </div>
  );
}

