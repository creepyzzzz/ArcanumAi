// path: lib/canvas/applyEdits.ts

import { DocMeta } from '@/types';

/**
 * This file will contain the logic for applying edits to documents and code
 * based on user requests in the chat (e.g., "shorten this paragraph").
 */

interface EditOptions {
  selection?: { from: number; to: number };
  intent?: 'rewrite' | 'shorten' | 'expand' | 'fix' | 'append';
}

/**
 * Applies an edit to a TipTap (document) document.
 * @param originalContent The original Markdown/HTML content of the document.
 * @param modification The new text from the AI.
 * @param options The editing options, including selection range and intent.
 * @returns The updated content string.
 */
export function applyDocumentEdit(
  originalContent: string,
  modification: string,
  options: EditOptions
): string {
  console.log('Applying document edit:', { originalContent, modification, options });
  
  // Basic placeholder logic:
  if (options.selection) {
    // If there was a selection, replace it.
    // This is a simplified example. A real implementation would need to handle
    // character indices carefully, especially with HTML/Markdown.
    return (
      originalContent.slice(0, options.selection.from) +
      modification +
      originalContent.slice(options.selection.to)
    );
  }
  
  // If no selection, just append the new content.
  return originalContent + '\n\n' + modification;
}

/**
 * Applies an edit to a Monaco (code) document.
 * @param originalContent The original code content.
 * @param modification The new code from the AI.
 * @param options The editing options.
 * @returns The updated content string.
 */
export function applyCodeEdit(
  originalContent: string,
  modification: string,
  options: EditOptions
): string {
  console.log('Applying code edit:', { originalContent, modification, options });

  // Placeholder logic similar to the document editor.
  if (options.selection) {
    return (
      originalContent.slice(0, options.selection.from) +
      modification +
      originalContent.slice(options.selection.to)
    );
  }

  return originalContent + '\n' + modification;
}
