---
type: work-item
id: "05"
parent: LOCAL-014
title: Comment UI overlay system
status: done
repo: vscode-extension
tags:
  - work-item
  - done
  - vscode-extension
---

# Comment UI Overlay System

## Objective

Build the GitHub-style comment UI that appears when users interact with diff lines:
- Hover over line → Show "+" button
- Click "+" → Show comment input form
- Submit → Display comment inline
- Existing comments → Show as threads below relevant lines

## Pre-Implementation

- Complete WI-03 (webview scaffold)
- Complete WI-04 (diff2html integration)
- Study GitHub's PR comment UX for reference

## Implementation Steps

### Step 1: Add Comment Button on Hover

**File**: `vscode-extension/media/diff-review.js`

```javascript
function setupLineHandlers() {
  // Find all diff lines
  const lines = document.querySelectorAll('.d2h-code-linenumber');

  lines.forEach(lineEl => {
    // Create add comment button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-comment-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add comment';

    // Position relative to line
    lineEl.style.position = 'relative';
    lineEl.appendChild(addBtn);

    // Show on hover
    lineEl.addEventListener('mouseenter', () => {
      addBtn.classList.add('visible');
    });

    lineEl.addEventListener('mouseleave', () => {
      if (!addBtn.classList.contains('active')) {
        addBtn.classList.remove('visible');
      }
    });

    // Handle click
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lineNum = parseInt(lineEl.textContent.trim(), 10);
      const filePath = getCurrentFilePath();
      showCommentInput(lineEl, filePath, lineNum);
    });
  });
}

function getCurrentFilePath() {
  // Get from toolbar or stored state
  return document.getElementById('filename').textContent;
}
```

### Step 2: Comment Input Form

**File**: `vscode-extension/media/diff-review.js`

```javascript
function showCommentInput(lineEl, filePath, lineNum) {
  // Remove any existing input
  const existing = document.querySelector('.comment-input-form');
  if (existing) existing.remove();

  // Create input form
  const form = document.createElement('div');
  form.className = 'comment-input-form';
  form.innerHTML = `
    <div class="comment-input-header">
      <span>Comment on line ${lineNum}</span>
      <button class="close-btn" title="Cancel">&times;</button>
    </div>
    <textarea placeholder="Add your comment..." rows="3"></textarea>
    <div class="comment-input-actions">
      <button class="cancel-btn">Cancel</button>
      <button class="submit-btn">Add Comment</button>
    </div>
  `;

  // Insert after the line's row
  const row = lineEl.closest('tr') || lineEl.closest('.d2h-code-line-ctn');
  if (row) {
    const wrapper = document.createElement('tr');
    wrapper.className = 'comment-row';
    const td = document.createElement('td');
    td.colSpan = 4;
    td.appendChild(form);
    wrapper.appendChild(td);
    row.parentNode.insertBefore(wrapper, row.nextSibling);
  }

  // Focus textarea
  const textarea = form.querySelector('textarea');
  textarea.focus();

  // Handle cancel
  form.querySelector('.close-btn').addEventListener('click', () => {
    form.closest('.comment-row')?.remove();
  });
  form.querySelector('.cancel-btn').addEventListener('click', () => {
    form.closest('.comment-row')?.remove();
  });

  // Handle submit
  form.querySelector('.submit-btn').addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) {
      vscode.postMessage({
        type: 'addComment',
        filePath,
        line: lineNum,
        text
      });
      form.closest('.comment-row')?.remove();
    }
  });

  // Handle Cmd/Ctrl+Enter to submit
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      form.querySelector('.submit-btn').click();
    }
    if (e.key === 'Escape') {
      form.closest('.comment-row')?.remove();
    }
  });
}
```

### Step 3: Display Existing Comments

**File**: `vscode-extension/media/diff-review.js`

```javascript
function updateComments(comments) {
  // Remove existing comment displays
  document.querySelectorAll('.comment-thread').forEach(el => el.remove());

  // Group comments by line
  const byLine = {};
  comments.forEach(comment => {
    const key = `${comment.filePath}:${comment.line}`;
    if (!byLine[key]) byLine[key] = [];
    byLine[key].push(comment);
  });

  // Insert comment threads
  Object.entries(byLine).forEach(([key, lineComments]) => {
    const [filePath, lineStr] = key.split(':');
    const lineNum = parseInt(lineStr, 10);

    // Find the line element
    const lineEl = findLineElement(lineNum);
    if (!lineEl) return;

    // Create comment thread
    const thread = document.createElement('div');
    thread.className = 'comment-thread';
    thread.innerHTML = lineComments.map(c => `
      <div class="comment ${c.status}" data-id="${c.id}">
        <div class="comment-header">
          <span class="comment-location">Line ${c.line}</span>
          <span class="comment-time">${formatTime(c.createdAt)}</span>
        </div>
        <div class="comment-body ${c.status === 'resolved' ? 'resolved' : ''}">
          ${escapeHtml(c.text)}
        </div>
        <div class="comment-actions">
          ${c.status === 'open' ? `
            <button class="resolve-btn" data-id="${c.id}">Resolve</button>
          ` : `
            <span class="resolved-badge">Resolved</span>
          `}
        </div>
      </div>
    `).join('');

    // Insert after line
    const row = lineEl.closest('tr');
    if (row) {
      const wrapper = document.createElement('tr');
      wrapper.className = 'comment-row';
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(thread);
      wrapper.appendChild(td);
      row.parentNode.insertBefore(wrapper, row.nextSibling);
    }

    // Attach resolve handlers
    thread.querySelectorAll('.resolve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        vscode.postMessage({
          type: 'resolveComment',
          id: btn.dataset.id
        });
      });
    });
  });
}

function findLineElement(lineNum) {
  // Find line number element in diff2html output
  const lineNumbers = document.querySelectorAll('.d2h-code-linenumber');
  for (const el of lineNumbers) {
    if (parseInt(el.textContent.trim(), 10) === lineNum) {
      return el;
    }
  }
  return null;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

### Step 4: Add CSS Styles

**File**: `vscode-extension/media/diff-review.css`

```css
/* Add comment button */
.add-comment-btn {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--vscode-button-border, transparent);
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.add-comment-btn.visible,
.add-comment-btn:focus {
  opacity: 1;
}

.add-comment-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

/* Comment input form */
.comment-input-form {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 16px;
}

.comment-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.comment-input-form textarea {
  width: 100%;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  padding: 8px;
  font-family: var(--vscode-font-family);
  font-size: 13px;
  resize: vertical;
}

.comment-input-form textarea:focus {
  outline: 1px solid var(--vscode-focusBorder);
}

.comment-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.comment-input-actions button {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder));
  color: var(--vscode-foreground);
}

.submit-btn {
  background: var(--vscode-button-background);
  border: none;
  color: var(--vscode-button-foreground);
}

.submit-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.close-btn {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 18px;
  padding: 0;
}

/* Comment thread display */
.comment-thread {
  background: var(--vscode-editor-background);
  border-left: 3px solid var(--vscode-activityBarBadge-background);
  margin: 8px 16px;
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
}

.comment {
  padding: 8px 0;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.comment:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 4px;
}

.comment-body {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.comment-body.resolved {
  text-decoration: line-through;
  opacity: 0.6;
}

.comment-actions {
  margin-top: 8px;
}

.resolve-btn {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder));
  color: var(--vscode-foreground);
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.resolve-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.resolved-badge {
  font-size: 11px;
  color: var(--vscode-gitDecoration-addedResourceForeground);
}

/* Comment row in table */
.comment-row td {
  padding: 0 !important;
  background: transparent !important;
}
```

## Acceptance Criteria

- [ ] "+" button appears on line hover
- [ ] Clicking "+" opens comment input form
- [ ] Comment input supports Cmd/Ctrl+Enter to submit
- [ ] Escape key cancels comment
- [ ] Submitted comments trigger message to extension
- [ ] Existing comments render as threads below lines
- [ ] Resolve button marks comment as resolved
- [ ] Resolved comments show strikethrough
- [ ] UI matches VSCode theme

## Testing

1. Hover over diff line - verify "+" appears
2. Click "+" - verify input form opens
3. Type comment and submit - verify message sent
4. Press Escape - verify form closes
5. Mock existing comments - verify they render
6. Click resolve - verify message sent
7. Test in light and dark themes

## Notes

- Comment display will be connected to real data in WI-06
- Line range selection (drag to select multiple lines) is a future enhancement
- Consider adding keyboard navigation between comments
