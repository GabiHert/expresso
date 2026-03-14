

> Parent: [[manifest]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /expresso-tags                                          ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: List and address @expresso inline task tags in code     ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /expresso-tags - List and Address Inline Task Tags

## Description

Scan the codebase for `@expresso` inline task tags in code comments. List them for discussion or address them one by one to resolve.

## TEMPORARY FILES
Any scratch files, exploration notes, or temporary output created during
execution MUST be placed in `.ai/tmp/`. Do NOT create temporary files
in the project root or source directories.

## Usage

```
/expresso-tags                    # List all @expresso tags
/expresso-tags address            # Address tags one by one
/expresso-tags --urgent           # List only urgent (!) tags
/expresso-tags --questions        # List only question (?) tags
```

## Tag Variants

| Variant | Format | Meaning | Priority |
|---------|--------|---------|----------|
| Urgent | `@expresso!` | High priority, fix now | 1 (first) |
| Normal | `@expresso` | Standard task | 2 |
| Question | `@expresso?` | Needs discussion first | 3 (last) |

## Workflow

```
LIST MODE (default):
1. SCAN CODEBASE
   • Find all @expresso tags in code comments
   • Support: //, /* */, #, <!-- -->

2. GROUP AND SORT
   • Urgent (!) first
   • Normal second
   • Questions (?) last

3. DISPLAY LIST
   • Show file:line and description
   • Count by variant

4. OFFER ACTIONS
   • Discuss specific tag
   • Run address mode

ADDRESS MODE:
1. SCAN (same as above)

2. FOR EACH TAG (priority order):
   • Show code context
   • Discuss/implement fix
   • Ask to remove tag

3. SUMMARY
   • Tags resolved
   • Tags remaining
```

## Implementation

### Step 0: Orientation

1. Read `.ai/_project/manifest.yaml` to understand:
   - Available repositories and paths
   - File extensions to scan

2. **Extension Support**: This command supports compiled extensions
   via `/command-extend expresso-tags --variant NAME`. If a compiled extension
   exists, the stub already points to it — no runtime discovery needed.

3. Announce:
```
╔══════════════════════════════════════════════════════════════════╗
║ EXPRESSO TAGS                                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 1: Parse Arguments

**Check for mode:**
- `address` argument → Address mode
- No argument → List mode

**Check for filters:**
- `--urgent` → Only show `@expresso!` tags
- `--questions` → Only show `@expresso?` tags
- No filter → Show all variants

### Step 2: Scan Codebase

Scan all source files for @expresso tags using grep:

```bash
# Find all @expresso tags
grep -rn "@expresso" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.java" --include="*.rs" \
  --include="*.rb" --include="*.php" --include="*.c" --include="*.cpp" \
  --include="*.h" --include="*.hpp" --include="*.cs" --include="*.swift" \
  --include="*.kt" --include="*.scala" --include="*.vue" --include="*.svelte" \
  --include="*.sql" --include="*.sh" --include="*.bash" \
  --include="*.yaml" --include="*.yml" --include="*.html" \
  --include="*.css" --include="*.scss" --include="*.sass" --include="*.less" \
  --include="*.lua" --include="*.r" --include="*.ex" --include="*.exs" \
  --include="*.md" \
  . 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build | grep -v ".git"
```

**Parse each match:**
1. Extract file path and line number
2. Determine variant:
   - Contains `@expresso!` → urgent
   - Contains `@expresso?` → question
   - Contains `@expresso` (no suffix) → normal
3. Extract task description (text after the tag)
4. Store: `{ file, line, variant, description }`

**Sort by priority:**
1. Urgent (`@expresso!`) first
2. Normal (`@expresso`) second
3. Questions (`@expresso?`) last

Within each group, sort by file path then line number.

### Step 3: Handle No Tags Found

**If no tags found:**
```
╔══════════════════════════════════════════════════════════════════╗
║ NO @EXPRESSO TAGS FOUND                                          ║
╚══════════════════════════════════════════════════════════════════╝

No inline task tags found in the codebase.

To add a tag, write a comment like:
  // @expresso Refactor this function
  // @expresso! Fix this bug urgently
  // @expresso? Should we use approach A or B?
```
Then stop.

### Step 4: List Mode (default)

**Display tags grouped by variant:**

```
╔══════════════════════════════════════════════════════════════════╗
║ EXPRESSO TAGS                                                    ║
╠══════════════════════════════════════════════════════════════════╣

Found {total} tags: {urgent} urgent, {normal} normal, {questions} questions

{if urgent tags exist}
URGENT ({count})
══════════════════════════════════════════════════════════════════
{for each urgent tag, numbered}
  {N}. {file}:{line}
     {description}

{/for}
{/if}

{if normal tags exist}
TASKS ({count})
══════════════════════════════════════════════════════════════════
{for each normal tag, numbered continuing from urgent}
  {N}. {file}:{line}
     {description}

{/for}
{/if}

{if question tags exist}
QUESTIONS ({count})
══════════════════════════════════════════════════════════════════
{for each question tag, numbered continuing}
  {N}. {file}:{line}
     {description}

{/for}
{/if}

╚══════════════════════════════════════════════════════════════════╝

OPTIONS
  • Enter a number to discuss that tag
  • "address" or "a" to address all tags
  • "q" to quit

Choice?
```

**Handle user choice:**

- **Number**: Show the tag's code context and discuss it
- **"address" or "a"**: Switch to address mode (Step 5)
- **"q"**: Stop

**If user picks a number:**
1. Read the file around that line (±10 lines)
2. Show the code with line numbers
3. Discuss the tag - what it means, how to address it
4. Ask: "Would you like to address this now? (y/n)"
5. If yes, implement the fix and offer to remove the tag
6. Return to list

### Step 5: Address Mode

Go through each tag in priority order:

```
╔══════════════════════════════════════════════════════════════════╗
║ ADDRESSING EXPRESSO TAGS                                         ║
╠══════════════════════════════════════════════════════════════════╣

Addressing {total} tags in priority order...

══════════════════════════════════════════════════════════════════
TAG {current}/{total} [{variant}]
{file}:{line}
══════════════════════════════════════════════════════════════════

{description}

CODE CONTEXT:
```
{show lines line-10 to line+10 with line numbers}
```

{if variant is 'question'}
This is a QUESTION tag. Let me explain the options first...
{explain the question and provide options}

How would you like to proceed?
  1. {option A}
  2. {option B}
  3. Skip this tag
{else}
How would you like to address this?
  1. Implement the fix
  2. Discuss first
  3. Skip this tag
{/if}
```

**For each tag:**

1. Show the context and description
2. If question variant, explain options before asking
3. Wait for user input
4. If implementing:
   - Make the code changes
   - Ask: "Remove the @expresso tag? (y/n)"
   - If yes, delete or comment out the tag line
5. Move to next tag

### Step 6: Remove Tag

When user confirms tag removal:

1. Read the file
2. Find the line with the @expresso tag
3. Determine removal strategy:
   - If tag is the entire comment → delete the line
   - If tag is part of a larger comment → remove just the @expresso portion
4. Write the updated file
5. Confirm: "Removed tag from {file}:{line}"

**Example transformations:**

```typescript
// Before: standalone tag
// @expresso Fix the error handling

// After: line deleted entirely
```

```typescript
// Before: tag with other content
// TODO: Refactor later @expresso Clean this up

// After: tag removed, other content preserved
// TODO: Refactor later
```

### Step 7: Output Summary

After addressing (or at end of list mode if user quits):

```
╔══════════════════════════════════════════════════════════════════╗
║ SESSION COMPLETE                                                 ║
╚══════════════════════════════════════════════════════════════════╝

Summary:
  • Tags found: {total}
  • Addressed: {addressed_count}
  • Removed: {removed_count}
  • Skipped: {skipped_count}
  • Remaining: {remaining_count}

{if remaining > 0}
Run /expresso-tags to see remaining tags.
{else}
All @expresso tags have been addressed!
{/if}
```

Then stop.

## Examples

### Example 1: List Mode Output

```
╔══════════════════════════════════════════════════════════════════╗
║ EXPRESSO TAGS                                                    ║
╠══════════════════════════════════════════════════════════════════╣

Found 5 tags: 1 urgent, 3 normal, 1 question

URGENT (1)
══════════════════════════════════════════════════════════════════
  1. src/services/auth.ts:42
     Fix token refresh race condition

TASKS (3)
══════════════════════════════════════════════════════════════════
  2. src/components/Login.tsx:15
     Add loading state to prevent double submit

  3. src/utils/validate.ts:89
     Add email format validation

  4. src/api/users.ts:120
     Handle pagination edge case

QUESTIONS (1)
══════════════════════════════════════════════════════════════════
  5. src/services/cache.ts:33
     Should we use Redis or in-memory cache?

╚══════════════════════════════════════════════════════════════════╝

OPTIONS
  • Enter a number to discuss that tag
  • "address" or "a" to address all tags
  • "q" to quit

Choice?
```

### Example 2: Address Mode Flow

```
══════════════════════════════════════════════════════════════════
TAG 1/5 [urgent]
src/services/auth.ts:42
══════════════════════════════════════════════════════════════════

Fix token refresh race condition

CODE CONTEXT:
    32│ async function refreshToken(token: string) {
    33│   const decoded = jwt.decode(token);
    34│   if (!decoded) {
    35│     throw new AuthError('Invalid token');
    36│   }
    37│
    38│   // Check if refresh is already in progress
    39│   // @expresso! Fix token refresh race condition
    40│   const newToken = await generateToken(decoded.userId);
    41│   return newToken;
    42│ }

How would you like to address this?
  1. Implement the fix
  2. Discuss first
  3. Skip this tag
```

## Notes

- Tags are addressed in priority order: urgent → normal → questions
- Question tags get extra explanation before asking for action
- Removing tags is optional - user can keep them as TODOs
- Skipped tags remain in the codebase for later
