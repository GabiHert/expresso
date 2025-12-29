<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-extension-scaffold.md                              ║
║ TASK: LOCAL-003                                                  ║
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
repo: vscode-extension
---

# Create Extension Scaffold

## Objective

Set up the VSCode extension project with proper structure, dependencies, and activation.

## Implementation Steps

### Step 1: Create Extension Directory

```bash
mkdir -p vscode-extension
cd vscode-extension
```

### Step 2: Initialize with Yeoman (Recommended)

```bash
# Install Yeoman and VS Code Extension generator
npm install -g yo generator-code

# Generate extension scaffold
yo code

# Options:
# - Type: New Extension (TypeScript)
# - Name: ai-cockpit
# - Identifier: ai-cockpit
# - Description: AI Cockpit - Monitor and manage Claude Code tasks
# - Initialize git repo: No (already in parent repo)
# - Bundle with webpack: Yes
# - Package manager: npm
```

### Step 3: Manual Setup (Alternative)

If not using Yeoman, create manually:

**package.json**:
```json
{
  "name": "ai-cockpit",
  "displayName": "AI Cockpit",
  "description": "Monitor and manage Claude Code tasks with real-time diff tracking",
  "version": "0.1.0",
  "publisher": "ai-cockpit",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "workspaceContains:.ai/cockpit"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "aiCockpit.showPanel",
        "title": "AI Cockpit: Show Panel"
      },
      {
        "command": "aiCockpit.refresh",
        "title": "AI Cockpit: Refresh"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ai-cockpit",
          "title": "AI Cockpit",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "ai-cockpit": [
        {
          "id": "aiCockpit.tasks",
          "name": "Tasks"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.85.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "dist",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Step 4: Create Entry Point

**src/extension.ts**:
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Cockpit extension activated');

  // Register commands
  const showPanelCommand = vscode.commands.registerCommand(
    'aiCockpit.showPanel',
    () => {
      vscode.window.showInformationMessage('AI Cockpit panel coming soon!');
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'aiCockpit.refresh',
    () => {
      vscode.window.showInformationMessage('Refreshing AI Cockpit...');
    }
  );

  context.subscriptions.push(showPanelCommand, refreshCommand);

  // Check if we're in a cockpit-enabled workspace
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    vscode.window.showInformationMessage('AI Cockpit: Workspace detected');
  }
}

export function deactivate() {
  console.log('AI Cockpit extension deactivated');
}
```

### Step 5: Create Directory Structure

```bash
mkdir -p src/{state,watchers,providers,commands,types}
mkdir -p media
touch src/state/CockpitState.ts
touch src/watchers/FileWatcher.ts
touch src/providers/StatusBarProvider.ts
touch src/providers/TaskTreeProvider.ts
touch src/providers/DiffContentProvider.ts
touch src/commands/index.ts
touch src/types/index.ts
```

### Step 6: Create Type Definitions

**src/types/index.ts**:
```typescript
export interface ActiveTask {
  taskId: string;
  title: string;
  branch?: string;
  frameworkPath: string;
  startedAt: string;
  sessionId?: string;
}

export interface CockpitEvent {
  id: string;
  taskId: string;
  taskIdSource: 'active-task-file' | 'git-branch' | 'session-fallback';
  tool: 'Edit' | 'Write' | 'TodoWrite';
  input: Record<string, any>;
  response?: string;
  sessionId: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  events: CockpitEvent[];
}
```

### Step 7: Install Dependencies and Compile

```bash
cd vscode-extension
npm install
npm run compile
```

### Step 8: Test Extension

1. Open VSCode in the extension directory
2. Press F5 to launch Extension Development Host
3. Open Command Palette (Cmd+Shift+P)
4. Run "AI Cockpit: Show Panel"
5. Verify message appears

## Acceptance Criteria

- [ ] `vscode-extension/` directory exists
- [ ] `package.json` has correct configuration
- [ ] Extension compiles without errors
- [ ] Extension activates when `.ai/cockpit` exists
- [ ] Commands are registered and work
- [ ] Activity bar icon appears

## Notes

- Use `activationEvents: ["workspaceContains:.ai/cockpit"]` for lazy activation
- The extension won't activate unless cockpit directory exists
- Consider adding `onStartupFinished` for faster perceived startup
