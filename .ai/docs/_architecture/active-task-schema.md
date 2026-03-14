---
type: internal-doc
tags:
  - doc
---

# active-task.json Schema

## Location
`.ai/cockpit/active-task.json`

## Purpose
Persists the currently active task context, including all repository paths and git information needed for safe git operations.

---

## Schema

```json
{
  "taskId": "string",           // Required: Task identifier (e.g., "LOCAL-026")
  "title": "string",            // Required: Task title
  "frameworkPath": "string",    // Required: Path to task folder in .ai/tasks/
  "startedAt": "string",        // Required: ISO timestamp
  "sessionId": "string",        // Required: Session identifier

  // DEPRECATED - kept for backward compatibility
  "branch": "string",           // Deprecated: Use affectedRepos[].branch instead

  // NEW FIELDS (LOCAL-026)
  "affectedRepos": [            // Required: Array of affected repositories
    {
      "name": "string",         // Repo name from manifest
      "absolutePath": "string", // Resolved absolute filesystem path
      "gitRoot": "string",      // Absolute path to .git directory parent
      "branch": "string",       // Branch created/used for this task
      "remote": "string",       // Git remote name (usually "origin")
      "remoteUrl": "string",    // Git remote URL
      "protected": false        // From manifest - if true, git ops blocked
    }
  ],
  "currentWorkRepo": "string"   // Optional: Name of repo currently being worked
}
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | Yes | Task identifier (e.g., "[[LOCAL-026]]", "JIRA-123") |
| `title` | string | Yes | Human-readable task title |
| `frameworkPath` | string | Yes | Relative path to task folder from project root |
| `startedAt` | string | Yes | ISO 8601 timestamp when task was started |
| `sessionId` | string | Yes | Unique session identifier for tracking |
| `branch` | string | No | **Deprecated** - Legacy field for single-repo tasks |

### affectedRepos Array

Each entry in `affectedRepos` contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Repo name matching manifest entry |
| `absolutePath` | string | Yes | Full filesystem path to repo root |
| `gitRoot` | string | Yes | Path to directory containing `.git` |
| `branch` | string | Yes | Branch name for this task in this repo |
| `remote` | string | Yes | Git remote name (typically "origin") |
| `remoteUrl` | string | Yes | Git remote URL for verification |
| `protected` | boolean | Yes | If true, git operations are blocked |

---

## Example

```json
{
  "taskId": "JIRA-123",
  "title": "Fix validation bug in user registration",
  "frameworkPath": ".ai/tasks/in_progress/JIRA-123",
  "startedAt": "2026-01-08T12:00:00Z",
  "sessionId": "abc123def456",
  "branch": "JIRA-123-fix-validation",
  "affectedRepos": [
    {
      "name": "backend",
      "absolutePath": "/Users/gabi/Projects/company/backend",
      "gitRoot": "/Users/gabi/Projects/company/backend",
      "branch": "JIRA-123-fix-validation",
      "remote": "origin",
      "remoteUrl": "git@github.com:company/backend.git",
      "protected": false
    },
    {
      "name": "frontend",
      "absolutePath": "/Users/gabi/Projects/company/frontend",
      "gitRoot": "/Users/gabi/Projects/company/frontend",
      "branch": "JIRA-123-fix-validation",
      "remote": "origin",
      "remoteUrl": "git@github.com:company/frontend.git",
      "protected": false
    }
  ],
  "currentWorkRepo": "backend"
}
```

---

## Usage Guidelines

### Before Any Git Operation

1. Read `active-task.json`
2. Find repo in `affectedRepos` by name
3. Use `absolutePath` to `cd` into correct directory
4. Verify `gitRoot` matches `git rev-parse --show-toplevel`
5. If `protected: true`, BLOCK the operation

### Example Verification Script

```bash
# Get repo info from active-task.json
REPO_PATH=$(jq -r '.affectedRepos[] | select(.name=="backend") | .absolutePath' .ai/cockpit/active-task.json)
EXPECTED_ROOT=$(jq -r '.affectedRepos[] | select(.name=="backend") | .gitRoot' .ai/cockpit/active-task.json)

# Navigate and verify (use pwd -P to resolve symlinks)
cd "$REPO_PATH"
ACTUAL_ROOT=$(cd "$(git rev-parse --show-toplevel)" && pwd -P)
EXPECTED_ROOT_RESOLVED=$(cd "$EXPECTED_ROOT" && pwd -P)

if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT_RESOLVED" ]; then
  echo "ERROR: Git root mismatch!"
  echo "Expected: $EXPECTED_ROOT_RESOLVED"
  echo "Actual: $ACTUAL_ROOT"
  exit 1
fi

echo "Verified: Working in correct repository"
```

**Note:** Using `pwd -P` ensures symlinks are resolved before comparison,
preventing false mismatches on systems with symlinked directories.

---

## Backward Compatibility

The `branch` field is kept at the root level for backward compatibility with tools that read it directly. New code should use `affectedRepos[].branch`.

If `affectedRepos` is empty or missing, tools should fall back to:
- `branch` field for git branch name
- Manifest `repos` for paths

---

## Related

- `/task-start` - Writes this file when starting a task
- `/task-work` - Reads this file for repo context
- `/task-resume` - Reads and announces repo context
- `manifest.yaml` - Source of repo configuration
