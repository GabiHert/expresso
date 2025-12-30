<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: TASK                                                      ║
║ LOCATION: .ai/tasks/in_progress/LOCAL-016/                       ║
╠══════════════════════════════════════════════════════════════════╣
║ BEFORE WORKING ON THIS TASK:                                     ║
║ 1. Read .ai/_project/manifest.yaml (know repos & MCPs)           ║
║ 2. Read this entire README first                                 ║
║ 3. Check which work items are in todo/ vs done/                  ║
║ 4. Work on ONE item at a time from todo/                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# LOCAL-016: Add --allow-dangerously-skip-permissions to Claude sessions

## Problem Statement

All Claude CLI sessions initiated by the AI Cockpit VSCode extension need to include the `--allow-dangerously-skip-permissions` flag. This flag enables Claude to run without interactive permission prompts, which is necessary for automated/orchestrated workflows managed by the Cockpit.

Currently, the extension launches Claude sessions using bare `claude` commands or `claude --resume {id}` without this flag, requiring manual permission grants during execution.

## Acceptance Criteria

- [ ] All Claude sessions started by Cockpit include `--allow-dangerously-skip-permissions`
- [ ] Resume sessions also include the flag (before `--resume`)
- [ ] Code is DRY with a centralized command builder function
- [ ] Extension compiles without TypeScript errors
- [ ] All 4 launch points are updated consistently

## Work Items

See `status.yaml` for full index.

| ID | Name | Repo | Status |
|----|------|------|--------|
| WI-01 | Create Claude command builder helper | vscode-extension | todo |
| WI-02 | Update all Claude launch points | vscode-extension | todo |
| WI-03 | Verify changes work correctly | vscode-extension | todo |

## Branches

| Repo | Branch |
|------|--------|
| vscode-extension | `LOCAL-016-claude-permissions-flag` |

## Technical Context

### Current State

The VSCode extension (`vscode-extension/src/extension.ts`) launches Claude sessions in **4 locations**:

1. **Line ~330** - `openTaskTerminal`: Opens terminal for a task from the tree view
   - Current: `terminal.sendText('claude')`

2. **Line ~448** - `resumeSession`: Resumes a previous Claude session
   - Current: `terminal.sendText(\`claude --resume ${session.id}\`)`

3. **Line ~721** - `newSession`: Creates new session with custom label
   - Current: `terminal.sendText('claude')`

4. **Line ~803** - `startSession`: Starts unassigned/exploratory session
   - Current: `terminal.sendText('claude')`

### Terminal Creation Pattern

All launches follow this pattern:
```typescript
const terminal = vscode.window.createTerminal({
  name: `Cockpit: ${taskId}`,
  env: {
    COCKPIT_TASK: taskId,
    COCKPIT_TERMINAL_ID: terminalId
  }
});
terminal.show();
terminal.sendText('claude');  // <-- Need to add flag here
```

### Target State

All Claude invocations should use:
```typescript
terminal.sendText('claude --allow-dangerously-skip-permissions');
// or for resume:
terminal.sendText(`claude --allow-dangerously-skip-permissions --resume ${session.id}`);
```

## Implementation Approach

**Recommended**: Create a private helper method to ensure consistency:

```typescript
private generateClaudeCommand(options?: { resume?: string }): string {
  const parts = ['claude', '--allow-dangerously-skip-permissions'];
  if (options?.resume) {
    parts.push('--resume', options.resume);
  }
  return parts.join(' ');
}
```

Then replace all hardcoded commands with calls to this helper.

## Risks & Considerations

- **Security**: The `--allow-dangerously-skip-permissions` flag gives Claude full system access without prompts. This is intentional for Cockpit-managed sessions but users should understand the implications.
- **Flag order**: For resume commands, the permissions flag should come before `--resume` to ensure proper parsing.

## Testing Strategy

1. Build the extension: `npm run compile` in vscode-extension/
2. Launch Extension Development Host (F5)
3. Test each launch method:
   - Click on a task in the sidebar to open task terminal
   - Use "Resume Session" on an existing session
   - Create a new session with custom label
   - Start an unassigned session
4. Verify each terminal shows `claude --allow-dangerously-skip-permissions` in the command

## Feedback

Review comments can be added to `feedback/diff-review.md`.
Use `/address-feedback` to discuss feedback with the agent.

## References

- Claude CLI documentation
- VSCode Terminal API: https://code.visualstudio.com/api/references/vscode-api#Terminal
