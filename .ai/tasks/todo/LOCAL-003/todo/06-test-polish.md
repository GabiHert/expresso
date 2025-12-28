<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 06-test-polish.md                                     ║
║ TASK: LOCAL-003                                                  ║
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
repo: vscode-extension
---

# Test and Polish

## Objective

End-to-end testing of the complete extension and final polish before release.

## Test Cases

### Test 1: Extension Activation

```bash
# 1. Open VSCode in a project WITHOUT .ai/cockpit/
# Expected: Extension doesn't activate (check Output > AI Cockpit)

# 2. Create .ai/cockpit/ directory
# Expected: Extension still not active (need to reload)

# 3. Reload VSCode
# Expected: Extension activates, status bar shows "No task"
```

### Test 2: Full Workflow Integration

```bash
# Prerequisites: Phase 1 and Phase 2 are complete

# 1. Start Claude Code in terminal
claude

# 2. Create and start a task
/task-create LOCAL-TEST "Test integration"
/task-start LOCAL-TEST

# 3. Verify in extension:
# - Status bar shows "LOCAL-TEST"
# - Task panel shows task with green icon
# - Click status bar shows menu

# 4. Make an edit with Claude
# "Change 'hello' to 'world' in test.txt"

# 5. Verify event captured:
# - Event appears under task in panel
# - Click event opens diff view

# 6. Complete task
/task-done

# 7. Verify:
# - Status bar shows "No task"
# - Task panel updates
```

### Test 3: Real-Time Updates

```bash
# 1. Open extension and task panel
# 2. In terminal, create active-task.json manually
echo '{"taskId":"REAL-TIME","title":"Test"}' > .ai/cockpit/active-task.json

# 3. Verify status bar updates immediately (no refresh needed)

# 4. Create event file
mkdir -p .ai/cockpit/events/REAL-TIME
echo '{"id":"evt-1","taskId":"REAL-TIME","tool":"Edit","input":{"file_path":"test.ts","old_string":"a","new_string":"b"},"timestamp":"2025-12-28T10:00:00Z"}' > .ai/cockpit/events/REAL-TIME/001-edit.json

# 5. Verify event appears in panel immediately
```

### Test 4: Error Handling

```bash
# 1. Create malformed active-task.json
echo 'invalid json' > .ai/cockpit/active-task.json
# Expected: Status bar shows "No task", no errors

# 2. Create malformed event file
echo 'invalid' > .ai/cockpit/events/TEST/001-bad.json
# Expected: Event not shown, no crash

# 3. Delete cockpit directory while extension running
rm -rf .ai/cockpit/
# Expected: Status bar updates, no crash
```

### Test 5: Performance

```bash
# 1. Create many events (50+)
for i in {1..50}; do
  echo "{\"id\":\"evt-$i\",\"taskId\":\"PERF\",\"tool\":\"Edit\",\"input\":{},\"timestamp\":\"2025-12-28T10:00:00Z\"}" > .ai/cockpit/events/PERF/$(printf "%03d" $i)-edit.json
done

# 2. Verify:
# - Panel loads quickly
# - Scrolling is smooth
# - No memory issues
```

### Test 6: Cross-Platform (if applicable)

- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test on Windows (paths with backslashes)

## Polish Items

### UI Polish

- [ ] Activity bar icon is clear and recognizable
- [ ] Status bar text is readable
- [ ] Tree view icons are appropriate
- [ ] Tooltips are helpful
- [ ] Quick pick menus are intuitive

### Error Messages

- [ ] User-friendly error messages (not stack traces)
- [ ] Actionable suggestions when possible
- [ ] Graceful degradation when features fail

### Documentation

- [ ] Update extension README.md
- [ ] Add screenshots to README
- [ ] Document keyboard shortcuts
- [ ] Add contribution guide

### Code Quality

- [ ] Remove console.log debugging
- [ ] Add proper error logging
- [ ] Clean up unused imports
- [ ] Run linter and fix issues

### Extension Manifest

Update **package.json** with:
```json
{
  "keywords": ["ai", "claude", "cockpit", "diff", "task"],
  "repository": {
    "type": "git",
    "url": "https://github.com/GabiHert/ai-framework"
  },
  "bugs": {
    "url": "https://github.com/GabiHert/ai-framework/issues"
  },
  "icon": "media/icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  }
}
```

## Final Checklist

### Functionality
- [ ] Status bar works correctly
- [ ] Task panel displays tasks
- [ ] Events are captured in real-time
- [ ] Diff viewer shows correct content
- [ ] Commands work from Command Palette

### Performance
- [ ] Activation is fast
- [ ] File watching is efficient
- [ ] Large event lists don't lag

### Reliability
- [ ] No crashes on edge cases
- [ ] Proper cleanup on deactivation
- [ ] Handles missing directories

### User Experience
- [ ] Intuitive without documentation
- [ ] Helpful error messages
- [ ] Consistent with VSCode patterns

## Known Issues / Future Work

Document any issues found during testing:

1. Issue: ___
   - Severity: Low/Medium/High
   - Workaround: ___
   - Fix in: v0.2.0

2. Issue: ___
   - ...

## Release Preparation

### Version 0.1.0 (MVP)

```bash
# 1. Update version in package.json
"version": "0.1.0"

# 2. Build extension
npm run compile

# 3. Package extension
npx vsce package

# 4. Test packaged extension
code --install-extension ai-cockpit-0.1.0.vsix
```

## Acceptance Criteria

- [ ] All 6 test cases pass
- [ ] All polish items complete
- [ ] Final checklist verified
- [ ] Extension packaged successfully

## Notes

- Consider adding telemetry for usage insights (opt-in)
- Plan v0.2.0 features based on feedback
- Create GitHub release with changelog
