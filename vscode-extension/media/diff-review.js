/**
 * Diff Review Panel - Webview Script
 * Handles diff rendering and comment interactions using diff2html
 */
(function() {
  'use strict';

  console.log('[DEBUG] diff-review.js starting execution');
  console.log('[DEBUG] Prism available at script start:', typeof Prism !== 'undefined');

  // Get VSCode API
  const vscode = acquireVsCodeApi();

  // State
  let currentData = null;
  let comments = [];

  // Restore previous state if available
  const previousState = vscode.getState();
  if (previousState) {
    currentData = previousState.currentData || null;
    comments = previousState.comments || [];
  }

  /**
   * Save current state for persistence
   */
  function saveState() {
    vscode.setState({
      currentData,
      comments,
      scrollPosition: window.scrollY
    });
  }

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

  /**
   * Apply Prism.js syntax highlighting to diff code lines
   * @param {string} filePath - Path to determine language
   */
  function highlightDiffCode(filePath) {
    console.log('[DEBUG] highlightDiffCode called');
    console.log('[DEBUG] filePath:', filePath);
    console.log('[DEBUG] Prism available:', typeof Prism !== 'undefined');

    // Check if Prism is available
    if (typeof Prism === 'undefined') {
      console.warn('Prism.js not loaded, skipping syntax highlighting');
      return;
    }

    const language = detectLanguage(filePath);
    console.log('[DEBUG] Detected language:', language);

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
    console.log('[DEBUG] Found code lines:', codeLines.length);

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

        // Validate Prism output before using
        if (!highlighted || typeof highlighted !== 'string') {
          throw new Error(`Prism.highlight returned invalid output: got ${typeof highlighted}`);
        }

        // Additional safety: Validate HTML structure
        const temp = document.createElement('div');
        temp.innerHTML = highlighted;

        // Verify only safe elements exist (spans with class attributes)
        const unsafeElements = temp.querySelectorAll(':not(span)');
        if (unsafeElements.length > 0) {
          console.warn('Prism output contained unexpected elements, using plain text');
          el.textContent = code;
          return;
        }

        // Replace innerHTML with validated highlighted version
        el.innerHTML = highlighted;
      } catch (error) {
        // If highlighting fails for a line, preserve original text
        console.warn('Failed to highlight line:', error);
        el.textContent = code;
      }
    });

    console.log(`Syntax highlighting applied: ${language}`);
  }

  // Notify extension we're ready
  vscode.postMessage({ type: 'ready' });

  /**
   * Show loading state
   */
  function showLoading() {
    const container = document.getElementById('diff-container');
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading diff...</p>
      </div>
    `;
  }

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
      case 'loadDiff':
        showLoading();
        currentData = message.data;
        console.log('[DEBUG] loadDiff message received');
        // Wait for Prism to load before rendering to ensure syntax highlighting works
        function renderWhenReady() {
          console.log('[DEBUG] renderWhenReady - Prism available:', typeof Prism !== 'undefined');
          if (typeof Prism !== 'undefined') {
            console.log('[DEBUG] Prism loaded, rendering diff');
            renderDiff(message.data);
            saveState();
          } else {
            // Prism not loaded yet, retry after a short delay
            console.log('[DEBUG] Prism not ready, polling again in 50ms');
            setTimeout(renderWhenReady, 50);
          }
        }
        renderWhenReady();
        break;
      case 'themeChanged':
        updateTheme(message.theme);
        break;
      case 'updateComments':
        comments = message.comments || [];
        renderComments(comments);
        saveState();
        break;
    }
  });

  // Restore scroll position after content loads
  if (previousState && previousState.scrollPosition) {
    requestAnimationFrame(() => {
      window.scrollTo(0, previousState.scrollPosition);
    });
  }

  /**
   * Render the diff content using diff2html
   */
  function renderDiff(data) {
    console.log('[DEBUG] renderDiff called');
    console.log('[DEBUG] data.filePath:', data.filePath);
    const container = document.getElementById('diff-container');

    // Clean up old event handlers before re-rendering
    cleanupLineHandlers();

    if (!data.unifiedDiff || data.unifiedDiff.trim() === '') {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📄</div>
          <p>No changes to display</p>
        </div>
      `;
      updateStats(0, 0);
      return;
    }

    // Check if diff2html is available
    if (typeof Diff2Html === 'undefined') {
      container.innerHTML = `
        <div class="error-state">
          <p>Error: diff2html library not loaded</p>
        </div>
      `;
      return;
    }

    try {
      // Use diff2html to render
      const diffHtml = Diff2Html.html(data.unifiedDiff, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: 'side-by-side'
      });

      container.innerHTML = diffHtml;

      // Apply syntax highlighting to code lines
      // DOM is settled immediately after synchronous innerHTML assignment
      console.log('[DEBUG] About to call highlightDiffCode from renderDiff');
      highlightDiffCode(data.filePath);
      console.log('[DEBUG] highlightDiffCode returned');

      // Calculate and update stats
      const additions = (data.unifiedDiff.match(/^\+[^+]/gm) || []).length;
      const deletions = (data.unifiedDiff.match(/^-[^-]/gm) || []).length;
      updateStats(additions, deletions);

      // Setup line hover handlers for comments
      setupLineHandlers();

      // Apply current theme
      const isDark = document.body.classList.contains('vscode-dark') ||
                     document.body.classList.contains('dark');
      if (isDark) {
        container.classList.add('d2h-dark-color-scheme');
      }

      // Render existing comments after diff is rendered
      if (comments.length > 0) {
        renderComments(comments);
      }
    } catch (error) {
      console.error('Failed to render diff:', error);
      container.innerHTML = `
        <div class="error-state">
          <p>Error rendering diff: ${escapeHtml(error.message)}</p>
          <details>
            <summary>Show raw diff</summary>
            <pre>${escapeHtml(data.unifiedDiff)}</pre>
          </details>
        </div>
      `;
      updateStats(0, 0);
    }
  }

  /**
   * Update stats display
   */
  function updateStats(additions, deletions) {
    const statsEl = document.getElementById('stats');
    if (statsEl) {
      statsEl.innerHTML = `<span class="additions">+${additions}</span> <span class="deletions">-${deletions}</span>`;
    }
  }

  // Track elements with attached handlers for cleanup
  let attachedButtons = [];
  let attachedCommentButtons = [];
  let currentFormCleanup = null;

  /**
   * Clean up line handlers before re-rendering
   */
  function cleanupLineHandlers() {
    attachedButtons.forEach(btn => {
      btn.removeEventListener('click', btn._clickHandler);
    });
    attachedButtons = [];
  }

  /**
   * Clean up comment button handlers before re-rendering comments
   */
  function cleanupCommentHandlers() {
    attachedCommentButtons.forEach(btn => {
      btn.removeEventListener('click', btn._clickHandler);
    });
    attachedCommentButtons = [];
  }

  /**
   * Setup line click handlers for adding comments
   */
  function setupLineHandlers() {
    // Target both line-by-line and side-by-side line number elements
    const lineNumbers = document.querySelectorAll('.d2h-code-linenumber, .d2h-code-side-linenumber');

    lineNumbers.forEach(lineEl => {
      // Skip empty line numbers
      const lineText = lineEl.textContent.trim();
      if (!lineText) return;

      // Create add comment button
      const addBtn = document.createElement('button');
      addBtn.className = 'add-comment-btn';
      addBtn.innerHTML = '+';
      addBtn.title = 'Add comment';
      addBtn.setAttribute('aria-label', `Add comment to line ${lineText}`);

      // Position relative to line (CSS handles hover visibility)
      lineEl.style.position = 'relative';
      lineEl.appendChild(addBtn);

      // Handle click
      const clickHandler = (e) => {
        e.stopPropagation();
        const lineNum = parseInt(lineEl.textContent.trim(), 10);
        if (isNaN(lineNum)) return;

        const filePath = getCurrentFilePath();
        addBtn.classList.add('active');
        showCommentInput(lineEl, filePath, lineNum, () => {
          addBtn.classList.remove('active');
        });
      };

      addBtn.addEventListener('click', clickHandler);
      addBtn._clickHandler = clickHandler;
      attachedButtons.push(addBtn);
    });
  }

  /**
   * Get current file path from toolbar
   */
  function getCurrentFilePath() {
    return document.getElementById('filename')?.textContent || '';
  }

  /**
   * Show comment input form
   */
  function showCommentInput(lineEl, filePath, lineNum, onClose) {
    // Clean up any existing form and its handlers
    if (currentFormCleanup) {
      currentFormCleanup();
      currentFormCleanup = null;
    }
    const existing = document.querySelector('.comment-input-form');
    if (existing) {
      existing.closest('.comment-row')?.remove();
    }

    // Create input form
    const form = document.createElement('div');
    form.className = 'comment-input-form';
    form.innerHTML = `
      <div class="comment-input-header">
        <span>Comment on line ${lineNum}</span>
        <button class="close-btn" title="Cancel" aria-label="Cancel comment">&times;</button>
      </div>
      <textarea placeholder="Add your comment..." rows="3" aria-label="Comment text"></textarea>
      <div class="comment-input-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="submit-btn">Add Comment</button>
      </div>
    `;
    form.setAttribute('role', 'form');
    form.setAttribute('aria-label', `Comment input for line ${lineNum}`);

    // Find the row to insert after
    const row = lineEl.closest('tr') || lineEl.closest('.d2h-code-line-ctn');
    if (row && row.parentNode) {
      const wrapper = document.createElement('tr');
      wrapper.className = 'comment-row';
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(form);
      wrapper.appendChild(td);
      row.parentNode.insertBefore(wrapper, row.nextSibling);
    }

    // Get elements
    const textarea = form.querySelector('textarea');
    const closeBtn = form.querySelector('.close-btn');
    const cancelBtn = form.querySelector('.cancel-btn');
    const submitBtn = form.querySelector('.submit-btn');

    // Define handlers
    const closeForm = () => {
      cleanupFormHandlers();
      form.closest('.comment-row')?.remove();
      if (onClose) onClose();
    };

    const closeBtnHandler = () => closeForm();
    const cancelBtnHandler = () => closeForm();
    const submitBtnHandler = () => {
      const text = textarea.value.trim();
      if (text) {
        vscode.postMessage({
          type: 'addComment',
          filePath,
          line: lineNum,
          text
        });
        closeForm();
      }
    };
    const keydownHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        submitBtn.click();
      }
      if (e.key === 'Escape') {
        closeForm();
      }
    };

    // Attach handlers
    closeBtn.addEventListener('click', closeBtnHandler);
    cancelBtn.addEventListener('click', cancelBtnHandler);
    submitBtn.addEventListener('click', submitBtnHandler);
    textarea.addEventListener('keydown', keydownHandler);

    // Cleanup function to remove all handlers
    const cleanupFormHandlers = () => {
      closeBtn.removeEventListener('click', closeBtnHandler);
      cancelBtn.removeEventListener('click', cancelBtnHandler);
      submitBtn.removeEventListener('click', submitBtnHandler);
      textarea.removeEventListener('keydown', keydownHandler);
      currentFormCleanup = null;
    };

    // Store cleanup function for external cleanup
    currentFormCleanup = cleanupFormHandlers;

    // Focus textarea
    setTimeout(() => textarea.focus(), 0);
  }

  /**
   * Update the theme class on body
   */
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
  }

  /**
   * Render comments as threads below diff lines
   * Uses DOM API instead of innerHTML to prevent XSS
   */
  function renderComments(commentList) {
    // Clean up old handlers first
    cleanupCommentHandlers();

    // Remove existing comment threads (but not input forms)
    document.querySelectorAll('.comment-thread').forEach(el => {
      el.closest('.comment-row')?.remove();
    });

    if (!commentList || commentList.length === 0) return;

    // Group comments by line
    const byLine = {};
    commentList.forEach(comment => {
      const key = `${comment.line}`;
      if (!byLine[key]) byLine[key] = [];
      byLine[key].push(comment);
    });

    // Insert comment threads
    Object.entries(byLine).forEach(([lineStr, lineComments]) => {
      const lineNum = parseInt(lineStr, 10);

      // Find the line element
      const lineEl = findLineElement(lineNum);
      if (!lineEl) return;

      // Create comment thread using DOM API (XSS-safe)
      const thread = document.createElement('div');
      thread.className = 'comment-thread';

      lineComments.forEach(c => {
        const commentEl = document.createElement('div');
        commentEl.className = `comment ${c.status}`;
        commentEl.dataset.id = c.id; // Safe - DOM API escapes automatically

        // Header
        const header = document.createElement('div');
        header.className = 'comment-header';

        const location = document.createElement('span');
        location.className = 'comment-location';
        location.textContent = `Line ${c.line}${c.lineEnd && c.lineEnd !== c.line ? `-${c.lineEnd}` : ''}`;
        header.appendChild(location);

        const time = document.createElement('span');
        time.className = 'comment-time';
        time.textContent = formatTime(c.createdAt);
        header.appendChild(time);

        commentEl.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = c.status === 'resolved' ? 'comment-body resolved' : 'comment-body';
        body.textContent = c.text; // Safe - textContent escapes automatically
        commentEl.appendChild(body);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'comment-actions';

        if (c.status === 'open') {
          const resolveBtn = document.createElement('button');
          resolveBtn.className = 'resolve-btn';
          resolveBtn.dataset.id = c.id; // Safe - DOM API escapes automatically
          resolveBtn.setAttribute('aria-label', `Resolve comment on line ${c.line}`);
          resolveBtn.textContent = 'Resolve';

          const clickHandler = () => {
            vscode.postMessage({
              type: 'resolveComment',
              id: c.id
            });
          };
          resolveBtn.addEventListener('click', clickHandler);
          resolveBtn._clickHandler = clickHandler;
          attachedCommentButtons.push(resolveBtn);

          actions.appendChild(resolveBtn);
        } else {
          const badge = document.createElement('span');
          badge.className = 'resolved-badge';
          badge.textContent = 'Resolved';
          actions.appendChild(badge);
        }

        commentEl.appendChild(actions);
        thread.appendChild(commentEl);
      });

      // Find the row to insert after
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

    // Setup accessibility after rendering comments
    setupCommentAccessibility();
  }

  /**
   * Find line element by line number
   */
  function findLineElement(lineNum) {
    const lineNumbers = document.querySelectorAll('.d2h-code-linenumber, .d2h-code-side-linenumber');
    for (const el of lineNumbers) {
      const num = parseInt(el.textContent.trim(), 10);
      if (num === lineNum) {
        return el;
      }
    }
    return null;
  }

  /**
   * Format timestamp for display
   */
  function formatTime(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Post a message to the extension
   */
  function postMessage(type, data) {
    vscode.postMessage({ type, ...data });
  }

  /**
   * Setup keyboard navigation
   */
  let currentCommentIndex = -1;

  function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Skip if input is focused
      if (isInputFocused()) return;

      // Navigate between comments: j/k or n/p
      if (e.key === 'j' || e.key === 'n') {
        e.preventDefault();
        navigateToNextComment();
      } else if (e.key === 'k' || e.key === 'p') {
        e.preventDefault();
        navigateToPreviousComment();
      }

      // Resolve focused comment: r
      if (e.key === 'r') {
        const focusedComment = document.querySelector('.comment:focus');
        if (focusedComment) {
          e.preventDefault();
          const resolveBtn = focusedComment.querySelector('.resolve-btn');
          resolveBtn?.click();
        }
      }
    });
  }

  function isInputFocused() {
    const active = document.activeElement;
    return active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT';
  }

  function navigateToNextComment() {
    const commentElements = document.querySelectorAll('.comment-thread .comment');
    if (commentElements.length === 0) return;

    currentCommentIndex = (currentCommentIndex + 1) % commentElements.length;
    const comment = commentElements[currentCommentIndex];
    comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
    comment.focus();
    announceStatus(`Comment ${currentCommentIndex + 1} of ${commentElements.length}`);
  }

  function navigateToPreviousComment() {
    const commentElements = document.querySelectorAll('.comment-thread .comment');
    if (commentElements.length === 0) return;

    currentCommentIndex = currentCommentIndex <= 0 ? commentElements.length - 1 : currentCommentIndex - 1;
    const comment = commentElements[currentCommentIndex];
    comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
    comment.focus();
    announceStatus(`Comment ${currentCommentIndex + 1} of ${commentElements.length}`);
  }

  /**
   * Setup accessibility features
   */
  function setupAccessibility() {
    // Label the diff container
    const container = document.getElementById('diff-container');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Code diff viewer');

    // Add aria-live for status announcements
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

  /**
   * Make comments focusable and add ARIA attributes
   */
  function setupCommentAccessibility() {
    document.querySelectorAll('.comment').forEach((comment, index) => {
      comment.setAttribute('tabindex', '0');
      comment.setAttribute('role', 'article');
      comment.setAttribute('aria-label', `Review comment ${index + 1}`);
    });
  }

  // Initialize keyboard navigation and accessibility
  setupKeyboardNavigation();
  setupAccessibility();

  // Expose functions for future use
  window.diffReview = {
    postMessage,
    renderDiff,
    renderComments,
    saveState,
    announceStatus
  };

  // Render cached data if available (for restored sessions)
  // Wait for Prism to load before rendering to ensure syntax highlighting works
  function initializeWithState() {
    if (previousState && previousState.currentData) {
      if (typeof Prism !== 'undefined') {
        renderDiff(previousState.currentData);
      } else {
        // Prism not loaded yet, retry after a short delay
        setTimeout(initializeWithState, 50);
      }
    }
  }

  // Start the initialization check
  if (previousState && previousState.currentData) {
    initializeWithState();
  }
})();
