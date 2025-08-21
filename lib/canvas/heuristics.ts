// path: lib/canvas/heuristics.ts

/**
 * This file contains the logic for automatically triggering the Canvas
 * based on the content of the assistant's streaming response.
 */

// Rule 1: Minimum token/character count to be considered a "document".
const LENGTH_THRESHOLD = 400;

// Rule 2: Regular expression to detect phrases indicating file/document creation.
const PHRASE_REGEX = /\b(open|create|place|put)\b.*\b(document|doc|canvas|file|notebook|draft)\b/i;

/**
 * Checks if a given text chunk meets the criteria to open the Canvas.
 * @param text The text content from the AI's response.
 * @returns An object indicating whether to trigger the canvas and the reason.
 */
export function checkHeuristics(text: string): { trigger: boolean; reason: string | null } {
  // Check for fenced code blocks
  if (text.includes('```')) {
    return { trigger: true, reason: 'Contains fenced code blocks.' };
  }

  // Check if the text length exceeds the threshold
  if (text.length > LENGTH_THRESHOLD) {
    return { trigger: true, reason: `Exceeds length threshold of ${LENGTH_THRESHOLD} characters.` };
  }

  // Check for specific trigger phrases
  if (PHRASE_REGEX.test(text)) {
    return { trigger: true, reason: 'Contains a document creation phrase.' };
  }

  // No trigger conditions met
  return { trigger: false, reason: null };
}
