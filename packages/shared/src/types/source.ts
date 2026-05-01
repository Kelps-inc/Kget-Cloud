export type SourceType = 'url' | 'local_folder' | 'upload';

export interface Source {
  id: string;
  organizationId: string;
  agentId: string | null;
  type: SourceType;
  name: string;
  configJson: Record<string, unknown>;
  scheduleCron: string | null;
  enabled: boolean;
  createdAt: string;
}
