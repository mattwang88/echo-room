
import type { Scenario } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Button and LogOut icon are no longer needed here

interface MeetingHeaderProps {
  scenario: Scenario | null;
  onEndMeeting: () => void; // Keep onEndMeeting prop for potential future use, but button is moved
}

export function MeetingHeader({
  scenario,
  onEndMeeting, // This prop is kept but button is moved out
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
          {/* End Meeting button removed from here */}
        </div>
      </CardHeader>
    </Card>
  );
}
