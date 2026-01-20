# Scripts

Utility scripts for the AI Framework.

## Available Scripts

### `create-worktree.sh`

Creates a git worktree for task isolation.

**Usage:**
```bash
./create-worktree.sh <repo-path> <task-id> [base-branch]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `repo-path` | Yes | Path to the git repository |
| `task-id` | Yes | Task ID or branch name (e.g., JIRA-123) |
| `base-branch` | No | Base branch to create from (default: main) |

**Examples:**
```bash
# Create worktree from main branch
./create-worktree.sh ~/Projects/backend JIRA-123

# Create worktree from develop branch
./create-worktree.sh ~/Projects/backend JIRA-123 develop

# Using explicit branch name
./create-worktree.sh /path/to/repo feature/new-api main
```

**What it does:**
1. Validates the repository path
2. Creates `.worktrees/{task-id}/` directory
3. Creates branch `task/{task-id}` from base branch
4. Adds `.worktrees/` to `.gitignore` (if not present)
5. Fetches latest from remote

**Cleanup:**
```bash
git worktree remove .worktrees/{task-id}
```

## Rules

See `.ai/_framework/agent-behavior.md` for mandatory usage requirements.
