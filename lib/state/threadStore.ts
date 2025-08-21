// path: lib/state/threadStore.ts

import { create } from 'zustand';
import { DocMeta, ThreadState } from '@/types';
import { nanoid } from 'nanoid';
import { getThreadState, saveThreadState } from '@/lib/persist/indexedDb';

interface ThreadStore {
  threadState: ThreadState | null;
  setThreadState: (threadId: string) => Promise<void>; // Now async
  getActiveDoc: () => DocMeta | null;
  openDocInCanvas: (docId: string) => void;
  closeCanvas: () => void;
  updateDoc: (docId: string, updates: Partial<DocMeta>) => void;
  createAndOpenDoc: (
    kind: 'document' | 'code',
    name?: string,
    content?: string
  ) => void;
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threadState: null,

  /**
   * Initializes or sets the thread state for a given thread ID by loading from IndexedDB.
   * @param threadId The ID of the thread to load.
   */
  setThreadState: async (threadId) => {
    const existingState = await getThreadState(threadId);
    if (existingState) {
      set({ threadState: existingState });
    } else {
      // If no state exists in DB, create a new one.
      const newState: ThreadState = { threadId, docs: {} };
      set({ threadState: newState });
      await saveThreadState(threadId, newState);
    }
  },

  getActiveDoc: () => {
    const state = get().threadState;
    if (!state || !state.activeDocId) return null;
    return state.docs[state.activeDocId] ?? null;
  },

  openDocInCanvas: (docId) => {
    set((store) => {
      if (!store.threadState || !store.threadState.docs[docId]) return {};
      const newState = {
        ...store.threadState,
        activeDocId: docId,
      };
      // Persist change
      saveThreadState(newState.threadId, newState);
      return { threadState: newState };
    });
  },

  closeCanvas: () => {
    set((store) => {
      if (!store.threadState) return {};
      const newState = {
        ...store.threadState,
        activeDocId: undefined,
      };
      // Persist change
      saveThreadState(newState.threadId, newState);
      return { threadState: newState };
    });
  },

  updateDoc: (docId, updates) => {
    set((store) => {
      if (!store.threadState || !store.threadState.docs[docId]) return {};
      const currentDoc = store.threadState.docs[docId];
      const updatedDoc = { ...currentDoc, ...updates, updatedAt: Date.now() };

      if (updates.content && updates.content !== currentDoc.content) {
        updatedDoc.history = [
          { ts: currentDoc.updatedAt, content: currentDoc.content },
          ...currentDoc.history,
        ].slice(0, 50);
      }

      const newState = {
        ...store.threadState,
        docs: {
          ...store.threadState.docs,
          [docId]: updatedDoc,
        },
      };
      // Persist change
      saveThreadState(newState.threadId, newState);
      return { threadState: newState };
    });
  },
  
  createAndOpenDoc: (kind, name = 'Untitled', content = '') => {
    const newDoc: DocMeta = {
      id: nanoid(),
      kind,
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
      language: kind === 'code' ? 'typescript' : undefined,
    };

    set((store) => {
      if (!store.threadState) {
        console.error("Cannot create doc without an active thread state.");
        return {};
      }
      const newState = {
        ...store.threadState,
        activeDocId: newDoc.id,
        docs: {
          ...store.threadState.docs,
          [newDoc.id]: newDoc,
        },
      };
      // Persist change
      saveThreadState(newState.threadId, newState);
      return { threadState: newState };
    });
  },
}));
