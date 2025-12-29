import { Attachment } from '@/types'; // Import the Attachment type

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
  files?: {
    name: string;
    text?: string;
    mime?: string;
    dataUrl?: string;
  }[];
};

export interface ChatOptions {
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  stream?: (chunk: string, reasoningChunk: string) => void;
  signal?: AbortSignal;
  attachments?: Attachment[];
}

export interface ProviderAdapter {
  id: string;
  displayName: string;
  needsKey: boolean;
  models: { id: string; label: string }[];
  sendChat(opts: ChatOptions): Promise<{ text: string; reasoning?: string }>;
}

export type ProviderId = 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq' | 'mock';