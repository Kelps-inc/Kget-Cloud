export type FileStatus = 'stored' | 'extracting' | 'extracted' | 'embedding' | 'indexed' | 'failed';

export interface FileAsset {
  id: string;
  organizationId: string;
  sourceId: string | null;
  jobId: string | null;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: FileStatus;
  createdAt: string;
}
