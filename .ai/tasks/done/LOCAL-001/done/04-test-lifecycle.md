<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-test-lifecycle.md                                  ║
║ TASK: LOCAL-001                                                  ║
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

# Test Task Lifecycle

## Objective

Verify the complete cockpit integration works end-to-end by testing the task lifecycle.

## Pre-Implementation

Ensure work items 01, 02, 03 are complete.

## Test Cases

### Test 1: Happy Path - Full Lifecycle

```bash
# 1. Create a test task
/task-create LOCAL-TEST "Test cockpit integration"

# 2. Verify no active task yet
ls .ai/cockpit/active-task.json  # Should not exist

# 3. Start the task
/task-start LOCAL-TEST

# 4. Verify active-task.json exists
cat .ai/cockpit/active-task.json | jq .

# Expected:
# {
#   "taskId": "LOCAL-TEST",
#   "title": "Test cockpit integration",
#   "branch": "...",
#   "frameworkPath": ".ai/tasks/in_progress/LOCAL-TEST",
#   "startedAt": "...",
#   "sessionId": "..."
# }

# 5. Complete the task
/task-done

# 6. Verify active-task.json is removed
ls .ai/cockpit/active-task.json  # Should not exist
```

**Expected Result**: All steps pass, file created and deleted correctly.

### Test 2: Start Without Cockpit Directory

```bash
# 1. Remove cockpit directory
rm -rf .ai/cockpit

# 2. Start a task
/task-start LOCAL-TEST

# 3. Verify directory was created
ls -la .ai/cockpit/

# 4. Verify active-task.json exists
cat .ai/cockpit/active-task.json
```

**Expected Result**: Directory is created automatically, active-task.json written.

### Test 3: Multiple Task Warning

```bash
# 1. Start first task
/task-start LOCAL-001

# 2. Try to start second task
/task-start LOCAL-002

# Expected: Warning about LOCAL-001 being active
# User should be prompted to switch or cancel
```

**Expected Result**: Warning is shown, user can choose action.

### Test 4: Done Without Start

```bash
# 1. Ensure no active task
rm -f .ai/cockpit/active-task.json

# 2. Create a task in in_progress manually
# (or have one that wasn't started with cockpit)

# 3. Run task-done
/task-done

# Expected: Should complete gracefully without errors
```

**Expected Result**: No errors, task completes normally.

### Test 5: Done With Different Active Task

```bash
# 1. Start task A
/task-start LOCAL-A

# 2. Manually switch to task B in in_progress
# 3. Run /task-done on task B

# Expected: Warning that LOCAL-A is active, not LOCAL-B
```

**Expected Result**: Warning shown, active-task.json preserved.

## Acceptance Criteria

- [ ] Test 1 passes: Full lifecycle works
- [ ] Test 2 passes: Directory created if missing
- [ ] Test 3 passes: Multiple task warning works
- [ ] Test 4 passes: Done without start is graceful
- [ ] Test 5 passes: Done with different task warns

## Notes

- Document any issues found during testing
- Update command documentation if behavior differs from spec
- Consider adding automated tests in the future
