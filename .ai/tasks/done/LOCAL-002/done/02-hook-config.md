<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 02-hook-config.md                                     ║
║ TASK: LOCAL-002                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: ai-framework
---

# Add Hook Configuration

## Objective

Configure Claude Code to run the cockpit-capture hook on Edit/Write/TodoWrite tool calls.

## Implementation Steps

### Step 1: Create or Update .claude/settings.json

**File**: `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cockpit-capture.js\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Step 2: Alternative - Project-Local Settings

If you want to keep these settings local (not committed), use:

**File**: `.claude/settings.local.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cockpit-capture.js\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Step 3: Verify Hook Registration

After creating the settings file:

1. Start a new Claude Code session (hooks are captured at startup)
2. Run `/hooks` to see registered hooks
3. Verify the PostToolUse hook for Edit|Write|TodoWrite is listed

### Step 4: Add to .gitignore (Optional)

If using `settings.local.json`, add to `.gitignore`:

```
.claude/settings.local.json
```

## Configuration Options

| Option | Value | Description |
|--------|-------|-------------|
| matcher | `Edit\|Write\|TodoWrite` | Regex for tool names to capture |
| timeout | `5` | Seconds before hook is killed |
| command | `node ...` | Full path to hook script |

### Extended Matchers

To capture more tools (e.g., Bash commands):

```json
{
  "matcher": "Edit|Write|TodoWrite|Bash"
}
```

### Disable Temporarily

Set enabled to false in the hook:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|TodoWrite",
        "enabled": false,
        "hooks": [...]
      }
    ]
  }
}
```

## Acceptance Criteria

- [ ] `.claude/settings.json` (or `.local.json`) exists
- [ ] Hook configuration uses correct matcher
- [ ] Hook points to correct script path
- [ ] Timeout is set to reasonable value (5s)
- [ ] `/hooks` command shows the registered hook

## Testing

```bash
# 1. Start new Claude Code session
claude

# 2. Check hooks
/hooks

# 3. Make an edit
# "Edit the file test.txt to say hello"

# 4. Check if event was captured
ls .ai/cockpit/events/
```

## Notes

- Hooks are captured at session startup - restart after config changes
- The `/hooks` command shows a summary of active hooks
- Use `$CLAUDE_PROJECT_DIR` for portable paths
