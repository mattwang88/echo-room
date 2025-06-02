
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import HomePage from '@/app/home/page';

export default function WelcomePage() {
  const [isExitingWelcome, setIsExitingWelcome] = useState(false);
  const [showHomePage, setShowHomePage] = useState(false);
  const router = useRouter();

  const handleEnterClick = () => {
    if (isExitingWelcome) return;

    setIsExitingWelcome(true);
    const animationDuration = 1000;

    setTimeout(() => {
      setShowHomePage(true);
    }, animationDuration);
  };

  if (showHomePage) {
    return <HomePage />;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
      {/* HomePage rendered underneath */}
      <div className="absolute inset-0 z-0">
        <HomePage />
      </div>

      {/* Welcome Overlay */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-300",
          isExitingWelcome ? "opacity-100" : "opacity-100"
        )}
      >
        {/* Background Image Container for Welcome */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full transition-transform duration-1000 ease-in-out z-0",
            {
              "-translate-y-full": isExitingWelcome,
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

        {/* Content: Logo and Button - this will fade out */}
        <div
          className={cn(
            "relative z-20 flex flex-col items-center justify-center h-full w-full",
            "transition-opacity duration-500 ease-in-out",
            {
              "opacity-0": isExitingWelcome,
            }
          )}
        >
          {/* Logo Group */}
          <div className="flex items-center justify-center">
            {/* Google G Logo */}
            <Image
              src="/images/google_icon.png"
              alt="Google G Logo"
              width={128}
              height={128}
              className="object-contain mr-10 -translate-x-32"
              data-ai-hint="google logo multicolor"
            />
            {/* Echo Text Span directly */}
            <span className="text-6xl sm:text-7xl font-semibold text-white ml-10 translate-x-32">Echo</span>
          </div>

          {/* Enter Button - positioned absolutely near the bottom */}
          <Button
            onClick={handleEnterClick}
            variant="ghost"
            size="icon"
            className="bg-white hover:bg-gray-100 text-primary rounded-full p-5 w-20 h-20 shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent mt-8 translate-y-[12.5rem] translate-x-5"
            disabled={isExitingWelcome}
            aria-label="Enter EchoRoom"
          >
            <LogIn className="h-8 w-8 sm:h-10 sm:h-10" />
          </Button>
        </div>

        {/* Footer for Welcome - this will fade out */}
        <footer
          className={cn(
            "absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10 transition-opacity duration-500 ease-in-out",
            {
              "opacity-0": isExitingWelcome,
            }
          )}
        >
          &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
        </footer>
      </div>
    </div>
  );
}
