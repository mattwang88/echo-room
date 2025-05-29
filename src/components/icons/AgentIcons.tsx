
import type { ParticipantRole } from '@/lib/types';
import { Cpu, Landmark, Package, Users, UserCircle2, BrainCircuit, Briefcase } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentIconProps extends LucideProps {
  role: ParticipantRole;
  scenarioId?: string;
}

export const AgentIcon: React.FC<AgentIconProps> = ({ role, className, scenarioId, ...props }) => {
  const defaultClassName = "h-8 w-8";

  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return <Briefcase className={cn(defaultClassName, 'text-primary', className)} {...props} />;
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
      return <UserCircle2 className={cn(defaultClassName, 'text-muted-foreground', className)} {...props} />;
  }
};

export const getAgentColor = (role: ParticipantRole, scenarioId?: string): string => {
  // Color for Manager (Product in manager-1on1 scenario) can be the same as Product or customized.
  // Keeping it same as Product (primary) for now.
  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return 'text-primary';
  }

  switch (role) {
    case 'CTO': return 'text-destructive';
    case 'Finance': return 'text-accent';
    case 'Product': return 'text-primary';
    case 'HR': return 'text-secondary-foreground';
    case 'User': return 'text-primary';
    case 'System': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
}

export const getAgentName = (role: ParticipantRole, scenarioId?: string): string => {
  if (role === 'Product' && scenarioId === 'manager-1on1') {
    return 'Manager';
  }
  if (role === 'User') return 'You';
  if (role === 'System') return 'System';
  return role;
};
