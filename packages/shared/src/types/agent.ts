export type AgentStatus = 'online' | 'offline' | 'disabled';

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  status: AgentStatus;
  lastSeenAt: string | null;
  version: string | null;
  machineName: string | null;
  os: string | null;
  createdAt: string;
}
