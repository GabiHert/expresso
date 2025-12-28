#!/usr/bin/env node
// AI Cockpit - Event Capture Hook
// Captures Edit/Write/TodoWrite events and stores them for the VSCode extension

const fs = require('fs');
const path = require('path');
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
 * 1. active-task.json file
 * 2. Git branch pattern
 * 3. Session ID fallback
 */
function resolveTaskId(projectDir, sessionId) {
  // Strategy 1: Active task file
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

  // Strategy 2: Git branch pattern
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

  // Strategy 3: Session fallback
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
