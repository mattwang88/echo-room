'use client';

import { useEffect, useState } from 'react';
import type { MeetingSummaryData, Message, AnalyzeResponseOutput } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, MessageSquareWarning, Info, ThumbsUp, ThumbsDown, Sparkles, Lightbulb, Zap, BarChartBig, MessageCircleQuestion, Brain, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { analyzeMultipleResponses } from '@/ai/flows/real-time-coaching';

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

const FeedbackItem: React.FC<{ title: string; content: string | undefined; icon: React.ReactNode }> = ({ title, content, icon }) => (
  <div className="mb-3">
    <div className="flex items-center text-md font-semibold mb-1 text-primary">
      {icon}
      <span className="ml-2">{title}</span>
    </div>
    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{content || "N/A"}</p>
  </div>
);

// Helper function to extract key phrases from feedback
const extractKeyPhrases = (feedback: string): string[] => {
  // Split into sentences and clean up
  const sentences = feedback
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Extract phrases that indicate strengths or areas for improvement
  const keyPhrases = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return (
      lowerSentence.includes('strength') ||
      lowerSentence.includes('improve') ||
      lowerSentence.includes('could') ||
      lowerSentence.includes('should') ||
      lowerSentence.includes('need') ||
      lowerSentence.includes('consider') ||
      lowerSentence.includes('good') ||
      lowerSentence.includes('excellent') ||
      lowerSentence.includes('clear') ||
      lowerSentence.includes('unclear')
    );
  });

  return keyPhrases;
};

// Helper function to group similar feedback
const groupSimilarFeedback = (feedbackArray: string[]): { [key: string]: string[] } => {
  const groups: { [key: string]: string[] } = {};
  
  feedbackArray.forEach(feedback => {
    const keyPhrases = extractKeyPhrases(feedback);
    
    keyPhrases.forEach(phrase => {
      // Create a simplified version of the phrase for grouping
      const simplifiedPhrase = phrase
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      
      if (!groups[simplifiedPhrase]) {
        groups[simplifiedPhrase] = [];
      }
      groups[simplifiedPhrase].push(feedback);
    });
  });
  
  return groups;
};

// Helper function to generate a summary from grouped feedback
const generateFeedbackSummary = (feedbackArray: string[]): string => {
  if (feedbackArray.length === 0) return "No specific feedback available.";
  if (feedbackArray.length === 1) return feedbackArray[0];
  
  const groups = groupSimilarFeedback(feedbackArray);
  
  // Sort groups by frequency
  const sortedGroups = Object.entries(groups)
    .sort(([, a], [, b]) => b.length - a.length);
  
  // Take the top 3 most frequent feedback points
  const topFeedback = sortedGroups.slice(0, 3);
  
  // Generate a summary
  const summary = topFeedback.map(([key, feedbacks]) => {
    const mostDetailedFeedback = feedbacks.reduce((a, b) => 
      a.length > b.length ? a : b
    );
    return mostDetailedFeedback;
  }).join('\n\n');
  
  return summary;
};

const FeedbackReport = ({ summaryData }: FeedbackReportProps) => {
  const [aggregatedFeedback, setAggregatedFeedback] = useState<AnalyzeResponseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const generateAggregatedFeedback = async () => {
      if (!summaryData) return;

      const userMessages = summaryData.messages.filter(msg => msg.participant === 'User');
      
      if (userMessages.length > 0) {
        try {
          const feedback = await analyzeMultipleResponses({
            responses: userMessages.map(msg => ({
              text: msg.text,
              timestamp: msg.timestamp,
            })),
            context: summaryData.objective,
          });
          if (isMounted) {
            setAggregatedFeedback(feedback);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error generating aggregated feedback:", error);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generateAggregatedFeedback();

    return () => {
      isMounted = false;
    };
  }, [summaryData]);

  if (!summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <MessageSquareWarning className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Summary Data Found</h2>
        <p className="text-muted-foreground mb-6">
          It seems the meeting data is unavailable. This might happen if the meeting wasn't completed or if there was an issue saving the summary.
        </p>
        <Link href="/home" passHref>
          <Button>Back to Scenarios</Button>
        </Link>
      </div>
    );
  }

  const { scenarioTitle, objective, messages } = summaryData;
  const averageScore = calculateAverageSemanticScore(messages);

  const userMessagesWithFeedback = messages.filter(msg => msg.participant === 'User' && (msg.coachingFeedback || msg.semanticEvaluation));

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
          </div>
        )}

        <Separator className="my-6" />

        <h3 className="text-xl font-semibold mb-4 text-primary">Key Insights from Your Meeting:</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Generating feedback summary...</p>
          </div>
        ) : aggregatedFeedback ? (
          <div className="space-y-6">
            <FeedbackItem 
              title="Communication Clarity" 
              content={aggregatedFeedback.clarity} 
              icon={<Lightbulb className="h-5 w-5" />} 
            />
            <FeedbackItem 
              title="Persuasive Impact" 
              content={aggregatedFeedback.persuasiveness} 
              icon={<Zap className="h-5 w-5" />} 
            />
            <FeedbackItem 
              title="Technical Accuracy" 
              content={aggregatedFeedback.technicalSoundness} 
              icon={<BarChartBig className="h-5 w-5" />} 
            />
            <FeedbackItem 
              title="Domain Knowledge" 
              content={aggregatedFeedback.domainKnowledgeFeedback} 
              icon={<Brain className="h-5 w-5" />} 
            />
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-lg font-semibold mb-3 text-primary flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Recommended Learning Resources
              </h4>
              <div className="text-sm text-foreground/80 whitespace-pre-wrap">
                {aggregatedFeedback.suggestedLearningMaterials}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-lg font-semibold mb-3 text-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a2 2 0 0 1 1.79 1.11L15 5.88Z"/><path d="M12 2v7.12"/></svg>
                <span className="ml-2">Overall Assessment</span>
              </h4>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {aggregatedFeedback.overallFeedback}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No feedback available for this session.</p>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex justify-center">
        <Link href="/home" passHref>
          <Button size="lg">
            <CheckCircle className="mr-2 h-5 w-5" /> Back to Scenarios
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export { FeedbackReport };

