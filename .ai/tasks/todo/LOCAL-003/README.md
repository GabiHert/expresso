<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/todo/LOCAL-003/                              ║
╠══════════════════════════════════════════════════════════════════╣
║ EPIC: EPIC-001 (AI Cockpit MVP v2)                               ║
║ PHASE: 3 of 3                                                    ║
║ DEPENDS ON: LOCAL-002 (Hook System)                              ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Ensure LOCAL-001 and LOCAL-002 are COMPLETE                   ║
║ 2. Read VSCode Extension API docs                                ║
║ 3. Read MVP v2 spec: .ai/docs/_architecture/ai-cockpit-mvp-v2.md ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-003: VSCode Extension (Phase 3)

Build the VSCode extension UI with task panel, diff viewer, and real-time updates via file watching.

## Problem Statement

With hooks capturing events (Phase 2) and tasks being tracked (Phase 1), we need a UI to display this information. The VSCode extension provides:
1. Status bar showing active task
2. Task panel showing progress and subtasks
3. Diff viewer for reviewing changes
4. Real-time updates as events are captured

## Acceptance Criteria

- [ ] Extension activates in VSCode
- [ ] Status bar shows current active task (or "No active task")
- [ ] File watcher monitors `.ai/cockpit/` for changes
- [ ] Task panel displays task list with status
- [ ] Clicking a task shows diff history
- [ ] Diff viewer uses native VSCode diff

## Work Items

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Create extension scaffold | vscode-extension | todo |
| 02 | Implement file watcher | vscode-extension | todo |
| 03 | Add status bar provider | vscode-extension | todo |
| 04 | Create task panel (TreeView) | vscode-extension | todo |
| 05 | Add diff viewer integration | vscode-extension | todo |
| 06 | Test and polish | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `feature/cockpit-extension` |

## Technical Context

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VSCode Extension                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │ Status Bar  │     │ Task Panel  │     │ Diff Viewer │        │
│  │ Provider    │     │ (TreeView)  │     │ Integration │        │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘        │
│         │                   │                   │               │
│         └─────────┬─────────┴─────────┬─────────┘               │
│                   │                   │                         │
│           ┌───────▼───────┐   ┌───────▼───────┐                 │
│           │ Cockpit State │   │ File Watcher  │                 │
│           │ Manager       │◄──│ Service       │                 │
│           └───────────────┘   └───────────────┘                 │
│                   │                   │                         │
└───────────────────┼───────────────────┼─────────────────────────┘
                    │                   │
                    ▼                   ▼
           .ai/cockpit/         .ai/cockpit/events/
           active-task.json     {taskId}/*.json
```

### Key VSCode APIs

| API | Purpose |
|-----|---------|
| `vscode.window.createStatusBarItem` | Status bar item |
| `vscode.window.registerTreeDataProvider` | Task panel |
| `vscode.workspace.createFileSystemWatcher` | File watching |
| `vscode.commands.executeCommand('vscode.diff')` | Diff viewer |
| `vscode.workspace.registerTextDocumentContentProvider` | Virtual docs |

### File Structure

```
vscode-extension/
├── package.json                 # Extension manifest
├── tsconfig.json
├── src/
│   ├── extension.ts             # Entry point
│   ├── state/
│   │   └── CockpitState.ts      # State management
│   ├── watchers/
│   │   └── FileWatcher.ts       # File system watcher
│   ├── providers/
│   │   ├── StatusBarProvider.ts # Status bar
│   │   ├── TaskTreeProvider.ts  # Task panel
│   │   └── DiffContentProvider.ts # Virtual documents
│   ├── commands/
│   │   └── index.ts             # Registered commands
│   └── types/
│       └── index.ts             # TypeScript interfaces
└── media/
    └── icons/                   # Extension icons
```

## Implementation Approach

1. **Work Item 01**: Scaffold extension with package.json, activation
2. **Work Item 02**: Implement file watcher for `.ai/cockpit/`
3. **Work Item 03**: Add status bar showing active task
4. **Work Item 04**: Create TreeView for task panel
5. **Work Item 05**: Integrate VSCode diff viewer
6. **Work Item 06**: Testing, polish, and documentation

## Risks & Considerations

- **VSCode API Learning Curve**: First-time extension development
- **Performance**: File watcher must be efficient
- **Cross-Platform**: Paths must work on macOS/Linux/Windows
- **State Management**: Keep UI in sync with file changes

## Testing Strategy

1. **Manual Testing**: Install extension, verify each feature
2. **Integration**: Verify file watcher triggers UI updates
3. **E2E**: Full flow from edit → hook → event → UI update

## Dependencies

- LOCAL-001: Provides `active-task.json`
- LOCAL-002: Provides event files in `.ai/cockpit/events/`

## References

- [VSCode Extension API](https://code.visualstudio.com/api)
- [TreeView Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/tree-view-sample)
- [Diff Provider Sample](https://github.com/microsoft/vscode-extension-samples)
- [MVP v2 Specification](../../docs/_architecture/ai-cockpit-mvp-v2.md)

---

_Created: 2025-12-28_
_Last Updated: 2025-12-28_
_EPIC: EPIC-001_
