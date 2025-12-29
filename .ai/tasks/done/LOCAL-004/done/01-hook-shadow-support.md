<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-hook-shadow-support.md                             ║
║ TASK: LOCAL-004                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: .claude/hooks
---

# Update Hook with Shadow Support

## Objective

Add `updateShadow()` function to cockpit-capture.js that maintains baseline and accumulated state for each file.

## Implementation Steps

### Step 1: Add crypto import

**File**: `.claude/hooks/cockpit-capture.js`

Add at the top:
```javascript
const crypto = require('crypto');
```

### Step 2: Add helper functions

Add these functions:

```javascript
function getShadowDir(projectDir, taskId, filePath) {
  const hash = crypto
    .createHash('sha256')
    .update(filePath)
    .digest('hex')
    .substring(0, 12);

  return path.join(projectDir, '.ai/cockpit/shadows', taskId, hash);
}

function hashContent(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}
```

### Step 3: Add updateShadow function

```javascript
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
    const fullPath = path.join(projectDir, filePath);
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
  const fullPath = path.join(projectDir, filePath);
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
```

### Step 4: Call updateShadow from main handler

In the `process.stdin.on('end', ...)` handler, add after `saveEvent()`:

```javascript
// Update shadow for file tracking
if (hookData.tool_name === 'Edit' || hookData.tool_name === 'Write') {
  updateShadow(projectDir, taskId.id, hookData);
}
```

## Acceptance Criteria

- [ ] First edit to file creates baseline.txt with original content
- [ ] First edit creates meta.json with editCount: 1
- [ ] Subsequent edits update accumulated.txt only
- [ ] Subsequent edits increment editCount in meta.json
- [ ] Write (new file) creates empty baseline.txt
- [ ] Shadow directory uses hash of file path

## Testing

1. Make an edit to an existing file:
   ```
   "Change 'foo' to 'bar' in test.txt"
   ```
   Verify: `.ai/cockpit/shadows/{taskId}/{hash}/` created with 3 files

2. Make another edit to same file:
   ```
   "Change 'bar' to 'baz' in test.txt"
   ```
   Verify: baseline unchanged, accumulated updated, editCount = 2

3. Create a new file:
   ```
   "Create hello.txt with content 'hello world'"
   ```
   Verify: baseline.txt is empty, accumulated.txt has content

## Notes

- Hook fires AFTER edit is applied, so we reverse it for baseline
- Keep shadow update fast (<50ms) to not slow down Claude
