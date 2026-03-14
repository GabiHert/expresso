---
type: work-item
id: "05"
parent: LOCAL-019
title: Test and verify highlighting
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-019]]


# Test and Verify Syntax Highlighting

## Objective

Thoroughly test the Prism.js syntax highlighting integration across different file types, themes, and edge cases.

## Pre-Implementation

Ensure all previous work items are complete:
- [ ] Prism.js vendor file is in place
- [ ] VSCode theme CSS is created
- [ ] HTML template loads Prism assets
- [ ] [[diff-review]].js has highlighting logic

## Testing Steps

### Test 1: TypeScript Highlighting

1. Make a change to any `.ts` file in the project
2. Open the diff review panel for that file
3. Verify highlighting:
   - [ ] Keywords (`const`, `let`, `function`, `class`) are blue
   - [ ] Strings are orange/brown
   - [ ] Comments are green/gray and italic
   - [ ] Function names are yellow
   - [ ] Types/interfaces are teal/green

### Test 2: JavaScript Highlighting

1. Create or modify a `.js` file
2. Open diff review panel
3. Verify:
   - [ ] Similar colors to TypeScript
   - [ ] Template literals highlight correctly
   - [ ] Arrow functions show `=>` correctly

### Test 3: Python Highlighting

1. Create a test `.py` file with changes
2. Open diff review panel
3. Verify:
   - [ ] Keywords (`def`, `class`, `if`, `for`) are blue
   - [ ] Strings (single and double quotes) are orange
   - [ ] Decorators (`@decorator`) are highlighted
   - [ ] Comments (`#`) are green/gray

### Test 4: JSON Highlighting

1. Modify a `.json` file
2. Open diff review panel
3. Verify:
   - [ ] Property keys are light blue
   - [ ] String values are orange
   - [ ] Numbers are light green
   - [ ] Booleans (`true`, `false`) are colored
   - [ ] `null` is colored

### Test 5: CSS/HTML Highlighting

1. Modify a `.css` or `.html` file
2. Open diff review panel
3. Verify:
   - [ ] CSS selectors are colored
   - [ ] CSS properties and values are different colors
   - [ ] HTML tags are blue
   - [ ] HTML attributes are light blue
   - [ ] HTML attribute values are orange

### Test 6: Theme Switching

1. Open a diff review panel
2. Switch VSCode theme from dark to light (or vice versa)
   - Command Palette > "Preferences: Color Theme"
3. Verify:
   - [ ] Token colors adapt to new theme
   - [ ] Diff backgrounds (green/red) are still visible
   - [ ] Text remains readable on all backgrounds

### Test 7: Diff Backgrounds Preserved

1. Open a diff with both additions and deletions
2. Verify:
   - [ ] Added lines have green background
   - [ ] Deleted lines have red background
   - [ ] Syntax highlighting is visible ON TOP of these backgrounds
   - [ ] Tokens don't have their own backgrounds that hide diff colors

### Test 8: Unknown Language Handling

1. Create a file with unusual extension (e.g., `.xyz`)
2. Make changes and open diff review panel
3. Verify:
   - [ ] No JavaScript errors in console
   - [ ] Code displays as plain text (no highlighting)
   - [ ] Console shows informative message about unknown language

### Test 9: Large Diff Performance

1. Open a diff with many changes (100+ lines)
2. Verify:
   - [ ] Panel opens without significant delay
   - [ ] No browser freezing or lag
   - [ ] Scrolling is smooth

### Test 10: CSP Compliance

1. Open browser dev tools (Help > Toggle Developer Tools)
2. Check Console tab
3. Verify:
   - [ ] No CSP violation errors
   - [ ] No "blocked by Content Security Policy" messages
   - [ ] Prism.js loads successfully

### Test 11: Bundle Size Verification

1. Check the size of vendor files:
```bash
ls -la vscode-extension/media/vendor/
```

2. Verify:
   - [ ] `prism.min.js` is under 100KB
   - [ ] Total vendor size is reasonable (~175KB with diff2html)

## Edge Cases to Test

### Multi-line Strings
```typescript
const template = `
  This is a
  multi-line string
`;
```
- Each line may highlight independently (acceptable limitation)

### Nested Language (HTML in JS)
```javascript
const html = '<div class="test">Hello</div>';
```
- HTML inside strings won't be highlighted (acceptable)

### Very Long Lines
- Verify no horizontal scroll issues
- Verify tokens don't break mid-word

## Post-Implementation

Document any issues found and their resolutions:

### Issues Found
_List any issues discovered during testing_

### Workarounds Applied
_List any workarounds needed_

### Known Limitations
_List acceptable limitations_

## Acceptance Criteria

- [ ] All 11 tests pass
- [ ] No CSP violations
- [ ] No JavaScript errors
- [ ] Performance is acceptable
- [ ] Theme switching works

## Final Verification

1. Compile the extension: `npm run compile`
2. Package the extension: `npm run package` (if applicable)
3. Verify the package includes all Prism files

## Notes

- Some edge cases (multi-line strings across diff chunks) may not highlight perfectly - this is acceptable
- If issues are found, they can be addressed in follow-up tasks
- Document any limitations in the task README
