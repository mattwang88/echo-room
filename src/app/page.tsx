
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GoogleEchoLogo } from '@/components/GoogleEchoLogo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const scenariosForButtons = [
  { id: 'product-pitch', title: 'New Product Pitch' },
  { id: 'manager-1on1', title: '1-on-1 with Manager' },
  { id: 'okr-review', title: 'Quarterly OKR Review' },
  { id: 'job-resignation', title: 'Practice Resignation' },
];

const participantRoles = ["CTO", "Finance", "Product", "HR"];

export default function HomePage() {
  const [simulationDescription, setSimulationDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const handleRoleSelect = (role: string) => {
    setSelectedRoles(prevSelectedRoles =>
      prevSelectedRoles.includes(role)
        ? prevSelectedRoles.filter(r => r !== role)
        : [...prevSelectedRoles, role]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          <GoogleEchoLogo iconSize={7} textSize="text-2xl" googleTextSize="text-2xl" />
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
          {/* Animated Sphere Placeholder */}
          <div className="mb-8">
            <Image 
              src="/images/front-page.gif" 
              alt="Front page animation" 
              width={300} 
              height={200} 
              className="mx-auto rounded-lg"
              data-ai-hint="front page animation"
              unoptimized // Add this prop for GIFs to prevent optimization issues
            />
          </div>

          {/* Describe Simulation Input Area */}
          <div className="relative flex items-center w-full p-1 bg-card border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary">
            <Sparkles className="h-5 w-5 text-gray-400 mx-3 flex-shrink-0" />
            <Textarea
              placeholder="Describe Simulation"
              value={simulationDescription}
              onChange={(e) => setSimulationDescription(e.target.value)}
              className="flex-grow !p-3 !border-0 !shadow-none !ring-0 resize-none min-h-[50px] bg-transparent focus:outline-none placeholder-gray-500"
              rows={1}
            />
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 mx-2">
              <Mic className="h-5 w-5" />
              <span className="sr-only">Use microphone</span>
            </Button>
             <Button className="bg-black text-white hover:bg-gray-800 rounded-md px-6 py-2.5 text-sm font-medium ml-1 mr-1 my-1 flex-shrink-0">
              Generate
            </Button>
          </div>
          
          {/* Action Icons Bar */}
          <div className="flex justify-center space-x-2 sm:space-x-3 mt-4">
            {[Users, Plus, Upload, Package, Layers].map((IconComponent, index) => {
              if (index === 0) { // Change for the first button (Users icon)
                return (
                  <DropdownMenu key={index}>
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
                            event.preventDefault(); // Keep menu open
                            handleRoleSelect(role);
                          }}
                        >
                          {role}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              // Keep others as icon buttons
              return (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="icon" 
                  className="bg-card border-gray-300 text-gray-600 hover:bg-gray-100 h-9 w-9 sm:h-10 sm:w-10" 
                  aria-label={IconComponent.displayName ? IconComponent.displayName.replace('Icon', '').trim() : `Action ${index + 1}`}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Signature Challenges Section */}
      <section className="pb-10 pt-6 px-4">
        <div className="w-full max-w-3xl mx-auto">
          <h2 className="text-sm font-medium text-gray-500 mb-3 text-left ml-1">
            Signature Challenges
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

      {/* Floating Messages Button */}
      <div className="fixed bottom-6 left-6">
        <Button variant="outline" className="bg-card border-gray-300 shadow-lg rounded-full pl-3 pr-4 py-2 h-10 text-sm text-gray-700 hover:bg-gray-100">
          <MessageCircle className="h-5 w-5 mr-2" />
          Messages
          <span className="ml-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">1</span>
        </Button>
      </div>
    </div>
  );
}
