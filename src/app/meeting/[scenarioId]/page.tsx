'use client';

import { MeetingInterface } from '@/components/meeting/MeetingInterface';
import { useParams } from 'next/navigation';

export default function MeetingPage() {
  const params = useParams();
  const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : '';
  
  if (!scenarioId) {
    // Optionally, handle cases where scenarioId might not be available immediately or is invalid
    // For now, MeetingInterface itself has a loading state.
    // You could redirect or show a more specific error here if needed.
  }

  return <MeetingInterface scenarioId={scenarioId} />;
}
