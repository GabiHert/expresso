<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 13-fix-path-traversal.md                              ║
║ TASK: LOCAL-014                                                  ║
║ SEVERITY: IMPORTANT (Security)                                   ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Fix Path Traversal in Work Item Opening

## Objective

Fix path traversal vulnerability where malicious file paths could access files outside the task directory.

## File

`vscode-extension/src/extension.ts` lines 143-174

## Problem

The path validation checks for `..` before `path.join()` normalizes the path. A path like `foo/./../../etc/passwd` would pass the check but resolve outside the intended directory. Also, `args.taskStatus` is not validated.

## Implementation

Add proper path validation:

```typescript
const VALID_STATUSES = ['todo', 'in_progress', 'done'];

// Validate task status
if (!VALID_STATUSES.includes(args.taskStatus)) {
  vscode.window.showErrorMessage('Invalid task status');
  return;
}

// Normalize path before checking
const fileName = args.workItem.file;
const normalizedFileName = path.normalize(fileName);

// Check for traversal attempts
if (normalizedFileName.includes('..') || path.isAbsolute(normalizedFileName)) {
  vscode.window.showErrorMessage('Invalid work item file path');
  return;
}

// Build the path
const workItemPath = path.join(
  workspaceRoot,
  '.ai',
  'tasks',
  args.taskStatus,
  args.taskId,
  normalizedFileName
);

// Verify resolved path is within allowed directory
const resolvedPath = path.resolve(workItemPath);
const allowedBase = path.resolve(workspaceRoot, '.ai/tasks', args.taskStatus, args.taskId);
if (!resolvedPath.startsWith(allowedBase + path.sep)) {
  vscode.window.showErrorMessage('Path traversal detected');
  return;
}
```

## Acceptance Criteria

- [ ] Validate `taskStatus` against whitelist
- [ ] Normalize file path before traversal check
- [ ] Verify resolved path stays within task directory
- [ ] Test with paths like `foo/./../../etc/passwd`
- [ ] Test with paths like `../../../etc/passwd`
- [ ] No access to files outside task directory
