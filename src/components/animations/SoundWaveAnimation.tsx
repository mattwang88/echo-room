
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
  // Adjusted bar width to w-3 and gap to gap-2 in previous steps by user.
  const barClasses = cn(baseBarClasses, animationClass, "w-3");

  return (
    <div
      className={cn(
        "flex items-center justify-center", // Changed to items-center for visualizer effect
        "gap-2", // Current gap
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Sound wave animation"
      data-ai-hint="soundwave animation"
    >
      {/* Symmetrical pattern: low, mid, high, mid, (center)low, mid, high, mid, low */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '0ms'}}></div>    {/* Bar 1 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '100ms'}}></div>   {/* Bar 2 */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div>   {/* Bar 3 - Peak 1 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '300ms'}}></div>   {/* Bar 4 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '400ms'}}></div>   {/* Bar 5 - Central Valley */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '500ms'}}></div>   {/* Bar 6 (Mirror of Bar 4) */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '600ms'}}></div>   {/* Bar 7 (Mirror of Bar 3 - Peak 2) */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '700ms'}}></div>   {/* Bar 8 (Mirror of Bar 2) */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '800ms'}}></div>   {/* Bar 9 (Mirror of Bar 1) */}
    </div>
  );
}

