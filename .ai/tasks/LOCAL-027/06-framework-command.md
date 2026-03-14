---
type: work-item
id: "06"
parent: LOCAL-027
title: Framework Command /expresso
status: done
repo: ai-framework
tags:
  - work-item
  - done
  - ai-framework
---

> Parent: [[LOCAL-027]]


# Framework Command /expresso

## Objective

Create the Claude-side `/expresso` command that:
1. Parses the pasted command to extract file, line, and task
2. Auto-reads the file at the specified line with context
3. Executes the task instruction
4. After completion, asks to remove the @expresso tag

## Pre-Implementation

Review existing command patterns:
- `.ai/_framework/commands/task-start.md` - Command structure pattern
- `.ai/_framework/commands/address-feedback.md` - File reading pattern

## Implementation Steps

### Step 1: Create the /expresso command file

**File**: `.ai/_framework/commands/expresso.md`

**Instructions**:

```markdown
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /expresso                                               ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Execute inline task from @expresso code comment         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /expresso - Execute Inline Code Task

## Description

Execute a task defined by an `@expresso` tag in code. Reads the file, understands context, executes the task, and offers to clean up the tag when done.

## Usage

```
/expresso path/to/file.ts:42 "Add error handling"
/expresso src/api/users.ts:15 "Refactor to use async/await"
```

## Tag Variants

| Variant | Meaning | Behavior |
|---------|---------|----------|
| `@expresso` | Standard task | Execute normally |
| `@expresso!` | Urgent task | Prioritize, execute immediately |
| `@expresso?` | Question | Explain/discuss first, then optionally execute |

## Workflow

```
1. PARSE COMMAND
   • Extract file path
   • Extract line number
   • Extract task description

2. READ & UNDERSTAND
   • Read the file
   • Focus on the tagged line
   • Read ±20 lines for context
   • Understand the code structure

3. IDENTIFY VARIANT
   • Check if @expresso, @expresso!, or @expresso?
   • Adjust behavior accordingly

4. EXECUTE OR DISCUSS
   • Standard: Execute the task
   • Urgent: Execute immediately
   • Question: Explain first, ask if should proceed

5. CLEANUP
   • After completion, ask to remove tag
   • If approved, remove the @expresso comment
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand project context

2. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

Parse the command format: `/expresso <path>:<line> "<task>"`

**Regex pattern**: `^/expresso\s+(.+?):(\d+)\s+"(.+)"$`

Extract:
- `filePath`: The file path (may be relative or absolute)
- `lineNumber`: The line number (1-based)
- `taskDescription`: The task to execute

**If parsing fails:**
```
Could not parse expresso command.

Expected format:
  /expresso path/to/file.ts:42 "task description"

Example:
  /expresso src/api/users.ts:15 "Add input validation"
```

### Step 2: Read File and Context

1. Read the file at the specified path
2. Focus on the line with the tag
3. Read surrounding context (±20 lines minimum)
4. Identify:
   - The function/class containing the tag
   - Related imports
   - Variable dependencies

**Output:**
```
FILE: {filePath}
LINE: {lineNumber}

CONTEXT:
{surrounding code with line numbers}

TAG: @expresso{variant} {taskDescription}
```

### Step 3: Identify Variant

Check the actual tag in the code to determine variant:

- Contains `@expresso!` → Urgent
- Contains `@expresso?` → Question
- Contains `@expresso` (no suffix) → Normal

### Step 4: Execute Based on Variant

**For Normal (@expresso):**
```
EXECUTING TASK
══════════════════════════════════════════════════════════════════

Task: {taskDescription}

{proceed to implement the change}
```

**For Urgent (@expresso!):**
```
🔥 URGENT TASK
══════════════════════════════════════════════════════════════════

Task: {taskDescription}

Executing immediately...

{proceed to implement the change}
```

**For Question (@expresso?):**
```
❓ QUESTION
══════════════════════════════════════════════════════════════════

Question: {taskDescription}

Let me analyze this...

{provide explanation/analysis}

Would you like me to:
1. Implement a solution based on this analysis
2. Just keep the explanation
3. Discuss further

Choice?
```

### Step 5: Cleanup - Ask to Remove Tag

After successfully completing the task:

```
╔══════════════════════════════════════════════════════════════════╗
║ ✅ TASK COMPLETE                                                 ║
╚══════════════════════════════════════════════════════════════════╝

The @expresso task has been completed.

Remove the @expresso tag from the code? (y/n)
```

**If yes:**
1. Read the file again (may have changed)
2. Find the line with the @expresso tag
3. Remove the comment:
   - If comment ONLY contains @expresso → remove entire comment
   - If comment has other content → remove just the @expresso part
4. Confirm removal

**If no:**
```
Keeping the @expresso tag for reference.
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╠══════════════════════════════════════════════════════════════════╣

FILE: src/api/users.ts:42
TASK: Add input validation for email field

CONTEXT:
────────────────────────────────────────────────────────────────────
  40 │ // @expresso Add input validation for email field
  41 │ function createUser(data: UserInput) {
  42 │   const user = {
  43 │     email: data.email,
  44 │     name: data.name,
  45 │   };
────────────────────────────────────────────────────────────────────

EXECUTING...

{implementation details}

╚══════════════════════════════════════════════════════════════════╝
```

## Error Handling

**File not found:**
```
❌ File not found: {filePath}

Please verify the path is correct.
```

**Line out of range:**
```
❌ Line {lineNumber} is out of range.

File has {totalLines} lines.
```

**Tag not found at line:**
```
⚠️ No @expresso tag found at line {lineNumber}.

The tag may have been moved or removed.
Would you like me to search for it? (y/n)
```

## Examples

**Example 1: Normal task**
```
/expresso src/utils/format.ts:25 "Add null check before formatting"
```

**Example 2: Urgent task**
```
/expresso src/api/auth.ts:88 "Fix security vulnerability in token validation"
```

**Example 3: Question**
```
/expresso src/services/cache.ts:42 "Should we use Redis or in-memory cache here?"
```
```

### Step 2: Add skill reference (if needed)

Check if skills are auto-registered from commands folder. If not, may need to update CLAUDE.md or skill configuration.

## Post-Implementation

Test the command with various inputs.

## Acceptance Criteria

- [ ] Command parses `/expresso path:line "task"` format
- [ ] Auto-reads file at specified line
- [ ] Shows surrounding context (±20 lines)
- [ ] Identifies variant from actual tag in code
- [ ] Executes task for normal and urgent variants
- [ ] Explains/discusses for question variant
- [ ] Asks to remove tag after completion
- [ ] Removes tag cleanly when approved
- [ ] Handles errors gracefully (file not found, etc.)

## Testing

1. Create test file with @expresso tag
2. Copy command from VSCode
3. Paste in Claude session
4. Verify file is read and context shown
5. Complete task
6. Verify removal prompt works

## Notes

- The command should feel magical - paste and Claude just "gets it"
- Context is crucial - read enough surrounding code
- Be careful when removing tags from multi-line comments
- Consider edge cases: tag moved, file changed, etc.
