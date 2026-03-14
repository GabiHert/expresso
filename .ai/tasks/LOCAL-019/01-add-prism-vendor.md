---
type: work-item
id: "01"
parent: LOCAL-019
title: Add Prism.js vendor files
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-019]]


# Add Prism.js Vendor Files

## Objective

Add the Prism.js syntax highlighting library to the extension's vendor directory, bundled with commonly-used programming languages.

## Pre-Implementation

Review the current vendor setup:
- `media/vendor/diff2html.min.js` - existing pattern to follow
- `media/vendor/diff2html.min.css` - CSS placement pattern

## Implementation Steps

### Step 1: Download Prism.js Bundle

**Option A: Download from Prism website (Recommended)**

Go to https://prismjs.com/download.html and select:

**Compression:** Minified

**Themes:** None (we'll create custom VSCode theme)

**Languages to include:**
- Core (always included)
- Markup (HTML)
- CSS
- JavaScript
- TypeScript
- JSX
- TSX
- Python
- Go
- Rust
- Java
- C
- C++
- C#
- PHP
- Ruby
- Bash
- JSON
- YAML
- Markdown
- SQL
- Docker
- Makefile

Download and save to `media/vendor/prism.min.js`

**Option B: Use CDN URL directly**

If vendor approach causes issues, can load from CDN (but requires CSP changes):
```
https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js
```

### Step 2: Verify File Placement

**File**: `vscode-extension/media/vendor/prism.min.js`

Expected structure after:
```
media/
├── vendor/
│   ├── diff2html.min.js
│   ├── diff2html.min.css
│   └── prism.min.js          ← NEW
├── diff-review.js
└── diff-review.css
```

### Step 3: Verify Bundle Size

Check that the minified bundle is reasonable:
- Target: ~30-50 KB for selected languages
- If larger than 100KB, consider removing less common languages

```bash
ls -la media/vendor/prism.min.js
```

## Post-Implementation

Verify the file loads without errors by checking the browser console when the diff review panel is opened (in next work items).

## Acceptance Criteria

- [ ] `prism.min.js` exists in `media/vendor/`
- [ ] File includes TypeScript, JavaScript, Python, Go, JSON at minimum
- [ ] Bundle size is under 100KB
- [ ] No syntax errors in the file

## Testing

Open the file in a text editor and verify:
1. It starts with `/* PrismJS ...` comment
2. It's minified (single line or few lines)
3. Search for `typescript` to verify TypeScript is included

## Notes

- We're NOT including any Prism CSS themes - we'll create our own VSCode-compatible theme in work item 02
- The bundle should be self-contained with no external dependencies
- Prism is CSP-safe and works with nonce-based script loading
