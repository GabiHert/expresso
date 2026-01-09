<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-manifest-protected-flag.md                         ║
║ TASK: LOCAL-026                                                  ║
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

# Add Protected Flag to Manifest Schema

## Objective

Define and document the `protected` and related fields for repos in the manifest schema, enabling repos to be marked as protected from task branch operations.

## Pre-Implementation

Review current manifest.yaml structure at `.ai/_project/manifest.yaml` lines 22-31.

## Implementation Steps

### Step 1: Update Manifest Schema Documentation

**File**: `.ai/_framework/docs/manifest-schema.md` (create if doesn't exist)

**Instructions**:
Document the new repo fields:

```yaml
repos:
  - name: string           # Required: repo identifier
    path: string           # Required: relative or absolute path
    description: string    # Optional: repo description
    tech: [string]         # Optional: technologies used

    # NEW FIELDS
    protected: boolean     # Optional, default false
                          # If true: no task branches created
                          # If true: git operations blocked

    locked_branch: string  # Optional: branch to stay on
                          # Only relevant if protected: true

    git_root: string       # Optional: absolute path to .git
                          # Use for nested repos where git_root != path

    is_framework: boolean  # Optional: marks as framework wrapper
                          # Helps identify the main framework repo
```

### Step 2: Update Project Manifest

**File**: `.ai/_project/manifest.yaml`

**Instructions**:
Add the protected flag to the ai-framework repo:

```yaml
repos:
  - name: ai-framework
    path: ./
    protected: true
    locked_branch: project/ai-cockpit
    is_framework: true
    description: "Core AI task framework - commands, templates, and agent behavior definitions"
    tech: [markdown, yaml, typescript]

  - name: vscode-extension
    path: ./vscode-extension
    description: "VSCode extension for AI Cockpit UI (to be created)"
    tech: [typescript, vscode-api, webview]
```

### Step 3: Add Schema Validation Reminder

**File**: `.ai/_framework/commands/task-start.md`

**Instructions**:
Add a note in Step 0 (Orientation) to read and understand protected repos:

```markdown
1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - **Protected repos (protected: true) - NEVER create branches in these**
   - Branch naming conventions
   - Commit conventions
```

## Post-Implementation

Verify the manifest YAML is valid by checking syntax.

## Acceptance Criteria

- [ ] New fields documented in manifest schema
- [ ] ai-framework repo marked as `protected: true` in manifest
- [ ] `locked_branch` set to `project/ai-cockpit`
- [ ] task-start.md references protected repos in orientation

## Testing

```bash
# Verify YAML is valid
cat .ai/_project/manifest.yaml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"
```

## Notes

This is the foundation - subsequent work items will implement the actual protection logic.
