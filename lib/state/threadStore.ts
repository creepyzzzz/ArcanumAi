// path: lib/state/threadStore.ts

import { create } from 'zustand';
import { DocMeta, ThreadState } from '@/types';
import { nanoid } from 'nanoid';
import { getThreadState, saveThreadState } from '@/lib/persist/indexedDb';

interface ThreadStore {
  threadState: ThreadState | null;
  setThreadState: (threadId: string) => Promise<void>;
  getActiveDoc: () => DocMeta | null;
  openDocInCanvas: (docId: string) => void;
  closeCanvas: () => void;
  updateDoc: (docId: string, updates: Partial<DocMeta>) => void;
  // --- MODIFICATION START ---
  // Added 'pdf' to the list of valid kinds for creating a document.
  createAndOpenDoc: (
    kind: 'document' | 'code' | 'pdf',
    name?: string,
    content?: string
  ) => void;
  // --- MODIFICATION END ---
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threadState: null,

  setThreadState: async (threadId) => {
    const existingState = await getThreadState(threadId);
    if (existingState) {
      set({ threadState: existingState });
    } else {
      const newState: ThreadState = { threadId, docs: {}, files: [] };
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
      saveThreadState(newState.threadId, newState);
      return { threadState: newState };
    });
  },
}));
