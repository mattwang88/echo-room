import type { AnalyzeResponseOutput } from '@/ai/flows/real-time-coaching';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Zap, BarChartBig, MessageCircleQuestion } from 'lucide-react'; // Zap for Persuasiveness, BarChartBig for Technical Soundness

interface CoachingPanelProps {
  feedback: AnalyzeResponseOutput | null;
  isAiThinking: boolean;
}

const FeedbackItem: React.FC<{ title: string; content: string; icon: React.ReactNode }> = ({ title, content, icon }) => (
  <div className="mb-4">
    <div className="flex items-center text-md font-semibold mb-1 text-primary">
      {icon}
      <span className="ml-2">{title}</span>
    </div>
    <p className="text-sm text-foreground/80">{content || "No specific feedback."}</p>
  </div>
);

export function CoachingPanel({ feedback, isAiThinking }: CoachingPanelProps) {
  return (
    <Card className="h-full shadow-lg rounded-lg">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-xl flex items-center">
          <MessageCircleQuestion className="mr-2 h-6 w-6 text-primary" />
          Real-time Coaching
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-y-auto h-[calc(100%-65px)]">
        {isAiThinking && !feedback && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4 animate-pulse text-primary" />
            <p>Waiting for your response to provide coaching...</p>
          </div>
        )}
        {!isAiThinking && !feedback && (
           <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4 text-primary/50" />
            <p>Coaching will appear here after you respond.</p>
          </div>
        )}
        {feedback && (
          <>
            <FeedbackItem title="Clarity" content={feedback.clarity} icon={<Lightbulb className="h-5 w-5" />} />
            <FeedbackItem title="Persuasiveness" content={feedback.persuasiveness} icon={<Zap className="h-5 w-5" />} />
            <FeedbackItem title="Technical Soundness" content={feedback.technicalSoundness} icon={<BarChartBig className="h-5 w-5" />} />
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-md font-semibold mb-1 text-primary flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a2 2 0 0 1 1.79 1.11L15 5.88Z"/><path d="M12 2v7.12"/></svg>
                 <span className="ml-2">Overall Feedback</span>
              </h3>
              <p className="text-sm text-foreground/80">{feedback.overallFeedback}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
