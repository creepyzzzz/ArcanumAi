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
  text?: string; // <-- FIX: Added missing optional text property
  createdAt: number;
  attachments?: Attachment[];
  attachmentIds?: string[];
  generatedFileId?: string;
  metadata?: Record<string, any>;
}

/**
 * Represents a reference to a file stored in IndexedDB.
 * This is our main persistence type for files.
 */
export interface FileRef {
  id: string;
  blobId: string;
  name: string;
  type: string; // The MIME type
  size: number;
  createdAt: number;
  // NEW: Store extracted text content for reuse.
  extractedText?: string;
  // NEW: Store the base64 data URL for images.
  dataUrl?: string;
  thumbUrl?: string; // For image thumbnails
  textSnippet?: string; // For text file previews
}

/**
 * A standardized, in-memory representation of a file attachment
 * that will be passed to the model providers.
 */
export interface Attachment {
  id: string;
  name: string;
  // NEW: More specific category for easier handling
  type: 'text' | 'image' | 'document' | 'unknown';
  mime_type: string;
  source: 'upload' | 'paste';
  // The actual content to be sent to the model
  text?: string;
  dataUrl?: string; // base64 data URL for images
}

// Canvas-related types
export interface DocMeta {
  id: string;
  kind: 'document' | 'code';
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  history: { ts: number; content: string }[];
  language?: string;
}

export interface ThreadState {
  threadId: string;
  docs: Record<string, DocMeta>;
  activeDocId?: string;
  files: FileRef[];
}
