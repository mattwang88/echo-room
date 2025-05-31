'use client';

import { useEffect, useState } from 'react';
import type { MeetingSummaryData } from '@/lib/types';
import { FeedbackReport } from '@/components/summary/FeedbackReport';
import { Logo } from '@/components/Logo';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { generateNotebookLMDebrief, type NotebookLMDebriefInput, type NotebookLMDebriefOutput } from '@/ai/flows/generate-notebooklm-debrief-flow';
import type { AnalyzeResponseOutput } from '@/lib/types';

export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<MeetingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notebookLMDebriefContent, setNotebookLMDebriefContent] = useState<string | null>(null);
  const [isLoadingDebrief, setIsLoadingDebrief] = useState(false);
  const { toast } = useToast();

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
          coachingFeedback: msg.coachingFeedback as AnalyzeResponseOutput, // Ensure this type cast is safe
        }));

      if (userMessagesWithCoaching.length > 0) {
        setIsLoadingDebrief(true);
        const debriefInput: NotebookLMDebriefInput = {
          scenarioTitle: summaryData.scenarioTitle,
          scenarioObjective: summaryData.objective,
          userResponsesWithCoaching: userMessagesWithCoaching,
        };
        generateNotebookLMDebrief(debriefInput)
          .then((response: NotebookLMDebriefOutput) => {
            setNotebookLMDebriefContent(response.notebookLMDebrief);
          })
          .catch(error => {
            console.error("Error generating learning debrief:", error);
            setNotebookLMDebriefContent("Sorry, we couldn't generate your learning debrief at this time.");
          })
          .finally(() => {
            setIsLoadingDebrief(false);
          });
      } else {
        setNotebookLMDebriefContent("No coaching feedback was available to generate a learning debrief.");
      }
    }
  }, [summaryData]);

  const handleCopyToClipboard = () => {
    if (notebookLMDebriefContent) {
      navigator.clipboard.writeText(notebookLMDebriefContent)
        .then(() => {
          toast({
            title: "Copied to Clipboard!",
            description: "Your learning summary is ready to be pasted into NotebookLM or any other tool.",
          });
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast({
            title: "Copy Failed",
            description: "Could not copy the summary to clipboard. Please try selecting and copying manually.",
            variant: "destructive",
          });
        });
    }
  };

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
              <Copy className="mr-3 h-7 w-7 text-primary" />
              Mini Lecture: Key Lessons from Your Meeting
            </CardTitle>
            <CardDescription className="text-secondary-foreground/80">
              Listen to or copy your personalized lecture below. This short lecture summarizes the most important lessons from your meeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingDebrief && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Generating your lecture...</p>
              </div>
            )}
            {!isLoadingDebrief && notebookLMDebriefContent && (
              <>
                <ScrollArea className="h-[300px] w-full p-4 border rounded-md bg-muted/20 mb-4">
                  <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground">
                    {notebookLMDebriefContent.split('\n').map((paragraph, index) => {
                        const isHeading = paragraph.trim().endsWith(':') && !paragraph.trim().startsWith('-');
                        const isListItem = paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•');
                        
                        if (isHeading) {
                          return <h4 key={index} className="text-md font-semibold mt-3 mb-1 text-primary">{paragraph.replace(/\*\*/g, '')}</h4>;
                        } else if (isListItem) {
                           return <p key={index} className="mb-1 ml-4">{paragraph}</p>;
                        }
                        return <p key={index} className={paragraph.trim() === '' ? 'my-2' : 'mb-3'}>{paragraph}</p>;
                      })}
                  </div>
                </ScrollArea>
                <Button onClick={handleCopyToClipboard} className="w-full" disabled={!notebookLMDebriefContent}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Lecture to Clipboard
                </Button>
              </>
            )}
            {!isLoadingDebrief && !notebookLMDebriefContent && (
                <p className="text-muted-foreground">No lecture content to display.</p>
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
