<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 12-fix-xss-comment-rendering.md                       ║
║ TASK: LOCAL-014                                                  ║
║ SEVERITY: IMPORTANT (Security)                                   ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Fix XSS Vulnerability in Comment Rendering

## Objective

Fix potential XSS vulnerability where comment IDs could break out of HTML attributes.

## File

`vscode-extension/media/diff-review.js` lines 388-405

## Problem

The `escapeHtml()` function uses `div.textContent = text; return div.innerHTML` which doesn't properly escape attribute contexts. An ID like `" onclick="alert(1)"` could break out of the `data-id` attribute.

## Implementation

Use DOM API instead of innerHTML for creating comment elements:

```javascript
function renderComments(commentList) {
  cleanupCommentHandlers();

  document.querySelectorAll('.comment-thread').forEach(el => {
    el.closest('.comment-row')?.remove();
  });

  if (!commentList || commentList.length === 0) return;

  const byLine = {};
  commentList.forEach(comment => {
    const key = `${comment.line}`;
    if (!byLine[key]) byLine[key] = [];
    byLine[key].push(comment);
  });

  Object.entries(byLine).forEach(([lineStr, lineComments]) => {
    const lineNum = parseInt(lineStr, 10);
    const lineEl = findLineElement(lineNum);
    if (!lineEl) return;

    const thread = document.createElement('div');
    thread.className = 'comment-thread';

    lineComments.forEach(c => {
      const commentEl = document.createElement('div');
      commentEl.className = `comment ${c.status}`;
      commentEl.dataset.id = c.id; // Safe - DOM API escapes automatically

      const header = document.createElement('div');
      header.className = 'comment-header';
      // ... build rest with DOM API

      thread.appendChild(commentEl);
    });

    // Insert into DOM
    const row = lineEl.closest('tr');
    if (row && row.parentNode) {
      const wrapper = document.createElement('tr');
      wrapper.className = 'comment-row';
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(thread);
      wrapper.appendChild(td);
      row.parentNode.insertBefore(wrapper, row.nextSibling);
    }
  });

  setupCommentAccessibility();
}
```

## Acceptance Criteria

- [ ] Replace innerHTML with DOM API for comment creation
- [ ] Use `element.dataset.id` instead of template strings
- [ ] Use `element.textContent` for text content
- [ ] Test with malicious comment IDs (e.g., `" onclick="alert(1)"`)
- [ ] No XSS possible through comment data
