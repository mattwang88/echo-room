import type { AgentRole, ParticipantRole } from '@/lib/types';
import { Cpu, Landmark, Package, Users, UserCircle2, BrainCircuit } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface AgentIconProps extends LucideProps {
  role: ParticipantRole;
}

export const AgentIcon: React.FC<AgentIconProps> = ({ role, className, ...props }) => {
  const defaultClassName = "h-8 w-8";
  switch (role) {
    case 'CTO':
      return <Cpu className={`${defaultClassName} text-red-500 ${className || ''}`} {...props} />;
    case 'Finance':
      return <Landmark className={`${defaultClassName} text-green-500 ${className || ''}`} {...props} />;
    case 'Product':
      return <Package className={`${defaultClassName} text-blue-500 ${className || ''}`} {...props} />;
    case 'HR':
      return <Users className={`${defaultClassName} text-yellow-500 ${className || ''}`} {...props} />;
    case 'User':
      return <UserCircle2 className={`${defaultClassName} text-primary ${className || ''}`} {...props} />;
    case 'System':
       return <BrainCircuit className={`${defaultClassName} text-muted-foreground ${className || ''}`} {...props} />;
    default:
      return <UserCircle2 className={`${defaultClassName} text-gray-400 ${className || ''}`} {...props} />;
  }
};

export const getAgentColor = (role: ParticipantRole): string => {
  switch (role) {
    case 'CTO': return 'text-red-500';
    case 'Finance': return 'text-green-500';
    case 'Product': return 'text-blue-500';
    case 'HR': return 'text-yellow-500';
    case 'User': return 'text-primary';
    case 'System': return 'text-muted-foreground';
    default: return 'text-gray-400';
  }
}

export const getAgentName = (role: ParticipantRole): string => {
  if (role === 'User') return 'You';
  if (role === 'System') return 'System';
  return role;
};
