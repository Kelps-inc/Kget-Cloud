export type DownloadJobStatus = 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'canceled';

export interface DownloadJob {
  id: string;
  organizationId: string;
  sourceId: string;
  agentId: string | null;
  status: DownloadJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  bytesDownloaded: number | null;
  durationMs: number | null;
  createdAt: string;
}
