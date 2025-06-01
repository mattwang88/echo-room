import type { Scenario } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface MeetingHeaderProps {
  scenario: Scenario | null;
  onEndMeeting: () => void;
}

export function MeetingHeader({
  scenario,
  onEndMeeting,
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
          {/* Scenario title and objective have been removed from here */}
          {/* End Meeting button was previously removed from here */}
        </div>
      </CardHeader>
    </Card>
  );
}
