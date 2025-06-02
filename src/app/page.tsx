
'use client';

import Image from 'next/image';
import Link from 'next/link'; // Keep for fallback if needed, but button handles nav
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
  const [curtainsOpening, setCurtainsOpening] = useState(false);
  const router = useRouter();

  const handleEnterClick = () => {
    setCurtainsOpening(true);
    setTimeout(() => {
      router.push('/home');
    }, 800); // Match CSS transition duration
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
      />

      {/* Left Curtain */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-1/2 bg-gray-800 z-50 transition-transform duration-1000 ease-in-out",
          curtainsOpening ? "-translate-x-full" : "translate-x-0"
        )}
      />
      {/* Right Curtain */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-1/2 bg-gray-800 z-50 transition-transform duration-1000 ease-in-out",
          curtainsOpening ? "translate-x-full" : "translate-x-0"
        )}
      />

      {/* Content: Logo and Button - above curtains */}
      <div className="relative z-[60] flex flex-col items-center justify-center">
        <div className="mb-8">
          <Image
            src="/images/logo.png"
            alt="EchoRoom Logo"
            width={280}
            height={80}
            priority
            data-ai-hint="company logo white"
            className="mx-auto"
          />
        </div>
        
        <Button
          onClick={handleEnterClick}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-lg shadow-lg transition-transform hover:scale-105"
          disabled={curtainsOpening}
        >
          <LogIn className="mr-2 h-5 w-5" />
          Enter EchoRoom
        </Button>
      </div>

      {/* Footer - revealed by curtains */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10">
        &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
      </footer>
    </div>
  );
}
