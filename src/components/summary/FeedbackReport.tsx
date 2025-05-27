'use client';

import type { MeetingSummaryData, Message } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, MessageSquareWarning, Info, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FeedbackReportProps {
  summaryData: MeetingSummaryData | null;
}

const calculateAverageSemanticScore = (messages: Message[]): number | null => {
  const userMessagesWithScores = messages.filter(
    (msg) => msg.participant === 'User' && msg.semanticEvaluation?.score !== undefined
  );
  if (userMessagesWithScores.length === 0) return null;
  const totalScore = userMessagesWithScores.reduce(
    (sum, msg) => sum + (msg.semanticEvaluation?.score || 0),
    0
  );
  return totalScore / userMessagesWithScores.length;
};


export function FeedbackReport({ summaryData }: FeedbackReportProps) {
  if (!summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <MessageSquareWarning className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Summary Data Found</h2>
        <p className="text-muted-foreground mb-6">
          It seems the meeting data is unavailable. This might happen if the meeting wasn't completed or if there was an issue saving the summary.
        </p>
        <Link href="/" passHref>
          <Button>Back to Scenarios</Button>
        </Link>
      </div>
    );
  }

  const { scenarioTitle, objective, messages } = summaryData;
  const averageScore = calculateAverageSemanticScore(messages);
  
  const userMessages = messages.filter(msg => msg.participant === 'User' && (msg.coachingFeedback || msg.semanticEvaluation));

  return (
    <Card className="w-full max-w-3xl mx-auto my-8 shadow-xl">
      <CardHeader className="text-center bg-primary text-primary-foreground p-6 rounded-t-lg">
        <CardTitle className="text-3xl">Meeting Feedback Report</CardTitle>
        <CardDescription className="text-primary-foreground/80 text-lg mt-1">{scenarioTitle}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-primary flex items-center"><Info className="mr-2 h-5 w-5"/>Scenario Objective</h3>
          <p className="text-muted-foreground">{objective}</p>
        </div>

        {averageScore !== null && (
          <div className="mb-6 p-4 bg-secondary rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-secondary-foreground flex items-center"><Sparkles className="mr-2 h-5 w-5 text-accent"/>Overall Performance</h3>
            <p className="text-lg">
              Average Semantic Score: <Badge variant={averageScore > 0.7 ? "default" : (averageScore > 0.4 ? "secondary" : "destructive")} className="text-lg bg-accent text-accent-foreground">{(averageScore * 100).toFixed(0)}%</Badge>
            </p>
            {/* Add more overall metrics here if available */}
          </div>
        )}
        
        <Separator className="my-6" />

        <h3 className="text-xl font-semibold mb-4 text-primary">Detailed Feedback on Your Responses:</h3>
        {userMessages.length > 0 ? (
          <ScrollArea className="h-[400px] pr-3">
            <Accordion type="single" collapsible className="w-full">
              {userMessages.map((msg, index) => (
                <AccordionItem value={`item-${index}`} key={msg.id} className="mb-2 border bg-card rounded-md shadow-sm">
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex flex-col text-left w-full">
                       <p className="font-medium truncate max-w-md">Your response #{index + 1}: "{msg.text}"</p>
                       {msg.semanticEvaluation?.score && (
                           <Badge variant={msg.semanticEvaluation.score > 0.7 ? "default" : (msg.semanticEvaluation.score > 0.4 ? "secondary" : "destructive")} 
                                  className="w-fit mt-1 bg-accent text-accent-foreground">
                             Score: {(msg.semanticEvaluation.score * 100).toFixed(0)}%
                           </Badge>
                       )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 border-t">
                    {msg.coachingFeedback && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-primary mb-1">Coaching Insights:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><strong>Clarity:</strong> {msg.coachingFeedback.clarity}</li>
                          <li><strong>Persuasiveness:</strong> {msg.coachingFeedback.persuasiveness}</li>
                          <li><strong>Technical Soundness:</strong> {msg.coachingFeedback.technicalSoundness}</li>
                          <li><strong>Overall:</strong> {msg.coachingFeedback.overallFeedback}</li>
                        </ul>
                      </div>
                    )}
                    {msg.semanticEvaluation && (
                       <div>
                        <h4 className="font-semibold text-primary mb-1">Semantic Evaluation:</h4>
                         <p className="text-sm text-muted-foreground"><strong>Feedback:</strong> {msg.semanticEvaluation.feedback}</p>
                         <p className="text-sm text-muted-foreground mt-1"><strong>Guidance:</strong> {msg.semanticEvaluation.guidance}</p>
                       </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground">No specific feedback available for your responses in this session.</p>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex justify-center">
        <Link href="/" passHref>
          <Button size="lg">
            <CheckCircle className="mr-2 h-5 w-5" /> Back to Scenarios
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
