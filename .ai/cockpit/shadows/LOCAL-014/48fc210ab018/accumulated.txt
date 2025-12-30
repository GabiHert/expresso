import { DiffComment, FeedbackFile } from '../types/feedback';
import { generateCommentId } from '../utils/idGenerator';

// Regex patterns for parsing
const METADATA_PATTERN = /## Metadata\n<!-- AUTO-GENERATED - DO NOT EDIT -->\n([\s\S]*?)\n<!-- END METADATA -->/;
const GENERAL_PATTERN = /^### General$/;
const HEADER_PATTERN = /^### (.+?)(?::(\d+)(?:-(\d+))?)?$/;
const COMMENT_META_PATTERN = /<!-- id: (\w+) \| status: (open|resolved) \| created: ([\d\-T:Z.+-]+) -->/;

/**
 * Parser and serializer for feedback markdown files (v2 format)
 * See .ai/docs/feedback-format-v2.md for specification
 */
export class FeedbackParser {
  /**
   * Parse a feedback markdown file into structured data
   */
  static parse(content: string): FeedbackFile {
    const version = this.detectVersion(content);

    if (version === 1) {
      return this.migrateV1ToV2(content);
    }

    // Parse v2 format
    const metadata = this.parseMetadata(content);
    const comments = this.parseComments(content);

    return {
      version: 2,
      lastSynced: metadata.lastSynced || new Date().toISOString(),
      fileHashes: metadata.fileHashes || {},
      comments
    };
  }

  /**
   * Serialize structured data back to markdown
   */
  static serialize(feedback: FeedbackFile): string {
    const lines: string[] = [];

    // Header
    lines.push('# Diff Feedback');
    lines.push('');
    lines.push('Use this file to add review comments on code changes. The `/address-feedback` command will read this file and present your feedback to the agent.');
    lines.push('');

    // Metadata block
    lines.push('## Metadata');
    lines.push('<!-- AUTO-GENERATED - DO NOT EDIT -->');
    lines.push(`version: ${feedback.version}`);
    lines.push(`last_synced: ${feedback.lastSynced}`);
    lines.push('file_hashes:');
    for (const [filePath, hash] of Object.entries(feedback.fileHashes)) {
      lines.push(`  ${filePath}: ${hash}`);
    }
    lines.push('<!-- END METADATA -->');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Comments
    for (const comment of feedback.comments) {
      // Header
      if (comment.filePath === 'General') {
        lines.push('### General');
      } else if (comment.line !== undefined) {
        if (comment.lineEnd !== undefined) {
          lines.push(`### ${comment.filePath}:${comment.line}-${comment.lineEnd}`);
        } else {
          lines.push(`### ${comment.filePath}:${comment.line}`);
        }
      } else {
        lines.push(`### ${comment.filePath}`);
      }

      // Metadata
      lines.push(`<!-- id: ${comment.id} | status: ${comment.status} | created: ${comment.createdAt} -->`);

      // Body (with strikethrough for resolved)
      if (comment.status === 'resolved') {
        lines.push(`~~${comment.text}~~`);
      } else {
        lines.push(comment.text);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Parse metadata block from content
   */
  private static parseMetadata(content: string): { lastSynced: string; fileHashes: Record<string, string> } {
    const match = content.match(METADATA_PATTERN);
    if (!match) {
      return { lastSynced: '', fileHashes: {} };
    }

    const metaContent = match[1];
    const result: { lastSynced: string; fileHashes: Record<string, string> } = {
      lastSynced: '',
      fileHashes: {}
    };

    // Parse YAML-like content
    const lines = metaContent.split('\n');
    let inFileHashes = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('last_synced:')) {
        result.lastSynced = trimmed.replace('last_synced:', '').trim();
        // Remove any comment
        if (result.lastSynced.includes('#')) {
          result.lastSynced = result.lastSynced.split('#')[0].trim();
        }
      } else if (trimmed.startsWith('file_hashes:')) {
        inFileHashes = true;
      } else if (inFileHashes && trimmed.includes(':')) {
        // Skip comments
        if (trimmed.startsWith('#')) continue;
        const colonIndex = trimmed.indexOf(':');
        const filePath = trimmed.substring(0, colonIndex).trim();
        const hash = trimmed.substring(colonIndex + 1).trim();
        if (filePath && hash && !hash.startsWith('#')) {
          result.fileHashes[filePath] = hash;
        }
      } else if (!trimmed.startsWith('version:') && !trimmed.startsWith('#') && trimmed !== '') {
        inFileHashes = false;
      }
    }

    return result;
  }

  /**
   * Parse all comments from content
   */
  private static parseComments(content: string): DiffComment[] {
    const comments: DiffComment[] = [];

    // Split by ### headers
    const sections = content.split(/(?=^### )/m);

    for (const section of sections) {
      if (!section.startsWith('### ')) continue;

      const lines = section.split('\n');
      const headerLine = lines[0];

      // Parse header
      const headerInfo = this.parseCommentHeader(headerLine.replace('### ', ''));
      if (!headerInfo) continue;

      // Find metadata line
      let metaInfo: { id: string; status: 'open' | 'resolved'; createdAt: string } | null = null;
      let bodyStartIndex = 1;

      for (let i = 1; i < lines.length; i++) {
        const metaMatch = lines[i].match(COMMENT_META_PATTERN);
        if (metaMatch) {
          metaInfo = {
            id: metaMatch[1],
            status: metaMatch[2] as 'open' | 'resolved',
            createdAt: metaMatch[3]
          };
          bodyStartIndex = i + 1;
          break;
        }
      }

      // If no metadata, generate it (v1 migration case in v2 file)
      if (!metaInfo) {
        metaInfo = {
          id: generateCommentId(),
          status: 'open',
          createdAt: new Date().toISOString()
        };
      }

      // Extract body
      let body = lines.slice(bodyStartIndex).join('\n').trim();

      // Check for strikethrough - but metadata status is source of truth
      const trimmedBody = body.trim();
      if (trimmedBody.startsWith('~~') && trimmedBody.endsWith('~~')) {
        body = trimmedBody.slice(2, -2);
        // Only set resolved if metadata didn't already specify status
        // Metadata takes precedence as source of truth
      }

      // Skip empty comments
      if (!body) continue;

      comments.push({
        id: metaInfo.id,
        filePath: headerInfo.filePath,
        line: headerInfo.line,
        lineEnd: headerInfo.lineEnd,
        text: body,
        status: metaInfo.status,
        createdAt: metaInfo.createdAt
      });
    }

    return comments;
  }

  /**
   * Parse a single comment header (e.g., "src/auth.ts:42-50")
   */
  static parseCommentHeader(header: string): {
    filePath: string;
    line?: number;
    lineEnd?: number;
  } | null {
    const trimmed = header.trim();

    // Check for "General" first
    if (trimmed === 'General') {
      return { filePath: 'General' };
    }

    // Parse file:line or file:line-lineEnd
    const match = trimmed.match(/^(.+?)(?::(\d+)(?:-(\d+))?)?$/);
    if (!match) return null;

    const filePath = match[1];

    // Validate path (no absolute paths, no traversal)
    if (this.isInvalidPath(filePath)) {
      return null;
    }

    const result: { filePath: string; line?: number; lineEnd?: number } = {
      filePath: this.normalizePath(filePath)
    };

    if (match[2]) {
      result.line = parseInt(match[2], 10);
    }
    if (match[3]) {
      result.lineEnd = parseInt(match[3], 10);
      // Validate range: lineEnd must be >= line
      if (result.line !== undefined && result.lineEnd < result.line) {
        return null;
      }
    }

    return result;
  }

  /**
   * Check if path is invalid (absolute or contains traversal)
   */
  private static isInvalidPath(filePath: string): boolean {
    try {
      // Decode URL encoding first
      const decoded = decodeURIComponent(filePath);
      // Normalize slashes
      const normalized = decoded.replace(/\\/g, '/').replace(/\/+/g, '/');

      // Absolute paths
      if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
        return true;
      }

      // Path traversal using segments
      const segments = normalized.split('/');
      if (segments.some(seg => seg === '..')) {
        return true;
      }

      // Null byte injection
      if (filePath.includes('\0')) {
        return true;
      }

      return false;
    } catch {
      // If decoding fails, treat as invalid
      return true;
    }
  }

  /**
   * Normalize path to use forward slashes
   */
  private static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Parse comment metadata from HTML comment
   */
  static parseCommentMeta(metaComment: string): {
    id: string;
    status: 'open' | 'resolved';
    createdAt: string;
  } | null {
    const match = metaComment.match(COMMENT_META_PATTERN);
    if (!match) return null;

    return {
      id: match[1],
      status: match[2] as 'open' | 'resolved',
      createdAt: match[3]
    };
  }

  /**
   * Detect format version
   */
  static detectVersion(content: string): number {
    // Check for v2 markers
    if (content.includes('## Metadata') && content.includes('version: 2')) {
      return 2;
    }
    // Check for any version field
    const versionMatch = content.match(/version:\s*(\d+)/);
    if (versionMatch) {
      return parseInt(versionMatch[1], 10);
    }
    // Default to v1 (legacy)
    return 1;
  }

  /**
   * Migrate v1 format to v2
   */
  static migrateV1ToV2(content: string): FeedbackFile {
    const comments: DiffComment[] = [];

    // Split by ### headers (v1 format)
    const sections = content.split(/(?=^### )/m);

    for (const section of sections) {
      if (!section.startsWith('### ')) continue;

      const lines = section.split('\n');
      const headerLine = lines[0];

      // Parse header
      const headerInfo = this.parseCommentHeader(headerLine.replace('### ', ''));
      if (!headerInfo) continue;

      // Body is everything after the header
      let body = lines.slice(1).join('\n').trim();

      // Skip empty comments
      if (!body) continue;

      // Detect resolved status from strikethrough
      let status: 'open' | 'resolved' = 'open';
      if (body.startsWith('~~') && body.endsWith('~~')) {
        body = body.slice(2, -2);
        status = 'resolved';
      }

      comments.push({
        id: generateCommentId(),
        filePath: headerInfo.filePath,
        line: headerInfo.line,
        lineEnd: headerInfo.lineEnd,
        text: body,
        status,
        createdAt: new Date().toISOString()
      });
    }

    return {
      version: 2,
      lastSynced: new Date().toISOString(),
      fileHashes: {},
      comments
    };
  }

  /**
   * Create an empty feedback file
   */
  static createEmpty(): FeedbackFile {
    return {
      version: 2,
      lastSynced: new Date().toISOString(),
      fileHashes: {},
      comments: []
    };
  }

  /**
   * Add a comment to a feedback file
   */
  static addComment(
    feedback: FeedbackFile,
    filePath: string,
    text: string,
    line?: number,
    lineEnd?: number
  ): DiffComment {
    const comment: DiffComment = {
      id: generateCommentId(),
      filePath: this.normalizePath(filePath),
      line,
      lineEnd,
      text,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    feedback.comments.push(comment);
    feedback.lastSynced = new Date().toISOString();

    return comment;
  }

  /**
   * Resolve a comment by ID
   */
  static resolveComment(feedback: FeedbackFile, commentId: string): boolean {
    const comment = feedback.comments.find(c => c.id === commentId);
    if (comment) {
      comment.status = 'resolved';
      feedback.lastSynced = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Delete a comment by ID
   */
  static deleteComment(feedback: FeedbackFile, commentId: string): boolean {
    const index = feedback.comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      feedback.comments.splice(index, 1);
      feedback.lastSynced = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get open comments for a specific file
   */
  static getOpenCommentsForFile(feedback: FeedbackFile, filePath: string): DiffComment[] {
    const normalizedPath = this.normalizePath(filePath);
    return feedback.comments.filter(
      c => c.filePath === normalizedPath && c.status === 'open'
    );
  }

  /**
   * Get all open comments
   */
  static getOpenComments(feedback: FeedbackFile): DiffComment[] {
    return feedback.comments.filter(c => c.status === 'open');
  }
}
