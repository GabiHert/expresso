---
type: internal-doc
tags:
  - doc
---

<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/_shared/README.md                             ║
║ • Related: AI Cockpit MVP v1                                     ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Claude Code Hooks - Complete Reference

Comprehensive documentation for Claude Code's hook system - intercept, validate, and modify Claude Code behavior.

---

## Overview

- **What**: Hooks are shell commands or LLM prompts that execute at specific points in Claude Code's workflow
- **Why**: Enable custom validation, logging, automation, and integration with external systems
- **When**: Use for file protection, code formatting, notifications, audit logging, or custom workflows

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Hook Event | A point in Claude Code's workflow where hooks can execute (10 available) |
| Matcher | Regex pattern to filter which tools trigger the hook |
| Command Hook | Shell command executed by the hook |
| Prompt Hook | LLM-based hook using Claude Haiku for intelligent decisions |
| Exit Code | Determines if hook blocks (2) or allows (0) the action |
| Hook Input | JSON data passed via stdin to the hook command |

---

## Hook Events

Claude Code supports **10 hook events**:

| Hook Event | When It Runs | Can Block? | Has Matcher? |
|------------|--------------|------------|--------------|
| **PreToolUse** | Before tool execution | Yes | Yes |
| **PostToolUse** | After tool completes | Yes (feedback) | Yes |
| **PermissionRequest** | When permission dialog shown | Yes | Yes |
| **UserPromptSubmit** | When user submits prompt | Yes | No |
| **Notification** | When Claude sends notification | No | Yes |
| **Stop** | When Claude finishes responding | Yes | No |
| **SubagentStop** | When subagent task completes | Yes | No |
| **PreCompact** | Before context compaction | No | Yes |
| **SessionStart** | At session start/resume | No | No |
| **SessionEnd** | When session ends | No | No |

---

## Configuration

### Configuration Files (Precedence Order)

1. Enterprise managed policies (highest)
2. `~/.claude/settings.json` - User-level (all projects)
3. `.claude/settings.json` - Project-level
4. `.claude/settings.local.json` - Local project (not committed)
5. Plugin hooks (`hooks/hooks.json`)

### Basic Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### Hook Types

#### Command Hooks

Execute shell commands. Fast, deterministic, good for validation and logging.

```json
{
  "type": "command",
  "command": "python3 /path/to/validator.py",
  "timeout": 60
}
```

#### Prompt Hooks

Use Claude Haiku for intelligent decisions. Only available for `Stop` and `SubagentStop`.

```json
{
  "type": "prompt",
  "prompt": "Evaluate if Claude should stop: $ARGUMENTS. Check if all tasks are complete.",
  "timeout": 30
}
```

---

## Matchers

Matchers filter which tools trigger hooks:

| Pattern Type | Example | Matches |
|--------------|---------|---------|
| Exact | `"Write"` | Only Write tool |
| Regex | `"Edit\|Write"` | Edit or Write |
| Wildcard | `".*"` | All tools |
| MCP | `"mcp__memory__.*"` | All memory server tools |
| Omitted | - | All (for events without matchers) |

### Hookable Tool Names

```
Bash, Edit, Write, Read, Glob, Grep, WebFetch, WebSearch, Task
mcp__<server>__<tool>  (MCP tools)
```

---

## Hook Input (stdin)

Hooks receive JSON data via stdin. Common fields in all hooks:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/conversation.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

### Event-Specific Input

#### PreToolUse

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "const x = 1",
    "new_string": "const x = 2"
  },
  "tool_use_id": "toolu_123"
}
```

#### PostToolUse

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "const x = 1",
    "new_string": "const x = 2"
  },
  "tool_response": "File edited successfully",
  "tool_use_id": "toolu_123"
}
```

#### UserPromptSubmit

```json
{
  "prompt": "Help me refactor this function"
}
```

#### Stop / SubagentStop

```json
{
  "stop_hook_active": true
}
```

#### Notification

```json
{
  "message": "Waiting for permission",
  "notification_type": "permission_prompt"
}
```

#### SessionStart

```json
{
  "source": "startup"
}
```
Source values: `startup`, `resume`, `clear`, `compact`

#### SessionEnd

```json
{
  "reason": "logout"
}
```
Reason values: `clear`, `logout`, `prompt_input_exit`, `other`

---

## Environment Variables

Available in all hooks:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root |
| `CLAUDE_CODE_REMOTE` | "true" if running in cloud |
| Standard shell env | All normal environment variables |

SessionStart only:

| Variable | Description |
|----------|-------------|
| `CLAUDE_ENV_FILE` | File path to persist env vars for session |

---

## Hook Output

Hooks communicate results via exit codes and stdout/stderr.

### Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| **0** | Success | Continue execution |
| **2** | Block | Stop execution, show stderr to Claude |
| Other | Warning | Log in verbose mode, continue |

### Simple Output (Exit Code Only)

```bash
#!/bin/bash
# Allow
exit 0

# Block with message
echo "Cannot edit this file" >&2
exit 2
```

### Advanced Output (JSON)

```json
{
  "continue": true,
  "stopReason": "Message shown to user",
  "suppressOutput": false,
  "systemMessage": "Warning to user",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Explanation",
    "updatedInput": {
      "field": "modified_value"
    }
  }
}
```

---

## Event-Specific Control

### PreToolUse

Control whether tool executes and optionally modify input:

```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow",
    "updatedInput": {
      "file_path": "/modified/path.ts"
    }
  }
}
```

Permission decisions: `allow`, `deny`, `ask`

### PermissionRequest

Override permission dialog:

```json
{
  "hookSpecificOutput": {
    "decision": {
      "behavior": "allow",
      "updatedInput": {}
    }
  }
}
```

### PostToolUse

Provide feedback to Claude after tool execution:

```json
{
  "decision": "block",
  "reason": "The edit introduced a syntax error",
  "hookSpecificOutput": {
    "additionalContext": "Line 45 has unmatched brackets"
  }
}
```

### UserPromptSubmit

Block or modify user prompts:

```json
{
  "decision": "block",
  "reason": "This prompt contains sensitive information"
}
```

Or add context:

```json
{
  "hookSpecificOutput": {
    "additionalContext": "User is working on authentication module"
  }
}
```

### Stop / SubagentStop

Prevent Claude from stopping:

```json
{
  "decision": "block",
  "reason": "Tests are still failing, please fix them"
}
```

### SessionStart

Add context at session start:

```json
{
  "hookSpecificOutput": {
    "additionalContext": "Remember: This project uses TypeScript strict mode"
  }
}
```

Persist environment variables:

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

---

## Practical Examples

### 1. File Protection Hook

Prevent editing sensitive files:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 -c \"import json, sys; data=json.load(sys.stdin); path=data.get('tool_input',{}).get('file_path',''); sys.exit(2 if any(p in path for p in ['.env', 'package-lock.json', '.git/']) else 0)\""
          }
        ]
      }
    ]
  }
}
```

### 2. Code Formatting Hook

Auto-format after edits:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/format.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null
fi

exit 0
```

### 3. Dangerous Command Validator

Block destructive bash commands:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/bash_validator.py\""
          }
        ]
      }
    ]
  }
}
```

```python
#!/usr/bin/env python3
# .claude/hooks/bash_validator.py
import json
import sys
import re

DANGEROUS_PATTERNS = [
    r'rm\s+-rf\s+/',
    r'git\s+push\s+.*--force',
    r'git\s+reset\s+--hard',
    r'DROP\s+TABLE',
    r'DELETE\s+FROM.*WHERE\s+1\s*=\s*1',
]

data = json.load(sys.stdin)
command = data.get('tool_input', {}).get('command', '')

for pattern in DANGEROUS_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(f"Blocked dangerous command matching: {pattern}", file=sys.stderr)
        sys.exit(2)

sys.exit(0)
```

### 4. AI Cockpit Event Capture

Capture all Edit/Write events for diff tracking:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cockpit-capture.js\""
          }
        ]
      }
    ]
  }
}
```

```javascript
#!/usr/bin/env node
// .claude/hooks/cockpit-capture.js
const http = require('http');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const data = JSON.parse(input);

  const event = {
    taskId: process.env.COCKPIT_TASK_ID || 'unknown',
    tool: data.tool_name,
    input: data.tool_input,
    response: data.tool_response,
    timestamp: Date.now()
  };

  const req = http.request({
    hostname: 'localhost',
    port: 9999,
    path: '/events',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, () => process.exit(0));

  req.on('error', () => process.exit(0)); // Don't block on failure
  req.write(JSON.stringify(event));
  req.end();
});
```

### 5. Desktop Notifications

Send system notifications on permission prompts:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Awaiting your input\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

### 6. Commit Message Validator

Validate commits follow conventions:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/commit_validator.py\""
          }
        ]
      }
    ]
  }
}
```

```python
#!/usr/bin/env python3
import json
import sys
import re

data = json.load(sys.stdin)
command = data.get('tool_input', {}).get('command', '')

# Check if it's a git commit command
if 'git commit' not in command:
    sys.exit(0)

# Extract commit message
match = re.search(r'-m\s+["\'](.+?)["\']', command)
if not match:
    sys.exit(0)

message = match.group(1)

# Validate conventional commits format
pattern = r'^(feat|fix|chore|refactor|test|docs)(\(.+\))?: .+'
if not re.match(pattern, message):
    print("Commit message must follow: type(scope): description", file=sys.stderr)
    sys.exit(2)

sys.exit(0)
```

### 7. Smart Stop Prevention

Prevent stopping until tests pass:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if Claude has completed all requested tasks. If tests were requested and haven't been run or are failing, return decision: block with reason explaining what's missing.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

---

## Security Considerations

### Risks

| Risk | Mitigation |
|------|------------|
| Credential exposure | Don't log sensitive data |
| Shell injection | Always quote variables: `"$VAR"` |
| Path traversal | Validate paths don't contain `..` |
| Malicious hooks | Review hooks before enabling |

### Sensitive File Protection

Always protect these files:
- `.env`, `.env.*`
- `credentials.json`, `*.pem`, `*.key`
- `.git/config`
- `package-lock.json`, `yarn.lock`

### Hook Session Isolation

- Hooks are captured at session startup
- Changes during session require `/hooks` review
- This prevents malicious mid-session modifications

---

## Debugging

### View Registered Hooks

```bash
/hooks  # Interactive menu
```

### Enable Debug Mode

```bash
claude --debug  # Shows hook execution details
```

### Manual Testing

```bash
# Test hook script directly
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | \
  python3 .claude/hooks/validator.py
echo $?  # Check exit code
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Hook not triggering | Check matcher regex, tool name case |
| Permission denied | `chmod +x script.sh` |
| JSON parse error | Validate JSON in settings file |
| Path not found | Use absolute paths or `$CLAUDE_PROJECT_DIR` |

---

## Limitations

1. **Prompt hooks limited**: Only `Stop` and `SubagentStop` support LLM hooks
2. **Snapshot isolation**: Hook changes don't apply until next session
3. **Timeout**: 60 second default per command
4. **Input modification**: `updatedInput` only works with `"allow"` permission
5. **Large output**: Can consume context tokens

---

## Integration with AI Cockpit

For AI Cockpit, the key hooks are:

| Hook | Purpose |
|------|---------|
| PostToolUse (Edit) | Capture `old_string`/`new_string` for diff history |
| PostToolUse (Write) | Capture new file creations |
| PostToolUse (TodoWrite) | Sync subtask status |
| SessionStart | Initialize cockpit task context |
| Stop | Optionally validate all subtasks complete |

See [AI Cockpit MVP v1](../_architecture/[[ai-cockpit-mvp-v1]].md) for integration details.

---

## Related Documentation

- [AI Cockpit MVP v1](../_architecture/ai-cockpit-mvp-v1.md)
- [Claude Code Official Docs](https://docs.anthropic.com/en/docs/claude-code)

---

_Created: 2025-12-27_
_Last Updated: 2025-12-27_
