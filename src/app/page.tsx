
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
  const [animationStep, setAnimationStep] = useState<'idle' | 'closing' | 'opening'>('idle');
  const router = useRouter();

  const handleEnterClick = () => {
    if (animationStep !== 'idle') return; // Prevent multiple clicks

    setAnimationStep('closing'); // Start closing animation

    setTimeout(() => {
      setAnimationStep('opening'); // Start opening animation

      setTimeout(() => {
        router.push('/home');
      }, 800); // Opening duration: matches curtain open animation
    }, 500); // Closing duration: matches curtain close animation
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
      <Image
        src="/images/welcome.png"
        alt="Welcome background"
        layout="fill"
        objectFit="cover"
        quality={100}
        className="-z-10"
        data-ai-hint="office meeting abstract"
        priority // Good for LCP if this is the main visual
      />

      {/* Left Curtain */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-1/2 bg-gray-800 z-50 transition-transform ease-in-out",
          {
            "-translate-x-full": animationStep === 'idle' || animationStep === 'opening',
            "translate-x-0": animationStep === 'closing',
            "duration-500": animationStep === 'closing',
            "duration-800": animationStep === 'opening',
            "duration-0": animationStep === 'idle',
          }
        )}
      />
      {/* Right Curtain */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-1/2 bg-gray-800 z-50 transition-transform ease-in-out",
          {
            "translate-x-full": animationStep === 'idle' || animationStep === 'opening',
            "translate-x-0": animationStep === 'closing',
            "duration-500": animationStep === 'closing',
            "duration-800": animationStep === 'opening',
            "duration-0": animationStep === 'idle',
          }
        )}
      />

      {/* Content: Logo and Button - above background, below curtains when closed */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        <div className="mb-8">
          <Image
            src="/images/logo.png"
            alt="EchoRoom Logo"
            width={280}
            height={80}
            data-ai-hint="company logo white"
            className="mx-auto"
          />
        </div>
        
        <Button
          onClick={handleEnterClick}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-lg shadow-lg transition-transform hover:scale-105"
          disabled={animationStep !== 'idle'}
        >
          <LogIn className="mr-2 h-5 w-5" />
          Enter EchoRoom
        </Button>
      </div>

      {/* Footer - above background, below curtains when closed */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10">
        &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
      </footer>
    </div>
  );
}
