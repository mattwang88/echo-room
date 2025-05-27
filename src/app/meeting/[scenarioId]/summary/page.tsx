'use client';

import { useEffect, useState } from 'react';
import type { MeetingSummaryData } from '@/lib/types';
import { FeedbackReport } from '@/components/summary/FeedbackReport';
import { Logo } from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<MeetingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedSummary = localStorage.getItem('echoRoomMeetingSummary');
      if (storedSummary) {
        setSummaryData(JSON.parse(storedSummary));
        // Optional: Clear the data from localStorage after reading to prevent re-use
        // localStorage.removeItem('echoRoomMeetingSummary'); 
      }
    } catch (error) {
      console.error("Error reading summary from localStorage:", error);
      // Handle error, e.g., show a message to the user
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-center">
        <Logo className="mb-6" iconSize={10} textSize="text-3xl" />
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your feedback summary...</p>
      </div>
    );
  }

  if (!summaryData) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-center">
        <Logo className="mb-6" iconSize={10} textSize="text-3xl" />
        <h1 className="text-2xl font-semibold text-destructive mb-4">No Summary Data Found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the summary for your last meeting.</p>
        <Link href="/" passHref>
          <Button>Return to Scenarios</Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex flex-col items-center">
      <header className="my-6 text-center">
        <Logo iconSize={10} textSize="text-3xl"/>
      </header>
      <main className="w-full">
        <FeedbackReport summaryData={summaryData} />
      </main>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EchoRoom. Your meeting insights, demystified.</p>
      </footer>
    </div>
  );
}
