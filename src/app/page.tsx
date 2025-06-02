
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import HomePage from '@/app/home/page'; // Import the HomePage component

export default function WelcomePage() {
  const [isExitingWelcome, setIsExitingWelcome] = useState(false);
  const [showHomePage, setShowHomePage] = useState(false);
  const router = useRouter();

  const handleEnterClick = () => {
    if (isExitingWelcome) return;

    setIsExitingWelcome(true);

    // Duration of the exit animation
    const animationDuration = 1000; // 1 second

    setTimeout(() => {
      // After animation, we want to effectively be on the "home page"
      // Visually, HomePage component will take over.
      setShowHomePage(true);
    }, animationDuration);
  };

  // If showHomePage is true, we don't render the welcome overlay anymore
  if (showHomePage) {
    return <HomePage />;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
      {/* HomePage rendered underneath - initially not interactive or fully visible due to overlay */}
      <div className="absolute inset-0 z-0">
        <HomePage />
      </div>

      {/* Welcome Overlay */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-300",
          isExitingWelcome ? "opacity-100" : "opacity-100" // Overlay is always opaque until hidden
        )}
      >
        {/* Background Image Container for Welcome */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full transition-transform duration-1000 ease-in-out z-0",
            {
              "-translate-y-full": isExitingWelcome, // Slide up
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

        {/* Content: Logo and Button for Welcome - these will fade out */}
        <div
          className={cn(
            "relative z-20 flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out",
            {
              "opacity-0": isExitingWelcome, // Fade out content
            }
          )}
        >
          <div className="mb-12"> {/* Increased margin-bottom for more space */}
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
            variant="ghost"
            size="icon"
            className="bg-white hover:bg-gray-100 text-primary rounded-full p-5 w-20 h-20 shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent mt-8 translate-y-30 translate-x-5"
            disabled={isExitingWelcome}
            aria-label="Enter EchoRoom"
          >
            <LogIn className="h-8 w-8" />
          </Button>
        </div>

        {/* Footer for Welcome - this will fade out */}
        <footer
          className={cn(
            "absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10 transition-opacity duration-500 ease-in-out",
            {
              "opacity-0": isExitingWelcome, // Fade out footer
            }
          )}
        >
          &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
        </footer>
      </div>
    </div>
  );
}
