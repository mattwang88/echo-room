import { scenarios } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/ScenarioCard';
import { Logo } from '@/components/Logo';

export default function ScenarioSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 bg-background">
      <header className="mb-10 text-center">
        <Logo className="justify-center mb-4" iconSize={12} textSize="text-4xl" />
        <p className="text-xl text-muted-foreground">
          Hone your communication skills in realistic AI-powered meeting simulations.
        </p>
      </header>

      <main className="w-full max-w-4xl">
        <h2 className="text-3xl font-semibold mb-8 text-center text-foreground">
          Choose a Scenario
        </h2>
        {scenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No scenarios available at the moment. Please check back later.</p>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EchoRoom. All rights reserved.</p>
      </footer>
    </div>
  );
}
