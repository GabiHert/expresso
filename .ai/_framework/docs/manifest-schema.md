# Manifest Schema Reference

## Location
`.ai/_project/manifest.yaml`

## Purpose
The project manifest defines all repositories, conventions, and settings for the AI framework. Commands read this file to understand the project structure.

---

## Schema

### Project Identity

```yaml
project:
  name: string              # Required: Project name
  description: string       # Required: Project description
  root: string              # Required: Absolute path to project root
```

### Repositories

```yaml
repos:
  - name: string            # Required: Unique repo identifier
    path: string            # Required: Relative (./foo) or absolute path
    description: string     # Optional: Repo description
    tech: [string]          # Optional: Technologies used (e.g., [typescript, react])

    # PROTECTION FIELDS
    protected: boolean      # Optional, default: false
                           # If true: No task branches created in this repo
                           # If true: Git operations (commit, push) blocked
                           # Use for framework/wrapper repos

    locked_branch: string   # Optional: Branch this repo must stay on
                           # Only relevant when protected: true
                           # Example: "main", "project/ai-cockpit"

    is_framework: boolean   # Optional: Marks as the framework wrapper repo
                           # Helps identify which repo contains .ai/ folder

    # NESTED REPO SUPPORT
    git_root: string        # Optional: Absolute path to .git parent directory
                           # Use when repo is nested and git_root != path
                           # Example: "/Users/me/projects/monorepo/backend"
```

### Protection Behavior

When `protected: true` is set on a repo:

1. **Branch Creation**: `/task-start` will NOT create task branches
2. **Git Operations**: `/task-work` will warn before any git add/commit/push
3. **Commit Blocking**: Agent will be blocked from committing to protected repos
4. **Visual Indicator**: Protected repos shown with ⛔ in status messages

### Example: Protected Framework Repo

```yaml
repos:
  - name: ai-framework
    path: ./
    protected: true
    locked_branch: project/ai-cockpit
    is_framework: true
    description: "Core AI task framework"
    tech: [markdown, yaml, typescript]

  - name: backend
    path: ./backend
    git_root: /Users/me/projects/company/backend
    description: "Main backend service"
    tech: [typescript, nodejs]
```

### Conventions

```yaml
conventions:
  commits:
    no_coauthor: boolean    # If true, never add Co-Authored-By
    require_jira: boolean   # If true, require JIRA ID in commits
    pattern: string         # Commit message pattern
    types: [string]         # Allowed commit types

  branches:
    pattern: string         # Branch naming pattern

  jira:
    prefix: string          # JIRA project prefix (e.g., "PROJ")
    url: string             # JIRA base URL (optional)
```

### Framework Settings

```yaml
framework:
  repo: string              # GitHub repo for framework updates
  branch: string            # Branch to track for framework
  track_customizations: boolean  # Track local customizations
```

### Auto-Sync

```yaml
auto_sync:
  enabled: boolean          # Auto-commit .ai/ changes after commands
  use_agent: boolean        # Use ai-sync agent for commits
```

---

## Validation

Validate manifest YAML syntax:

```bash
cat .ai/_project/manifest.yaml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"
```

## Related

- `/init` - Generates initial manifest
- `/enhance` - Updates manifest with new settings
- `/task-start` - Reads manifest for repo configuration
