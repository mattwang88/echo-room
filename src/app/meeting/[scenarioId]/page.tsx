'use client';

import { MeetingInterface } from '@/components/meeting/MeetingInterface';
import { useParams, useSearchParams } from 'next/navigation';

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : '';
  const meetingType = (searchParams?.get('type') === 'real-time') ? 'real-time' : 'chat';
  
  if (!scenarioId) {
    // Optionally, handle cases where scenarioId might not be available immediately or is invalid
    // For now, MeetingInterface itself has a loading state.
    // You could redirect or show a more specific error here if needed.
  }

  return <MeetingInterface scenarioId={scenarioId} meetingType={meetingType} />;
}
