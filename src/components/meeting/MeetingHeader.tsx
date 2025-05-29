
import type { Scenario } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetingHeaderProps {
  scenario: Scenario | null;
  onEndMeeting: () => void;
  isTTSEnabled: boolean;
  onToggleTTS: () => void;
  isTTSSupported: boolean;
}

export function MeetingHeader({ scenario, onEndMeeting, isTTSEnabled, onToggleTTS, isTTSSupported }: MeetingHeaderProps) {
  if (!scenario) {
    return (
      <Card className="mb-4 rounded-lg shadow">
        <CardHeader>
          <CardTitle>Loading scenario...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-4 rounded-lg shadow-md sticky top-0 z-10 bg-card/90 backdrop-blur-sm">
      <CardHeader className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl text-primary truncate">{scenario.title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              <strong>Objective:</strong> {scenario.objective}
            </CardDescription>
          </div>
          <div className="flex items-center ml-4 space-x-2">
            {isTTSSupported && (
              <Button variant="outline" size="icon" onClick={onToggleTTS} title={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}>
                {isTTSEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                <span className="sr-only">{isTTSEnabled ? "Disable TTS" : "Enable TTS"}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEndMeeting}>
              <LogOut className="mr-2 h-4 w-4" /> End Meeting
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
