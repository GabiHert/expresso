<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /address-feedback                                       ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Read and address diff feedback comments from reviewers  ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /address-feedback - Address Diff Feedback

## Description

Read and address feedback comments left on task diffs. This command reads the `feedback/diff-review.md` file from a task folder and presents the feedback to the agent for discussion or resolution.

## Usage

```
/address-feedback              # Address feedback for current task
/address-feedback LOCAL-013    # Address feedback for specific task
```

## Workflow

```
1. RESOLVE TASK
   • Check argument for task ID
   • Fall back to COCKPIT_TASK env var
   • Fall back to active-task.json
   • Fall back to in_progress folder

2. READ FEEDBACK
   • Read feedback/diff-review.md from task folder
   • Handle missing file gracefully

3. PARSE ENTRIES
   • Extract headers matching ### path/to/file:line pattern
   • Identify resolved (strikethrough) vs unresolved
   • Group by file

4. PRESENT FEEDBACK
   • Show unresolved items with context
   • Offer options to discuss, show code, or resolve

5. ADDRESS ITEMS
   • Discuss specific items as requested
   • Show code context for items
   • Mark items as resolved when done
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories
   - Project context

2. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ ADDRESS FEEDBACK                                                 ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Resolve Task ID

**If task ID provided as argument:**
- Use the provided task ID
- Look in both `in_progress/` and `done/` folders

**If no task ID provided:**

1. Check `COCKPIT_TASK` environment variable:
   ```bash
   echo $COCKPIT_TASK
   ```

2. Check `.ai/cockpit/active-task.json`:
   ```bash
   cat .ai/cockpit/active-task.json 2>/dev/null | grep taskId
   ```

3. Check `.ai/tasks/in_progress/` for single task:
   - If exactly one task, use that
   - If multiple, list and ask user to choose
   - If none, check `done/` folder

4. If no task found anywhere:
   ```
   No task found.

   Use one of:
     /address-feedback LOCAL-013    # Specify task ID
     /task-status                   # See all tasks
   ```

### Step 2: Read Feedback File

Construct path: `.ai/tasks/{status}/{taskId}/feedback/diff-review.md`

**If file exists:**
- Read the file content
- Proceed to parsing

**If file does not exist:**
```
╔══════════════════════════════════════════════════════════════════╗
║ NO FEEDBACK FOUND                                                ║
╚══════════════════════════════════════════════════════════════════╝

Task: {task-id}
Path: .ai/tasks/{status}/{taskId}/feedback/diff-review.md

No feedback file exists for this task.

To add feedback:
  1. Create the file at the path above
  2. Or use VSCode's "Open Feedback" button on the task

Format:
  ### path/to/file.ts:42
  Your feedback comment here
```
Then stop.

### Step 3: Parse Feedback Entries

Parse the markdown file to extract feedback entries:

1. **Find all headers** matching pattern: `### {content}`

2. **Classify each header**:
   - `### ~~path/to/file~~` → Resolved (strikethrough)
   - `### path/to/file:42` → Specific line
   - `### path/to/file:15-20` → Line range
   - `### path/to/file` → General file feedback
   - `### General` → Overall task feedback

3. **Extract comment content**:
   - Text between current header and next header
   - Trim whitespace

4. **Count items**:
   - Unresolved count
   - Resolved count

### Step 4: Present Feedback

**If no unresolved feedback:**
```
╔══════════════════════════════════════════════════════════════════╗
║ FEEDBACK: {task-id}                                              ║
╚══════════════════════════════════════════════════════════════════╝

All feedback has been resolved! ({resolved_count} resolved items)

Nothing to address. Continue working or run /task-done when complete.
```
Then stop.

**If unresolved feedback exists:**
```
╔══════════════════════════════════════════════════════════════════╗
║ FEEDBACK FOR {task-id}                                           ║
╚══════════════════════════════════════════════════════════════════╝

Unresolved Feedback ({count} items):

{for each unresolved item}
### {location}
> {comment content}

{/for}

{if resolved items exist}
──────────────────────────────────────────────────────────────────
Resolved ({resolved_count}):
{for each resolved item}
  ✓ ~~{location}~~
{/for}
{/if}

══════════════════════════════════════════════════════════════════

How would you like to proceed?

  1. Discuss a specific item (enter the file path or number)
  2. Show code context for an item
  3. Address all items one by one
  4. Continue working (keep feedback for later)
```

Wait for user input.

### Step 5: Handle User Choice

**If user asks to discuss a specific item:**
1. Identify the item by path or number
2. Read the file (if it exists) around the specified line
3. Show the code context (5-10 lines around)
4. Discuss the feedback and how to address it
5. After discussion, offer to mark as resolved

**If user asks to show code context:**
1. For line-specific feedback (`file:line` or `file:line-range`):
   - Read the file
   - Show lines `line-5` to `line+5` (or the range +/- context)
2. For general file feedback:
   - Show file summary or first 20 lines
3. Present the code with line numbers

**If user asks to address all items:**
1. Go through each item one by one
2. For each item:
   - Show the feedback
   - Show relevant code if file exists
   - Ask: "How would you like to address this?"
   - Discuss and implement fix if needed
   - Ask: "Mark as resolved? (y/n)"
3. After all items, show summary

**If user wants to continue working:**
- Acknowledge the feedback is noted
- Stop and let user continue

### Step 6: Mark Items as Resolved

When marking an item as resolved:

1. Read the feedback file
2. Find the header: `### {location}`
3. Replace with: `### ~~{location}~~`
4. Write the updated file

After marking resolved:
```
Marked as resolved: {location}

Remaining unresolved: {count}
```

### Step 7: Output Summary

After addressing items (if any changes made):
```
╔══════════════════════════════════════════════════════════════════╗
║ FEEDBACK SESSION COMPLETE                                        ║
╚══════════════════════════════════════════════════════════════════╝

Summary:
  • Discussed: {count} items
  • Resolved: {newly_resolved_count} items
  • Remaining: {remaining_count} items

{if remaining > 0}
Run /address-feedback again to continue addressing feedback.
{else}
All feedback addressed!
{/if}
```

## Examples

### Example 1: Single Feedback Item

```
╔══════════════════════════════════════════════════════════════════╗
║ FEEDBACK FOR LOCAL-013                                           ║
╚══════════════════════════════════════════════════════════════════╝

Unresolved Feedback (1 item):

### src/services/auth.ts:42
> Verify this handles concurrent refresh token requests

══════════════════════════════════════════════════════════════════

How would you like to proceed?
```

### Example 2: Multiple Items with Resolved

```
╔══════════════════════════════════════════════════════════════════╗
║ FEEDBACK FOR LOCAL-007                                           ║
╚══════════════════════════════════════════════════════════════════╝

Unresolved Feedback (2 items):

### src/components/Login.tsx:15-20
> Add loading state to prevent double submission

### General
> Ensure error messages are user-friendly

──────────────────────────────────────────────────────────────────
Resolved (1):
  ✓ ~~src/services/api.ts:100~~

══════════════════════════════════════════════════════════════════

How would you like to proceed?
```

### Step 8: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**

Use the ai-sync agent (lightweight/Haiku) to commit and push changes:
```
Use the ai-sync agent to sync the .ai folder changes
```

This ensures feedback resolution is tracked in version control automatically.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.

## Notes

- Keep the interaction simple - read, present, discuss
- The agent should not automatically make changes without discussion
- Resolution is tracked in the markdown file itself
- Feedback persists across sessions until resolved
