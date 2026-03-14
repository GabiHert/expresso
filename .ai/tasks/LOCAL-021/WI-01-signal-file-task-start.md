---
type: work-item
id: WI-01
parent: LOCAL-021
title: Add signal file write to /task-start
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-021]]


# Add Signal File Write to /[[task-start]] Command

## Objective

Modify the `/task-start` command to write a signal file (`task-switch-signal.json`) that triggers the VSCode extension to synchronize the session registry when a task switch occurs.

## Pre-Implementation

Before starting, read:
- `.ai/_framework/commands/task-start.md` (current implementation)
- Task README Architecture Diagrams section
- Understand atomic file write pattern (temp file + rename)

## Implementation Steps

### Step 1: Locate the signal file write insertion point

**File**: `.ai/_framework/commands/task-start.md`

**Location**: Step 7 (Writing active-task.json), after line ~295

Find the section that writes `active-task.json`:
```bash
# Atomic rename
mv .ai/cockpit/active-task.json.tmp .ai/cockpit/active-task.json
```

The signal file write should go **immediately after** this line.

### Step 2: Capture previous task ID

Before writing the signal, we need to know what task we're switching FROM.

**Add before the active-task.json write**:
```bash
# Capture previous task ID for signal file
previous_task_id=""
if [ -f .ai/cockpit/active-task.json ]; then
  previous_task_id=$(jq -r '.taskId // empty' .ai/cockpit/active-task.json 2>/dev/null)
fi
```

### Step 3: Write signal file

**Add after the active-task.json atomic rename**:
```bash
# Write task-switch-signal to trigger VSCode sync
if [ -n "$previous_task_id" ] && [ "$previous_task_id" != "$task_id" ]; then
  cat > .ai/cockpit/task-switch-signal.json.tmp << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "previousTaskId": "$previous_task_id",
  "newTaskId": "$task_id",
  "type": "task-switch"
}
EOF

  # Atomic rename to trigger FileWatcher
  mv .ai/cockpit/task-switch-signal.json.tmp .ai/cockpit/task-switch-signal.json
fi
```

**Key points**:
- Only write if task actually changed (`previous_task_id != task_id`)
- Use atomic write pattern (temp file + rename)
- Include timestamp for debugging
- Type field for future extensibility

### Step 4: Update the announce message

**Find**: The "ACTIVE TASK UPDATED" announce block

**Add**: Mention that VSCode extension will be notified

```bash
echo ""
echo "✓ Active task switched: $previous_task_id → $task_id"
echo "  VSCode extension will be notified automatically"
echo ""
```

## Post-Implementation

After completing:
1. Test manually: Create a session, run `/task-start TASK-B`, verify signal file created
2. Check signal file format is valid JSON
3. Verify signal file is NOT created on first task-start (no previous task)

## Acceptance Criteria

- [ ] Signal file written only when task actually changes
- [ ] Signal file uses atomic write pattern (temp + rename)
- [ ] Signal file contains: timestamp, previousTaskId, newTaskId, type
- [ ] Signal file is valid JSON
- [ ] No signal file created on first `/task-start` (no previous task)
- [ ] Command still works if jq not available (graceful fallback)

## Testing

### Manual Test 1: First task-start (no signal)
```bash
cd /path/to/project
rm -f .ai/cockpit/active-task.json .ai/cockpit/task-switch-signal.json
/task-start LOCAL-018
# Verify: task-switch-signal.json does NOT exist
```

### Manual Test 2: Task switch (signal created)
```bash
/task-start LOCAL-019
# Verify: task-switch-signal.json exists
cat .ai/cockpit/task-switch-signal.json
# Should show: previousTaskId: LOCAL-018, newTaskId: LOCAL-019
```

### Manual Test 3: Same task (no signal)
```bash
/task-start LOCAL-019
# Verify: signal file not updated (timestamp unchanged)
```

## Notes

- The VSCode extension will delete this signal file after processing
- If the extension is not running, signal files will accumulate (handled in WI-06)
- The atomic rename pattern prevents partial reads by FileWatcher
- Signal file can be regenerated if lost (verification fallback in WI-05)
