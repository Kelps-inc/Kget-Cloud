import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("kget_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient
      .post<AuthResponse>("/api/auth/register", data)
      .then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),

  me: () => apiClient.get("/api/auth/me").then((r) => r.data),
};

// ── Files ───────────────────────────────────────────────────────────────────

export const filesApi = {
  list: () => apiClient.get<FileAsset[]>("/api/files").then((r) => r.data),

  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<FileAsset>("/api/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) =>
          onProgress &&
          onProgress(Math.round((e.loaded * 100) / (e.total ?? 1))),
      })
      .then((r) => r.data);
  },

  get: (id: string) =>
    apiClient.get<FileAsset>(`/api/files/${id}`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/files/${id}`).then((r) => r.data),
};

// ── Chat ────────────────────────────────────────────────────────────────────

export const chatApi = {
  createSession: () =>
    apiClient.post<ChatSession>("/api/chat/sessions").then((r) => r.data),

  listSessions: () =>
    apiClient.get<ChatSession[]>("/api/chat/sessions").then((r) => r.data),

  getSession: (id: string) =>
    apiClient
      .get<ChatSessionWithMessages>(`/api/chat/sessions/${id}`)
      .then((r) => r.data),

  sendMessage: (sessionId: string, content: string) =>
    apiClient
      .post<ChatMessageResponse>(`/api/chat/sessions/${sessionId}/messages`, {
        content,
      })
      .then((r) => r.data),
};

// ── Monitoring ──────────────────────────────────────────────────────────────

export const sourcesApi = {
  list: () => apiClient.get<Source[]>("/api/sources").then((r) => r.data),

  create: (data: {
    name: string;
    type: SourceType;
    url: string;
    scheduleCron?: string;
  }) => apiClient.post<Source>("/api/sources", data).then((r) => r.data),

  run: (id: string) =>
    apiClient.post<DownloadJob>(`/api/sources/${id}/run`).then((r) => r.data),

  report: () =>
    apiClient.get<CollectionReport>("/api/sources/report").then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/sources/${id}`).then((r) => r.data),
};

export const agentsApi = {
  list: () => apiClient.get<Agent[]>("/api/agents").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<AgentDetail>(`/api/agents/${id}`).then((r) => r.data),

  create: (data: { name: string }) =>
    apiClient
      .post<Agent & { token: string }>("/api/agents", data)
      .then((r) => r.data),

  update: (
    id: string,
    data: {
      name?: string;
      maxFileBytes?: number;
      allowLocalFiles?: boolean;
      allowedLocalRoots?: string[];
    },
  ) => apiClient.patch<Agent>(`/api/agents/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/agents/${id}`).then((r) => r.data),
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

export interface FileAsset {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  sha256: string;
  status: "stored" | "processing" | "indexed" | "error";
  processingError?: string | null;
  chunkCount?: number;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  organizationId: string;
  createdAt: string;
  _count?: { messages: number };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceIds: string[];
  createdAt: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export interface ChatMessageResponse {
  id: string;
  role: "assistant";
  content: string;
  sources: {
    id: string;
    fileId: string;
    content: string;
    similarity: number;
  }[];
  createdAt: string;
}

export type SourceType = "url" | "agent_url" | "local_folder";

export interface Source {
  id: string;
  organizationId: string;
  agentId: string | null;
  type: SourceType;
  name: string;
  configJson: { url?: string };
  scheduleCron: string | null;
  enabled: boolean;
  createdAt: string;
  latestFile?: FileAsset | null;
  recentJobs?: DownloadJob[];
  _count?: { fileAssets: number; downloadJobs: number };
}

export interface DownloadJob {
  id: string;
  organizationId: string;
  sourceId: string;
  agentId: string | null;
  status:
    | "queued"
    | "assigned"
    | "running"
    | "completed"
    | "failed"
    | "canceled";
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  bytesDownloaded: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  status: string;
  lastSeenAt: string | null;
  version: string | null;
  machineName: string | null;
  os: string | null;
  createdAt: string;
  maxFileBytes: string | null;
  allowLocalFiles: boolean;
  allowedLocalRoots: string[];
  _count?: { downloadJobs: number; sources: number };
}

export interface AgentJob {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  bytesDownloaded: string | null;
  durationMs: number | null;
  createdAt: string;
  source: { id: string; name: string } | null;
}

export interface AgentDetail extends Agent {
  downloadJobs: AgentJob[];
  sources: { id: string; name: string; type: string; enabled: boolean }[];
}

export interface CollectionReport {
  generatedAt: string;
  summary: {
    monitoredSources: number;
    enabledSources: number;
    recentJobs: number;
    completedJobs: number;
    failedJobs: number;
    changesDetected: number;
  };
  findings: {
    jobId: string;
    sourceId: string;
    sourceName: string;
    status: string;
    changed: boolean;
    evidenceFileId: string | null;
    errorMessage: string | null;
    createdAt: string;
    finishedAt: string | null;
    logs: { level: string; message: string; createdAt: string }[];
  }[];
  latestEvidence: {
    id: string;
    sourceName: string;
    originalName: string;
    sha256: string;
    status: string;
    chunks: number;
    createdAt: string;
  }[];
}
