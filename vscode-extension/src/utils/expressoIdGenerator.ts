import * as crypto from 'crypto';

/**
 * Generate a unique ID for an expresso tag
 * Format: exp_XXXXXX (6 random alphanumeric chars)
 */
export function generateExpressoId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(6);
  let result = 'exp_';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a deterministic fingerprint based on file path, line, and task description
 * Useful for matching tags across scans (same tag = same fingerprint)
 */
export function generateTagFingerprint(
  filePath: string,
  line: number,
  taskDescription: string
): string {
  const content = `${filePath}:${line}:${taskDescription}`;
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}
