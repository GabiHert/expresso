# vscode-extension Documentation

## Overview

VSCode extension for AI Cockpit UI - real-time task tracking, diff history, and agent monitoring.

**Status**: To be created

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Extension logic |
| VSCode API | Extension framework, TreeView, Diff viewer |
| WebView | Custom UI panels (if needed) |

## Planned Features

### MVP Features
1. **Task Panel** - Display current task and subtasks
2. **Diff History** - List of file changes with click-to-view
3. **File Watcher** - Monitor `.ai/cockpit/` for changes

### Future Features
- Accept/reject individual changes
- Revert capability
- Multi-agent orchestration
- Real-time streaming

## Key Files (Planned)

| File | Purpose |
|------|---------|
| `src/extension.ts` | Extension entry point |
| `src/taskProvider.ts` | Task TreeView data provider |
| `src/diffProvider.ts` | Diff history and viewer |
| `src/fileWatcher.ts` | Watch `.ai/cockpit/` for changes |

## Integration Points

### Input: Claude Code Hooks
Claude Code writes to `.ai/cockpit/` on Edit/Write tool calls:
- `diffs.jsonl` - Append-only diff log
- `task.json` - Current task state

### Output: VSCode UI
- TreeView for task/subtask display
- Native diff viewer for change inspection
- Status bar for quick status

## Development Setup

```bash
# Initialize extension (not yet created)
npx yo code
cd vscode-extension
npm install
```

## Related Documentation

- [Architecture Overview](../_architecture/README.md)
- [ai-framework](../ai-framework/README.md)
