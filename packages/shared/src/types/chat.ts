export type ChatRole = 'user' | 'assistant';

export interface ChatSession {
  id: string;
  organizationId: string;
  title: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sourceIds: string[];
  createdAt: string;
}
