

> Parent: [[manifest]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /task-explore                                           ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Explore codebase for task context                       ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /task-explore - Explore Codebase

## Description

Explore the codebase to understand context for a task or question. Uses exploration agents to thoroughly investigate the code and report findings.

## SCOPE CONSTRAINT
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ READ-ONLY COMMAND — DO NOT MODIFY ANY FILES                  │
│                                                                 │
│ ALLOWED:  Read any file, display output to user                 │
│ FORBIDDEN: Edit, Write, create, or delete ANY files             │
│ TEMP FILES: If you must create scratch files, use .ai/tmp/      │
│                                                                 │
│ This command explores and reports findings only. It must NEVER   │
│ modify application source code, tests, config, or any other     │
│ files. If you find yourself about to edit a file, STOP — you    │
│ are off track.                                                  │
└─────────────────────────────────────────────────────────────────┘

## Usage

```
/task-explore "How does authentication work?"
/task-explore "Find all API endpoints"
/task-explore JIRA-123              # Explore context for a task
/task-explore                       # Interactive mode
/task-explore "auth" --quick        # Fast scan, file paths only
/task-explore "auth" --thorough     # Deep analysis with full context
```

## Exploration Modes

### Quick Mode (`--quick`)
- Fast keyword-based file search
- Returns file paths with brief descriptions
- Skips deep code analysis
- Good for: "Does this feature exist?", "Where is X defined?"

### Medium Mode (default)
- Balanced exploration with reasonable depth
- Returns file paths, key functions, patterns
- Moderate code analysis
- Good for: "How does this feature work?"

### Thorough Mode (`--thorough`)
- Comprehensive deep-dive analysis
- Returns detailed code paths, all dependencies, full data flow
- Traces execution paths and side effects
- Launches code-explorer agent for critical areas
- Good for: "I need to understand everything about this feature"

## Workflow

```
1. PARSE QUERY
   • If JIRA, read task README for context
   • If question, identify keywords and scope

2. DETERMINE REPOS
   • If task, use affected repos from README
   • If question, explore all repos from manifest

3. LAUNCH EXPLORERS
   • Use Explore agents with "very thorough" setting
   • Provide specific focus based on query

4. COMPILE FINDINGS
   • Aggregate results from all agents
   • Identify key files and patterns
   • Note dependencies and connections

5. OUTPUT REPORT
   • Executive summary
   • Key files discovered
   • Patterns identified
   • Suggested next steps
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories and paths
   - Agent preferences (exploration thoroughness)

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend task-explore --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ CODEBASE EXPLORATION                                             ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Query

**If JIRA/task ID provided:**
- Find the task in `.ai/tasks/` (any status folder)
- Read the task's README.md for context
- Extract: problem statement, affected repos, technical context
- Use this to focus the exploration

**If question provided:**
- Identify keywords and concepts
- Determine which repos might be relevant based on the question

**If no argument (interactive mode):**
```
What would you like to explore?

Examples:
  • "How does authentication work?"
  • "Where are API endpoints defined?"
  • "How is data validated?"
  • "What's the database schema for users?"

Your question:
```

### Step 2: Determine Scope

**If task-based exploration:**
```
EXPLORATION SCOPE

Task: {task-id} - {title}
Focus: {problem statement}

Affected repositories:
{list repos from task}

Exploring with focus on:
  • {key aspect 1}
  • {key aspect 2}
```

**If question-based exploration:**
```
EXPLORATION SCOPE

Question: {question}

Searching in:
  • {repo1} - {description}
  • {repo2} - {description}

Keywords: {extracted keywords}
```

Ask if scope should be adjusted:
```
Is this scope correct, or should I focus differently? (y/adjust)
```

### Step 3: Determine Thoroughness

Parse arguments for mode flag:
- `--quick` → Quick mode
- `--thorough` → Thorough mode
- No flag → Medium mode (default)

### Step 4: Launch Explorers

For each relevant repository, launch an Explore agent with appropriate depth:

**Quick Mode:**
```
Explore {repo.name} ({repo.path}) for: {query/task context}

[quick] Fast scan - find files and brief descriptions only.

Report:
- File paths matching the topic
- One-line description of each file's purpose
- No deep code analysis needed
```

**Medium Mode (default):**
```
Explore {repo.name} ({repo.path}) for: {query/task context}

[medium] Balanced exploration.

Focus on:
1. Files directly related to {topic}
2. How the feature/system is structured
3. Key entry points and patterns
4. Dependencies and integrations

Report:
- Executive summary (2-3 sentences)
- Key files with line numbers
- Patterns discovered
- Dependencies identified
```

**Thorough Mode:**
```
Explore {repo.name} ({repo.path}) for: {query/task context}

[very thorough] Comprehensive deep-dive analysis.

Focus on:
1. ALL files related to {topic}
2. Complete feature/system structure
3. Every entry point and code flow
4. All patterns and conventions used
5. Full dependency tree
6. Test files that show usage
7. Configuration and environment
8. Edge cases and error handling

Report:
- Detailed executive summary
- Complete file inventory with line numbers
- All patterns discovered with examples
- Full dependency map
- Potential pitfalls or gotchas
- Suggested deep-dive areas for code-explorer
```

If exploring multiple repos, launch agents in parallel for efficiency.

### Step 5: Deep Dive (Thorough Mode Only)

In `--thorough` mode, after initial exploration completes:

1. Identify 2-3 most critical files from exploration results
2. Launch code-explorer agent for each:

```
Deep analysis of {file path}

Analyze:
1. Trace all execution paths
2. Map every dependency
3. Identify all side effects
4. Document complete data flow
5. Find edge cases and error handling
6. Locate related tests

Provide comprehensive understanding suitable for implementation work.
```

3. Synthesize deep-dive findings into final report

### Step 6: Compile Findings

Aggregate findings from all exploration agents:

**Summary**: Combine executive summaries into cohesive overview

**Key Files**: List most important files by relevance
- Include file path and line numbers
- Brief description of what each file does
- Note entry points vs supporting files

**Patterns**: Document recurring patterns discovered
- How things are structured
- Conventions followed
- Common approaches

**Dependencies**: Map connections
- What depends on what
- External services/APIs involved
- Shared utilities used

**Potential Issues**: Note any concerns
- Technical debt observed
- Complexity warnings
- Edge cases to watch for

### Step 7: Output Report

```
╔══════════════════════════════════════════════════════════════════╗
║ EXPLORATION: "{query}"                                           ║
║ Mode: {quick|medium|thorough}                                    ║
╠══════════════════════════════════════════════════════════════════╣

SUMMARY
══════════════════════════════════════════════════════════════════
{2-3 paragraph executive summary of findings}

KEY FILES
══════════════════════════════════════════════════════════════════
{grouped by repository}

{repo1}:
  • {file1}:{lines} - {purpose}
    {brief explanation}
  • {file2}:{lines} - {purpose}
    {brief explanation}

{repo2}:
  • {file1}:{lines} - {purpose}
  ...

PATTERNS
══════════════════════════════════════════════════════════════════
  • {pattern 1}: {description}
  • {pattern 2}: {description}
  • {pattern 3}: {description}

DEPENDENCIES
══════════════════════════════════════════════════════════════════
  • {component} → {what it depends on}
  • {component} → {what it depends on}

{if concerns found}
CONSIDERATIONS
══════════════════════════════════════════════════════════════════
  ⚠ {concern 1}
  ⚠ {concern 2}
{/if}

SUGGESTED READING
══════════════════════════════════════════════════════════════════
Start with: {most important file}:{lines}
Then: {second file}:{lines}

╚══════════════════════════════════════════════════════════════════╝
```

### Step 8: Offer Follow-up Actions

```
NEXT STEPS

Based on this exploration:

  1. Document these findings (/document)
  2. Create a task based on findings (/task-create)
  3. Explore a related area
  4. Done

Choice?
```

If task-based exploration, also offer:
```
  5. Add findings to task README
```

Then stop. Wait for user input.

## Output Format Example

```
╔══════════════════════════════════════════════════════════════════╗
║ EXPLORATION: "How does authentication work?"                     ║
╠══════════════════════════════════════════════════════════════════╣

SUMMARY
══════════════════════════════════════════════════════════════════
Authentication uses JWT tokens with a refresh token rotation
strategy. The main auth middleware validates tokens on each
request and attaches user context. Login creates an access token
(15min) and refresh token (7 days), both stored in HTTP-only
cookies for security.

KEY FILES
══════════════════════════════════════════════════════════════════

backend:
  • src/middleware/auth.ts:15-89 - Main authentication middleware
    Validates JWT, extracts user, handles refresh
  • src/services/token.ts:1-120 - Token generation and validation
    JWT creation, verification, rotation logic
  • src/routes/auth.ts:1-95 - Auth endpoints
    Login, logout, refresh, password reset

frontend:
  • src/hooks/useAuth.ts:1-67 - React auth hook
    Login state, user context, logout handling
  • src/contexts/AuthContext.tsx:1-45 - Auth state provider
    Global auth state management

PATTERNS
══════════════════════════════════════════════════════════════════
  • HTTP-only cookies for token storage (XSS protection)
  • Refresh token rotation on each use (security)
  • Role-based middleware for route protection
  • Consistent error format for auth failures

DEPENDENCIES
══════════════════════════════════════════════════════════════════
  • auth.ts → token.ts (token validation)
  • auth.ts → userService (user lookup)
  • routes/auth.ts → password.ts (hashing)

CONSIDERATIONS
══════════════════════════════════════════════════════════════════
  ⚠ Token refresh logic has edge cases with concurrent requests
  ⚠ No rate limiting on login endpoint currently

SUGGESTED READING
══════════════════════════════════════════════════════════════════
Start with: backend/src/middleware/auth.ts:15-45
Then: backend/src/services/token.ts:1-50

╚══════════════════════════════════════════════════════════════════╝
```
