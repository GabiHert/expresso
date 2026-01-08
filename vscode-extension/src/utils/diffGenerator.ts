import { createTwoFilesPatch } from 'diff';

/**
 * Generate a unified diff from two strings
 */
export function generateUnifiedDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): string {
  return createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldContent || '',
    newContent || '',
    'original',
    'modified',
    { context: Infinity }
  );
}
