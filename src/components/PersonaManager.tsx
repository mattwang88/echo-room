'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import type { Persona, AgentRole } from '@/lib/types';
import { addUserPersona, deleteUserPersona, getAllUserPersonas, saveUserPersona } from '@/lib/userPersonas';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface PersonaManagerProps {
  personas: Persona[];
  onFormSubmitSuccess?: () => void;
  personaToEdit?: Persona | null;
  availableRoles: AgentRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonaManager({
  personas: initialPersonas,
  onFormSubmitSuccess,
  personaToEdit,
  availableRoles,
  open,
  onOpenChange,
}: PersonaManagerProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgentRole>('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [predefinedAvatars, setPredefinedAvatars] = useState<string[]>([]);
  const [userAvatars, setUserAvatars] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [internalPersonas, setInternalPersonas] = useState<Persona[]>(initialPersonas || []);

  const [isInternalAlertOpen, setIsInternalAlertOpen] = useState(false);
  const [personaToDeleteInternallyId, setPersonaToDeleteInternallyId] = useState<string | null>(null);

  // Load available avatars on mount
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const response = await fetch('/api/avatars');
        const data = await response.json();
        setPredefinedAvatars(data.avatars || []);
        setAvailableAvatars(data.avatars || []);
      } catch (error) {
        console.error('Error loading avatars:', error);
        toast({
          title: "Error",
          description: "Failed to load avatars",
          variant: "destructive",
        });
      }
    };
    loadAvatars();
  }, [toast]);

  const resetForm = useCallback(() => {
    setName('');
    setRole(availableRoles.length > 0 ? availableRoles[0] : '');
    setInstructionPrompt('');
    setCurrentEditingId(null);
    setSelectedAvatar(null);
  }, [availableRoles]);

  useEffect(() => {
    if (personaToEdit) {
      setName(personaToEdit.name);
      setRole(personaToEdit.role as AgentRole);
      setInstructionPrompt(personaToEdit.instructionPrompt);
      setCurrentEditingId(personaToEdit.id);
      setSelectedAvatar(personaToEdit.avatar || null);
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
      avatar: selectedAvatar || undefined,
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
    setSelectedAvatar(persona.avatar || null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      // Add the new avatar to the list
      setUserAvatars(prev => [...prev, data.filename]);
      setSelectedAvatar(data.filename);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditingId) return;

    try {
      setIsSubmitting(true);
      const updatedPersona: Persona = {
        id: currentEditingId,
        name,
        role,
        instructionPrompt,
        avatar: selectedAvatar || undefined,
      };
      saveUserPersona(updatedPersona);
      const updatedLivePersonas = getAllUserPersonas();
      setInternalPersonas(updatedLivePersonas);
      setCurrentEditingId(null);
      setSelectedAvatar(null);
      toast({
        title: "Success",
        description: "Persona updated successfully",
      });
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: "Error",
        description: "Failed to save persona",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (personaToDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (personaToDelete) {
      deleteUserPersona(personaToDelete.id);
      const updatedLivePersonas = getAllUserPersonas();
      setInternalPersonas(updatedLivePersonas);
      setShowDeleteConfirm(false);
      setPersonaToDelete(null);
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      }
    }
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{currentEditingId ? 'Edit Persona' : 'Create New Persona'}</DialogTitle>
        <DialogDescription>
          {currentEditingId ? 'Modify the details of this AI persona.' : 'Define a new AI persona that can participate in your meeting scenarios.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
          <div className="mt-2">
            <div className="flex items-center space-x-2 mb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-2">Upload Image</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            <ScrollArea className="h-[200px] pr-4">
              <div className="grid grid-cols-4 gap-2">
                {predefinedAvatars.map((avatar) => (
                  <div
                    key={avatar}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                      selectedAvatar === avatar ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    <img
                      src={`/images/${avatar}`}
                      alt="Avatar"
                      className="w-full h-24 object-cover"
                    />
                  </div>
                ))}
                {userAvatars.map((avatar) => (
                  <div
                    key={avatar}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                      selectedAvatar === avatar ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    <img
                      src={`/images/${avatar}`}
                      alt="User Avatar"
                      className="w-full h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter className="pt-2">
          {currentEditingId && (
            <Button type="button" variant="outline" onClick={() => { resetForm(); if (onFormSubmitSuccess) onFormSubmitSuccess(); }} className="mr-auto">
              Cancel Edit
            </Button>
          )}
          <Button
            type="submit"
            disabled={!name.trim() || !role.trim() || !instructionPrompt.trim() || !selectedAvatar}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              currentEditingId ? 'Save Changes' : 'Create Persona'
            )}
          </Button>
        </DialogFooter>
      </form>

      {(internalPersonas || []).length > 0 && !personaToEdit && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold mb-3">Existing Personas</h4>
          <div className="space-y-3">
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
                      onClick={() => {
                        setPersonaToDelete(persona);
                        setShowDeleteConfirm(true);
                      }}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
