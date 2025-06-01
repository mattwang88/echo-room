'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { Pencil, Trash2 } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { getAllUserPersonas, addUserPersona, deleteUserPersona } from '@/lib/userPersonas';

interface PersonaManagerProps {
  personas: Persona[];
  onPersonasUpdate: (personas: Persona[]) => void;
}

export function PersonaManager({ personas, onPersonasUpdate }: PersonaManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !instructionPrompt.trim()) return;

    const id = editingPersona?.id || uuidv4();
    const persona: Persona = {
      id,
      name: name.trim(),
      role: role.trim(),
      instructionPrompt: instructionPrompt.trim(),
    };

    addUserPersona(persona);
    const updatedPersonas = editingPersona 
      ? personas.map(p => p.id === editingPersona.id ? persona : p)
      : [...personas, persona];
    onPersonasUpdate(updatedPersonas);

    setOpen(false);
    resetForm();
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setRole(persona.role);
    setInstructionPrompt(persona.instructionPrompt);
    setOpen(true);
  };

  const handleDeletePersona = (id: string) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deleteUserPersona(id);
      const updatedPersonas = personas.filter(p => p.id !== id);
      onPersonasUpdate(updatedPersonas);
    }
  };

  const resetForm = () => {
    setName('');
    setRole('');
    setInstructionPrompt('');
    setEditingPersona(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">AI Personas</h3>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              + Add Persona
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingPersona ? 'Edit Persona' : 'Create New Persona'}</DialogTitle>
              <DialogDescription>
                Define a new AI persona that can participate in your meeting scenarios.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePersona} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Sarah Chen"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Role</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Senior Product Manager"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Instruction Prompt</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  placeholder="Define how this persona should behave and respond..."
                  value={instructionPrompt}
                  onChange={e => setInstructionPrompt(e.target.value)}
                  required
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={!name.trim() || !role.trim() || !instructionPrompt.trim()}
                >
                  {editingPersona ? 'Save Changes' : 'Create Persona'}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {personas.map((persona) => (
          <div key={persona.id} className="p-4 border rounded-lg relative group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{persona.name}</h4>
                <p className="text-sm text-muted-foreground">{persona.role}</p>
                <p className="mt-2 text-sm">{persona.instructionPrompt}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditPersona(persona)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePersona(persona.id)}
                  className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 