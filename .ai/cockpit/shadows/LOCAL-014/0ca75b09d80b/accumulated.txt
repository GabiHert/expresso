/**
 * Types for the feedback system (v2 format)
 * See .ai/docs/feedback-format-v2.md for specification
 */

/**
 * A single comment on a diff
 */
export interface DiffComment {
  /** Unique 6-character identifier */
  id: string;

  /** File path relative to repo root, or "General" for task-level comments */
  filePath: string;

  /** Starting line number (1-based), undefined for file/general comments */
  line?: number;

  /** Ending line number for ranges, undefined for single-line comments */
  lineEnd?: number;

  /** Comment text (markdown supported) */
  text: string;

  /** Current status */
  status: 'open' | 'resolved';

  /** ISO 8601 timestamp when comment was created */
  createdAt: string;
}

/**
 * Complete feedback file structure
 */
export interface FeedbackFile {
  /** Format version (2 for current spec) */
  version: number;

  /** ISO 8601 timestamp of last sync */
  lastSynced: string;

  /** Map of file paths to content hashes for staleness detection */
  fileHashes: Record<string, string>;

  /** All comments in the file */
  comments: DiffComment[];
}
