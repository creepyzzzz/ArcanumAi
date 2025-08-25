// types/index.ts

/**
 * Represents a chat thread in the database.
 */
export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: string[]; // Array of message IDs
  files: string[]; // Array of file IDs
  modelLock: string | null;
}

/**
 * Represents a single message in a chat thread.
 */
export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  text?: string;
  createdAt: number;
  attachments?: Attachment[];
  attachmentIds?: string[];
  generatedFileId?: string;
  metadata?: Record<string, any>;
}

/**
 * Represents a reference to a file stored in IndexedDB.
 */
export interface FileRef {
  id: string;
  blobId: string;
  name: string;
  type: string; // The MIME type
  size: number;
  createdAt: number;
  extractedText?: string;
  dataUrl?: string;
  thumbUrl?: string;
  textSnippet?: string;
}

/**
 * A standardized, in-memory representation of a file attachment
 * that will be passed to the model providers.
 */
export interface Attachment {
  id: string;
  name: string;
  type: 'text' | 'image' | 'document' | 'unknown';
  mime_type: string;
  source: 'upload' | 'paste';
  text?: string;
  dataUrl?: string;
}

// --- MODIFICATION START ---
// Added 'pdf' to the list of valid document kinds.
export interface DocMeta {
  id: string;
  kind: 'document' | 'code' | 'pdf';
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  history: { ts: number; content: string }[];
  language?: string;
}
// --- MODIFICATION END ---

export interface ThreadState {
  threadId: string;
  docs: Record<string, DocMeta>;
  activeDocId?: string;
  files: FileRef[];
}
