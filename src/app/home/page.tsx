
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
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
  MicOff,
  Users,
  Plus,
  Upload,
  Package,
  Layers,
  MessageCircle,
  Loader2,
  Pencil,
  X,
  LogIn,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addUserCreatedScenario } from '@/lib/userScenarios';
import { generateCustomScenarioDetails, type GenerateCustomScenarioInput } from '@/ai/flows/generate-custom-scenario-flow';
import type { Scenario, AgentRole, Persona } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { PersonaManager } from '@/components/PersonaManager';
import { getAllUserPersonas, deleteUserPersona } from '@/lib/userPersonas';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { getLearningMode, setLearningMode } from '@/lib/userSettings';

const scenariosForButtons = [
  { id: 'product-pitch', title: 'New Product Pitch' },
  { id: 'manager-1on1', title: '1-on-1 with Manager' },
  { id: 'okr-review', title: 'Quarterly OKR Review' },
  { id: 'job-resignation', title: 'Practice Resignation' },
];

const availableParticipantRoles: AgentRole[] = [
  "CEO", "COO", "CFO", "CMO", "CIO", "Chief Sales Officer",
  "General Counsel", "VP Engineering", "VP Marketing", "VP Sales", "VP Product",
  "CTO", "Product", "Finance", "HR", "Manager",
  "Engineering Manager", "Senior Software Engineer", "Software Engineer", "DevOps Engineer", "QA Engineer",
  "Product Manager", "UX Designer", "UI Designer",
  "Data Scientist", "Data Analyst", "Business Analyst",
  "Project Manager", "Sales Representative", "Account Executive",
  "Customer Support Agent", "Customer Success Manager", "Recruiter"
];


const randomMeetingTopics = [
  "Pitch Q3 marketing strategy.",
  "Review Project Phoenix progress.",
  "Brainstorm new website design.",
  "Plan team offsite event details.",
  "Resolve customer feedback issue.",
  "Prepare client presentation draft.",
  "Align on next month's sales targets.",
  "Improve internal communication flow.",
  "Debrief recent product launch success.",
  "Address payment module tech debt.",
  "Finalize all-hands meeting agenda.",
  "Explore new project management tools.",
  "Update competitor analysis findings.",
  "Conduct CRM system training session.",
  "Discuss employee engagement results.",
];

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [simulationDescription, setSimulationDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AgentRole[]>([]);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [showMeetingLoadingOverlay, setShowMeetingLoadingOverlay] = useState(false);

  const [userPersonas, setUserPersonas] = useState<Persona[]>([]);
  const [isPersonaManagerOpen, setIsPersonaManagerOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const [personaToDeleteId, setPersonaToDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [clientHasMounted, setClientHasMounted] = useState(false);
  useEffect(() => {
    setClientHasMounted(true);
  }, []);

  const [isRecordingHomepage, setIsRecordingHomepage] = useState(false);
  const baseTextForSTT = useRef<string>("");

  const {
    isListening: sttIsListeningHomepageHook,
    startListening: startSttListeningHomepage,
    stopListening: stopSttListeningHomepage,
    sttError: sttErrorHomepage,
    isSTTSupported: isSTTSupportedHomepage,
    clearSTTError: clearSTTErrorHomepage,
  } = useSpeechToText({
    onTranscript: (finalTranscriptSegment: string) => {
      const newTextWithFinalSegment = baseTextForSTT.current + (baseTextForSTT.current ? " " : "") + finalTranscriptSegment.trim();
      setSimulationDescription(newTextWithFinalSegment);
      baseTextForSTT.current = newTextWithFinalSegment;
    },
    onInterimTranscript: (interimTranscriptSegment: string) => {
      setSimulationDescription(baseTextForSTT.current + (baseTextForSTT.current ? " " : "") + interimTranscriptSegment.trim());
    },
    onListeningChange: (listening: boolean) => {
      setIsRecordingHomepage(listening);
    },
  });

  useEffect(() => {
    setIsRecordingHomepage(sttIsListeningHomepageHook);
  }, [sttIsListeningHomepageHook]);

  useEffect(() => {
    if (sttErrorHomepage) {
      toast({
        title: "Voice Input Error",
        description: sttErrorHomepage,
        variant: "destructive",
      });
    }
  }, [sttErrorHomepage, toast]);

  const handleHomepageMicClick = () => {
    clearSTTErrorHomepage();
    if (isRecordingHomepage) {
      stopSttListeningHomepage();
    } else {
      baseTextForSTT.current = simulationDescription;
      startSttListeningHomepage();
    }
  };

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
    const rolesBeforeLoad = [...selectedRoles];
    setIsPersonaManagerOpen(false);
    setEditingPersona(null);
    loadPersonas();
    setSelectedRoles(rolesBeforeLoad);
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

  const handleGenerateRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * randomMeetingTopics.length);
    const randomTopic = randomMeetingTopics[randomIndex];
    if (randomTopic.split(" ").length > 10) {
        const shorterTopic = randomMeetingTopics.find(t => t.split(" ").length <=10) || "Discuss team goals.";
        setSimulationDescription(shorterTopic);
        baseTextForSTT.current = shorterTopic;
    } else {
        setSimulationDescription(randomTopic);
        baseTextForSTT.current = randomTopic;
    }
  };

  const handleGenerateScenario = async () => {
    if (!simulationDescription.trim() || isRecordingHomepage) {
      toast({
        title: "Input Issue",
        description: isRecordingHomepage ? "Please stop voice input before generating." : "Please describe the simulation topic.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScenario(true);
    try {
      const rolesFromCustomPersonas = userPersonas.map(p => p.role as AgentRole);
      const activeAgentsForThisScenario = Array.from(new Set([...rolesFromCustomPersonas, ...selectedRoles]));

      const aiInput: GenerateCustomScenarioInput = {
        simulationDescription,
        selectedRoles: activeAgentsForThisScenario,
      };
      const aiGeneratedDetails = await generateCustomScenarioDetails(aiInput);

      const newScenarioId = `custom-${uuidv4()}`;
      const personaConf: Record<string, string> = {};

      availableParticipantRoles.forEach(stdRole => {
        const keyForConfig = `${stdRole.toLowerCase().replace(/\s+/g, '')}Persona`;

        if (activeAgentsForThisScenario.includes(stdRole)) {
          let personaInstruction = `You are the ${stdRole}. The meeting is about: "${simulationDescription}". The user's objective is: "${aiGeneratedDetails.scenarioObjective}". Engage constructively based on your role's expertise, asking relevant questions and providing feedback.`;
          const customPersonaForRole = userPersonas.find(p => p.role === stdRole);
          if (customPersonaForRole) {
             personaInstruction = customPersonaForRole.instructionPrompt;
          }
          personaConf[keyForConfig] = personaInstruction;
        } else {
          personaConf[keyForConfig] = `You are the ${stdRole}. You are not actively participating in this specific custom scenario titled "${aiGeneratedDetails.scenarioTitle}".`;
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
        agentsInvolved: activeAgentsForThisScenario,
        personaConfig: personaConf,
        maxTurns: 10,
      };

      addUserCreatedScenario(newScenario);
      setShowMeetingLoadingOverlay(true);
      router.push(`/meeting/${newScenarioId}`);

    } catch (error) {
      console.error("Failed to generate scenario:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate the scenario. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingScenario(false);
    }
  };

  const handleNavigateToSignatureScenario = (scenarioId: string) => {
    setShowMeetingLoadingOverlay(true);
    router.push(`/meeting/${scenarioId}`);
  };

  const displayedParticipantRoles = selectedRoles.filter(
    role => !userPersonas.some(p => p.role === role)
  );

  const hasActiveParticipantsToShow = userPersonas.length > 0 || displayedParticipantRoles.length > 0;

  const [isLearningMode, setIsLearningMode] = useState(false);

  // Load learning mode state on mount
  useEffect(() => {
    setIsLearningMode(getLearningMode());
  }, []);

  const handleToggleLearningMode = () => {
    const newMode = !isLearningMode;
    setIsLearningMode(newMode);
    setLearningMode(newMode);
    toast({
      title: newMode ? "Learning Mode Enabled" : "Learning Mode Disabled",
      description: newMode 
        ? "Personas will now act as teachers, providing guidance and education."
        : "Personas will now act as regular meeting participants.",
    });
  };

  if (showMeetingLoadingOverlay) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-2xl text-foreground font-medium">Meeting Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
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

          <div className="relative flex items-center w-full p-1 bg-card border border-gray-300 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={handleGenerateRandomTopic}
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors duration-150 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 flex-shrink-0 mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate random topic"
              disabled={isGeneratingScenario || isRecordingHomepage}
            >
              <Sparkles className="h-5 w-5" />
              <span className="sr-only">Generate random topic</span>
            </button>
            <Textarea
              placeholder={isRecordingHomepage ? "Listening..." : "Describe the meeting topic and pick your persona"}
              value={simulationDescription}
              onChange={(e) => setSimulationDescription(e.target.value)}
              className="flex-grow !p-3 !border-0 !shadow-none !ring-0 resize-none min-h-[50px] bg-transparent focus:outline-none focus-visible:!ring-transparent focus-visible:!ring-offset-0 placeholder-gray-500"
              rows={1}
              disabled={isRecordingHomepage}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHomepageMicClick}
              disabled={!clientHasMounted || !isSTTSupportedHomepage || isGeneratingScenario}
              className="text-gray-500 hover:text-gray-700 mx-2"
              title={isRecordingHomepage ? "Stop voice input" : "Use microphone"}
            >
              {isRecordingHomepage ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span className="sr-only">{isRecordingHomepage ? "Stop voice input" : "Use microphone"}</span>
            </Button>
             <Button
                onClick={handleGenerateScenario}
                disabled={!simulationDescription.trim() || isGeneratingScenario || isRecordingHomepage}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium ml-1 mr-1 my-1 flex-shrink-0"
              >
              {isGeneratingScenario ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>

          <div className="flex justify-center items-center space-x-2 sm:space-x-3 mt-4">
            <Dialog open={isPersonaManagerOpen} onOpenChange={(open) => { if (!open) handleClosePersonaManager(); else setIsPersonaManagerOpen(true); }}>
              <DialogTrigger asChild>
                 <Button
                  variant="outline"
                  className="bg-card border-gray-300 shadow-lg rounded-full pl-3 pr-4 py-2 h-10 text-sm text-gray-700 hover:bg-gray-100"
                  aria-label="Add or Customize Persona"
                  onClick={() => handleOpenPersonaManager()}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Persona
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                 <PersonaManager
                  personas={userPersonas}
                  onFormSubmitSuccess={handleClosePersonaManager}
                  personaToEdit={editingPersona}
                  availableRoles={availableParticipantRoles}
                />
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-card border-gray-300 shadow-lg rounded-full pl-3 pr-4 py-2 h-10 text-sm text-gray-700 hover:bg-gray-100"
                  aria-label="Select Agents"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Select Agents
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 overflow-y-auto">
                {availableParticipantRoles.map((role) => (
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

            <div className="flex items-center gap-2">
              {[Upload, Package, Layers].map((IconComponent, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-card border-gray-300 shadow-lg rounded-full pl-3 pr-4 py-2 h-10 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {index === 0 ? 'Upload' : index === 1 ? 'Package' : 'Layers'}
                </Button>
              ))}
              <Button
                variant={isLearningMode ? "default" : "outline"}
                className={`rounded-full pl-3 pr-4 py-2 h-10 text-sm ${
                  isLearningMode 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-card border-gray-300 shadow-lg text-gray-700 hover:bg-gray-100'
                }`}
                onClick={handleToggleLearningMode}
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Learning Mode
              </Button>
            </div>
          </div>
        </div>
      </main>

      <section className="pt-6 px-4">
        <div className="w-full max-w-3xl mx-auto">
          {hasActiveParticipantsToShow && (
            <>
              <h2 className="text-sm font-medium text-gray-500 mb-3 text-left ml-1">
                Meeting Participants
              </h2>
              <div className="flex flex-wrap justify-start gap-2 sm:gap-3">
                {userPersonas.map((persona) => (
                  <div key={persona.id} className="relative group">
                    <Button
                      variant="outline"
                      className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto pr-14"
                      onClick={() => handleOpenPersonaManager(persona)}
                    >
                      {persona.name}
                    </Button>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-[-6px] right-5 h-5 w-5 p-0.5 rounded-full bg-background text-primary hover:bg-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={(e) => { e.stopPropagation(); handleOpenPersonaManager(persona);}}
                        title="Edit Persona"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-[-6px] right-[-6px] h-5 w-5 p-0.5 rounded-full bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={(e) => { e.stopPropagation(); handleDeletePersonaRequest(persona.id); }}
                        title="Remove Persona"
                      >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {displayedParticipantRoles.map((role) => (
                  <div key={role} className="relative group">
                    <Button
                      variant="outline"
                      className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto"
                    >
                      {role}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-[-6px] right-[-6px] h-5 w-5 p-0.5 rounded-full bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={(e) => { e.stopPropagation(); handleRoleSelect(role); }}
                        title={`Remove ${role}`}
                      >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  ))}
              </div>
            </>
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
                <Button
                  key={challenge.id}
                  variant="outline"
                  onClick={() => handleNavigateToSignatureScenario(challenge.id)}
                  className="bg-card border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 h-auto"
                >
                  {challenge.title}
                </Button>
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

    

    