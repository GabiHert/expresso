import * as crypto from 'crypto';

/**
 * Generate short unique IDs for comments
 * Format: 6 character alphanumeric (e.g., "a1b2c3")
 * Uses full randomness for each character to minimize collision risk
 */
export function generateCommentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(6);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Calculate file hash for staleness detection
 * Uses SHA-256, returns first 8 characters
 */
export function calculateFileHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}
