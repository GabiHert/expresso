<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-004/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-004: Shadow Copy System - Cumulative Diff Tracking

## Problem Statement

The current AI Cockpit stores individual Edit/Write events but cannot show:
1. Cumulative changes Claude made to a file (all edits combined)
2. Changes the user made after Claude (sync detection)

Need a lightweight shadow copy system that stores only:
- Baseline (original file before first Claude edit)
- Accumulated (file state after all Claude edits)

## Acceptance Criteria

- [ ] Hook captures baseline on first edit to a file
- [ ] Hook updates accumulated state on each subsequent edit
- [ ] Extension can show "Claude Changes" diff (baseline → accumulated)
- [ ] Extension can show "Your Changes" diff (accumulated → actual file)
- [ ] Tree view shows files changed with edit count
- [ ] Sync status indicator (synced vs user-modified)

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Update hook with shadow support | .claude/hooks | todo |
| 02 | Create ShadowManager service | vscode-extension | todo |
| 03 | Add cumulative diff commands | vscode-extension | todo |
| 04 | Add Files Changed to Tree View | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| ai-framework | `project/ai-cockpit` (current) |

## Technical Context

### Architecture

```
.ai/cockpit/shadows/{taskId}/{file-hash}/
├── baseline.txt      # Original before Claude
├── accumulated.txt   # After all Claude edits
└── meta.json         # Metadata (editCount, sync status)
```

### Data Flow

```
Claude Edit → Hook fires → updateShadow()
                              │
                              ├─ First edit? Save baseline
                              │
                              └─ Update accumulated.txt + meta.json
                                        │
                                        ▼
                              Extension watches shadows/
                                        │
                                        ▼
                              Tree View: Files Changed (3)
                              ├── ✓ file1.ts (5 edits)
                              └── ⚠ file2.ts (2 edits) modified
```

### Three Diff Views

1. **Claude Changes**: `baseline` ↔ `accumulated`
2. **Your Changes**: `accumulated` ↔ `actual file`
3. **Full Picture**: `baseline` ↔ `actual file`

## Implementation Approach

**Phase 1: Hook Update**
- Add `updateShadow()` function to cockpit-capture.js
- On first edit: capture baseline by reversing the edit
- On all edits: read current file state → save as accumulated

**Phase 2: Extension Integration**
- Create ShadowManager.ts to load/query shadows
- Add showClaudeChanges() and showYourChanges() to DiffViewer
- Register new commands

**Phase 3: Tree View**
- Add "Files Changed" section under tasks
- Show edit count and sync status icons
- Click to view cumulative diff

## Risks & Considerations

- **Baseline reconstruction**: Hook fires AFTER edit, so we reverse it
- **String replacement edge case**: If old_string appears multiple times
- **Storage**: ~3 files per changed file (much better than per-event)

## Testing Strategy

1. Make single edit → verify baseline + accumulated created
2. Make multiple edits → verify accumulated updates, baseline unchanged
3. Edit file manually → verify sync status shows "user-modified"
4. New file (Write) → verify empty baseline

## References

- Design doc: `.ai/docs/_architecture/shadow-copy-system.md`
- MVP v2 spec: `.ai/docs/_architecture/ai-cockpit-mvp-v2.md`
