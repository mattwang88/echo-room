
import type { ParticipantRole, AgentRole } from '@/lib/types'; // Added AgentRole
import { Cpu, Landmark, Package, Users, UserCircle2, BrainCircuit, Briefcase } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentIconProps extends LucideProps {
  role: ParticipantRole;
  scenarioId?: string;
}

export const AgentIcon: React.FC<AgentIconProps> = ({ role, className, scenarioId, ...props }) => {
  const defaultClassName = "h-8 w-8";

  // Specific icon for Manager in 'manager-1on1' scenario
  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return <Briefcase className={cn(defaultClassName, 'text-primary', className)} {...props} />;
  }
  if (role === 'Manager') { // General Manager icon
    return <Briefcase className={cn(defaultClassName, 'text-indigo-500', className)} {...props} />;
  }


  switch (role) {
    case 'CTO':
      return <Cpu className={cn(defaultClassName, 'text-destructive', className)} {...props} />;
    case 'Finance':
      return <Landmark className={cn(defaultClassName, 'text-accent', className)} {...props} />;
    case 'Product':
      return <Package className={cn(defaultClassName, 'text-primary', className)} {...props} />;
    case 'HR':
      return <Users className={cn(defaultClassName, 'text-secondary-foreground', className)} {...props} />;
    case 'User':
      return <UserCircle2 className={cn(defaultClassName, 'text-primary', className)} {...props} />;
    case 'System':
       return <BrainCircuit className={cn(defaultClassName, 'text-muted-foreground', className)} {...props} />;
    default:
      // Check if it's a custom role that might be in AgentRole type
      if (typeof role === 'string' && ['CTO', 'Finance', 'Product', 'HR', 'Manager'].includes(role)) {
        // Fallback for defined agent roles not explicitly cased above, or if it's a new one
        return <UserCircle2 className={cn(defaultClassName, 'text-gray-500', className)} {...props} />; // Generic agent icon
      }
      return <UserCircle2 className={cn(defaultClassName, 'text-muted-foreground', className)} {...props} />;
  }
};

export const getAgentColor = (role: ParticipantRole, scenarioId?: string): string => {
  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return 'text-primary'; // Manager in this scenario keeps Product's color or gets a specific one
  }
  if (role === 'Manager') {
    return 'text-indigo-500'; // Dedicated color for Manager role
  }

  switch (role) {
    case 'CTO': return 'text-destructive';
    case 'Finance': return 'text-accent';
    case 'Product': return 'text-primary';
    case 'HR': return 'text-secondary-foreground';
    case 'User': return 'text-primary';
    case 'System': return 'text-muted-foreground';
    default: return 'text-gray-500'; // Default for any other (custom) roles
  }
}

export const getAgentName = (role: ParticipantRole, scenarioId?: string): string => {
  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return 'Manager';
  }
  if (role === 'Manager') return 'Manager';
  if (role === 'User') return 'You';
  if (role === 'System') return 'System';
  return role; // Returns the role string itself (e.g., "CTO", "Finance")
};
