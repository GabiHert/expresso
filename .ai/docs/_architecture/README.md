---
type: internal-doc
tags:
  - doc
---

# Architecture Documentation

System-level architecture and design decisions for AI Cockpit.

## Overview

AI Cockpit is a VSCode extension for monitoring and managing AI agents. The system consists of:

```
+------------------+     +-----------------+     +------------------+
|   Claude Code    |---->|   JSON Files    |<----|  VSCode Panel    |
|   + Hooks        |     | (.ai/cockpit/)  |     |  (read-only)     |
+------------------+     +-----------------+     +------------------+
```

## Core Components

### 1. ai-framework (Core)
The task management framework with commands, templates, and agent behavior definitions.

### 2. vscode-extension (UI)
The VSCode extension providing:
- Task status panel
- Diff history viewer
- Real-time agent monitoring

## Key Design Decisions

### File-Based Communication
Using JSON files in `.ai/cockpit/` for IPC between Claude Code and the extension:
- Simple, no external dependencies
- Watchable via VSCode file system APIs
- Persists across sessions

### Claude Code Hooks
Leveraging Claude Code's hook system to capture:
- Edit tool calls (with old_string/new_string)
- Write tool calls (new files)
- Task status changes

## Contents

_Add architecture documentation as the system evolves._
