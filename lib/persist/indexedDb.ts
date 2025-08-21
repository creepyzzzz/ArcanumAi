// path: lib/persist/indexedDb.ts

import { get, set, del, keys } from 'idb-keyval';
import { ThreadState } from '@/types';

/**
 * This file provides a simple wrapper around the idb-keyval library
 * to handle storing and retrieving thread document states in the browser's IndexedDB.
 */

const THREAD_STATE_PREFIX = 'thread-state-';

/**
 * Saves the entire state for a specific thread to IndexedDB.
 * @param threadId The ID of the thread.
 * @param state The ThreadState object to save.
 */
export async function saveThreadState(
  threadId: string,
  state: ThreadState
): Promise<void> {
  try {
    await set(`${THREAD_STATE_PREFIX}${threadId}`, state);
  } catch (error) {
    console.error('Failed to save thread state to IndexedDB:', error);
  }
}

/**
 * Retrieves the state for a specific thread from IndexedDB.
 * @param threadId The ID of the thread.
 * @returns The stored ThreadState object, or null if not found.
 */
export async function getThreadState(
  threadId: string
): Promise<ThreadState | null> {
  try {
    const state = await get<ThreadState>(`${THREAD_STATE_PREFIX}${threadId}`);
    return state || null;
  } catch (error) {
    console.error('Failed to retrieve thread state from IndexedDB:', error);
    return null;
  }
}

/**
 * Deletes the state for a specific thread from IndexedDB.
 * This should be called when a thread is deleted from the main database.
 * @param threadId The ID of the thread to delete.
 */
export async function deleteThreadState(threadId: string): Promise<void> {
  try {
    await del(`${THREAD_STATE_PREFIX}${threadId}`);
  } catch (error) {
    console.error('Failed to delete thread state from IndexedDB:', error);
  }
}
