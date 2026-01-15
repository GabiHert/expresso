/**
 * Types for the @expresso in-code task tag system
 * Tags allow developers to annotate code with inline tasks that integrate with Claude
 */

/**
 * Represents a discovered Claude command from markdown files
 */
export interface CommandInfo {
  /** Command name with leading slash (e.g., "/task-start") */
  name: string;
  /** Human-readable description extracted from markdown H1 */
  description: string;
  /** Absolute path to the markdown file */
  filePath: string;
  /** Where the command was discovered from */
  source: 'framework' | 'project';
}

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

  /** Whether to highlight @expresso keyword distinctly */
  highlightKeyword: boolean;

  /** Whether to highlight Claude commands in comments */
  highlightCommands: boolean;
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
  highlightKeyword: true,
  highlightCommands: true,
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
  /** Text color for @expresso keyword (hex format, e.g., #D97706) */
  keywordColor: string;
  /** Font weight for keyword ('bold' | 'normal') */
  keywordFontWeight: string;
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
    keywordColor: '#16A34A',  // Green for better contrast against brown background
    keywordFontWeight: 'bold',
  },
  urgent: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderColor: 'rgba(255, 87, 34, 0.4)',
    gutterIcon: 'expresso-sparkle-urgent.gif',
    codeLensText: '🔥 Brew this NOW',
    emoji: '🔥',
    keywordColor: '#EF4444',
    keywordFontWeight: 'bold',
  },
  question: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: 'rgba(33, 150, 243, 0.4)',
    gutterIcon: 'expresso-sparkle-question.gif',
    codeLensText: '❓ Brew this',
    emoji: '❓',
    keywordColor: '#3B82F6',
    keywordFontWeight: 'bold',
  },
};

/**
 * Valid Claude slash commands that should be highlighted in comments
 * These correspond to commands in .ai/_framework/commands/
 *
 * @deprecated Use CommandRegistry.getCommandNames() instead.
 * This static list is no longer used at runtime and will be removed.
 */
export const VALID_CLAUDE_COMMANDS = [
  '/task-start',
  '/task-work',
  '/task-done',
  '/task-explore',
  '/task-status',
  '/task-review',
  '/task-resume',
  '/task-create',
  '/init',
  '/help',
  '/ask',
  '/enhance',
  '/document',
  '/ai-sync',
  '/address-feedback',
  '/command-create',
  '/command-extend',
  '/expresso',
] as const;

/**
 * Type for valid Claude command names
 *
 * @deprecated Use string type or CommandInfo.name instead.
 */
export type ClaudeCommand = (typeof VALID_CLAUDE_COMMANDS)[number];

/**
 * Decoration style for Claude command highlighting
 * Uses purple to distinguish from @expresso variants
 */
export const COMMAND_DECORATION_STYLE = {
  /** Text color for commands (bright cyan for visibility) */
  color: '#00FFFF',
  /** Font weight */
  fontWeight: 'bold',
  /** Light background to make commands pop */
  backgroundColor: 'rgba(0, 255, 255, 0.15)',
  /** Rounded corners */
  borderRadius: '2px',
};

/**
 * Represents a matched Claude command in code
 */
export interface CommandMatch {
  /** The command text (e.g., '/task-start') */
  command: string;
  /** Line number (1-based) */
  line: number;
  /** Column where command starts */
  columnStart: number;
  /** Column where command ends */
  columnEnd: number;
  /** File path */
  filePath: string;
}
