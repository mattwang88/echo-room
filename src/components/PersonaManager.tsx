
'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2 } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { addUserPersona, deleteUserPersona } from '@/lib/userPersonas';

interface PersonaManagerProps {
  personas: Persona[];
  onPersonasUpdate: (personas: Persona[]) => void;
  onFormSubmitSuccess?: () => void;
}

export function PersonaManager({ personas, onPersonasUpdate, onFormSubmitSuccess }: PersonaManagerProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [personaToDeleteId, setPersonaToDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRole('');
    setInstructionPrompt('');
    setEditingPersona(null);
  };
  
  useEffect(() => {
    if (!editingPersona && (name || role || instructionPrompt)) {
      // This primarily handles deselecting an edit.
    }
  }, [editingPersona, name, role, instructionPrompt]);


  const handleCreateOrUpdatePersona = (e: React.FormEvent) => {
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

    if (onFormSubmitSuccess) {
      onFormSubmitSuccess();
    }
    resetForm();
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setRole(persona.role);
    setInstructionPrompt(persona.instructionPrompt);
  };

  const confirmDeletePersona = () => {
    if (personaToDeleteId) {
      deleteUserPersona(personaToDeleteId); 
      const updatedPersonas = personas.filter(p => p.id !== personaToDeleteId);
      onPersonasUpdate(updatedPersonas); 
      if (editingPersona?.id === personaToDeleteId) { 
        resetForm();
      }
      setPersonaToDeleteId(null);
      setIsAlertOpen(false);
    }
  };

  const openDeleteConfirmation = (id: string) => {
    console.log('Attempting to open delete confirmation for ID:', id);
    setPersonaToDeleteId(id);
    setIsAlertOpen(true);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editingPersona ? 'Edit Persona' : 'Create New Persona'}</DialogTitle>
        <DialogDescription>
          {editingPersona ? 'Modify the details of this AI persona.' : 'Define a new AI persona that can participate in your meeting scenarios.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleCreateOrUpdatePersona} className="space-y-4 py-4">
        <div>
          <label htmlFor="personaName" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input
            id="personaName"
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Sarah Chen, Cautious Investor"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="personaRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Input
            id="personaRole"
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Senior Product Manager, Skeptic"
            value={role}
            onChange={e => setRole(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="personaInstruction" className="block text-sm font-medium text-gray-700 mb-1">Instruction Prompt</label>
          <Textarea
            id="personaInstruction"
            className="w-full border rounded px-3 py-2"
            placeholder="Define how this persona should behave, their key concerns, and typical questions they might ask..."
            value={instructionPrompt}
            onChange={e => setInstructionPrompt(e.target.value)}
            required
            rows={5}
          />
        </div>
        <DialogFooter className="pt-2">
          {editingPersona && (
            <Button type="button" variant="outline" onClick={resetForm} className="mr-auto">
              Cancel Edit
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!name.trim() || !role.trim() || !instructionPrompt.trim()}
          >
            {editingPersona ? 'Save Changes' : 'Create Persona'}
          </Button>
        </DialogFooter>
      </form>

      {personas.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold mb-3">Existing Personas</h4>
          <div className="max-h-[250px] overflow-y-auto pr-2 space-y-3">
            {personas.map((persona) => (
              <div key={persona.id} className="p-3 border rounded-lg relative group bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium text-primary">{persona.name}</h5>
                    <p className="text-xs text-muted-foreground mb-1">{persona.role}</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap text-xs">
                      {persona.instructionPrompt.length > 100 
                        ? `${persona.instructionPrompt.substring(0, 100)}...`
                        : persona.instructionPrompt}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2  opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute top-2 right-2 sm:relative sm:top-0 sm:right-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPersona(persona)}
                      className="h-7 w-7"
                      title="Edit Persona"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteConfirmation(persona.id)}
                      className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete Persona"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonaToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePersona} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
