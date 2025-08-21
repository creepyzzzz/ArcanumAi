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

// --- MODIFICATION START ---
// Create a dedicated interface for chat options.
// This makes the code cleaner and ensures all providers
// have the same set of available options.
export interface ChatOptions {
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  stream?: (chunk: string) => void;
  signal?: AbortSignal; // Officially add the signal property here
  attachments?: Attachment[]; // NEW: Add optional attachments property
}
// --- MODIFICATION END ---


export interface ProviderAdapter {
  id: string;
  displayName: string;
  needsKey: boolean;
  models: { id: string; label: string }[];
  // --- MODIFICATION START ---
  // Update sendChat to use the new ChatOptions interface.
  sendChat(opts: ChatOptions): Promise<{ text: string }>;
  // --- MODIFICATION END ---
}

export type ProviderId = 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq' | 'mock';
