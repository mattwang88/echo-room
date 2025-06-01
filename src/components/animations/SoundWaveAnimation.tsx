
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
      {/* One Peak, One Valley - Right part upside down of left */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '0ms'}}></div>    {/* Bar 1 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '100ms'}}></div>   {/* Bar 2 */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '200ms'}}></div>   {/* Bar 3 - Peak 1 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '300ms'}}></div>   {/* Bar 4 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '400ms'}}></div>   {/* Bar 5 - Valley 1 / Pivot */}
      <div className={cn(barClasses, "h-3/5")} style={{animationDelay: '500ms'}}></div>   {/* Bar 6 - Peak 2 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '600ms'}}></div>   {/* Bar 7 */}
      <div className={cn(barClasses, "h-1/5")} style={{animationDelay: '700ms'}}></div>   {/* Bar 8 - Valley 2 */}
      <div className={cn(barClasses, "h-2/5")} style={{animationDelay: '800ms'}}></div>   {/* Bar 9 */}
    </div>
  );
}
