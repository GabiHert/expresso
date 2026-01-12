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

Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

Parse the command format: `/expresso <path>:<line> "<task>"`

Extract:
- `filePath`: The file path (relative to workspace)
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
────────────────────────────────────────────────────────────────────
{surrounding code with line numbers}
────────────────────────────────────────────────────────────────────

TASK: {taskDescription}
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

Wait for user input before proceeding with implementation.

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
   - If comment ONLY contains @expresso → remove entire line
   - If comment has other content → remove just the @expresso part
4. Confirm removal:
```
✓ @expresso tag removed from {filePath}:{line}
```

**If no:**
```
Keeping the @expresso tag for reference.
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
Would you like me to search for it in the file? (y/n)
```

If yes, search for @expresso in the file and report all occurrences.

## Examples

### Example 1: Normal task
```
User pastes:
/expresso src/utils/format.ts:25 "Add null check before formatting"

Claude:
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╚══════════════════════════════════════════════════════════════════╝

FILE: src/utils/format.ts
LINE: 25

CONTEXT:
────────────────────────────────────────────────────────────────────
  23 │ // @expresso Add null check before formatting
  24 │ export function formatDate(date: Date): string {
  25 │   return date.toISOString().split('T')[0];
  26 │ }
────────────────────────────────────────────────────────────────────

TASK: Add null check before formatting

EXECUTING TASK...

[Claude adds null check]

╔══════════════════════════════════════════════════════════════════╗
║ ✅ TASK COMPLETE                                                 ║
╚══════════════════════════════════════════════════════════════════╝

Remove the @expresso tag from the code? (y/n)
```

### Example 2: Question variant
```
User pastes:
/expresso src/services/cache.ts:42 "Should we use Redis or in-memory cache here?"

Claude:
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╚══════════════════════════════════════════════════════════════════╝

FILE: src/services/cache.ts
LINE: 42

❓ QUESTION
══════════════════════════════════════════════════════════════════

Question: Should we use Redis or in-memory cache here?

Let me analyze this...

[Claude provides analysis of Redis vs in-memory, pros/cons, recommendation]

Would you like me to:
1. Implement Redis cache
2. Implement in-memory cache
3. Just keep this analysis
4. Discuss further

Choice?
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════╗
║ ☕ EXPRESSO TASK                                                 ║
╠══════════════════════════════════════════════════════════════════╣

FILE: {filePath}:{line}
TASK: {taskDescription}

CONTEXT:
────────────────────────────────────────────────────────────────────
{code with line numbers}
────────────────────────────────────────────────────────────────────

{EXECUTING or QUESTION section based on variant}

╚══════════════════════════════════════════════════════════════════╝
```
