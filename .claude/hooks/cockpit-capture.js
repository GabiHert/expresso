#!/usr/bin/env node
// AI Cockpit - Event Capture Hook
// Captures Edit/Write/TodoWrite events and stores them for the VSCode extension

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Resolve task ID using fallback chain
    const taskId = resolveTaskId(projectDir, hookData.session_id);

    // Build event payload
    const event = {
      id: generateEventId(),
      taskId: taskId.id,
      taskIdSource: taskId.source,
      tool: hookData.tool_name,
      input: hookData.tool_input,
      response: hookData.tool_response,
      sessionId: hookData.session_id,
      timestamp: new Date().toISOString()
    };

    // Save event to file
    saveEvent(projectDir, event);

    // Update shadow for file tracking
    if (hookData.tool_name === 'Edit' || hookData.tool_name === 'Write') {
      updateShadow(projectDir, taskId.id, hookData);
    }

    // Success - don't block Claude Code
    process.exit(0);

  } catch (err) {
    // Log error but don't block Claude Code
    console.error(`[cockpit] Error: ${err.message}`);
    process.exit(0); // Exit 0 to not block
  }
});

/**
 * Resolve the active task ID using fallback chain:
 * 1. COCKPIT_TASK env var (enables parallel sessions)
 * 2. active-task.json file
 * 3. Git branch pattern
 * 4. Session ID fallback
 */
function resolveTaskId(projectDir, sessionId) {
  // Strategy 1: Environment variable override (highest priority)
  const envTaskId = process.env.COCKPIT_TASK;
  if (envTaskId) {
    return { id: envTaskId, source: 'env-var' };
  }

  // Strategy 2: Active task file
  const activeTaskPath = path.join(projectDir, '.ai/cockpit/active-task.json');
  if (fs.existsSync(activeTaskPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(activeTaskPath, 'utf8'));
      if (data.taskId) {
        return { id: data.taskId, source: 'active-task-file' };
      }
    } catch (e) {
      // Invalid JSON, continue to next strategy
    }
  }

  // Strategy 3: Git branch pattern
  try {
    const branch = execSync('git branch --show-current', {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Match patterns like: feat/TASK-123-description or LOCAL-456-fix
    const match = branch.match(/([A-Z]+-\d+)/i);
    if (match) {
      return { id: match[1].toUpperCase(), source: 'git-branch' };
    }
  } catch (e) {
    // Git not available or not in a repo
  }

  // Strategy 4: Session fallback
  return {
    id: `session-${sessionId || 'unknown'}`,
    source: 'session-fallback'
  };
}

/**
 * Generate a unique event ID
 */
function generateEventId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `evt-${timestamp}-${random}`;
}

/**
 * Save event to the cockpit events directory
 */
function saveEvent(projectDir, event) {
  const eventsDir = path.join(projectDir, '.ai/cockpit/events', event.taskId);

  // Create directory if needed
  fs.mkdirSync(eventsDir, { recursive: true });

  // Generate sequential filename
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
  const nextNum = String(files.length + 1).padStart(3, '0');
  const toolName = event.tool.toLowerCase();
  const filename = `${nextNum}-${toolName}.json`;

  // Write event atomically (write to temp, then rename)
  const eventPath = path.join(eventsDir, filename);
  const tempPath = eventPath + '.tmp';

  fs.writeFileSync(tempPath, JSON.stringify(event, null, 2));
  fs.renameSync(tempPath, eventPath);
}

/**
 * Get the shadow directory for a file
 */
function getShadowDir(projectDir, taskId, filePath) {
  const hash = crypto
    .createHash('sha256')
    .update(filePath)
    .digest('hex')
    .substring(0, 12);

  return path.join(projectDir, '.ai/cockpit/shadows', taskId, hash);
}

/**
 * Hash content for comparison
 */
function hashContent(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Update shadow copy for cumulative diff tracking
 */
function updateShadow(projectDir, taskId, hookData) {
  const filePath = hookData.tool_input.file_path;
  if (!filePath) return;

  const shadowDir = getShadowDir(projectDir, taskId, filePath);
  const metaPath = path.join(shadowDir, 'meta.json');
  const baselinePath = path.join(shadowDir, 'baseline.txt');
  const accumulatedPath = path.join(shadowDir, 'accumulated.txt');

  fs.mkdirSync(shadowDir, { recursive: true });

  const isFirstEdit = !fs.existsSync(metaPath);

  if (isFirstEdit) {
    // Capture baseline
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
    let baseline = '';

    if (hookData.tool_name === 'Write') {
      baseline = ''; // New file, empty baseline
    } else if (fs.existsSync(fullPath)) {
      // Reconstruct baseline by reversing the edit
      const current = fs.readFileSync(fullPath, 'utf8');
      const oldStr = hookData.tool_input.old_string || '';
      const newStr = hookData.tool_input.new_string || '';
      baseline = current.replace(newStr, oldStr);
    }

    fs.writeFileSync(baselinePath, baseline);

    // Initialize meta
    const meta = {
      filePath,
      taskId,
      baseline: {
        capturedAt: new Date().toISOString(),
        hash: hashContent(baseline),
        size: baseline.length
      },
      accumulated: {
        lastUpdatedAt: new Date().toISOString(),
        hash: '',
        size: 0,
        editCount: 0
      },
      sync: {
        lastCheckedAt: new Date().toISOString(),
        status: 'synced'
      }
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }

  // Update accumulated with current file state
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
  let accumulated = '';

  if (hookData.tool_name === 'Write') {
    accumulated = hookData.tool_input.content || '';
  } else if (fs.existsSync(fullPath)) {
    accumulated = fs.readFileSync(fullPath, 'utf8');
  }

  fs.writeFileSync(accumulatedPath, accumulated);

  // Update meta
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.accumulated = {
    lastUpdatedAt: new Date().toISOString(),
    hash: hashContent(accumulated),
    size: accumulated.length,
    editCount: (meta.accumulated.editCount || 0) + 1
  };
  meta.sync = {
    lastCheckedAt: new Date().toISOString(),
    actualFileHash: meta.accumulated.hash,
    status: 'synced'
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}
