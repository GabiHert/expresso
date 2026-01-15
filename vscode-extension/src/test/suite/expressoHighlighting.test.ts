/**
 * Tests for Expresso Highlighting Features
 *
 * These tests verify:
 * - Keyword styling configuration
 * - Valid Claude commands list (deprecated - now uses CommandRegistry)
 * - Command decoration style
 * - Comment line detection
 * - Command regex matching
 * - Configuration defaults
 *
 * NOTE: VALID_CLAUDE_COMMANDS is deprecated and will be removed.
 * Runtime command discovery now uses CommandRegistry service.
 * These tests verify the static list for backward compatibility.
 */

import * as assert from 'assert';
import {
  VALID_CLAUDE_COMMANDS,
  EXPRESSO_VARIANT_STYLES,
  COMMAND_DECORATION_STYLE,
  DEFAULT_EXPRESSO_CONFIG,
  ClaudeCommand,
} from '../../types/expresso';

suite('Expresso Highlighting Tests', () => {
  suite('Keyword Styles', () => {
    test('should have keywordColor for all variants', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        assert.ok(style.keywordColor, `${variant} should have keywordColor`);
        assert.ok(style.keywordColor.startsWith('#'), `${variant} keywordColor should be hex`);
      }
    });

    test('should have keywordFontWeight for all variants', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        assert.strictEqual(style.keywordFontWeight, 'bold');
      }
    });

    test('keyword colors should be valid hex colors', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        assert.ok(
          style.keywordColor.startsWith('#'),
          `${variant} keywordColor should be hex format`
        );
      }
    });

    test('keyword colors should match variant theme', () => {
      // Normal: Green (for contrast against brown background)
      assert.strictEqual(EXPRESSO_VARIANT_STYLES.normal.keywordColor, '#16A34A');

      // Urgent: Bright Red
      assert.strictEqual(EXPRESSO_VARIANT_STYLES.urgent.keywordColor, '#EF4444');

      // Question: Bright Blue
      assert.strictEqual(EXPRESSO_VARIANT_STYLES.question.keywordColor, '#3B82F6');
    });
  });

  /**
   * @deprecated Tests for VALID_CLAUDE_COMMANDS
   * These verify the static list still works for backward compatibility.
   * Runtime uses CommandRegistry which dynamically discovers commands.
   */
  suite('Valid Commands (Deprecated Static List)', () => {
    test('should have 18 valid commands in static list', () => {
      assert.strictEqual(VALID_CLAUDE_COMMANDS.length, 18);
    });

    test('all commands should start with /', () => {
      for (const cmd of VALID_CLAUDE_COMMANDS) {
        assert.ok(cmd.startsWith('/'), `${cmd} should start with /`);
      }
    });

    test('should include essential task commands', () => {
      const essential = ['/task-start', '/task-work', '/task-done', '/task-status'];
      for (const cmd of essential) {
        assert.ok(
          VALID_CLAUDE_COMMANDS.includes(cmd as ClaudeCommand),
          `Should include ${cmd}`
        );
      }
    });

    test('should include utility commands', () => {
      const utilities = ['/help', '/init', '/ask', '/enhance'];
      for (const cmd of utilities) {
        assert.ok(
          VALID_CLAUDE_COMMANDS.includes(cmd as ClaudeCommand),
          `Should include ${cmd}`
        );
      }
    });

    test('should include expresso command', () => {
      assert.ok(VALID_CLAUDE_COMMANDS.includes('/expresso'));
    });
  });

  suite('Command Decoration Style', () => {
    test('should have cyan color', () => {
      // Note: The style was changed from purple to cyan
      assert.ok(COMMAND_DECORATION_STYLE.color.includes('00FFFF') ||
                COMMAND_DECORATION_STYLE.color.includes('cyan'));
    });

    test('should have bold fontWeight', () => {
      assert.strictEqual(COMMAND_DECORATION_STYLE.fontWeight, 'bold');
    });

    test('should have light background', () => {
      assert.ok(COMMAND_DECORATION_STYLE.backgroundColor.includes('0.1'));
    });

    test('should have border radius', () => {
      assert.strictEqual(COMMAND_DECORATION_STYLE.borderRadius, '2px');
    });
  });

  suite('Configuration Defaults', () => {
    test('should have highlightKeyword enabled by default', () => {
      assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.highlightKeyword, true);
    });

    test('should have highlightCommands enabled by default', () => {
      assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.highlightCommands, true);
    });

    test('should have showDecorations enabled by default', () => {
      assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.showDecorations, true);
    });

    test('should have showCodeLens enabled by default', () => {
      assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.showCodeLens, true);
    });
  });

  suite('Comment Detection Pattern', () => {
    test('should detect single-line comment patterns', () => {
      const commentPattern = /^\s*(\/\/|\/\*|\*|#|<!--|.*\*\/|.*-->)/;

      const commentLines = [
        '// this is a comment',
        '  // indented comment',
        '/* block start',
        ' * middle of block',
        ' */ block end',
        '# python comment',
        '<!-- html comment -->',
      ];

      for (const line of commentLines) {
        assert.ok(
          commentPattern.test(line),
          `"${line}" should be detected as comment`
        );
      }
    });

    test('should not detect non-comment patterns', () => {
      const commentPattern = /^\s*(\/\/|\/\*|\*|#|<!--|.*\*\/|.*-->)/;

      const nonCommentLines = [
        'const x = 1;',
        'function test() {',
        '  return value;',
        'class MyClass {}',
      ];

      for (const line of nonCommentLines) {
        assert.ok(
          !commentPattern.test(line),
          `"${line}" should NOT be detected as comment`
        );
      }
    });
  });

  suite('Command Regex Matching', () => {
    test('should match valid commands in comments', () => {
      // Using deprecated VALID_CLAUDE_COMMANDS for backward compatibility test
      const commandPattern = new RegExp(
        `(${VALID_CLAUDE_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
        'g'
      );

      const testCases = [
        { line: '// Run /task-start to begin', expected: ['/task-start'] },
        { line: '// Use /task-work and /task-done', expected: ['/task-work', '/task-done'] },
        { line: '// /help for info', expected: ['/help'] },
        { line: '// No commands here', expected: [] },
      ];

      for (const { line, expected } of testCases) {
        commandPattern.lastIndex = 0;
        const matches: string[] = [];
        let match;
        while ((match = commandPattern.exec(line)) !== null) {
          matches.push(match[1]);
        }
        assert.deepStrictEqual(
          matches,
          expected,
          `Line "${line}" should match ${JSON.stringify(expected)}`
        );
      }
    });

    test('should not match invalid commands', () => {
      const commandPattern = new RegExp(
        `(${VALID_CLAUDE_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
        'g'
      );

      const invalidCommands = [
        '// /invalid-command not valid',
        '// /random-stuff here',
        '// /not-a-command',
      ];

      for (const line of invalidCommands) {
        commandPattern.lastIndex = 0;
        const matches: string[] = [];
        let match;
        while ((match = commandPattern.exec(line)) !== null) {
          matches.push(match[1]);
        }
        assert.deepStrictEqual(
          matches,
          [],
          `Line "${line}" should not match any commands`
        );
      }
    });
  });
});
