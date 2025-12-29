<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-hook-env-var.md                                    ║
║ TASK: LOCAL-005                                                  ║
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

# Hook Environment Variable Support

## Objective

Add `COCKPIT_TASK` environment variable as the highest priority method for determining task ID in the cockpit-capture hook. This enables parallel Claude sessions to work on different tasks simultaneously.

## Pre-Implementation

The hook is located at `.claude/hooks/cockpit-capture.js`. The `resolveTaskId()` function currently has this priority chain:
1. active-task.json file
2. Git branch pattern
3. Session ID fallback

## Implementation Steps

### Step 1: Add env var check to resolveTaskId()

**File**: `.claude/hooks/cockpit-capture.js`

**Location**: Beginning of `resolveTaskId()` function (around line 58)

**Instructions**:

Add as the FIRST strategy in the function:

```javascript
function resolveTaskId(projectDir, sessionId) {
  // Strategy 0: Environment variable override (NEW)
  const envTaskId = process.env.COCKPIT_TASK;
  if (envTaskId) {
    return { id: envTaskId, source: 'env-var' };
  }

  // Strategy 1: Active task file (existing code continues...)
  // ...
}
```

### Step 2: Test manually

```bash
# Test 1: Env var should take priority
COCKPIT_TASK=TEST-ENV-001 claude
# Make a small edit to any file
# Check: ls .ai/cockpit/events/TEST-ENV-001/
# Should see new event file

# Test 2: Check event content
cat .ai/cockpit/events/TEST-ENV-001/*.json | head -50
# Should see: "taskIdSource": "env-var"

# Test 3: Without env var, fallback works
unset COCKPIT_TASK
# Verify active-task.json is used (existing behavior)
```

## Acceptance Criteria

- [ ] `COCKPIT_TASK` env var is checked first in `resolveTaskId()`
- [ ] Returns `{ id: envTaskId, source: 'env-var' }` when set
- [ ] Existing fallback chain preserved when env var not set
- [ ] Events created with correct `taskIdSource` value

## Testing

```bash
# Parallel session test
# Terminal 1:
COCKPIT_TASK=PARALLEL-A claude
# Make edit

# Terminal 2 (simultaneously):
COCKPIT_TASK=PARALLEL-B claude
# Make edit

# Verify:
ls .ai/cockpit/events/PARALLEL-A/
ls .ai/cockpit/events/PARALLEL-B/
# Both should have separate events
```

## Notes

- This is the core change that enables the entire feature
- Keep the change minimal - just add the env var check
- Don't modify the existing fallback behavior
