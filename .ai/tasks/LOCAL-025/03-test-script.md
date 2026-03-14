---
type: work-item
id: "03"
parent: LOCAL-025
title: Test installation script
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

# Test Installation Script

## Objective

Verify the installation script works correctly across different scenarios.

## Testing Performed

### 1. Help Output
```bash
node install.js --help
```
Result: Help text displayed correctly with all options

### 2. Fresh Installation
```bash
node install.js /tmp/test-ai-framework-install --yes --no-extension
```
Result: All files copied, directories created, success message shown

### 3. File Structure Verification
```bash
find /tmp/test-ai-framework-install -type f | head -30
```
Result: Verified presence of:
- `.claude/settings.json`
- `.claude/agents/*.md` (3 files)
- `.claude/hooks/cockpit-capture.js`
- `.claude/commands/*.md` (17 files)
- `.ai/_framework/` (commands and templates)
- `.ai/tasks/{todo,in_progress,done}/.gitkeep`
- `.ai/cockpit/{events,shadows}/.gitkeep`
- `.ai/cockpit/config.json`

### 4. Cleanup
```bash
rm -rf /tmp/test-ai-framework-install
```
Result: Test directory cleaned up

## Acceptance Criteria

- [x] Help output works
- [x] Fresh installation works
- [x] Non-interactive mode works
- [x] --no-extension flag works
- [x] All expected files are created
- [x] Directory structure is correct

## Notes

Additional test scenarios for future:
- Test with existing installation (backup behavior)
- Test --update flag
- Test VSCode extension installation (requires VSCode CLI)
- Test on Windows
