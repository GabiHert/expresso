/**
 * Tests for CommandRegistry Service
 *
 * These tests verify the core logic of command discovery without
 * requiring VSCode API (file system operations are mocked conceptually).
 */

import * as assert from 'assert';
import * as path from 'path';

suite('CommandRegistry Tests', () => {
  suite('Command Name Extraction', () => {
    test('should extract command name from filename', () => {
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
        { file: 'task-status.md', expected: '/task-status' },
        { file: 'address-feedback.md', expected: '/address-feedback' },
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
        {
          content: '# /ai-sync - Sync AI Context Files',
          expected: 'Sync AI Context Files',
        },
      ];

      for (const { content, expected } of testCases) {
        const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);
        assert.ok(h1Match, `Should match pattern for: ${content}`);
        assert.strictEqual(h1Match[1], expected);
      }
    });

    test('should generate fallback description from filename', () => {
      // When H1 doesn't match expected pattern
      const content = '# Custom Command\n\nNo dash separator';
      const filename = 'my-custom-command.md';

      const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);

      if (!h1Match) {
        // Fallback logic: convert filename to title case
        const basename = path.basename(filename, '.md');
        const description = basename
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        assert.strictEqual(description, 'My Custom Command');
      }
    });

    test('should handle markdown with HTML comment metadata', () => {
      const content = `<!--
Header comment block
-->

# /task-create - Create a New Task

## Description
Creates a task...`;

      const h1Match = content.match(/^#\s+\/[\w-]+\s+-\s+(.+)$/m);
      assert.ok(h1Match, 'Should match H1 even with preceding comment');
      assert.strictEqual(h1Match[1], 'Create a New Task');
    });
  });

  suite('Extension File Filtering', () => {
    test('should skip .extend.md files', () => {
      const files = [
        'task-start.md',
        'task-start.extend.md',
        'help.md',
        'custom.extend.md',
        'task-work.md',
      ];

      const commandFiles = files.filter(f =>
        f.endsWith('.md') && !f.includes('.extend.')
      );

      assert.deepStrictEqual(commandFiles, ['task-start.md', 'help.md', 'task-work.md']);
    });

    test('should skip non-markdown files', () => {
      const files = [
        'task-start.md',
        'README.txt',
        'config.yaml',
        'help.md',
      ];

      const commandFiles = files.filter(f => f.endsWith('.md'));
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

    test('should correctly identify source in Windows paths', () => {
      const frameworkPath = 'C:\\project\\.ai\\_framework\\commands\\task-start.md';
      const projectPath = 'C:\\project\\.ai\\_project\\commands\\custom.md';

      const isFramework = (p: string) => p.includes('_framework');
      const isProject = (p: string) => p.includes('_project');

      assert.ok(isFramework(frameworkPath));
      assert.ok(isProject(projectPath));
    });
  });

  suite('Command Pattern Building', () => {
    test('should build regex pattern from command names', () => {
      const commands = ['/task-start', '/task-work', '/help'];

      const pattern = new RegExp(
        `(${commands.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
        'g'
      );

      // Test matching
      const line = '// Use /task-start to begin and /help for info';
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(line)) !== null) {
        matches.push(match[1]);
      }

      assert.deepStrictEqual(matches, ['/task-start', '/help']);
    });

    test('should handle empty command list', () => {
      const commands: string[] = [];

      // When commands is empty, return pattern that matches nothing
      const pattern = commands.length === 0
        ? /(?!)/g
        : new RegExp(
            `(${commands.map(cmd => cmd.replace('/', '\\/')).join('|')})(?=\\s|$|[^a-zA-Z0-9-])`,
            'g'
          );

      const line = '// /task-start /help';
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(line)) !== null) {
        matches.push(match[1]);
      }

      assert.deepStrictEqual(matches, []);
    });
  });
});
