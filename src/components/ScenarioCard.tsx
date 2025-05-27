'use client';

import type { Scenario } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ScenarioCardProps {
  scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{scenario.title}</CardTitle>
        <CardDescription className="h-20 overflow-hidden text-ellipsis">
          {scenario.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Link href={`/meeting/${scenario.id}`} passHref legacyBehavior>
          <Button className="w-full">
            Start Scenario <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
