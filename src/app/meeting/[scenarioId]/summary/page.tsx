
'use client';

import { useEffect, useState } from 'react';
import type { MeetingSummaryData } from '@/lib/types';
import { FeedbackReport } from '@/components/summary/FeedbackReport';
import { Logo } from '@/components/Logo';
import { Loader2, FileText, PlayCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateNotebookLMDebrief, type NotebookLMDebriefInput, type NotebookLMDebriefOutput } from '@/ai/flows/generate-notebooklm-debrief-flow';
import { generateSpeechAudio, type GenerateSpeechAudioInput, type GenerateSpeechAudioOutput } from '@/ai/flows/generate-speech-audio-flow';
import type { AnalyzeResponseOutput } from '@/lib/types';


export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<MeetingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notebookLMDebriefContent, setNotebookLMDebriefContent] = useState<string | null>(null);
  const [isLoadingDebrief, setIsLoadingDebrief] = useState(false);
  const [debriefAudioDataUri, setDebriefAudioDataUri] = useState<string | null>(null);
  const [isLoadingDebriefAudio, setIsLoadingDebriefAudio] = useState(false);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);


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
          coachingFeedback: msg.coachingFeedback as AnalyzeResponseOutput,
        }));

      if (userMessagesWithCoaching.length > 0) {
        setIsLoadingDebrief(true);
        setDebriefAudioDataUri(null); // Reset audio URI
        setAudioPlaybackError(null); // Reset audio error
        const debriefInput: NotebookLMDebriefInput = {
          scenarioTitle: summaryData.scenarioTitle,
          scenarioObjective: summaryData.objective,
          userResponsesWithCoaching: userMessagesWithCoaching,
        };
        generateNotebookLMDebrief(debriefInput)
          .then(async (response: NotebookLMDebriefOutput) => {
            const debriefText = response.notebookLMDebrief;
            setNotebookLMDebriefContent(debriefText);

            if (debriefText && !debriefText.startsWith("Sorry, we couldn't generate")) {
              setIsLoadingDebriefAudio(true);
              try {
                const audioInput: GenerateSpeechAudioInput = {
                  text: debriefText,
                  languageCode: 'en-US',
                  voiceName: 'en-US-Neural2-A' // A clear, general voice for the debrief
                };
                const audioResponse: GenerateSpeechAudioOutput = await generateSpeechAudio(audioInput);
                if (audioResponse.audioContentDataUri) {
                  setDebriefAudioDataUri(audioResponse.audioContentDataUri);
                } else {
                  console.error("Audio generation failed:", audioResponse.errorMessage);
                  setAudioPlaybackError(audioResponse.errorMessage || "Failed to generate audio for the debrief.");
                }
              } catch (audioError) {
                console.error("Error generating debrief audio:", audioError);
                setAudioPlaybackError(audioError instanceof Error ? audioError.message : "An unknown error occurred while generating audio.");
              } finally {
                setIsLoadingDebriefAudio(false);
              }
            }
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
              <FileText className="mr-3 h-7 w-7 text-primary" />
              EchoRoom Learning Journal
            </CardTitle>
            <CardDescription className="text-secondary-foreground/80">
              Your personalized learning debrief and reflection prompts. Listen to an audio version below.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingDebrief && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Generating your learning debrief...</p>
              </div>
            )}
            {!isLoadingDebrief && notebookLMDebriefContent && (
              <>
                {isLoadingDebriefAudio && (
                  <div className="flex items-center justify-center my-4 p-3 bg-muted rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <p className="text-sm text-muted-foreground">Generating audio debrief...</p>
                  </div>
                )}
                {audioPlaybackError && !isLoadingDebriefAudio && (
                  <div className="my-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <p className="text-sm">Could not load audio debrief: {audioPlaybackError}</p>
                  </div>
                )}
                {debriefAudioDataUri && !isLoadingDebriefAudio && (
                  <div className="my-4">
                    <h4 className="text-md font-semibold mb-2 text-primary flex items-center">
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Listen to Your Debrief
                    </h4>
                    <audio controls src={debriefAudioDataUri} className="w-full rounded-md shadow">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground mt-4">
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
              </>
            )}
            {!isLoadingDebrief && !notebookLMDebriefContent && (
                <p className="text-muted-foreground">No learning debrief content to display.</p>
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

