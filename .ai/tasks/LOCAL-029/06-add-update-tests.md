---
type: work-item
id: "06"
parent: LOCAL-029
title: Add/update tests
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
branch: feature/command-registry
---

> Parent: [[LOCAL-029]]


# Add/Update Tests

## Objective

Create unit tests for the new `CommandRegistry` service and update existing tests in `expressoHighlighting.test.ts` to work with the new dynamic architecture.

## Pre-Implementation

Review existing test structure in `src/test/suite/` and understand the testing patterns used.

## Implementation Steps

### Step 1: Create CommandRegistry Test File

**File**: `src/test/suite/commandRegistry.test.ts` (NEW FILE)

```typescript
/**
 * Tests for CommandRegistry Service
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Note: In VSCode extension tests, we may need to mock vscode APIs
// For now, test the core logic that doesn't depend on VSCode

suite('CommandRegistry Tests', () => {
  suite('Command Name Extraction', () => {
    test('should extract command name from filename', () => {
      // Test the logic: task-start.md -> /task-start
      const filename = 'task-start.md';
      const basename = path.basename(filename, '.md');
      const commandName = `/${basename}`;

      assert.strictEqual(commandName, '/task-start');
    });

    test('should handle hyphenated filenames', () => {
      const testCases = [
        { file: 'task-start.md', expected: '/task-start' },
        { file: 'command-create.md', expected: '/command-create' },
        { file: 'ai-sync.md', expected: '/ai-sync' },
        { file: 'help.md', expected: '/help' },
      ];

      for (const { file, expected } of testCases) {
        const basename = path.basename(file, '.md');
        const commandName = `/${basename}`;
        assert.strictEqual(commandName, expected, `Failed for ${file}`);
      }
    });
  });

  suite('Description Extraction', () => {
    test('should extract description from H1 header pattern', () => {
      const content = `# /task-start - Start Working on a Task

## Description
...`;

      const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);
      assert.ok(h1Match, 'Should match H1 pattern');
      assert.strictEqual(h1Match[1], 'Start Working on a Task');
    });

    test('should handle various H1 formats', () => {
      const testCases = [
        {
          content: '# /help - Show Available Commands',
          expected: 'Show Available Commands',
        },
        {
          content: '# /task-work - Continue Working Through Task Items',
          expected: 'Continue Working Through Task Items',
        },
        {
          content: '# /init - Initialize AI Framework',
          expected: 'Initialize AI Framework',
        },
      ];

      for (const { content, expected } of testCases) {
        const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);
        assert.ok(h1Match, `Should match pattern for: ${content}`);
        assert.strictEqual(h1Match[1], expected);
      }
    });

    test('should fallback to filename-based description', () => {
      // When H1 doesn't match expected pattern
      const content = '# Custom Command\n\nNo dash separator';
      const filename = 'my-custom-command.md';

      const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);

      if (!h1Match) {
        // Fallback logic
        const basename = path.basename(filename, '.md');
        const description = basename
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        assert.strictEqual(description, 'My Custom Command');
      }
    });
  });

  suite('Extension File Filtering', () => {
    test('should skip .extend.md files', () => {
      const files = [
        'task-start.md',
        'task-start.extend.md',
        'help.md',
        'custom.extend.md',
      ];

      const commandFiles = files.filter(f =>
        f.endsWith('.md') && !f.includes('.extend.')
      );

      assert.deepStrictEqual(commandFiles, ['task-start.md', 'help.md']);
    });
  });

  suite('Source Detection', () => {
    test('should detect framework source from path', () => {
      const frameworkPath = '/project/.ai/_framework/commands/task-start.md';
      const projectPath = '/project/.ai/_project/commands/custom.md';

      const isFramework = (p: string) => p.includes('_framework');
      const isProject = (p: string) => p.includes('_project');

      assert.ok(isFramework(frameworkPath));
      assert.ok(!isFramework(projectPath));
      assert.ok(isProject(projectPath));
      assert.ok(!isProject(frameworkPath));
    });
  });
});
```

### Step 2: Update expressoHighlighting.test.ts

**File**: `src/test/suite/expressoHighlighting.test.ts`

Update tests that reference `VALID_CLAUDE_COMMANDS`:

```typescript
// Option A: If VALID_CLAUDE_COMMANDS is removed
// Update imports and tests to not depend on it

// Option B: If tests need command list, create a test helper
const TEST_COMMANDS = [
  '/task-start',
  '/task-work',
  '/task-done',
  '/help',
  '/init',
];

suite('Command Regex Matching', () => {
  test('should match valid commands in comments', () => {
    const commandPattern = new RegExp(
      `(${TEST_COMMANDS.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
      'g'
    );

    // ... rest of test
  });
});
```

### Step 3: Remove Tests for Removed Constants

If `VALID_CLAUDE_COMMANDS` is removed, update or remove these tests:

```typescript
// REMOVE or update:
suite('Valid Commands', () => {
  test('should have 18 valid commands', () => {
    // This test relied on hardcoded count - remove it
  });
  // ...
});

suite('Command Decoration Style', () => {
  // Remove if COMMAND_DECORATION_STYLE is removed
});
```

### Step 4: Add Integration Test Concept

Add a note about manual testing since VSCode extension testing is complex:

```typescript
/**
 * Integration Test Notes
 *
 * The following scenarios should be manually verified:
 *
 * 1. Dynamic Command Discovery:
 *    - Create .ai/_project/commands/test-cmd.md
 *    - Header: # /test-cmd - Test Command
 *    - Verify /test-cmd appears in autocomplete
 *    - Verify /test-cmd is highlighted in comments
 *
 * 2. Hot Reload:
 *    - Delete the test-cmd.md file
 *    - Verify /test-cmd no longer highlights
 *    - Verify /test-cmd no longer in autocomplete
 *
 * 3. Description Extraction:
 *    - Check autocomplete shows correct descriptions
 *    - Verify descriptions match H1 headers
 */
```

### Step 5: Run Tests

```bash
cd /Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension
npm test
```

## Acceptance Criteria

- [ ] `commandRegistry.test.ts` is created with unit tests
- [ ] Tests cover command name extraction
- [ ] Tests cover description extraction
- [ ] Tests cover extension file filtering
- [ ] Tests cover source detection
- [ ] `expressoHighlighting.test.ts` is updated for new architecture
- [ ] Removed tests for deleted constants
- [ ] All tests pass: `npm test`

## Testing

```bash
npm test
```

Expected output: All tests pass with no failures related to removed constants.

## Notes

- VSCode extension testing is complex; unit tests focus on pure logic
- Integration testing is largely manual for VSCode extensions
- Consider adding a TEST_COMMANDS constant for tests that need a command list
- The focus is on testing the parsing/extraction logic, not VSCode API integration
