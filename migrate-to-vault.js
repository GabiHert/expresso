#!/usr/bin/env node

/**
 * migrate-to-vault.js
 *
 * Migrates a project's .ai/ folder from filesystem+YAML to Obsidian vault format.
 * All YAML files become .md with frontmatter. Status subfolders are flattened.
 * Cockpit is removed. .obsidian/ baseline config is created. .mcp.json is created/merged.
 *
 * Usage: node migrate-to-vault.js /path/to/project
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// ============================================================
// CONFIG
// ============================================================

const OBSIDIAN_GIT_PLUGIN_ID = 'obsidian-git';

const OBSIDIAN_BASELINE = {
  'app.json': JSON.stringify({
    livePreview: true,
    showFrontmatter: true,
    foldHeading: true,
    foldIndent: true,
  }, null, 2),
  'appearance.json': JSON.stringify({
    baseFontSize: 16,
    interfaceFontSize: 14,
  }, null, 2),
  'core-plugins.json': JSON.stringify([
    'file-explorer', 'global-search', 'graph',
    'outline', 'tag-pane', 'backlink',
    'page-preview', 'templates',
  ], null, 2),
  'community-plugins.json': JSON.stringify([
    OBSIDIAN_GIT_PLUGIN_ID,
  ], null, 2),
  'hotkeys.json': JSON.stringify({}, null, 2),
};

const OBSIDIAN_GIT_CONFIG = {
  commitMessage: 'vault: auto-sync {{date}}',
  autoSaveInterval: 5,
  autoPullInterval: 10,
  autoPullOnBoot: true,
  disablePush: false,
  pullBeforePush: true,
  disablePopups: false,
  listChangedFilesInMessageBody: true,
  showStatusBar: true,
  updateSubmodules: false,
  syncMethod: 'merge',
  gitPath: '',
  customMessageOnAutoBackup: false,
  autoBackupAfterFileChange: false,
  treeStructure: false,
  refreshSourceControl: true,
  basePath: '',
  differentIntervalCommitAndPush: false,
  changedFilesInStatusBar: false,
  showedMobileNotice: true,
  refreshSourceControlTimer: 7000,
  showBranchStatusBar: true,
  setLastSaveToLastCommit: false,
};

const GITIGNORE_ENTRIES = [
  '.obsidian/workspace.json',
  '.obsidian/workspace-mobile.json',
  '.obsidian/cache',
];

const ROOT_GITIGNORE_ENTRIES = [
  'ai-vault',
];

// ============================================================
// HELPERS
// ============================================================

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ wrote: ${path.relative(process.cwd(), filePath)}`);
}

function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log(`  🗑  deleted: ${path.relative(process.cwd(), filePath)}`);
  } catch { /* ignore */ }
}

function deleteDirIfEmpty(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      fs.rmdirSync(dirPath);
      console.log(`  🗑  removed empty dir: ${path.relative(process.cwd(), dirPath)}`);
    }
  } catch { /* ignore */ }
}

function deleteDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`  🗑  deleted dir: ${path.relative(process.cwd(), dirPath)}`);
  } catch { /* ignore */ }
}

function parseYaml(content) {
  try {
    return yaml.parse(content);
  } catch (e) {
    console.warn(`  ⚠️  YAML parse error: ${e.message}`);
    return null;
  }
}

function toFrontmatter(obj) {
  return `---\n${yaml.stringify(obj).trim()}\n---`;
}

function hasFrontmatter(content) {
  return content.trimStart().startsWith('---');
}

function parseFrontmatterAndBody(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: null, body: content };
  }
  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) {
    return { frontmatter: null, body: content };
  }
  const fmStr = trimmed.substring(3, endIdx).trim();
  const body = trimmed.substring(endIdx + 3).trimStart();
  return { frontmatter: parseYaml(fmStr), body };
}

function listDirs(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch { return []; }
}

function listFiles(dirPath, ext) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isFile() && (!ext || d.name.endsWith(ext)))
      .map(d => d.name);
  } catch { return []; }
}

function listAllFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name);
  } catch { return []; }
}

// ============================================================
// MIGRATION STEPS
// ============================================================

const oldPatternRefs = [];

function trackOldPattern(filePath, pattern, line) {
  oldPatternRefs.push({ file: filePath, pattern, line });
}

// Step 1: Manifest
function migrateManifest(aiDir) {
  console.log('\n📋 Step 1: Migrate manifest.yaml → manifest.md');
  const manifestPath = path.join(aiDir, '_project', 'manifest.yaml');
  const content = readFile(manifestPath);
  if (!content) {
    console.log('  ⚠️  No manifest.yaml found, skipping');
    return;
  }

  const data = parseYaml(content);
  if (!data) return;

  const frontmatter = {
    type: 'manifest',
    project: data.project?.name || 'Unknown',
    root: data.project?.root || '',
    repos: data.repos || [],
    mcps: data.mcps || {},
    conventions: data.conventions || {},
    agents: data.agents || {},
    notifications: data.notifications || {},
    framework: data.framework || {},
    tags: ['manifest', 'config'],
  };

  if (data.lightweight_commands) {
    frontmatter.lightweight_commands = data.lightweight_commands;
  }
  if (data.auto_sync) {
    frontmatter.auto_sync = data.auto_sync;
  }

  const repoList = (data.repos || [])
    .map(r => `- **${r.name}**: ${r.description || r.path}`)
    .join('\n');

  const body = `# ${data.project?.name || 'Project'}\n\n${data.project?.description || ''}\n\n## Repositories\n${repoList}\n`;

  const outputPath = path.join(aiDir, '_project', 'manifest.md');
  writeFile(outputPath, `${toFrontmatter(frontmatter)}\n\n${body}`);
  deleteFile(manifestPath);
}

// Step 2: Tasks
function migrateTasks(aiDir) {
  console.log('\n📝 Step 2: Migrate tasks (flatten folders, frontmatter status)');
  const tasksDir = path.join(aiDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    console.log('  ⚠️  No tasks/ directory found, skipping');
    return;
  }

  const statusFolders = ['todo', 'in_progress', 'done'];

  for (const statusFolder of statusFolders) {
    const statusDir = path.join(tasksDir, statusFolder);
    if (!fs.existsSync(statusDir)) continue;

    const taskDirs = listDirs(statusDir);
    for (const taskId of taskDirs) {
      const taskDir = path.join(statusDir, taskId);
      const status = statusFolder === 'in_progress' ? 'in_progress' : statusFolder;

      console.log(`\n  📂 Task: ${taskId} (${status})`);
      migrateTask(aiDir, tasksDir, taskDir, taskId, status);
    }

    // After moving all tasks out, remove the status folder
    deleteDirIfEmpty(statusDir);
  }
}

function migrateTask(aiDir, tasksDir, taskDir, taskId, status) {
  // Read status.yaml
  const statusYamlPath = path.join(taskDir, 'status.yaml');
  const statusContent = readFile(statusYamlPath);
  const statusData = statusContent ? parseYaml(statusContent) : null;

  // Read README.md
  const readmePath = path.join(taskDir, 'README.md');
  const readmeContent = readFile(readmePath);
  if (!readmeContent) {
    console.log(`    ⚠️  No README.md found for ${taskId}, skipping`);
    return;
  }

  // Strip HTML comment header if present
  let body = readmeContent;
  const commentEnd = body.indexOf('-->');
  if (body.trimStart().startsWith('<!--') && commentEnd !== -1) {
    body = body.substring(commentEnd + 3).trimStart();
  }

  // Build frontmatter from status.yaml + folder status
  const frontmatter = {
    type: 'task',
    id: taskId,
    title: statusData?.title || extractTitle(body),
    status: status,
    created: statusData?.created || '',
    updated: statusData?.updated || '',
    tags: ['task', status],
  };

  if (statusData?.summary) {
    frontmatter.summary = statusData.summary;
  }

  // Extract repos and branches from work items
  if (statusData?.work_items) {
    const repos = [...new Set(statusData.work_items.map(wi => wi.repo).filter(Boolean))];
    if (repos.length > 0) frontmatter.repos = repos;
    frontmatter.tags.push(...repos);
  }

  // Build wikilinks for work items
  const wiLinks = (statusData?.work_items || [])
    .map(wi => {
      const wiFilename = wi.file
        ? path.basename(wi.file, '.md')
        : `${taskId}-${wi.id.includes('-') ? wi.id.split('-').pop() : wi.id}`;
      return `- [[${wiFilename}]] — ${wi.name} (${wi.status})`;
    })
    .join('\n');

  // Replace "See status.yaml" references and inject wikilinked work item list
  body = body.replace(/See `status\.yaml` for full index\.\n?/g, '');

  // Try to replace existing work items table with wikilinked version
  if (wiLinks) {
    // Append linked work items section at the end
    body += `\n\n## Linked Work Items\n\n${wiLinks}\n`;
  }

  // Add link to manifest
  body = `> Project: [[manifest]]\n\n${body}`;

  // Write task note
  const destDir = path.join(tasksDir, taskId);
  const destFile = path.join(destDir, `${taskId}.md`);
  fs.mkdirSync(destDir, { recursive: true });
  writeFile(destFile, `${toFrontmatter(frontmatter)}\n\n${body}`);

  // Migrate work items
  migrateWorkItems(taskDir, destDir, taskId, statusData);

  // Delete status.yaml
  deleteFile(statusYamlPath);

  // Delete old README.md (we wrote the new task note)
  if (readmePath !== destFile) {
    deleteFile(readmePath);
  }

  // Move any remaining files (feedback/, etc.) to new location
  moveRemainingFiles(taskDir, destDir);

  // Clean up old task directory if it's different from dest
  if (taskDir !== destDir) {
    deleteDir(taskDir);
  }
}

function migrateWorkItems(taskDir, destDir, taskId, statusData) {
  const wiSubfolders = ['todo', 'in_progress', 'done'];

  for (const subFolder of wiSubfolders) {
    const wiDir = path.join(taskDir, subFolder);
    if (!fs.existsSync(wiDir)) continue;

    const wiFiles = listFiles(wiDir, '.md');
    for (const wiFile of wiFiles) {
      const wiPath = path.join(wiDir, wiFile);
      const wiContent = readFile(wiPath);
      if (!wiContent) continue;

      const wiStatus = subFolder === 'in_progress' ? 'in_progress' : subFolder;

      // Find matching status.yaml entry
      const wiMatch = findWorkItemMatch(statusData, wiFile, taskId);

      // Strip HTML comment header
      let wiBody = wiContent;
      const commentEnd = wiBody.indexOf('-->');
      if (wiBody.trimStart().startsWith('<!--') && commentEnd !== -1) {
        wiBody = wiBody.substring(commentEnd + 3).trimStart();
      }

      // Handle existing pseudo-frontmatter (repo context blocks)
      const { frontmatter: existingFm, body: cleanBody } = parseFrontmatterAndBody(wiBody);
      if (existingFm) {
        wiBody = cleanBody;
      }

      // Build proper frontmatter
      const wiFm = {
        type: 'work-item',
        id: wiMatch?.id || wiFile.replace('.md', ''),
        parent: taskId,
        title: wiMatch?.name || extractTitle(wiBody),
        status: wiStatus,
        repo: wiMatch?.repo || existingFm?.repo || '',
        tags: ['work-item', wiStatus],
      };

      if (wiMatch?.repo) wiFm.tags.push(wiMatch.repo);
      if (wiMatch?.depends_on?.length) wiFm.depends_on = wiMatch.depends_on;
      if (wiMatch?.bdd_feature) wiFm.bdd_feature = wiMatch.bdd_feature;
      if (existingFm?.branch) wiFm.branch = existingFm.branch;

      // Add backlink to parent task at the top of body
      const backlink = `> Parent: [[${taskId}]]\n\n`;
      wiBody = backlink + wiBody;

      // Write to task root (not subfolder)
      const destPath = path.join(destDir, wiFile);
      writeFile(destPath, `${toFrontmatter(wiFm)}\n\n${wiBody}`);

      // Scan for old patterns
      scanForOldPatterns(destPath, wiBody);
    }

    // Remove the subfolder
    deleteDir(path.join(taskDir, subFolder));
  }
}

function findWorkItemMatch(statusData, filename, taskId) {
  if (!statusData?.work_items) return null;
  return statusData.work_items.find(wi => {
    if (wi.file && wi.file.includes(filename.replace('.md', ''))) return true;
    const wiId = wi.id.includes('-') ? wi.id : `${taskId}-${wi.id}`;
    return filename.startsWith(wiId) || filename.includes(wi.id);
  });
}

function moveRemainingFiles(srcDir, destDir) {
  if (srcDir === destDir) return;
  const entries = [];
  try {
    entries.push(...fs.readdirSync(srcDir, { withFileTypes: true }));
  } catch { return; }

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.name === 'status.yaml') continue; // already handled
    if (['todo', 'in_progress', 'done'].includes(entry.name)) continue; // already handled

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`  📁 moved dir: ${entry.name}`);
      }
    } else if (entry.isFile() && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  📄 moved file: ${entry.name}`);
    }
  }
}

function extractTitle(body) {
  const match = body.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled';
}

// Step 3: Extension sources
function migrateExtensions(aiDir) {
  console.log('\n🔧 Step 3: Migrate extension sources (.yaml → .md)');
  const cmdDir = path.join(aiDir, '_project', 'commands');
  if (!fs.existsSync(cmdDir)) {
    console.log('  ⚠️  No _project/commands/ directory found, skipping');
    return;
  }

  const yamlFiles = listAllFiles(cmdDir).filter(f => f.endsWith('.yaml'));

  for (const file of yamlFiles) {
    const filePath = path.join(cmdDir, file);
    const content = readFile(filePath);
    if (!content) continue;

    const data = parseYaml(content);
    if (!data) continue;

    const frontmatter = {
      type: 'extension-source',
      variant: data.variant || '',
      extends: data.extends || '',
      description: data.description || `${data.extends}:${data.variant} variant`,
      tags: ['extension', data.extends, data.variant].filter(Boolean),
    };

    if (data.created) frontmatter.created = data.created;
    if (data.updated) frontmatter.updated = data.updated;
    if (data.step_overrides) frontmatter.step_overrides = data.step_overrides;
    if (data.pre_hooks) frontmatter.pre_hooks = data.pre_hooks;
    if (data.post_hooks) frontmatter.post_hooks = data.post_hooks;
    if (data.agents) frontmatter.agents = data.agents;

    const extendsLink = `> Extends: [[${data.extends}]]\n\n`;
    const body = data.context
      ? `${extendsLink}# ${data.extends}:${data.variant}\n\n${data.context}`
      : `${extendsLink}# ${data.extends}:${data.variant}\n`;

    const outputPath = filePath.replace(/\.yaml$/, '.md');
    writeFile(outputPath, `${toFrontmatter(frontmatter)}\n\n${body}`);
    deleteFile(filePath);
  }
}

// Step 4: Agent definitions
function migrateAgents(aiDir) {
  console.log('\n🤖 Step 4: Migrate agent definitions (.yaml → .md)');
  const agentsDir = path.join(aiDir, '_framework', 'agents');
  if (!fs.existsSync(agentsDir)) {
    console.log('  ⚠️  No _framework/agents/ directory found, skipping');
    return;
  }

  const yamlFiles = listFiles(agentsDir, '.yaml');

  for (const file of yamlFiles) {
    const filePath = path.join(agentsDir, file);
    const content = readFile(filePath);
    if (!content) continue;

    const data = parseYaml(content);
    if (!data) continue;

    const frontmatter = {
      type: 'agent',
      name: data.name || file.replace('.yaml', ''),
      scope: data.scope || 'unknown',
      tags: ['agent', data.scope || 'unknown'],
    };

    if (data.version) frontmatter.version = data.version;
    if (data.model) frontmatter.model = data.model;
    if (data.tools) frontmatter.tools = data.tools;
    if (data.execution) frontmatter.execution = data.execution;
    if (data.context) frontmatter.context = data.context;
    if (data.output) frontmatter.output = data.output;

    // The prompt becomes the body
    const prompt = data.prompt || '';
    const description = data.description || '';
    const body = `# ${data.name || file.replace('.yaml', '')} Agent\n\n${description}\n\n${prompt}`;

    const outputPath = filePath.replace(/\.yaml$/, '.md');
    writeFile(outputPath, `${toFrontmatter(frontmatter)}\n\n${body}`);
    deleteFile(filePath);
  }
}

// Step 5: Add frontmatter to docs
function migrateDocs(aiDir) {
  console.log('\n📚 Step 5: Add frontmatter to docs');
  const docsDir = path.join(aiDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    console.log('  ⚠️  No docs/ directory found, skipping');
    return;
  }

  processDocsDir(docsDir, docsDir);
}

function processDocsDir(baseDir, currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      processDocsDir(baseDir, fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = readFile(fullPath);
      if (!content) continue;

      // Skip if already has frontmatter
      if (hasFrontmatter(content)) {
        console.log(`  ⏭  already has frontmatter: ${path.relative(baseDir, fullPath)}`);
        scanForOldPatterns(fullPath, content);
        continue;
      }

      // Derive metadata from path
      const relPath = path.relative(baseDir, fullPath);
      const parts = relPath.split(path.sep);
      const repo = parts.length > 1 && !parts[0].startsWith('_') ? parts[0] : '';
      const domain = parts.length > 2 ? parts[1] : '';

      const tags = ['doc'];
      if (repo) tags.push(repo);
      if (domain) tags.push(domain);

      const frontmatter = {
        type: parts[0].startsWith('_') ? 'internal-doc' : 'doc',
        tags,
      };
      if (repo) frontmatter.repo = repo;
      if (domain) frontmatter.domain = domain;

      // Add links based on metadata
      let linkedContent = content;
      const links = [];
      if (repo) links.push(`[[manifest]]`);
      // Scan for references to other docs or tasks in the content
      // and add a navigation footer
      if (links.length > 0) {
        linkedContent = `> ${links.join(' | ')}\n\n${linkedContent}`;
      }

      writeFile(fullPath, `${toFrontmatter(frontmatter)}\n\n${linkedContent}`);
      scanForOldPatterns(fullPath, linkedContent);
    }
  }
}

// Step 6: Delete cockpit
function deleteCockpit(aiDir) {
  console.log('\n🗑  Step 6: Delete cockpit/');
  const cockpitDir = path.join(aiDir, 'cockpit');
  if (fs.existsSync(cockpitDir)) {
    deleteDir(cockpitDir);
  } else {
    console.log('  ⏭  No cockpit/ directory found');
  }
}

// Step 7: Initialize .obsidian
function initObsidian(aiDir) {
  console.log('\n⚙️  Step 7: Initialize .obsidian/ baseline config');
  const obsidianDir = path.join(aiDir, '.obsidian');
  fs.mkdirSync(obsidianDir, { recursive: true });

  for (const [file, content] of Object.entries(OBSIDIAN_BASELINE)) {
    writeFile(path.join(obsidianDir, file), content);
  }

  // Obsidian Git plugin config
  const pluginsDir = path.join(obsidianDir, 'plugins', OBSIDIAN_GIT_PLUGIN_ID);
  fs.mkdirSync(pluginsDir, { recursive: true });
  writeFile(path.join(pluginsDir, 'data.json'), JSON.stringify(OBSIDIAN_GIT_CONFIG, null, 2));
  writeFile(path.join(pluginsDir, 'manifest.json'), JSON.stringify({
    id: OBSIDIAN_GIT_PLUGIN_ID,
    name: 'Obsidian Git',
    version: '2.31.0',
    description: 'Backup your vault with Git',
  }, null, 2));

  // .gitignore for workspace files
  const gitignorePath = path.join(aiDir, '.gitignore');
  let gitignore = readFile(gitignorePath) || '';
  let modified = false;

  for (const entry of GITIGNORE_ENTRIES) {
    if (!gitignore.includes(entry)) {
      gitignore += `\n${entry}`;
      modified = true;
    }
  }

  if (modified) {
    writeFile(gitignorePath, gitignore.trim() + '\n');
  }

  // Create visible symlink for Obsidian (hidden .ai folder is not selectable in macOS file picker)
  const projectRoot = path.dirname(aiDir);
  const symlinkPath = path.join(projectRoot, 'ai-vault');
  try {
    if (!fs.existsSync(symlinkPath)) {
      fs.symlinkSync(aiDir, symlinkPath);
      console.log(`  🔗 created symlink: ai-vault → .ai/`);
    } else {
      console.log(`  ⏭  symlink ai-vault already exists`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Could not create symlink: ${e.message}`);
  }

  // Add symlink to project root .gitignore
  const rootGitignorePath = path.join(projectRoot, '.gitignore');
  let rootGitignore = readFile(rootGitignorePath) || '';
  let rootModified = false;
  for (const entry of ROOT_GITIGNORE_ENTRIES) {
    if (!rootGitignore.includes(entry)) {
      rootGitignore += `\n${entry}`;
      rootModified = true;
    }
  }
  if (rootModified) {
    writeFile(rootGitignorePath, rootGitignore.trim() + '\n');
  }
}

// Step 8: Create/merge .mcp.json
function setupMcpJson(projectRoot, aiDir) {
  console.log('\n🔌 Step 8: Create/merge .mcp.json');
  const mcpJsonPath = path.join(projectRoot, '.mcp.json');
  let mcpConfig = {};

  const existing = readFile(mcpJsonPath);
  if (existing) {
    try {
      mcpConfig = JSON.parse(existing);
    } catch {
      console.log('  ⚠️  Existing .mcp.json is invalid, backing up');
      fs.copyFileSync(mcpJsonPath, mcpJsonPath + '.bak');
      mcpConfig = {};
    }
  }

  if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};

  const relAiDir = path.relative(projectRoot, aiDir);

  mcpConfig.mcpServers.vault = {
    command: 'npx',
    args: ['@bitbonsai/mcpvault@latest', `./${relAiDir}`],
  };

  writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));
}

// Step 9: Scan for old patterns
function scanForOldPatterns(filePath, content) {
  const patterns = [
    { regex: /status\.yaml/g, name: 'status.yaml reference' },
    { regex: /manifest\.yaml/g, name: 'manifest.yaml reference' },
    { regex: /todo\//g, name: 'todo/ folder reference' },
    { regex: /in_progress\//g, name: 'in_progress/ folder reference' },
    { regex: /\/done\//g, name: 'done/ folder reference' },
    { regex: /Move this file to in_progress/g, name: 'old workflow instruction' },
    { regex: /Move to done\//g, name: 'old workflow instruction' },
    { regex: /Update status\.yaml/g, name: 'status.yaml update instruction' },
    { regex: /cockpit\//g, name: 'cockpit/ reference' },
    { regex: /\.yaml/g, name: '.yaml file reference' },
  ];

  const lines = content.split('\n');
  for (const { regex, name } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        trackOldPattern(filePath, name, i + 1);
      }
      regex.lastIndex = 0;
    }
  }
}

function scanFrameworkCommands(aiDir) {
  console.log('\n🔍 Step 9: Scan for old pattern references');
  const cmdDir = path.join(aiDir, '_framework', 'commands');
  if (!fs.existsSync(cmdDir)) return;

  const files = listFiles(cmdDir, '.md');
  for (const file of files) {
    const filePath = path.join(cmdDir, file);
    const content = readFile(filePath);
    if (content) scanForOldPatterns(filePath, content);
  }

  // Also scan project commands
  const projCmdDir = path.join(aiDir, '_project', 'commands');
  if (fs.existsSync(projCmdDir)) {
    const projFiles = listAllFiles(projCmdDir);
    for (const file of projFiles) {
      const filePath = path.join(projCmdDir, file);
      const content = readFile(filePath);
      if (content) scanForOldPatterns(filePath, content);
    }
  }
}

function printReport(projectRoot) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(70));

  if (oldPatternRefs.length === 0) {
    console.log('\n✅ No old pattern references found!');
    return;
  }

  console.log(`\n⚠️  Found ${oldPatternRefs.length} old pattern references that need AI agent review:\n`);

  // Group by file
  const grouped = {};
  for (const ref of oldPatternRefs) {
    const relPath = path.relative(projectRoot, ref.file);
    if (!grouped[relPath]) grouped[relPath] = [];
    grouped[relPath].push(ref);
  }

  for (const [file, refs] of Object.entries(grouped)) {
    console.log(`  📄 ${file}`);
    const uniquePatterns = [...new Set(refs.map(r => `    L${r.line}: ${r.pattern}`))];
    uniquePatterns.forEach(p => console.log(p));
    console.log('');
  }

  // Write report file
  const reportPath = path.join(projectRoot, '.ai', 'tmp', 'migration-report.md');
  const reportContent = `---
type: migration-report
generated: ${new Date().toISOString()}
total_issues: ${oldPatternRefs.length}
tags: [migration, vault]
---

# Vault Migration Report

## Files with old pattern references

These files contain references to the old filesystem-based structure and need
to be updated to use vault-native patterns (frontmatter, mcpvault MCP tools).

${Object.entries(grouped).map(([file, refs]) => {
  const uniqueRefs = [...new Set(refs.map(r => `- L${r.line}: ${r.pattern}`))];
  return `### ${file}\n${uniqueRefs.join('\n')}`;
}).join('\n\n')}

## What the AI agent should do

1. **Replace folder-based status** with frontmatter queries
   - \`tasks/todo/\` → \`search_notes\` with \`status: todo\` tag
   - \`tasks/in_progress/\` → \`search_notes\` with \`status: in_progress\` tag
   - \`Move to done/\` → \`update_frontmatter\` to set \`status: done\`

2. **Replace status.yaml reads** with frontmatter reads
   - \`Read status.yaml\` → \`get_frontmatter\` on the task note
   - \`Update status.yaml\` → \`update_frontmatter\` on the task note

3. **Replace manifest.yaml reads** with manifest.md
   - \`Read manifest.yaml\` → \`Read manifest.md\` or \`get_frontmatter("_project/manifest.md")\`

4. **Update work item workflow instructions**
   - Remove "Move this file to in_progress/" instructions
   - Replace with "Update frontmatter status to in_progress"

5. **Remove cockpit references**
   - Any references to \`cockpit/\`, \`shadows/\`, session events

6. **Test mcpvault integration**
   - Verify \`search_notes\` returns tasks by status tag
   - Verify \`read_note\` parses frontmatter correctly
   - Verify \`write_note\` creates proper notes
   - Verify \`update_frontmatter\` updates status correctly
   - Verify \`patch_note\` can update work item checkboxes

7. **Test Obsidian**
   - Open .ai/ as vault in Obsidian
   - Verify Git plugin is configured and auto-syncs
   - Verify graph view shows note connections
   - Verify search finds notes by tags and content
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFile(reportPath, reportContent);
  console.log(`\n📋 Full report written to: ${path.relative(projectRoot, reportPath)}`);
}

// Step 10: Auto-link pass
// Scans all migrated .md files for plain-text references to known note names
// and converts them to [[wikilinks]] where they aren't already linked.
function autoLinkPass(aiDir) {
  console.log('\n🔗 Step 10: Auto-link pass (convert plain references to wikilinks)');

  // Build index of all note names (filename without .md)
  const noteNames = new Set();
  collectNoteNames(aiDir, noteNames);

  // Sort by length descending so longer names match first (prevents partial matches)
  const sortedNames = [...noteNames].sort((a, b) => b.length - a.length);

  console.log(`  Found ${sortedNames.length} notes to cross-reference`);

  // Scan all .md files and inject wikilinks
  let totalLinksAdded = 0;
  totalLinksAdded += linkFilesInDir(aiDir, sortedNames);

  // Add parent backlinks to any work-item that doesn't have one yet
  const backlinksAdded = addParentBacklinks(aiDir);
  totalLinksAdded += backlinksAdded;

  // Ensure task notes link to all their work items (scan folder)
  const taskLinksAdded = addTaskToWorkItemLinks(aiDir);
  totalLinksAdded += taskLinksAdded;

  // Add links between agents and the agents index
  const agentLinksAdded = addAgentLinks(aiDir);
  totalLinksAdded += agentLinksAdded;

  console.log(`  Added ${totalLinksAdded} wikilinks (${backlinksAdded} parent backlinks, ${taskLinksAdded} task→WI links, ${agentLinksAdded} agent links)`);
}

function addParentBacklinks(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '.obsidian' || entry.name === 'tmp') continue;

    if (entry.isDirectory()) {
      count += addParentBacklinks(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = readFile(fullPath);
      if (!content) continue;

      const { frontmatter } = parseFrontmatterAndBody(content);
      if (!frontmatter || frontmatter.type !== 'work-item' || !frontmatter.parent) continue;

      // Check if backlink already exists
      if (content.includes(`> Parent: [[${frontmatter.parent}]]`)) continue;

      // Inject backlink after frontmatter
      const fmEnd = findFrontmatterEnd(content);
      const fm = content.substring(0, fmEnd);
      const body = content.substring(fmEnd);
      const linked = `${fm}\n\n> Parent: [[${frontmatter.parent}]]\n${body}`;

      fs.writeFileSync(fullPath, linked, 'utf8');
      count++;
    }
  }
  return count;
}

function collectNoteNames(dir, names) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '.obsidian' || entry.name === 'tmp') continue;
    if (entry.isDirectory()) {
      collectNoteNames(fullPath, names);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      names.add(entry.name.replace('.md', ''));
    }
  }
}

// Words that are also note names but should NOT be auto-linked in prose
const SKIP_AUTOLINK = new Set([
  'context', 'document', 'manifest', 'help', 'init', 'ask', 'enhance',
  'overview', 'README', 'INDEX', 'status',
]);

function linkFilesInDir(dir, noteNames) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '.obsidian' || entry.name === 'tmp') continue;

    if (entry.isDirectory()) {
      count += linkFilesInDir(fullPath, noteNames);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = readFile(fullPath);
      if (!content) continue;

      // Only replace in body, not in frontmatter
      const fmEnd = findFrontmatterEnd(content);
      const fm = content.substring(0, fmEnd);
      let body = content.substring(fmEnd);
      let fileLinks = 0;
      const thisNote = entry.name.replace('.md', '');

      // Strip code blocks before linking, restore after
      const codeBlocks = [];
      body = body.replace(/```[\s\S]*?```/g, (match) => {
        codeBlocks.push(match);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
      });
      // Strip inline code
      const inlineCode = [];
      body = body.replace(/`[^`]+`/g, (match) => {
        inlineCode.push(match);
        return `__INLINE_CODE_${inlineCode.length - 1}__`;
      });

      for (const name of noteNames) {
        if (name === thisNote) continue;
        if (name.length < 6) continue;
        if (SKIP_AUTOLINK.has(name)) continue;

        // Only match task IDs (LOCAL-xxx, EEXPR-xxx) and hyphenated note names
        if (!/^[A-Z]+-\d+/.test(name) && !/^[a-z]+-[a-z]/.test(name)) continue;

        const regex = new RegExp(
          `(?<!\\[\\[)\\b(${escapeRegex(name)})\\b(?!\\]\\])`,
          'g'
        );

        let replaced = false;
        body = body.replace(regex, (match) => {
          if (replaced) return match;
          replaced = true;
          fileLinks++;
          return `[[${match}]]`;
        });
      }

      // Restore code blocks
      body = body.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[i]);
      body = body.replace(/__INLINE_CODE_(\d+)__/g, (_, i) => inlineCode[i]);

      if (fileLinks > 0) {
        fs.writeFileSync(fullPath, fm + body, 'utf8');
        count += fileLinks;
      }
    }
  }
  return count;
}

function findFrontmatterEnd(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return 0;
  const offset = content.length - trimmed.length;
  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return 0;
  return offset + endIdx + 3;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const projectRoot = process.argv[2];
  if (!projectRoot) {
    console.error('Usage: node migrate-to-vault.js /path/to/project');
    process.exit(1);
  }

  const resolvedRoot = path.resolve(projectRoot);
  const aiDir = path.join(resolvedRoot, '.ai');

  if (!fs.existsSync(aiDir)) {
    console.error(`Error: .ai/ directory not found at ${aiDir}`);
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ VAULT MIGRATION SCRIPT                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║ Project: ${resolvedRoot}`);
  console.log(`║ .ai dir: ${aiDir}`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  migrateManifest(aiDir);
  migrateTasks(aiDir);
  migrateExtensions(aiDir);
  migrateAgents(aiDir);
  migrateDocs(aiDir);
  deleteCockpit(aiDir);
  initObsidian(aiDir);
  setupMcpJson(resolvedRoot, aiDir);
  scanFrameworkCommands(aiDir);
  autoLinkPass(aiDir);
  printReport(resolvedRoot);

  console.log('\n✅ Migration complete!');
  console.log('   Next steps:');
  console.log('   1. Review the migration report above');
  console.log('   2. Run the AI agent with the detailed prompt to fix old pattern references');
  console.log('   3. Open .ai/ as an Obsidian vault and verify');
  console.log('   4. Test mcpvault MCP tools (search, read, write)');
  console.log('   5. Verify Obsidian Git plugin auto-syncs');
}

main();
