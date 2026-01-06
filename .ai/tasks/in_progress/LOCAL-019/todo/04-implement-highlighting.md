<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-implement-highlighting.md                         ║
║ TASK: LOCAL-019                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Implement Syntax Highlighting in diff-review.js

## Objective

Add Prism.js syntax highlighting to the diff-review.js webview script, highlighting code lines after diff2html renders them.

## Pre-Implementation

Review the current diff rendering flow:
- `diff-review.js:84-153` - `renderDiff()` function
- `diff-review.js:111-119` - `Diff2Html.html()` call and innerHTML assignment

## Implementation Steps

### Step 1: Add Language Detection Function

**File**: `vscode-extension/media/diff-review.js`

Add this function near the top of the IIFE (after line 30):

```javascript
/**
 * Detect programming language from file path
 * @param {string} filePath - Path to the file
 * @returns {string|null} - Prism language identifier or null
 */
function detectLanguage(filePath) {
  if (!filePath) return null;

  const ext = filePath.split('.').pop()?.toLowerCase();
  const filename = filePath.split('/').pop()?.toLowerCase();

  // Handle special filenames first
  const filenameMap = {
    'dockerfile': 'docker',
    'makefile': 'makefile',
    'gemfile': 'ruby',
    'rakefile': 'ruby',
    '.bashrc': 'bash',
    '.zshrc': 'bash',
    '.gitignore': 'git',
  };

  if (filenameMap[filename]) {
    return filenameMap[filename];
  }

  // Map extensions to Prism language identifiers
  const extensionMap = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',

    // Data formats
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'toml': 'toml',

    // Python
    'py': 'python',
    'pyw': 'python',
    'pyx': 'python',

    // Go
    'go': 'go',

    // Rust
    'rs': 'rust',

    // Java/JVM
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'groovy': 'groovy',

    // C family
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'cs': 'csharp',

    // Other languages
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'r': 'r',
    'lua': 'lua',
    'pl': 'perl',
    'pm': 'perl',

    // Shell
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'ps1': 'powershell',

    // Database
    'sql': 'sql',

    // Documentation
    'md': 'markdown',
    'markdown': 'markdown',
    'rst': 'rest',

    // Config
    'ini': 'ini',
    'conf': 'ini',
    'cfg': 'ini',
    'env': 'bash',

    // Docker/DevOps
    'dockerfile': 'docker',
  };

  return extensionMap[ext] || null;
}
```

### Step 2: Add Syntax Highlighting Function

Add this function after `detectLanguage`:

```javascript
/**
 * Apply Prism.js syntax highlighting to diff code lines
 * @param {string} filePath - Path to determine language
 */
function highlightDiffCode(filePath) {
  // Check if Prism is available
  if (typeof Prism === 'undefined') {
    console.warn('Prism.js not loaded, skipping syntax highlighting');
    return;
  }

  const language = detectLanguage(filePath);
  if (!language) {
    console.log('Unknown language for file:', filePath);
    return;
  }

  // Check if Prism has the grammar for this language
  if (!Prism.languages[language]) {
    console.warn(`Prism language not available: ${language}`);
    return;
  }

  // Select all code content elements from diff2html
  const codeLines = document.querySelectorAll('.d2h-code-line-ctn');

  codeLines.forEach(el => {
    const code = el.textContent;

    // Skip empty lines or lines with only whitespace
    if (!code || !code.trim()) {
      return;
    }

    try {
      // Highlight the code using Prism
      const highlighted = Prism.highlight(
        code,
        Prism.languages[language],
        language
      );

      // Replace innerHTML with highlighted version
      el.innerHTML = highlighted;
    } catch (error) {
      // If highlighting fails for a line, leave it as-is
      console.warn('Failed to highlight line:', error);
    }
  });

  console.log(`Syntax highlighting applied: ${language}`);
}
```

### Step 3: Call Highlighting After Diff Render

**File**: `vscode-extension/media/diff-review.js`

In the `renderDiff()` function, add a call to `highlightDiffCode()` after the diff is rendered.

Find this section (around line 119):

```javascript
container.innerHTML = diffHtml;

// Calculate and update stats
const additions = (data.unifiedDiff.match(/^\+[^+]/gm) || []).length;
```

Add the highlighting call after setting innerHTML:

```javascript
container.innerHTML = diffHtml;

// Apply syntax highlighting to code lines
highlightDiffCode(data.filePath);

// Calculate and update stats
const additions = (data.unifiedDiff.match(/^\+[^+]/gm) || []).length;
```

### Step 4: Handle Theme Changes

When the VSCode theme changes, the CSS variables update automatically, but if you want to re-highlight (optional for edge cases), you can add this to the `updateTheme` function:

```javascript
function updateTheme(theme) {
  document.body.className = theme;
  const container = document.getElementById('diff-container');
  if (container) {
    if (theme === 'dark') {
      container.classList.add('d2h-dark-color-scheme');
    } else {
      container.classList.remove('d2h-dark-color-scheme');
    }
  }
  // Note: Prism tokens use CSS variables, so colors update automatically
  // No need to re-highlight unless there are issues
}
```

## Post-Implementation

Test the highlighting in the extension:
1. Reload the extension window
2. Open a diff review panel for a TypeScript file
3. Verify code has colored tokens

## Acceptance Criteria

- [ ] `detectLanguage()` function correctly maps common extensions
- [ ] `highlightDiffCode()` function applies Prism highlighting
- [ ] Highlighting is called after diff2html renders
- [ ] Empty lines and unknown languages are handled gracefully
- [ ] Console logs help with debugging

## Testing

1. Open diff for `.ts` file - verify TypeScript keywords are blue
2. Open diff for `.py` file - verify Python keywords are colored
3. Open diff for `.json` file - verify JSON keys/values are colored
4. Open diff for unknown extension - verify no errors, plain text shown
5. Check console for any errors

## Notes

- Each line is highlighted independently - multi-line strings may not look perfect
- Prism.highlight() is synchronous and fast for typical diff sizes
- For very large diffs (1000+ lines), consider using requestIdleCallback
- The `filePath` comes from `data.filePath` in the message from extension
