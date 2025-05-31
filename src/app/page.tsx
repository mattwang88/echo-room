'use client';

import { useState, useEffect } from 'react';
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
import { 
  addUserCreatedScenario, 
  getUserCreatedScenarioById, 
  deleteUserCreatedScenario,
  getAllUserCreatedScenarios 
} from '@/lib/userScenarios';
import { Pencil, Trash2 } from 'lucide-react';
import type { Scenario } from '@/lib/types';

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
  const [objective, setObjective] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load user-created scenarios
    const userScenarios = getAllUserCreatedScenarios();
    setScenarios(userScenarios);
  }, []);

  const handleAgentChange = (agent: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agent)
        ? prev.filter((a) => a !== agent)
        : [...prev, agent]
    );
  };

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !objective.trim() || selectedAgents.length === 0) return;
    
    const id = editingScenario?.id || uuidv4();
    const scenario = {
      id,
      title: title.trim(),
      description: description.trim(),
      objective: objective.trim(),
      initialMessage: {
        participant: selectedAgents[0],
        text: `Welcome to ${title.trim()}. ${description.trim()} Our objective is to ${objective.trim()}. Please begin.`,
      },
      agentsInvolved: selectedAgents,
      personaConfig: {
        ctoPersona: `You are the CTO. Your role is to evaluate technical aspects and feasibility. The meeting objective is: ${objective.trim()}. Respond accordingly.`,
        financePersona: `You are the Head of Finance. Your role is to evaluate financial implications and resources. The meeting objective is: ${objective.trim()}. Respond accordingly.`,
        productPersona: `You are the Head of Product. Your role is to evaluate product strategy and market fit. The meeting objective is: ${objective.trim()}. Respond accordingly.`,
        hrPersona: `You are the Head of HR. Your role is to evaluate people and organizational aspects. The meeting objective is: ${objective.trim()}. Respond accordingly.`,
      },
      maxTurns: 10,
    };

    if (editingScenario) {
      // Update existing scenario
      addUserCreatedScenario(scenario);
      setScenarios(prev => prev.map(s => s.id === editingScenario.id ? scenario : s));
    } else {
      // Create new scenario
      addUserCreatedScenario(scenario);
      setScenarios(prev => [...prev, scenario]);
    }

    setOpen(false);
    resetForm();
  };

  const handleEditScenario = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setTitle(scenario.title);
    setDescription(scenario.description);
    setObjective(scenario.objective);
    setSelectedAgents(scenario.agentsInvolved);
    setOpen(true);
  };

  const handleDeleteScenario = (scenarioId: string) => {
    if (window.confirm('Are you sure you want to delete this scenario?')) {
      deleteUserCreatedScenario(scenarioId);
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setObjective('');
    setSelectedAgents([]);
    setEditingScenario(null);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    resetForm();
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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-foreground">
            Choose a Scenario
          </h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-lg font-medium px-6 py-3 rounded-lg shadow">
                + Create New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingScenario ? 'Edit Scenario' : 'Create a New Scenario'}</DialogTitle>
                <DialogDescription>
                  {editingScenario 
                    ? 'Modify the details of this scenario.'
                    : 'Enter a title, description, and select the people you want to invite to this meeting simulation.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateScenario} className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    placeholder="Scenario Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Description</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Describe the scenario..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Objective</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="What is the main objective of this meeting? (e.g., 'Get approval for a new project', 'Discuss team restructuring')"
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    required
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
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={!title.trim() || !description.trim() || !objective.trim() || selectedAgents.length === 0}
                  >
                    {editingScenario ? 'Save Changes' : 'Create Scenario'}
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
              <div key={scenario.id} className="relative group">
                <ScenarioCard scenario={scenario} />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditScenario(scenario)}
                    className="h-8 w-8 bg-background/80 hover:bg-background"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteScenario(scenario.id)}
                    className="h-8 w-8 bg-background/80 hover:bg-background"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No scenarios available. Create your first scenario to get started!</p>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EchoRoom. All rights reserved.</p>
      </footer>
    </div>
  );
}
