
'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2 } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { addUserPersona, deleteUserPersona, getAllUserPersonas } from '@/lib/userPersonas'; // Added getAllUserPersonas

interface PersonaManagerProps {
  personas: Persona[]; // Personas to display in its internal list
  onPersonasUpdate: (personas: Persona[]) => void; // To update its internal list
  onFormSubmitSuccess?: () => void; // To close the dialog from homepage
  personaToEdit?: Persona | null; // Persona being edited, passed from homepage
}

export function PersonaManager({ 
  personas: initialPersonas, // Renamed to avoid conflict with internal state
  onPersonasUpdate, 
  onFormSubmitSuccess, 
  personaToEdit 
}: PersonaManagerProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  
  // Internal list of personas for display *within* this component's UI (if needed)
  const [internalPersonas, setInternalPersonas] = useState<Persona[]>(initialPersonas);

  const [isInternalAlertOpen, setIsInternalAlertOpen] = useState(false);
  const [personaToDeleteInternallyId, setPersonaToDeleteInternallyId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setRole('');
    setInstructionPrompt('');
    setCurrentEditingId(null);
  }, []);
  
  useEffect(() => {
    if (personaToEdit) {
      setName(personaToEdit.name);
      setRole(personaToEdit.role);
      setInstructionPrompt(personaToEdit.instructionPrompt);
      setCurrentEditingId(personaToEdit.id);
    } else {
      resetForm();
    }
  }, [personaToEdit, resetForm]);

  // Effect to keep internalPersonas in sync with the prop if it changes
  useEffect(() => {
    setInternalPersonas(initialPersonas);
  }, [initialPersonas]);


  const handleCreateOrUpdatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !instructionPrompt.trim()) return;

    const id = currentEditingId || uuidv4();
    const persona: Persona = {
      id,
      name: name.trim(),
      role: role.trim(),
      instructionPrompt: instructionPrompt.trim(),
    };

    addUserPersona(persona); 
    
    // Refresh the internal list if this component displays one
    const updatedInternalPersonas = getAllUserPersonas();
    setInternalPersonas(updatedInternalPersonas);
    onPersonasUpdate(updatedInternalPersonas); // Notify parent of changes if needed for its own display

    if (onFormSubmitSuccess) {
      onFormSubmitSuccess(); // This will close the dialog and trigger homepage refresh
    }
    resetForm();
  };

  const handleEditInternalPersona = (persona: Persona) => {
    // This function is for editing personas from the list *within* this dialog
    // If called, it means we are not using the personaToEdit prop from parent
    // but rather picking one from the internal list.
    // This might be redundant if editing is always initiated from homepage buttons.
    setName(persona.name);
    setRole(persona.role);
    setInstructionPrompt(persona.instructionPrompt);
    setCurrentEditingId(persona.id);
  };

  const confirmDeleteInternalPersona = () => {
    if (personaToDeleteInternallyId) {
      deleteUserPersona(personaToDeleteInternallyId); 
      const updatedInternalPersonas = internalPersonas.filter(p => p.id !== personaToDeleteInternallyId);
      setInternalPersonas(updatedInternalPersonas);
      onPersonasUpdate(updatedInternalPersonas); 
      
      if (currentEditingId === personaToDeleteInternallyId) { 
        resetForm();
      }
      setPersonaToDeleteInternallyId(null);
      setIsInternalAlertOpen(false);
    }
  };

  const openInternalDeleteConfirmation = (id: string) => {
    setPersonaToDeleteInternallyId(id);
    setIsInternalAlertOpen(true);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{currentEditingId ? 'Edit Persona' : 'Create New Persona'}</DialogTitle>
        <DialogDescription>
          {currentEditingId ? 'Modify the details of this AI persona.' : 'Define a new AI persona that can participate in your meeting scenarios.'}
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
          {currentEditingId && (
            <Button type="button" variant="outline" onClick={() => { resetForm(); if (onFormSubmitSuccess) onFormSubmitSuccess(); }} className="mr-auto">
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!name.trim() || !role.trim() || !instructionPrompt.trim()}
          >
            {currentEditingId ? 'Save Changes' : 'Create Persona'}
          </Button>
        </DialogFooter>
      </form>

      {/* List of personas *within* this dialog - can be kept or removed if homepage buttons are primary */}
      {internalPersonas.length > 0 && !personaToEdit && ( // Show list only if not in edit mode from homepage
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold mb-3">Existing Personas (Internal List)</h4>
          <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3">
            {internalPersonas.map((persona) => (
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
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute top-2 right-2 sm:relative sm:top-0 sm:right-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditInternalPersona(persona)} // Uses internal edit
                      className="h-7 w-7"
                      title="Edit Persona from list"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openInternalDeleteConfirmation(persona.id)}
                      className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete Persona from list"
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

      <AlertDialog open={isInternalAlertOpen} onOpenChange={setIsInternalAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the persona from this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonaToDeleteInternallyId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInternalPersona} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    