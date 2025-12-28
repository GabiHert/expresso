<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-task-id-resolution.md                              ║
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

# Implement Task ID Resolution

## Objective

Test and refine the task ID resolution logic that determines which task an event belongs to.

## Resolution Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    TASK ID RESOLUTION                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Read .ai/cockpit/active-task.json                          │
│     ↓ if exists and has valid taskId                           │
│     → Return { id: taskId, source: 'active-task-file' }        │
│                                                                │
│     ↓ if not found or invalid                                  │
│  2. Parse git branch name                                      │
│     ↓ if matches pattern ([A-Z]+-\d+)                          │
│     → Return { id: 'TASK-123', source: 'git-branch' }          │
│                                                                │
│     ↓ if no match                                              │
│  3. Use session ID as fallback                                 │
│     → Return { id: 'session-abc123', source: 'session-fallback'}│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Test Strategy 1 - Active Task File

```bash
# Create active task file
mkdir -p .ai/cockpit
echo '{"taskId":"TEST-001","title":"Test"}' > .ai/cockpit/active-task.json

# Run hook with sample input
echo '{"tool_name":"Edit","session_id":"sess1"}' | \
  CLAUDE_PROJECT_DIR=$(pwd) node .claude/hooks/cockpit-capture.js

# Check result
cat .ai/cockpit/events/TEST-001/001-edit.json | jq '.taskIdSource'
# Expected: "active-task-file"

# Cleanup
rm .ai/cockpit/active-task.json
```

### Step 2: Test Strategy 2 - Git Branch

```bash
# Create a feature branch
git checkout -b feat/LOCAL-002-test

# Remove active task file
rm -f .ai/cockpit/active-task.json

# Run hook
echo '{"tool_name":"Edit","session_id":"sess1"}' | \
  CLAUDE_PROJECT_DIR=$(pwd) node .claude/hooks/cockpit-capture.js

# Check result
cat .ai/cockpit/events/LOCAL-002/001-edit.json | jq '.taskIdSource'
# Expected: "git-branch"

# Cleanup
git checkout main
git branch -D feat/LOCAL-002-test
```

### Step 3: Test Strategy 3 - Session Fallback

```bash
# Ensure no active task and non-matching branch
rm -f .ai/cockpit/active-task.json
git checkout main  # Assuming main doesn't match pattern

# Run hook
echo '{"tool_name":"Edit","session_id":"abc123"}' | \
  CLAUDE_PROJECT_DIR=$(pwd) node .claude/hooks/cockpit-capture.js

# Check result
cat .ai/cockpit/events/session-abc123/001-edit.json | jq '.taskIdSource'
# Expected: "session-fallback"
```

### Step 4: Test Edge Cases

#### 4a. Malformed active-task.json

```bash
echo 'invalid json' > .ai/cockpit/active-task.json
# Should fall through to git branch
```

#### 4b. Missing taskId field

```bash
echo '{"title":"No ID"}' > .ai/cockpit/active-task.json
# Should fall through to git branch
```

#### 4c. Various branch patterns

Test these branch names:

| Branch Name | Expected Task ID |
|-------------|------------------|
| `feat/JIRA-123-feature` | `JIRA-123` |
| `LOCAL-456-fix` | `LOCAL-456` |
| `fix/bug-ABC-789` | `ABC-789` |
| `main` | `session-...` (fallback) |
| `develop` | `session-...` (fallback) |
| `feature/no-ticket` | `session-...` (fallback) |

### Step 5: Update Pattern If Needed

If the regex needs adjustment, update in `cockpit-capture.js`:

```javascript
// Current pattern: /([A-Z]+-\d+)/i
// Matches: JIRA-123, LOCAL-456, ABC-789

// Alternative for lowercase:
// /([a-zA-Z]+-\d+)/i
```

## Acceptance Criteria

- [ ] Strategy 1 works: active-task.json is used when present
- [ ] Strategy 2 works: git branch is parsed correctly
- [ ] Strategy 3 works: session ID fallback is used
- [ ] Edge cases handled: malformed JSON, missing fields
- [ ] Branch patterns match expected task IDs
- [ ] Events are grouped by correct taskId

## Notes

- The source field helps debug which strategy was used
- Consider logging resolution strategy for debugging
- Pattern can be made configurable via config.json in the future
