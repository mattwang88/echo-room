
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Bell,
  Settings,
  UserCircle2,
  Sparkles,
  Mic,
  Users,
  Plus,
  Upload,
  Package,
  Layers,
  MessageCircle,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addUserCreatedScenario } from '@/lib/userScenarios';
import { generateCustomScenarioDetails, type GenerateCustomScenarioInput } from '@/ai/flows/generate-custom-scenario-flow';
import type { Scenario, AgentRole, Persona } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { PersonaManager } from '@/components/PersonaManager';
import { getAllUserPersonas, deleteUserPersona } from '@/lib/userPersonas';


const scenariosForButtons = [
  { id: 'product-pitch', title: 'New Product Pitch' },
  { id: 'manager-1on1', title: '1-on-1 with Manager' },
  { id: 'okr-review', title: 'Quarterly OKR Review' },
  { id: 'job-resignation', title: 'Practice Resignation' },
];

const participantRoles: AgentRole[] = ["CTO", "Finance", "Product", "HR", "Manager"];

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [simulationDescription, setSimulationDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AgentRole[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [userPersonas, setUserPersonas] = useState<Persona[]>([]);
  const [isPersonaManagerOpen, setIsPersonaManagerOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const [personaToDeleteId, setPersonaToDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const loadPersonas = () => {
    setUserPersonas(getAllUserPersonas());
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleRoleSelect = (role: AgentRole) => {
    setSelectedRoles(prevSelectedRoles =>
      prevSelectedRoles.includes(role)
        ? prevSelectedRoles.filter(r => r !== role)
        : [...prevSelectedRoles, role]
    );
  };

  const handleOpenPersonaManager = (persona?: Persona) => {
    setEditingPersona(persona || null);
    setIsPersonaManagerOpen(true);
  };

  const handleClosePersonaManager = () => {
    setIsPersonaManagerOpen(false);
    setEditingPersona(null);
    loadPersonas(); 
  };

  const handleDeletePersonaRequest = (id: string) => {
    setPersonaToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteHomepagePersona = () => {
    if (personaToDeleteId) {
      deleteUserPersona(personaToDeleteId);
      loadPersonas(); 
      toast({ title: "Persona Deleted", description: "The persona has been successfully removed." });
    }
    setPersonaToDeleteId(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleGenerateScenario = async () => {
    if (!simulationDescription.trim()) {
      toast({
        title: "Description Missing",
        description: "Please describe the simulation topic.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const aiInput: GenerateCustomScenarioInput = {
        simulationDescription,
        selectedRoles,
      };
      const aiGeneratedDetails = await generateCustomScenarioDetails(aiInput);

      const newScenarioId = `custom-${uuidv4()}`;
      
      const personaConf: Record<string, string> = {};
      const standardPersonaRoles: AgentRole[] = ["CTO", "Finance", "Product", "HR", "Manager"]; 
      
      standardPersonaRoles.forEach(stdRole => {
        const key = `${stdRole.toLowerCase()}Persona`;
        if (selectedRoles.includes(stdRole)) {
          let personaInstruction = `You are the ${stdRole}. The meeting is about: "${simulationDescription}". The user's objective is: "${aiGeneratedDetails.scenarioObjective}". Engage constructively based on your role's expertise, asking relevant questions and providing feedback.`;
          
          const customPersonaForRole = userPersonas.find(p => p.role === stdRole);
          if (customPersonaForRole) {
             personaInstruction = customPersonaForRole.instructionPrompt;
          } else if (stdRole === "Manager") { 
            personaInstruction = `You are the Manager. The meeting is about: "${simulationDescription}". The user's objective is: "${aiGeneratedDetails.scenarioObjective}". Engage constructively, providing guidance, feedback, and asking relevant questions from a managerial perspective.`;
          }
          personaConf[key] = personaInstruction;
        } else {
          personaConf[key] = `You are the ${stdRole}. You are not actively participating in this specific custom scenario titled "${aiGeneratedDetails.scenarioTitle}".`;
        }
      });

      const newScenario: Scenario = {
        id: newScenarioId,
        title: aiGeneratedDetails.scenarioTitle,
        description: simulationDescription,
        objective: aiGeneratedDetails.scenarioObjective,
        initialMessage: {
          participant: 'System',
          text: aiGeneratedDetails.initialSystemMessage,
        },
        agentsInvolved: selectedRoles,
        personaConfig: personaConf,
        maxTurns: 10, 
      };

      addUserCreatedScenario(newScenario);
      router.push(`/meeting/${newScenarioId}`);

    } catch (error) {
      console.error("Failed to generate scenario:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate the scenario. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const displayedRolesFromCustomPersonas = userPersonas.map(p => p.role);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          <div className="flex items-center space-x-4">
             <Image
              src="/images/logo.png"
              alt="EchoRoom Logo"
              width={150}
              height={40}
              data-ai-hint="company logo"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
              <UserCircle2 className="h-6 w-6" />
              <span className="sr-only">Profile</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center pt-10 pb-4 px-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <Image
              src="/images/front-page.gif"
              alt="Front page animation of an abstract sphere"
              width={300}
              height={200}
              className="mx-auto rounded-lg"
              data-ai-hint="abstract sphere animation"
              unoptimized 
            />
          </div>

          <div className="relative flex items-center w-full p-1 bg-card border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary">
            <Sparkles className="h-5 w-5 text-gray-400 mx-3 flex-shrink-0" />
            <Textarea
              placeholder="Describe the meeting topic or scenario you want to practice..."
              value={simulationDescription}
              onChange={(e) => setSimulationDescription(e.target.value)}
              className="flex-grow !p-3 !border-0 !shadow-none !ring-0 resize-none min-h-[50px] bg-transparent focus:outline-none placeholder-gray-500"
              rows={1}
            />
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 mx-2">
              <Mic className="h-5 w-5" />
              <span className="sr-only">Use microphone</span>
            </Button>
             <Button 
                onClick={handleGenerateScenario}
                disabled={!simulationDescription.trim() || isGenerating}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium ml-1 mr-1 my-1 flex-shrink-0"
              >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>

          <div className="flex justify-center space-x-2 sm:space-x-3 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-card border-gray-300 text-gray-600 hover:bg-gray-100 h-9 w-9 sm:h-10 sm:w-10"
                  aria-label="Select Participants"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {participantRoles.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={selectedRoles.includes(role)}
                    onSelect={(event) => {
                      event.preventDefault(); 
                      handleRoleSelect(role);
                    }}
                  >
                    {role}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={isPersonaManagerOpen} onOpenChange={(open) => { if (!open) handleClosePersonaManager(); else setIsPersonaManagerOpen(true); }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-card border-gray-300 text-gray-600 hover:bg-gray-100 h-9 w-9 sm:h-10 sm:w-10"
                  aria-label="Manage Personas"
                  onClick={() => handleOpenPersonaManager()}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                 <PersonaManager
                  onFormSubmitSuccess={handleClosePersonaManager}
                  personaToEdit={editingPersona}
                />
              </DialogContent>
            </Dialog>

            {[Upload, Package, Layers].map((IconComponent, index) => (
              <Button
                key={index}
                variant="outline"
                size="icon"
                className="bg-card border-gray-300 text-gray-600 hover:bg-gray-100 h-9 w-9 sm:h-10 sm:w-10"
                aria-label={IconComponent.displayName ? IconComponent.displayName.replace('Icon', '').trim() : `Action ${index + 2}`}
              >
                <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            ))}
          </div>
        </div>
      </main>

      {/* Section for People in the meeting room */}
      <section className="pt-6 px-4">
        <div className="w-full max-w-3xl mx-auto">
          <h2 className="text-sm font-medium text-gray-500 mb-3 text-left ml-1">
            People in the meeting room
          </h2>
          {userPersonas.length > 0 || selectedRoles.length > 0 ? (
            <div className="flex flex-wrap justify-start gap-2 sm:gap-3">
              {/* Display all user-created custom personas */}
              {userPersonas.map((persona) => (
                <div key={persona.id} className="relative group">
                  <Button
                    variant="outline"
                    className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto pr-10"
                    onClick={() => handleOpenPersonaManager(persona)}
                  >
                    {persona.name} <span className="text-xs text-gray-500 ml-1">({persona.role})</span>
                  </Button>
                  <div className="absolute top-0 right-0 h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-500 hover:text-gray-700"
                      onClick={(e) => { e.stopPropagation(); handleOpenPersonaManager(persona);}}
                      title="Edit Persona"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive/80"
                      onClick={(e) => { e.stopPropagation(); handleDeletePersonaRequest(persona.id); }}
                      title="Delete Persona"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Display selected standard roles that don't have a custom persona */}
              {selectedRoles
                .filter(role => !displayedRolesFromCustomPersonas.includes(role))
                .map((role) => (
                  <Button
                    key={role}
                    variant="outline"
                    className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto cursor-default opacity-75"
                    disabled 
                  >
                    {role} (Standard)
                  </Button>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-left ml-1">
              Create custom personas or select roles to see participants here.
            </p>
          )}
        </div>
      </section>

      <section className="pb-32 pt-6 px-4">
        <div className="w-full max-w-3xl mx-auto">
          <h2 className="text-sm font-medium text-gray-500 mb-3 text-left ml-1">
            Signature Scenarios
          </h2>
          <div className="flex flex-wrap justify-start gap-2 sm:gap-3">
            {scenariosForButtons.map((challenge) => (
              <Link key={challenge.id} href={`/meeting/${challenge.id}`} passHref legacyBehavior>
                <Button
                  variant="outline"
                  className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto"
                >
                  {challenge.title}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 left-6 z-50">
        <Button variant="outline" className="bg-card border-gray-300 shadow-lg rounded-full pl-3 pr-4 py-2 h-10 text-sm text-gray-700 hover:bg-gray-100">
          <MessageCircle className="h-5 w-5 mr-2" />
          Messages
          <span className="ml-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">1</span>
        </Button>
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this persona?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The persona "{userPersonas.find(p => p.id === personaToDeleteId)?.name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonaToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHomepagePersona} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Persona
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    
