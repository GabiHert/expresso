<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-cockpit-directory.md                               ║
║ TASK: LOCAL-001                                                  ║
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
repo: ai-framework
---

# Create Cockpit Directory Structure

## Objective

Set up the `.ai/cockpit/` directory structure that will store the active task file and captured events.

## Implementation Steps

### Step 1: Create Directory Structure

**Location**: `.ai/cockpit/`

Create the following structure:

```
.ai/cockpit/
├── .gitkeep              # Ensure directory is tracked
├── config.json           # Optional cockpit configuration
└── events/               # Will store captured events (Phase 2)
    └── .gitkeep
```

### Step 2: Create config.json

**File**: `.ai/cockpit/config.json`

```json
{
  "version": "1.0.0",
  "serverPort": 9999,
  "eventStorage": "file",
  "gitBranchPattern": "([A-Z]+-\\d+)",
  "enabled": true
}
```

### Step 3: Update .gitignore (Optional)

Consider whether `active-task.json` should be gitignored (it's session-specific):

**File**: `.ai/.gitignore` (create if doesn't exist)

```
# Cockpit session files
cockpit/active-task.json
```

Or alternatively, track everything for visibility.

## Acceptance Criteria

- [ ] `.ai/cockpit/` directory exists
- [ ] `.ai/cockpit/config.json` exists with valid JSON
- [ ] `.ai/cockpit/events/` directory exists
- [ ] Directories are tracked in git (via .gitkeep or config.json)

## Testing

```bash
# Verify structure
ls -la .ai/cockpit/
ls -la .ai/cockpit/events/
cat .ai/cockpit/config.json | jq .
```

## Notes

- The `events/` directory will be populated by hooks in Phase 2
- The `active-task.json` file is created/deleted dynamically by commands
- Consider adding cockpit to the manifest.yaml if needed
