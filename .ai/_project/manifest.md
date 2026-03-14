---
type: manifest
project: AI Cockpit
root: /Users/gabriel.herter/Documents/Personal/ai-framework
repos:
  - name: ai-framework
    path: ./
    protected: true
    locked_branch: project/ai-cockpit
    is_framework: true
    description: Core AI task framework - commands, templates, and agent behavior
      definitions
    tech:
      - markdown
      - yaml
      - typescript
  - name: vscode-extension
    path: ./vscode-extension
    description: VSCode extension for AI Cockpit UI (to be created)
    tech:
      - typescript
      - vscode-api
      - webview
mcps:
  available:
    - name: context7
      description: Library documentation lookup
    - name: notification-server
      description: Discord notifications for task events
    - name: playwright
      description: Browser automation and testing
    - name: claude-mermaid
      description: Mermaid diagram generation and preview
    - name: markdown-pdf
      description: Markdown to PDF conversion
  optional:
    - name: sql-query
      description: Direct database queries (for testing)
conventions:
  commits:
    no_coauthor: true
    require_jira: false
    pattern: "type(scope): description"
    types:
      - feat
      - fix
      - chore
      - refactor
      - test
      - docs
  branches:
    pattern: feature/{short-description}
  jira:
    prefix: LOCAL
    url: ""
agents:
  exploration: Explore
  explore:
    default_thoroughness: very thorough
notifications:
  on_task_create: true
  on_task_done: true
  on_error: true
  mention_user: false
framework:
  repo: GabiHert/ai-framework
  branch: project/ai-cockpit
  track_customizations: true
tags:
  - manifest
  - config
lightweight_commands:
  enabled: true
  model: haiku
  commands:
    - task-status
    - help
    - ai-sync
auto_sync:
  enabled: true
  use_agent: true
---

# AI Cockpit

VSCode extension for monitoring and managing AI agents - real-time task tracking, diff history, and agent orchestration

## Repositories
- **ai-framework**: Core AI task framework - commands, templates, and agent behavior definitions
- **vscode-extension**: VSCode extension for AI Cockpit UI (to be created)
