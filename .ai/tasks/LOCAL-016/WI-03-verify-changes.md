---
type: work-item
id: WI-03
parent: LOCAL-016
title: Verify changes work correctly
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-016]]


# Verify Changes Work Correctly

## Objective

Verify that all Claude session launch methods now include the `--allow-dangerously-skip-permissions` flag.

## Pre-Implementation

Ensure WI-01 and WI-02 are complete.

## Implementation Steps

### Step 1: Compile the extension

**Instructions**:
```bash
cd vscode-extension
npm run compile
```

Verify no TypeScript errors.

### Step 2: Code verification

**Instructions**:

Search for Claude command usage to verify all are updated:
```bash
grep -n "generateClaudeCommand" src/extension.ts
```

Should show 4 usages (one for each launch point).

Search for any remaining hardcoded commands:
```bash
grep -n "sendText.*'claude" src/extension.ts
```

Should return no matches (or only non-launch related usages).

### Step 3: Manual testing (optional but recommended)

**Instructions**:

1. Open the ai-framework project in VSCode
2. Press F5 to launch Extension Development Host
3. In the new VSCode window, test each method:

**Test A: Open Task Terminal**
- Click on a task in the AI Cockpit sidebar
- Verify terminal shows: `claude --allow-dangerously-skip-permissions`

**Test B: Resume Session**
- If a previous session exists, click "Resume"
- Verify terminal shows: `claude --allow-dangerously-skip-permissions --resume <session-id>`

**Test C: New Session**
- Use the "New Session" command with a custom label
- Verify terminal shows: `claude --allow-dangerously-skip-permissions`

**Test D: Start Unassigned Session**
- Start an unassigned/exploratory session
- Verify terminal shows: `claude --allow-dangerously-skip-permissions`

## Post-Implementation

Document any issues found and their resolutions.

## Acceptance Criteria

- [ ] Extension compiles without errors
- [ ] 4 usages of `generateClaudeCommand` found in extension.ts
- [ ] No hardcoded Claude launch commands remain
- [ ] (Optional) Manual testing confirms flag appears in all terminal commands

## Testing

All testing steps are documented in the Implementation Steps above.

## Notes

- If manual testing is not possible in current environment, code verification is sufficient
- The flag will be visible in the terminal when Claude is launched
