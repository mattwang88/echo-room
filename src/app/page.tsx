
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
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
          <div className="flex items-center justify-center mb-auto pt-20 sm:pt-32"> {/* Pushes logo towards top, mb-auto pushes button down */}
            <Image
              src="https://placehold.co/64x64.png" // Placeholder for Google G
              alt="Google G Logo"
              width={64}
              height={64}
              data-ai-hint="Google G logo multicolor"
              className="object-contain mr-4 sm:mr-6"
            />
            <div className="flex items-center space-x-2 sm:space-x-3">
              <MessageSquareText className="h-14 w-14 sm:h-16 sm:w-16 text-white" strokeWidth={1.5} />
              <span className="text-3xl sm:text-4xl font-semibold text-white">Echo</span>
            </div>
          </div>

          {/* Enter Button - positioned absolutely near the bottom */}
          <Button
            onClick={handleEnterClick}
            variant="ghost"
            size="icon"
            className="bg-white hover:bg-gray-100 text-primary rounded-full p-4 w-16 h-16 sm:w-20 sm:h-20 shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent absolute bottom-[15%] left-1/2 -translate-x-1/2"
            disabled={isExitingWelcome}
            aria-label="Enter EchoRoom"
          >
            <LogIn className="h-7 w-7 sm:h-8 sm:h-8" />
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
