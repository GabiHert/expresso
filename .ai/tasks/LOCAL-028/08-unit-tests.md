---
type: work-item
id: "08"
parent: LOCAL-028
title: Unit tests
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: main
---

# Unit Tests

## Objective

Create comprehensive unit tests for the new keyword and command highlighting functionality.

## Pre-Implementation

Depends on: All previous work items (01-07)

Review existing test patterns:
- `vscode-extension/src/test/suite/captureQueue.test.ts`

## Implementation Steps

### Step 1: Create test file

**File**: `vscode-extension/src/test/suite/expressoHighlighting.test.ts` (new file)

**Instructions**:
Create the test file with structure:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  VALID_CLAUDE_COMMANDS,
  EXPRESSO_VARIANT_STYLES,
  COMMAND_DECORATION_STYLE,
  CommandMatch,
  ClaudeCommand,
} from '../../types/expresso';

suite('Expresso Highlighting Tests', () => {
  suite('Keyword Styles', () => {
    test('should have keywordColor for all variants', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        assert.ok(style.keywordColor, `${variant} should have keywordColor`);
        assert.ok(style.keywordColor.startsWith('rgba'), `${variant} keywordColor should be rgba`);
      }
    });

    test('should have keywordFontWeight for all variants', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        assert.strictEqual(style.keywordFontWeight, 'bold');
      }
    });

    test('keyword colors should be full opacity', () => {
      const variants = ['normal', 'urgent', 'question'] as const;
      for (const variant of variants) {
        const style = EXPRESSO_VARIANT_STYLES[variant];
        // Should end with , 1) for full opacity
        assert.ok(
          style.keywordColor.includes(', 1)'),
          `${variant} keywordColor should have full opacity`
        );
      }
    });
  });

  suite('Valid Commands', () => {
    test('should have 18 valid commands', () => {
      assert.strictEqual(VALID_CLAUDE_COMMANDS.length, 18);
    });

    test('all commands should start with /', () => {
      for (const cmd of VALID_CLAUDE_COMMANDS) {
        assert.ok(cmd.startsWith('/'), `${cmd} should start with /`);
      }
    });

    test('should include essential commands', () => {
      const essential = ['/task-start', '/task-work', '/task-done', '/help'];
      for (const cmd of essential) {
        assert.ok(
          VALID_CLAUDE_COMMANDS.includes(cmd as ClaudeCommand),
          `Should include ${cmd}`
        );
      }
    });
  });

  suite('Command Decoration Style', () => {
    test('should have purple color', () => {
      assert.ok(COMMAND_DECORATION_STYLE.color.includes('156, 39, 176'));
    });

    test('should have bold fontWeight', () => {
      assert.strictEqual(COMMAND_DECORATION_STYLE.fontWeight, 'bold');
    });

    test('should have light background', () => {
      assert.ok(COMMAND_DECORATION_STYLE.backgroundColor.includes('0.1'));
    });
  });
});
```

### Step 2: Add command scanning tests

**File**: `vscode-extension/src/test/suite/expressoHighlighting.test.ts`
**Location**: Add to the same file

**Instructions**:
Add tests for command detection (these may need mocking):

```typescript
suite('Command Detection', () => {
  test('isCommentLine should detect // comments', () => {
    // These tests verify the regex/detection logic
    const commentLines = [
      '// this is a comment',
      '  // indented comment',
      '/* block start',
      ' * middle of block',
      ' */ block end',
      '# python comment',
      '<!-- html comment -->',
    ];

    const nonCommentLines = [
      'const x = 1;',
      'function test() {',
      '  return value;',
    ];

    // Test with regex patterns used in scanner
    const commentPattern = /^\s*(\/\/|\/\*|\*|#|<!--|.*\*\/|.*-->)/;

    for (const line of commentLines) {
      assert.ok(
        commentPattern.test(line),
        `"${line}" should be detected as comment`
      );
    }

    for (const line of nonCommentLines) {
      assert.ok(
        !commentPattern.test(line),
        `"${line}" should NOT be detected as comment`
      );
    }
  });

  test('command regex should match valid commands', () => {
    const commandPattern = new RegExp(
      `(${VALID_CLAUDE_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
      'g'
    );

    const testCases = [
      { line: '// Run /task-start to begin', expected: ['/task-start'] },
      { line: '// Use /task-work and /task-done', expected: ['/task-work', '/task-done'] },
      { line: '// /help for info', expected: ['/help'] },
      { line: '// No commands here', expected: [] },
      { line: '// /invalid-command not valid', expected: [] },
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
});
```

### Step 3: Add configuration tests

**File**: `vscode-extension/src/test/suite/expressoHighlighting.test.ts`
**Location**: Add to the same file

**Instructions**:
Add config tests:

```typescript
suite('Configuration', () => {
  test('DEFAULT_EXPRESSO_CONFIG should have highlightKeyword', () => {
    // Import at top of file
    const { DEFAULT_EXPRESSO_CONFIG } = require('../../types/expresso');
    assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.highlightKeyword, true);
  });

  test('DEFAULT_EXPRESSO_CONFIG should have highlightCommands', () => {
    const { DEFAULT_EXPRESSO_CONFIG } = require('../../types/expresso');
    assert.strictEqual(DEFAULT_EXPRESSO_CONFIG.highlightCommands, true);
  });
});
```

### Step 4: Run tests

**Instructions**:
```bash
cd vscode-extension
npm run test
```

## Post-Implementation

Ensure all tests pass:
```bash
cd vscode-extension && npm run test
```

## Acceptance Criteria

- [ ] Test file created at src/test/suite/expressoHighlighting.test.ts
- [ ] Tests for keyword styles (color, fontWeight, opacity)
- [ ] Tests for valid commands list (count, format, essential commands)
- [ ] Tests for command decoration style (color, weight, background)
- [ ] Tests for comment line detection
- [ ] Tests for command regex matching
- [ ] Tests for configuration defaults
- [ ] All tests pass

## Testing

```bash
cd vscode-extension
npm run test
```

## Notes

- Tests focus on the type definitions and regex logic which can be unit tested
- Decoration application tests would require VSCode extension test host
- The regex tests verify command detection without needing full scanner instantiation
