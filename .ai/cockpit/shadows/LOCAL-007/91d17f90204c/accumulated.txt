/**
 * Safe JSON parsing utilities for graceful error handling
 */

export function safeJsonParse<T>(
  json: string,
  fallback: T,
  context?: string
): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn(
      `AI Cockpit: JSON parse error${context ? ` in ${context}` : ''}: ${error}`
    );
    return fallback;
  }
}

export function safeJsonParseLine<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    // Silent for line-by-line parsing (common with JSONL)
    return null;
  }
}
