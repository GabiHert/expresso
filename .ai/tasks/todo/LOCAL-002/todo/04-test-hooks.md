<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-test-hooks.md                                      ║
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

# Test Hook Integration

## Objective

End-to-end testing of the hook system with real Claude Code operations.

## Pre-Requisites

- Work items 01, 02, 03 are complete
- Claude Code is installed and working
- Hook configuration is in place

## Test Cases

### Test 1: Edit Event Capture

```bash
# 1. Start task (from Phase 1)
/task-start LOCAL-TEST

# 2. Create a test file
echo "hello" > test-file.txt

# 3. Ask Claude to edit it
# "Change 'hello' to 'world' in test-file.txt"

# 4. Verify event captured
ls .ai/cockpit/events/LOCAL-TEST/
cat .ai/cockpit/events/LOCAL-TEST/001-edit.json | jq .

# Expected fields:
# - id: evt-...
# - taskId: LOCAL-TEST
# - taskIdSource: active-task-file
# - tool: Edit
# - input.file_path: test-file.txt
# - input.old_string: hello
# - input.new_string: world
```

**Expected Result**: Event file created with correct structure.

### Test 2: Write Event Capture

```bash
# 1. Ensure task is active
cat .ai/cockpit/active-task.json

# 2. Ask Claude to create a new file
# "Create a file called new-file.ts with a simple function"

# 3. Verify event captured
ls .ai/cockpit/events/LOCAL-TEST/
cat .ai/cockpit/events/LOCAL-TEST/002-write.json | jq .

# Expected:
# - tool: Write
# - input.file_path: new-file.ts
# - input.content: ...
```

**Expected Result**: Write event captured with file content.

### Test 3: TodoWrite Event Capture

```bash
# 1. Ask Claude to track a task
# "Create a todo list for: 1. Review code 2. Run tests"

# 2. Verify event captured
cat .ai/cockpit/events/LOCAL-TEST/003-todowrite.json | jq .

# Expected:
# - tool: TodoWrite
# - input.todos: [...]
```

**Expected Result**: TodoWrite event captured with todos array.

### Test 4: Multiple Events in Sequence

```bash
# 1. Ask Claude to do multiple operations
# "Create a file utils.ts, then edit it to add a second function"

# 2. Verify both events captured
ls .ai/cockpit/events/LOCAL-TEST/
# Should show: 001-write.json, 002-edit.json (or similar)

# 3. Verify sequential numbering
```

**Expected Result**: Events are numbered sequentially.

### Test 5: Performance Check

```bash
# 1. Time a single operation
time echo '{"tool_name":"Edit","session_id":"test"}' | \
  node .claude/hooks/cockpit-capture.js

# Expected: < 100ms
```

**Expected Result**: Hook execution is fast.

### Test 6: Error Resilience

```bash
# 1. Make hook script fail (temporarily)
# Add syntax error or remove it

# 2. Perform an edit with Claude

# 3. Verify Claude was not blocked
# (Edit should complete even if hook fails)

# 4. Restore hook script
```

**Expected Result**: Claude Code continues even if hook fails.

### Test 7: No Active Task

```bash
# 1. Clear active task
rm .ai/cockpit/active-task.json

# 2. Checkout a non-task branch
git checkout main

# 3. Make an edit

# 4. Verify event goes to session fallback
ls .ai/cockpit/events/
# Should see: session-{sessionId}/
```

**Expected Result**: Events use session fallback when no task.

## Cleanup

After testing:

```bash
# Remove test files
rm -f test-file.txt new-file.ts utils.ts

# Clear test events
rm -rf .ai/cockpit/events/LOCAL-TEST
rm -rf .ai/cockpit/events/session-*

# Complete task
/task-done
```

## Acceptance Criteria

- [ ] Test 1: Edit events are captured correctly
- [ ] Test 2: Write events are captured correctly
- [ ] Test 3: TodoWrite events are captured correctly
- [ ] Test 4: Multiple events are numbered sequentially
- [ ] Test 5: Hook execution is fast (<100ms)
- [ ] Test 6: Claude Code continues if hook fails
- [ ] Test 7: Session fallback works correctly

## Notes

- Document any issues found during testing
- Note performance characteristics for different event types
- Consider adding automated tests in the future
