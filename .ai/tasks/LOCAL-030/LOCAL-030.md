---
type: task
id: LOCAL-030
title: Remove Session and Shadow File Tracking Feature
status: done
created: 2025-01-15
updated: 2025-01-16
tags:
  - task
  - done
  - vscode-extension
summary:
  total: 8
  todo: 0
  in_progress: 0
  done: 8
repos:
  - vscode-extension
---

> Parent: [[manifest]]


# LOCAL-030: Remove Session and Shadow File Tracking Feature

## Problem Statement

The VSCode extension currently tracks:
1. **Sessions** - Claude terminal sessions per task via SQLite database
2. **Shadow Files** - File changes with baseline/accumulated diffs

This feature adds complexity and is no longer needed. Remove all session tracking
and shadow file functionality while keeping the core task management features.

## Acceptance Criteria

- All session tracking code removed (SessionManager, SessionDatabase)
- All shadow file tracking code removed (ShadowManager, DiffViewer)
- CockpitCleanupService removed (only cleaned sessions/shadows)
- TaskTreeProvider simplified (no session/shadow tree items)
- Extension builds without errors
- Extension activates without session/shadow services
- Tree view shows tasks without session/shadow items
- No orphaned imports or dead code
- sql.js dependency removed if no longer needed

## Work Items


| ID | Name | Repo | Status |
|----|------|------|--------|
| 01 | Remove Shadow Services | vscode-extension | todo |
| 02 | Remove Session Services | vscode-extension | todo |
| 03 | Remove Cleanup Service | vscode-extension | todo |
| 04 | Simplify TaskTreeProvider | vscode-extension | todo |
| 05 | Clean Extension Entry Point | vscode-extension | todo |
| 06 | Update Package.json | vscode-extension | todo |
| 07 | Remove Test Files | vscode-extension | todo |
| 08 | Clean Dependencies | vscode-extension | todo |

## Branches

**Note:** The ai-framework repo is protected. Work is done in vscode-extension.

| Repo | Path | Branch |
|------|------|--------|
| vscode-extension | `/Users/gabriel.herter/Documents/Personal/ai-framework/vscode-extension` | Current branch |

**Protected Repos (no branches created):**
- ai-framework - stays on `project/ai-cockpit`

## Technical Context

### Files to Delete
- `src/services/SessionManager.ts` - Session lifecycle management
- `src/services/SessionDatabase.ts` - SQLite persistence layer
- `src/services/ShadowManager.ts` - File change tracking
- `src/services/DiffViewer.ts` - Shadow diff display
- `src/services/CockpitCleanupService.ts` - Task/session/shadow cleanup
- `src/test/suite/sessionDatabase.test.ts` - Database tests
- `src/test/suite/cockpitCleanupService.test.ts` - Cleanup tests

### Files to Modify
- `src/extension.ts` - Remove service imports, initialization, commands
- `src/providers/TaskTreeProvider.ts` - Remove session/shadow tree items
- `package.json` - Remove commands, menu items, configuration

### Storage to Clean (documentation only)
- `.ai/cockpit/sessions.db` - SQLite database
- `.ai/cockpit/sessions.json` - Legacy backup
- `.ai/cockpit/shadows/` - Shadow file copies

## Implementation Approach

Work bottom-up:
1. Delete service files (no dependencies on them from other services)
2. Clean up TaskTreeProvider (remove tree item classes)
3. Clean extension.ts (remove imports, init, commands)
4. Update package.json (remove manifest entries)
5. Remove tests
6. Clean dependencies and verify build

## Risks & Considerations

- TaskTreeProvider has session/shadow classes interleaved - careful removal needed
- extension.ts has many session-related command registrations to remove
- Ensure no runtime errors from missing services

## Testing Strategy

1. After each deletion, run `npm run compile` to check for errors
2. Final verification: extension loads and shows tasks in tree view
3. Verify no console errors about missing services

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.
