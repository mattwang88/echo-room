'use client';

import { useState } from 'react';
import { scenarios } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/ScenarioCard';
import { Logo } from '@/components/Logo';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { addUserCreatedScenario } from '@/lib/userScenarios';

const DEFAULT_AGENT_ROLES = [
  { label: 'CTO', value: 'CTO' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Product', value: 'Product' },
  { label: 'HR', value: 'HR' },
];

export default function ScenarioSelectionPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [customAgent, setCustomAgent] = useState('');
  const [customAgents, setCustomAgents] = useState<string[]>([]);
  const router = useRouter();

  const handleAgentChange = (agent: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agent)
        ? prev.filter((a) => a !== agent)
        : [...prev, agent]
    );
  };

  const handleAddCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAgent.trim();
    if (trimmed && !customAgents.includes(trimmed) && !DEFAULT_AGENT_ROLES.some(r => r.value === trimmed)) {
      setCustomAgents((prev) => [...prev, trimmed]);
      setCustomAgent('');
    }
  };

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || selectedAgents.length === 0) return;
    const id = uuidv4();
    // Sensible defaults for required fields
    const scenario = {
      id,
      title: title.trim(),
      description: description.trim(),
      objective: 'Participate in a custom meeting simulation.',
      initialMessage: {
        participant: selectedAgents[0],
        text: `Welcome to your custom meeting: ${title.trim()}. Participants: ${selectedAgents.join(', ')}. Please begin.`,
      },
      agentsInvolved: selectedAgents,
      personaConfig: {
        ctoPersona: 'You are the CTO. Respond as a technical leader.',
        financePersona: 'You are the Head of Finance. Respond as a financial expert.',
        productPersona: 'You are the Head of Product. Respond as a product strategist.',
        hrPersona: 'You are the Head of HR. Respond as a people and culture leader.',
      },
      maxTurns: 10,
    };
    addUserCreatedScenario(scenario);
    setOpen(false);
    setTitle('');
    setDescription('');
    setSelectedAgents([]);
    setCustomAgent('');
    setCustomAgents([]);
    router.push(`/meeting/${id}`);
  };

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
        <div className="mb-8 flex justify-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-lg font-medium px-6 py-3 rounded-lg shadow">
                + Create New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Scenario</DialogTitle>
                <DialogDescription>
                  Enter a title, description, and select or add the people you want to invite to this meeting simulation.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateScenario}>
                <div>
                  <label className="block font-medium mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    placeholder="Scenario Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Description</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Describe the scenario..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">People Invited</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {DEFAULT_AGENT_ROLES.map((role) => (
                      <label key={role.value} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          value={role.value}
                          checked={selectedAgents.includes(role.value)}
                          onChange={() => handleAgentChange(role.value)}
                        />
                        {role.label}
                      </label>
                    ))}
                    {customAgents.map((agent) => (
                      <label key={agent} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          value={agent}
                          checked={selectedAgents.includes(agent)}
                          onChange={() => handleAgentChange(agent)}
                        />
                        {agent}
                      </label>
                    ))}
                  </div>
                  <form className="flex gap-2" onSubmit={handleAddCustomAgent}>
                    <input
                      type="text"
                      className="border rounded px-3 py-2 flex-1"
                      placeholder="Add custom person..."
                      value={customAgent}
                      onChange={e => setCustomAgent(e.target.value)}
                    />
                    <Button type="submit" variant="secondary">
                      Add
                    </Button>
                  </form>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!title.trim() || !description.trim() || selectedAgents.length === 0}>
                    Create Scenario
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
