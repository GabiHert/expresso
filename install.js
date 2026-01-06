#!/usr/bin/env node
/**
 * AI Framework Installation Script
 *
 * Installs the AI Cockpit framework and VSCode extension to a target project.
 *
 * Usage:
 *   node install.js                     # Install to current directory
 *   node install.js ./my-project        # Install to specific directory
 *   node install.js --yes               # Non-interactive mode
 *   node install.js --no-extension      # Skip VSCode extension
 *   node install.js --update            # Update existing installation
 *   node install.js --help              # Show help
 *
 * What gets installed:
 *   - .ai/_framework/          Command definitions and templates
 *   - .claude/commands/        Claude Code slash commands
 *   - .claude/agents/          Lightweight subagents (Haiku model)
 *   - .claude/hooks/           Event capture for VSCode extension
 *   - .claude/settings.json    Hook configuration
 *   - AI Cockpit VSCode extension (optional)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

// ============================================================
// CONFIGURATION
// ============================================================

const SCRIPT_DIR = __dirname;

const FRAMEWORK_DIRS = [
  '.ai/_framework',
];

const CLAUDE_DIRS = [
  '.claude/commands',
  '.claude/agents',
  '.claude/hooks',
];

const CLAUDE_FILES = [
  '.claude/settings.json',
];

const DIRS_TO_CREATE = [
  '.ai/tasks/todo',
  '.ai/tasks/in_progress',
  '.ai/tasks/done',
  '.ai/cockpit/events',
  '.ai/cockpit/shadows',
  '.ai/docs',
];

const VSCODE_EXTENSION = 'vscode-extension/ai-cockpit-0.1.0.vsix';

const COCKPIT_CONFIG = {
  version: '1.0.0',
  serverPort: 9999,
  eventStorage: 'file',
  gitBranchPattern: '([A-Z]+-\\d+)',
  enabled: true,
};

// ============================================================
// UTILITIES
// ============================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`  ⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`  ✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ${message}`, colors.dim);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function confirm(question, defaultYes = true) {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${suffix}`);

  if (answer === '') {
    return defaultYes;
  }
  return answer === 'y' || answer === 'yes';
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source file not found: ${src}`);
  }

  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

function createBackup(targetPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${targetPath}.backup-${timestamp}`;

  if (fs.existsSync(targetPath)) {
    if (fs.statSync(targetPath).isDirectory()) {
      copyDirectory(targetPath, backupPath);
    } else {
      fs.copyFileSync(targetPath, backupPath);
    }
    return backupPath;
  }
  return null;
}

function mergeSettings(existingPath, newSettings) {
  let existing = {};

  if (fs.existsSync(existingPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
    } catch (e) {
      logWarning(`Could not parse existing settings.json, will overwrite`);
    }
  }

  // Deep merge hooks
  const merged = { ...existing };

  if (newSettings.hooks) {
    merged.hooks = merged.hooks || {};

    for (const [hookType, hookConfigs] of Object.entries(newSettings.hooks)) {
      merged.hooks[hookType] = merged.hooks[hookType] || [];

      for (const newHook of hookConfigs) {
        // Check if this hook already exists (by matcher)
        const existingIndex = merged.hooks[hookType].findIndex(
          h => h.matcher === newHook.matcher
        );

        if (existingIndex === -1) {
          merged.hooks[hookType].push(newHook);
        } else {
          // Update existing hook
          merged.hooks[hookType][existingIndex] = newHook;
        }
      }
    }
  }

  return merged;
}

function isVSCodeAvailable() {
  try {
    const result = spawnSync('code', ['--version'], {
      stdio: 'pipe',
      shell: true
    });
    return result.status === 0;
  } catch (e) {
    return false;
  }
}

function installVSCodeExtension(vsixPath) {
  try {
    execSync(`code --install-extension "${vsixPath}" --force`, {
      stdio: 'pipe',
      shell: true,
    });
    return true;
  } catch (e) {
    return false;
  }
}

function printHelp() {
  console.log(`
${colors.bright}AI Framework Installation Script${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node install.js [target-directory] [options]

${colors.cyan}ARGUMENTS:${colors.reset}
  target-directory    Directory to install to (default: current directory)

${colors.cyan}OPTIONS:${colors.reset}
  --yes, -y           Non-interactive mode (accept all defaults)
  --no-extension      Skip VSCode extension installation
  --update            Update existing installation (overwrites framework only)
  --help, -h          Show this help message

${colors.cyan}EXAMPLES:${colors.reset}
  node install.js                     # Install to current directory
  node install.js ./my-project        # Install to specific directory
  node install.js --yes               # Non-interactive mode
  node install.js ./my-project -y     # Install to directory, non-interactive

${colors.cyan}WHAT GETS INSTALLED:${colors.reset}
  .ai/_framework/          Command definitions and templates
  .claude/commands/        Claude Code slash commands
  .claude/agents/          Lightweight subagents (Haiku model)
  .claude/hooks/           Event capture for VSCode extension
  .claude/settings.json    Hook configuration
  AI Cockpit extension     VSCode extension (optional)

${colors.cyan}AFTER INSTALLATION:${colors.reset}
  1. Open the target directory in VSCode
  2. Run /init in Claude Code to complete project setup
  3. The AI Cockpit panel will appear in the sidebar
`);
}

// ============================================================
// MAIN INSTALLATION LOGIC
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let targetDir = process.cwd();
  let nonInteractive = false;
  let skipExtension = false;
  let updateMode = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--yes' || arg === '-y') {
      nonInteractive = true;
    } else if (arg === '--no-extension') {
      skipExtension = true;
    } else if (arg === '--update') {
      updateMode = true;
    } else if (!arg.startsWith('-')) {
      targetDir = path.resolve(arg);
    }
  }

  // Header
  console.log(`
${colors.bright}╔══════════════════════════════════════════════════════════════════╗
║                    AI Framework Installer                         ║
╚══════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  log(`Target directory: ${targetDir}`, colors.dim);
  log(`Mode: ${updateMode ? 'Update' : 'Fresh install'}`, colors.dim);

  // --------------------------------------------------------
  // Step 1: Validate target directory
  // --------------------------------------------------------
  logStep('1/6', 'Validating target directory');

  if (!fs.existsSync(targetDir)) {
    if (nonInteractive) {
      fs.mkdirSync(targetDir, { recursive: true });
      logSuccess(`Created directory: ${targetDir}`);
    } else {
      const create = await confirm(`Directory does not exist. Create it?`);
      if (create) {
        fs.mkdirSync(targetDir, { recursive: true });
        logSuccess(`Created directory: ${targetDir}`);
      } else {
        logError('Installation cancelled');
        process.exit(1);
      }
    }
  } else {
    logSuccess('Directory exists');
  }

  // --------------------------------------------------------
  // Step 2: Check for existing installation
  // --------------------------------------------------------
  logStep('2/6', 'Checking for existing installation');

  const aiExists = fs.existsSync(path.join(targetDir, '.ai'));
  const claudeExists = fs.existsSync(path.join(targetDir, '.claude'));

  if ((aiExists || claudeExists) && !updateMode) {
    logWarning('Existing installation detected:');
    if (aiExists) logInfo('  - .ai/ directory found');
    if (claudeExists) logInfo('  - .claude/ directory found');

    if (!nonInteractive) {
      const proceed = await confirm('Create backup and continue?');
      if (!proceed) {
        logError('Installation cancelled');
        process.exit(1);
      }
    }

    // Create backups
    if (aiExists) {
      const backup = createBackup(path.join(targetDir, '.ai'));
      if (backup) logSuccess(`Backed up .ai/ to ${path.basename(backup)}`);
    }
    if (claudeExists) {
      const backup = createBackup(path.join(targetDir, '.claude'));
      if (backup) logSuccess(`Backed up .claude/ to ${path.basename(backup)}`);
    }
  } else if (updateMode) {
    logInfo('Update mode: will overwrite framework files only');
  } else {
    logSuccess('No existing installation found');
  }

  // --------------------------------------------------------
  // Step 3: Copy framework files
  // --------------------------------------------------------
  logStep('3/6', 'Installing framework files');

  for (const dir of FRAMEWORK_DIRS) {
    const src = path.join(SCRIPT_DIR, dir);
    const dest = path.join(targetDir, dir);

    try {
      copyDirectory(src, dest);
      logSuccess(`Copied ${dir}/`);
    } catch (e) {
      logError(`Failed to copy ${dir}: ${e.message}`);
      process.exit(1);
    }
  }

  // --------------------------------------------------------
  // Step 4: Copy Claude integration files
  // --------------------------------------------------------
  logStep('4/6', 'Installing Claude Code integration');

  for (const dir of CLAUDE_DIRS) {
    const src = path.join(SCRIPT_DIR, dir);
    const dest = path.join(targetDir, dir);

    try {
      copyDirectory(src, dest);
      logSuccess(`Copied ${dir}/`);
    } catch (e) {
      logError(`Failed to copy ${dir}: ${e.message}`);
      process.exit(1);
    }
  }

  // Handle settings.json merge
  const settingsSrc = path.join(SCRIPT_DIR, '.claude/settings.json');
  const settingsDest = path.join(targetDir, '.claude/settings.json');

  if (fs.existsSync(settingsSrc)) {
    try {
      const newSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf-8'));
      const merged = mergeSettings(settingsDest, newSettings);

      fs.mkdirSync(path.dirname(settingsDest), { recursive: true });
      fs.writeFileSync(settingsDest, JSON.stringify(merged, null, 2));
      logSuccess('Merged .claude/settings.json');
    } catch (e) {
      logWarning(`Could not merge settings.json: ${e.message}`);
    }
  }

  // --------------------------------------------------------
  // Step 5: Create directory structure
  // --------------------------------------------------------
  logStep('5/6', 'Creating directory structure');

  for (const dir of DIRS_TO_CREATE) {
    const fullPath = path.join(targetDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logSuccess(`Created ${dir}/`);
    } else {
      logInfo(`${dir}/ already exists`);
    }
  }

  // Create cockpit config
  const cockpitConfigPath = path.join(targetDir, '.ai/cockpit/config.json');
  if (!fs.existsSync(cockpitConfigPath)) {
    fs.writeFileSync(cockpitConfigPath, JSON.stringify(COCKPIT_CONFIG, null, 2));
    logSuccess('Created .ai/cockpit/config.json');
  }

  // Create .gitkeep files for empty directories
  const gitkeepDirs = [
    '.ai/tasks/todo',
    '.ai/tasks/in_progress',
    '.ai/tasks/done',
    '.ai/cockpit/events',
    '.ai/cockpit/shadows',
  ];

  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(targetDir, dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }

  // --------------------------------------------------------
  // Step 6: Install VSCode extension
  // --------------------------------------------------------
  logStep('6/6', 'VSCode extension');

  if (skipExtension) {
    logInfo('Skipped (--no-extension flag)');
  } else {
    const vsixPath = path.join(SCRIPT_DIR, VSCODE_EXTENSION);

    if (!fs.existsSync(vsixPath)) {
      logWarning('Extension file not found, skipping');
      logInfo(`Expected: ${vsixPath}`);
    } else if (!isVSCodeAvailable()) {
      logWarning('VSCode CLI not available, skipping extension install');
      logInfo('Install manually: code --install-extension ' + vsixPath);
    } else {
      let shouldInstall = true;

      if (!nonInteractive) {
        shouldInstall = await confirm('Install AI Cockpit VSCode extension?');
      }

      if (shouldInstall) {
        const success = installVSCodeExtension(vsixPath);
        if (success) {
          logSuccess('AI Cockpit extension installed');
        } else {
          logWarning('Failed to install extension');
          logInfo('Install manually: code --install-extension ' + vsixPath);
        }
      } else {
        logInfo('Skipped by user');
      }
    }
  }

  // --------------------------------------------------------
  // Success message
  // --------------------------------------------------------
  console.log(`
${colors.green}${colors.bright}╔══════════════════════════════════════════════════════════════════╗
║                    Installation Complete!                         ║
╚══════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}Next steps:${colors.reset}

  1. ${colors.bright}Open the project in VSCode${colors.reset}
     cd ${targetDir}
     code .

  2. ${colors.bright}Run /init in Claude Code${colors.reset}
     This will configure the framework for your project

  3. ${colors.bright}Start using the framework${colors.reset}
     /task-create   - Create a new task
     /task-status   - View task dashboard
     /help          - See all commands

${colors.dim}The AI Cockpit panel will appear in the VSCode sidebar once
you have an active Claude Code session.${colors.reset}
`);
}

// Run main
main().catch((e) => {
  logError(`Installation failed: ${e.message}`);
  process.exit(1);
});
