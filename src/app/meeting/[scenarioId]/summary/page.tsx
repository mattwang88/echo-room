
'use client';

import { useEffect, useState } from 'react';
import type { MeetingSummaryData, Message } from '@/lib/types';
import { FeedbackReport } from '@/components/summary/FeedbackReport';
import { Logo } from '@/components/Logo';
import { Loader2, Podcast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generatePodcastSummary, type PodcastSummaryInput, type PodcastSummaryOutput } from '@/ai/flows/generate-podcast-summary-flow';
import type { AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';


export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<MeetingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [podcastScript, setPodcastScript] = useState<string | null>(null);
  const [isLoadingPodcast, setIsLoadingPodcast] = useState(false);

  useEffect(() => {
    try {
      const storedSummary = localStorage.getItem('echoRoomMeetingSummary');
      if (storedSummary) {
        setSummaryData(JSON.parse(storedSummary));
      }
    } catch (error) {
      console.error("Error reading summary from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (summaryData) {
      const userMessagesWithCoaching = summaryData.messages
        .filter(msg => msg.participant === 'User' && msg.coachingFeedback)
        .map(msg => ({
          userResponseText: msg.text,
          coachingFeedback: msg.coachingFeedback as AnalyzeResponseOutput, // Cast as it's filtered
        }));

      if (userMessagesWithCoaching.length > 0) {
        setIsLoadingPodcast(true);
        const podcastInput: PodcastSummaryInput = {
          scenarioTitle: summaryData.scenarioTitle,
          scenarioObjective: summaryData.objective,
          userResponsesWithCoaching: userMessagesWithCoaching,
        };
        generatePodcastSummary(podcastInput)
          .then((response: PodcastSummaryOutput) => {
            setPodcastScript(response.podcastScript);
          })
          .catch(error => {
            console.error("Error generating podcast summary:", error);
            setPodcastScript("Sorry, we couldn't generate your podcast debrief at this time.");
          })
          .finally(() => {
            setIsLoadingPodcast(false);
          });
      } else {
        setPodcastScript("No coaching feedback was available to generate a podcast summary.");
      }
    }
  }, [summaryData]);


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
      <main className="w-full max-w-3xl space-y-8">
        <FeedbackReport summaryData={summaryData} />

        <Card className="shadow-xl">
          <CardHeader className="bg-secondary rounded-t-lg">
            <CardTitle className="text-2xl flex items-center text-secondary-foreground">
              <Podcast className="mr-3 h-7 w-7 text-primary" />
              EchoRoom Debrief
            </CardTitle>
            <CardDescription className="text-secondary-foreground/80">
              Your personalized podcast-style feedback summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingPodcast && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Generating your debrief...</p>
              </div>
            )}
            {podcastScript && !isLoadingPodcast && (
              <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground">
                {podcastScript.split('\n').map((paragraph, index) => (
                  <p key={index} className={paragraph.trim() === '' ? 'my-2' : 'mb-3'}>{paragraph}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
       <footer className="mt-8 mb-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EchoRoom. Your meeting insights, demystified.</p>
      </footer>
    </div>
  );
}
