
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Trash2 } from 'lucide-react';
import type { Persona, AgentRole } from '@/lib/types';
import { addUserPersona, deleteUserPersona, getAllUserPersonas } from '@/lib/userPersonas';

interface PersonaManagerProps {
  personas: Persona[];
  onFormSubmitSuccess?: () => void;
  personaToEdit?: Persona | null;
  availableRoles: AgentRole[];
}

export function PersonaManager({
  personas: initialPersonas,
  onFormSubmitSuccess,
  personaToEdit,
  availableRoles,
}: PersonaManagerProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgentRole>('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  const [internalPersonas, setInternalPersonas] = useState<Persona[]>(initialPersonas || []);

  const [isInternalAlertOpen, setIsInternalAlertOpen] = useState(false);
  const [personaToDeleteInternallyId, setPersonaToDeleteInternallyId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setRole(availableRoles.length > 0 ? availableRoles[0] : '');
    setInstructionPrompt('');
    setCurrentEditingId(null);
  }, [availableRoles]);

  useEffect(() => {
    if (personaToEdit) {
      setName(personaToEdit.name);
      setRole(personaToEdit.role as AgentRole);
      setInstructionPrompt(personaToEdit.instructionPrompt);
      setCurrentEditingId(personaToEdit.id);
    } else {
      resetForm();
    }
  }, [personaToEdit, resetForm]);

  useEffect(() => {
    setInternalPersonas(initialPersonas || []);
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
    const updatedLivePersonas = getAllUserPersonas();
    setInternalPersonas(updatedLivePersonas);


    if (onFormSubmitSuccess) {
      onFormSubmitSuccess();
    }
    resetForm();
  };

  const handleEditInternalPersona = (persona: Persona) => {
    setName(persona.name);
    setRole(persona.role as AgentRole);
    setInstructionPrompt(persona.instructionPrompt);
    setCurrentEditingId(persona.id);
  };

  const confirmDeleteInternalPersona = () => {
    if (personaToDeleteInternallyId) {
      deleteUserPersona(personaToDeleteInternallyId);
      const updatedLivePersonas = getAllUserPersonas();
      setInternalPersonas(updatedLivePersonas);


      if (currentEditingId === personaToDeleteInternallyId) {
        resetForm();
      }
      setPersonaToDeleteInternallyId(null);
      setIsInternalAlertOpen(false);
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      }
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
          <Select value={role} onValueChange={(value) => setRole(value as AgentRole)} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((roleOption) => (
                <SelectItem key={roleOption} value={roleOption}>
                  {roleOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              Cancel Edit
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

      {(internalPersonas || []).length > 0 && !personaToEdit && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold mb-3">Existing Personas</h4>
          <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3">
            {(internalPersonas || []).map((persona) => (
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
                      onClick={() => handleEditInternalPersona(persona)}
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
              This action cannot be undone. This will permanently delete the persona.
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
