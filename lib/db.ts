import { get, set, del, keys } from 'idb-keyval';
import { Thread, Message, FileRef } from '@/types';
import { processFile } from './file-utils'; // Import the new processor

const THREAD_PREFIX = 'thread:';
const MESSAGE_PREFIX = 'message:';
const FILE_PREFIX = 'file:';
const BLOB_PREFIX = 'blob:';

// A cross-browser compatible function to generate a UUID
function generateUUID() {
  let d = new Date().getTime();
  let d2 = (typeof performance !== 'undefined' && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export class Database {
  // Thread operations
  static async createThread(thread: Omit<Thread, 'id'>): Promise<Thread> {
    const id = generateUUID();
    const newThread: Thread = { ...thread, id };
    await set(`${THREAD_PREFIX}${id}`, newThread);
    return newThread;
  }

  static async getThread(id: string): Promise<Thread | null> {
    return await get(`${THREAD_PREFIX}${id}`) || null;
  }

  static async updateThread(id: string, updates: Partial<Thread>): Promise<void> {
    const existing = await this.getThread(id);
    if (existing) {
      await set(`${THREAD_PREFIX}${id}`, { ...existing, ...updates });
    }
  }

  static async deleteThread(id: string): Promise<void> {
    const thread = await this.getThread(id);
    if (thread) {
      // Delete all messages
      for (const messageId of thread.messages) {
        await this.deleteMessage(messageId);
      }
      // Delete all files
      for (const fileId of thread.files) {
        await this.deleteFile(fileId);
      }
      await del(`${THREAD_PREFIX}${id}`);
    }
  }

  static async getAllThreads(): Promise<Thread[]> {
    const allKeys = await keys();
    const threadKeys = allKeys.filter(key => key.toString().startsWith(THREAD_PREFIX));
    const threads = await Promise.all(
      threadKeys.map(key => get(key))
    );
    return threads.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async searchThreads(query: string): Promise<Thread[]> {
    const allThreads = await this.getAllThreads();
    if (!query.trim()) return allThreads;
    
    return allThreads.filter(thread =>
      thread.title.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Message operations
  static async createMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const id = generateUUID();
    const newMessage: Message = { ...message, id };
    await set(`${MESSAGE_PREFIX}${id}`, newMessage);
    
    // Update thread's message list
    const thread = await this.getThread(message.threadId);
    if (thread) {
      await this.updateThread(message.threadId, {
        messages: [...thread.messages, id],
        updatedAt: Date.now()
      });
    }
    
    return newMessage;
  }

  static async getMessage(id: string): Promise<Message | null> {
    return await get(`${MESSAGE_PREFIX}${id}`) || null;
  }

  static async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const existing = await this.getMessage(id);
    if (existing) {
      await set(`${MESSAGE_PREFIX}${id}`, { ...existing, ...updates });
    }
  }

  static async deleteMessage(id: string): Promise<void> {
    await del(`${MESSAGE_PREFIX}${id}`);
  }

  static async getThreadMessages(threadId: string): Promise<Message[]> {
    const thread = await this.getThread(threadId);
    if (!thread) return [];
    
    const messages = await Promise.all(
      thread.messages.map(messageId => this.getMessage(messageId))
    );
    
    return messages.filter((m): m is Message => !!m).sort((a, b) => a.createdAt - b.createdAt);
  }

  // File operations
  static async createFile(metadata: Omit<FileRef, 'id' | 'blobId'>, blob: File): Promise<FileRef> {
    const id = generateUUID();
    const blobId = generateUUID();
    
    // Store the raw file blob
    await set(`${BLOB_PREFIX}${blobId}`, blob);
    
    // NEW: Process the file to get extractedText or dataUrl
    const processedData = await processFile(blob);

    // Combine metadata with processed data
    const newFile: FileRef = { 
      ...metadata, 
      id, 
      blobId,
      ...processedData // Add extractedText or dataUrl
    };
    
    // Store the complete file reference object
    await set(`${FILE_PREFIX}${id}`, newFile);
    
    return newFile;
  }

  static async getFile(id: string): Promise<FileRef | null> {
    return await get(`${FILE_PREFIX}${id}`) || null;
  }

  static async getFileBlob(blobId: string): Promise<Blob | null> {
    return await get(`${BLOB_PREFIX}${blobId}`) || null;
  }

  static async updateFileBlob(id: string, blob: Blob): Promise<void> {
    const file = await this.getFile(id);
    if (file) {
      await set(`${BLOB_PREFIX}${file.blobId}`, blob);
      
      // NEW: Re-process the file content when the blob is updated
      const processedData = await processFile(blob as File);
      
      const updatedFile: FileRef = { 
        ...file, 
        size: blob.size,
        ...processedData
      };
      await set(`${FILE_PREFIX}${id}`, updatedFile);
    }
  }

  static async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);
    if (file) {
      await del(`${BLOB_PREFIX}${file.blobId}`);
      await del(`${FILE_PREFIX}${id}`);
    }
  }

  static async getThreadFiles(threadId: string): Promise<FileRef[]> {
    const thread = await this.getThread(threadId);
    if (!thread) return [];
    
    const files = await Promise.all(
      thread.files.map(fileId => this.getFile(fileId))
    );
    
    return files.filter((f): f is FileRef => !!f);
  }

  // Export/Import
  static async exportThread(threadId: string): Promise<any> {
    const thread = await this.getThread(threadId);
    if (!thread) return null;
    
    const messages = await this.getThreadMessages(threadId);
    const files = await this.getThreadFiles(threadId);
    
    return {
      thread,
      messages,
      files: files.map(f => ({ ...f, blobId: undefined })) // Don't export blobs
    };
  }
}
