import type { ParticipantRole } from '@/lib/types';
import { Cpu, Landmark, Package, Users, UserCircle2, BrainCircuit } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentIconProps extends LucideProps {
  role: ParticipantRole;
}

export const AgentIcon: React.FC<AgentIconProps> = ({ role, className, ...props }) => {
  const defaultClassName = "h-8 w-8";
  switch (role) {
    case 'CTO':
      return <Cpu className={cn(defaultClassName, 'text-destructive', className)} {...props} />;
    case 'Finance':
      return <Landmark className={cn(defaultClassName, 'text-accent', className)} {...props} />;
    case 'Product':
      return <Package className={cn(defaultClassName, 'text-primary', className)} {...props} />;
    case 'HR':
      // No direct yellow in theme, using secondary-foreground as a distinct option
      return <Users className={cn(defaultClassName, 'text-secondary-foreground', className)} {...props} />;
    case 'User':
      return <UserCircle2 className={cn(defaultClassName, 'text-primary', className)} {...props} />;
    case 'System':
       return <BrainCircuit className={cn(defaultClassName, 'text-muted-foreground', className)} {...props} />;
    default:
      return <UserCircle2 className={cn(defaultClassName, 'text-muted-foreground', className)} {...props} />;
  }
};

export const getAgentColor = (role: ParticipantRole): string => {
  switch (role) {
    case 'CTO': return 'text-destructive';
    case 'Finance': return 'text-accent';
    case 'Product': return 'text-primary';
    case 'HR': return 'text-secondary-foreground'; // Consistent with icon color
    case 'User': return 'text-primary';
    case 'System': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
}

export const getAgentName = (role: ParticipantRole): string => {
  if (role === 'User') return 'You';
  if (role === 'System') return 'System';
  return role;
};
