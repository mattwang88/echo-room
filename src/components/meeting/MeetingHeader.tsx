
import type { Scenario } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
// Removed TTS related icons: Volume2, VolumeX

interface MeetingHeaderProps {
  scenario: Scenario | null;
  onEndMeeting: () => void;
  // Removed TTS related props
  // isTTSEnabled?: boolean;
  // toggleTTSEnabled?: () => void;
  // isTTSSupported?: boolean;
  // isTTSSpeaking?: boolean;
}

export function MeetingHeader({ 
  scenario, 
  onEndMeeting, 
  // Removed TTS related props from destructuring
  // isTTSEnabled, 
  // toggleTTSEnabled, 
  // isTTSSupported,
  // isTTSSpeaking
}: MeetingHeaderProps) {
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl text-primary">{scenario.title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              <strong>Objective:</strong> {scenario.objective}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Removed TTS Toggle Button */}
            {/* {isTTSSupported && toggleTTSEnabled && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleTTSEnabled} 
                className="h-9 w-9" 
                title={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
              >
                {isTTSSpeaking ? <VolumeX className="h-4 w-4 animate-pulse" /> : (isTTSEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />) }
              </Button>
            )} */}
            <Button variant="outline" size="sm" onClick={onEndMeeting} className="ml-4">
              <LogOut className="mr-2 h-4 w-4" /> End Meeting
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
