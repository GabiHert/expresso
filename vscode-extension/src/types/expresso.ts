/**
 * Types for the @expresso in-code task tag system
 * Tags allow developers to annotate code with inline tasks that integrate with Claude
 */

/**
 * Expresso tag variant types
 * - normal: Standard @expresso tag (brown highlight)
 * - urgent: @expresso! for high priority (orange-red highlight)
 * - question: @expresso? for questions/discussions (blue highlight)
 */
export type ExpressoVariant = 'normal' | 'urgent' | 'question';

/**
 * Represents a single @expresso tag found in code
 */
export interface ExpressoTag {
  /** Unique identifier for this tag instance */
  id: string;

  /** Absolute file path */
  filePath: string;

  /** Relative file path (to workspace root) */
  relativePath: string;

  /** Line number (1-based) */
  line: number;

  /** Column where @expresso starts */
  columnStart: number;

  /** Column where the full tag text ends */
  columnEnd: number;

  /** Tag variant (normal, urgent, question) */
  variant: ExpressoVariant;

  /** The task description after @expresso */
  taskDescription: string;

  /** Full text of the comment containing the tag */
  fullCommentText: string;

  /** Whether this is a multi-line comment */
  isMultiLine: boolean;

  /** ISO 8601 timestamp when first detected */
  detectedAt: string;
}

/**
 * Result of scanning workspace or file for tags
 */
export interface ExpressoScanResult {
  /** All tags found */
  tags: ExpressoTag[];

  /** Tags grouped by file path for quick lookup */
  byFile: Map<string, ExpressoTag[]>;

  /** Total count of tags */
  totalCount: number;

  /** Count by variant */
  countByVariant: {
    normal: number;
    urgent: number;
    question: number;
  };

  /** ISO 8601 timestamp of scan completion */
  scannedAt: string;
}

/**
 * Configuration for the expresso scanner
 */
export interface ExpressoConfig {
  /** Whether the feature is enabled */
  enabled: boolean;

  /** File extensions to scan */
  fileExtensions: string[];

  /** Directories to exclude from scanning */
  excludePatterns: string[];

  /** Whether to scan on file save */
  scanOnSave: boolean;

  /** Whether to show decorations (highlighting, gutter icons) */
  showDecorations: boolean;

  /** Whether to show CodeLens ("Brew this" buttons) */
  showCodeLens: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_EXPRESSO_CONFIG: ExpressoConfig = {
  enabled: true,
  fileExtensions: [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.go',
    '.java',
    '.rs',
    '.rb',
    '.php',
    '.c',
    '.cpp',
    '.h',
    '.cs',
    '.swift',
    '.kt',
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/vendor/**',
    '**/__pycache__/**',
  ],
  scanOnSave: true,
  showDecorations: true,
  showCodeLens: true,
};

/**
 * Visual styling configuration for each variant
 */
export interface ExpressoVariantStyle {
  /** Background color (rgba format) */
  backgroundColor: string;
  /** Border color (rgba format) */
  borderColor: string;
  /** Gutter icon filename */
  gutterIcon: string;
  /** CodeLens button text */
  codeLensText: string;
  /** Emoji for toast notification */
  emoji: string;
}

/**
 * Styling configuration for all variants
 */
export const EXPRESSO_VARIANT_STYLES: Record<ExpressoVariant, ExpressoVariantStyle> = {
  normal: {
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    borderColor: 'rgba(139, 90, 43, 0.4)',
    gutterIcon: 'expresso-sparkle.gif',
    codeLensText: '☕ Brew this',
    emoji: '☕',
  },
  urgent: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderColor: 'rgba(255, 87, 34, 0.4)',
    gutterIcon: 'expresso-sparkle-urgent.gif',
    codeLensText: '🔥 Brew this NOW',
    emoji: '🔥',
  },
  question: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: 'rgba(33, 150, 243, 0.4)',
    gutterIcon: 'expresso-sparkle-question.gif',
    codeLensText: '❓ Brew this',
    emoji: '❓',
  },
};
