
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react'; // Assuming you might want an icon

export default function WelcomePage() {
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
      <div className="relative z-10 bg-black/50 backdrop-blur-sm p-8 sm:p-12 rounded-xl shadow-2xl">
        <div className="mb-6">
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
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Welcome to EchoRoom
        </h1>
        <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-xl mx-auto">
          Practice workplace communication and sharpen your skills in AI-simulated meeting rooms.
        </p>
        <Link href="/home" passHref>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-lg shadow-lg transition-transform hover:scale-105">
            <LogIn className="mr-2 h-5 w-5" />
            Enter EchoRoom
          </Button>
        </Link>
      </div>
       <footer className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm z-10">
        &copy; {new Date().getFullYear()} EchoRoom. Your space to master communication.
      </footer>
    </div>
  );
}
