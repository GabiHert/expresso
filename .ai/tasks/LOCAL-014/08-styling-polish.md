---
type: work-item
id: "08"
parent: LOCAL-014
title: Styling and polish
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

> Parent: [[LOCAL-014]]


# Styling and Polish

## Objective

Final polish pass on the diff review experience:
- Ensure styles match VSCode themes perfectly
- Add keyboard shortcuts
- Improve accessibility
- Handle edge cases gracefully
- Add loading states and error handling

## Pre-Implementation

- Complete WI-03 through WI-07 (all functionality working)
- Test in multiple themes (light, dark, high contrast)

## Implementation Steps

### Step 1: Theme Synchronization

**File**: `vscode-extension/media/diff-review.css`

Use VSCode CSS variables consistently:

```css
/* Theme-aware color scheme */
:root {
  /* Backgrounds */
  --diff-bg: var(--vscode-editor-background);
  --diff-gutter-bg: var(--vscode-editorGutter-background, var(--vscode-editor-background));
  --toolbar-bg: var(--vscode-editorWidget-background);

  /* Text */
  --text-primary: var(--vscode-editor-foreground);
  --text-secondary: var(--vscode-descriptionForeground);
  --text-link: var(--vscode-textLink-foreground);

  /* Diff colors */
  --diff-add-bg: var(--vscode-diffEditor-insertedTextBackground, rgba(35, 134, 54, 0.2));
  --diff-add-highlight: var(--vscode-diffEditor-insertedLineBackground, rgba(35, 134, 54, 0.3));
  --diff-del-bg: var(--vscode-diffEditor-removedTextBackground, rgba(248, 81, 73, 0.2));
  --diff-del-highlight: var(--vscode-diffEditor-removedLineBackground, rgba(248, 81, 73, 0.3));

  /* Interactive */
  --button-bg: var(--vscode-button-background);
  --button-fg: var(--vscode-button-foreground);
  --button-hover: var(--vscode-button-hoverBackground);
  --input-bg: var(--vscode-input-background);
  --input-border: var(--vscode-input-border);
  --focus-border: var(--vscode-focusBorder);

  /* Status */
  --success: var(--vscode-gitDecoration-addedResourceForeground, #3fb950);
  --warning: var(--vscode-gitDecoration-modifiedResourceForeground, #d29922);
  --error: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
}

/* Override diff2html with VSCode colors */
.d2h-wrapper {
  background: var(--diff-bg) !important;
  color: var(--text-primary) !important;
}

.d2h-file-header {
  background: var(--toolbar-bg) !important;
  border-color: var(--vscode-panel-border) !important;
}

.d2h-code-line-ctn {
  background: var(--diff-bg) !important;
}

.d2h-ins {
  background: var(--diff-add-bg) !important;
}

.d2h-ins.d2h-change {
  background: var(--diff-add-highlight) !important;
}

.d2h-del {
  background: var(--diff-del-bg) !important;
}

.d2h-del.d2h-change {
  background: var(--diff-del-highlight) !important;
}

.d2h-code-linenumber {
  background: var(--diff-gutter-bg) !important;
  color: var(--text-secondary) !important;
  border-color: var(--vscode-panel-border) !important;
}

/* High contrast mode */
.vscode-high-contrast .d2h-ins {
  border-left: 2px solid var(--success);
}

.vscode-high-contrast .d2h-del {
  border-left: 2px solid var(--error);
}
```

### Step 2: Add Keyboard Shortcuts

**File**: `vscode-extension/media/diff-review.js`

```javascript
// Global keyboard handler
document.addEventListener('keydown', (e) => {
  // Navigate between comments: j/k or n/p
  if (e.key === 'j' || e.key === 'n') {
    navigateToNextComment();
  } else if (e.key === 'k' || e.key === 'p') {
    navigateToPreviousComment();
  }

  // Add comment on current line: c
  if (e.key === 'c' && !isInputFocused()) {
    const focusedLine = document.querySelector('.d2h-code-line:hover, .d2h-code-line:focus');
    if (focusedLine) {
      triggerAddComment(focusedLine);
    }
  }

  // Resolve focused comment: r
  if (e.key === 'r' && !isInputFocused()) {
    const focusedComment = document.querySelector('.comment:focus, .comment:hover');
    if (focusedComment) {
      const resolveBtn = focusedComment.querySelector('.resolve-btn');
      resolveBtn?.click();
    }
  }
});

function isInputFocused() {
  const active = document.activeElement;
  return active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT';
}

let currentCommentIndex = -1;

function navigateToNextComment() {
  const comments = document.querySelectorAll('.comment-thread .comment');
  if (comments.length === 0) return;

  currentCommentIndex = (currentCommentIndex + 1) % comments.length;
  comments[currentCommentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  comments[currentCommentIndex].focus();
}

function navigateToPreviousComment() {
  const comments = document.querySelectorAll('.comment-thread .comment');
  if (comments.length === 0) return;

  currentCommentIndex = currentCommentIndex <= 0 ? comments.length - 1 : currentCommentIndex - 1;
  comments[currentCommentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  comments[currentCommentIndex].focus();
}
```

### Step 3: Add Loading States

**File**: `vscode-extension/media/diff-review.js`

```javascript
function showLoading() {
  const container = document.getElementById('diff-container');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading diff...</p>
    </div>
  `;
}

function showError(message) {
  const container = document.getElementById('diff-container');
  container.innerHTML = `
    <div class="error-state">
      <span class="codicon codicon-error"></span>
      <p>${escapeHtml(message)}</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  `;
}

function showEmpty() {
  const container = document.getElementById('diff-container');
  container.innerHTML = `
    <div class="empty-state">
      <span class="codicon codicon-check"></span>
      <p>No changes to review</p>
    </div>
  `;
}
```

**File**: `vscode-extension/media/diff-review.css`

```css
/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--vscode-panel-border);
  border-top-color: var(--button-bg);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  color: var(--error);
}

.error-state button {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--button-bg);
  color: var(--button-fg);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  color: var(--success);
}

.empty-state .codicon {
  font-size: 32px;
  margin-bottom: 8px;
}
```

### Step 4: Accessibility Improvements

**File**: `vscode-extension/media/diff-review.js`

```javascript
// Add ARIA labels
function setupAccessibility() {
  // Label the diff container
  const container = document.getElementById('diff-container');
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Code diff viewer');

  // Make comments focusable
  document.querySelectorAll('.comment').forEach(comment => {
    comment.setAttribute('tabindex', '0');
    comment.setAttribute('role', 'article');
  });

  // Add aria-live for updates
  const statusRegion = document.createElement('div');
  statusRegion.setAttribute('role', 'status');
  statusRegion.setAttribute('aria-live', 'polite');
  statusRegion.className = 'sr-only';
  statusRegion.id = 'status-announcer';
  document.body.appendChild(statusRegion);
}

function announceStatus(message) {
  const announcer = document.getElementById('status-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

// Call when comment is added
function onCommentAdded(comment) {
  announceStatus(`Comment added on line ${comment.line}`);
}

// Call when comment is resolved
function onCommentResolved(comment) {
  announceStatus(`Comment resolved on line ${comment.line}`);
}
```

**File**: `vscode-extension/media/diff-review.css`

```css
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus indicators */
.comment:focus {
  outline: 2px solid var(--focus-border);
  outline-offset: 2px;
}

.add-comment-btn:focus {
  outline: 2px solid var(--focus-border);
  opacity: 1;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }

  * {
    transition-duration: 0.01ms !important;
  }
}
```

### Step 5: Toolbar Enhancements

**File**: `vscode-extension/media/diff-review.js`

Add toolbar with controls:

```javascript
function renderToolbar(data) {
  const toolbar = document.getElementById('toolbar');
  toolbar.innerHTML = `
    <div class="toolbar-left">
      <span class="filename">${escapeHtml(data.filePath)}</span>
      <span class="stats">
        <span class="additions">+${data.additions || 0}</span>
        <span class="deletions">-${data.deletions || 0}</span>
      </span>
    </div>
    <div class="toolbar-right">
      <button class="toolbar-btn" id="toggle-view" title="Toggle side-by-side/unified">
        <span class="codicon codicon-split-horizontal"></span>
      </button>
      <button class="toolbar-btn" id="collapse-comments" title="Collapse all comments">
        <span class="codicon codicon-fold"></span>
      </button>
      <span class="comment-count">
        💬 <span id="open-comment-count">0</span> open
      </span>
    </div>
  `;

  // Toggle view button
  document.getElementById('toggle-view').addEventListener('click', () => {
    toggleViewMode();
  });

  // Collapse comments
  document.getElementById('collapse-comments').addEventListener('click', () => {
    toggleCommentsCollapsed();
  });
}

let viewMode = 'side-by-side';

function toggleViewMode() {
  viewMode = viewMode === 'side-by-side' ? 'line-by-line' : 'side-by-side';
  // Re-render diff with new mode
  vscode.postMessage({ type: 'requestRefresh', viewMode });
}

let commentsCollapsed = false;

function toggleCommentsCollapsed() {
  commentsCollapsed = !commentsCollapsed;
  document.querySelectorAll('.comment-thread').forEach(thread => {
    thread.classList.toggle('collapsed', commentsCollapsed);
  });
}
```

### Step 6: Final CSS Polish

**File**: `vscode-extension/media/diff-review.css`

```css
/* Toolbar */
#toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
}

.toolbar-btn:hover {
  background: var(--vscode-list-hoverBackground);
  color: var(--text-primary);
}

.comment-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Collapsed comments */
.comment-thread.collapsed .comment-body,
.comment-thread.collapsed .comment-actions {
  display: none;
}

.comment-thread.collapsed::after {
  content: '...';
  color: var(--text-secondary);
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Selection styling */
::selection {
  background: var(--vscode-editor-selectionBackground);
}
```

## Acceptance Criteria

- [ ] Colors match VSCode theme in light, dark, and high contrast
- [ ] Keyboard shortcuts work (j/k for navigation, c for comment, r for resolve)
- [ ] Loading spinner shown while diff renders
- [ ] Error state shown on failures
- [ ] Empty state shown when no changes
- [ ] Screen reader compatible (ARIA labels, live regions)
- [ ] Focus indicators visible
- [ ] Reduced motion respected
- [ ] Toolbar shows file stats and controls
- [ ] View mode toggle works (side-by-side / line-by-line)
- [ ] Comments can be collapsed

## Testing

1. Test in Light+, Dark+, High Contrast themes
2. Navigate with keyboard only
3. Use screen reader to verify announcements
4. Enable "Reduce Motion" system preference
5. Test loading/error/empty states
6. Toggle view mode and collapse comments

## Notes

- This is the final polish pass - focus on details
- May require iteration based on user feedback
- Consider gathering feedback before finalizing
