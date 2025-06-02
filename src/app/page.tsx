
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  const handleEnterClick = () => {
    if (isExiting) return; 

    setIsExiting(true);

    setTimeout(() => {
      router.push('/home');
    }, 1000); // Match the longest animation duration (image slide up)
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
      {/* Background Image Container */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-transform duration-1000 ease-in-out z-0",
          {
            "-translate-y-full": isExiting, // Slide up
          }
        )}
      >
        <Image
          src="/images/welcome.png"
          alt="Welcome background"
          layout="fill"
          objectFit="cover"
          quality={100}
          data-ai-hint="office meeting abstract"
          priority
        />
      </div>

      {/* Content: Logo and Button */}
      <div
        className={cn(
          "relative z-20 flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out",
          {
            "opacity-0": isExiting, // Fade out
          }
        )}
      >
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
          disabled={isExiting}
        >
          <LogIn className="mr-2 h-5 w-5" />
          Enter EchoRoom
        </Button>
      </div>

      {/* Footer */}
      <footer
        className={cn(
          "absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10 transition-opacity duration-500 ease-in-out",
           {
            "opacity-0": isExiting, // Fade out
          }
        )}
      >
        &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
      </footer>
    </div>
  );
}
