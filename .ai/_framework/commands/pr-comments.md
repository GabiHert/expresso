

> Parent: [[commands-index]]
<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: FRAMEWORK                                                 ║
║ COMMAND: /pr-comments                                            ║
║ STATUS: Complete                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ PURPOSE: Triage, analyze, and address PR review comments         ║
╚══════════════════════════════════════════════════════════════════╝
-->

# /pr-comments - PR Comment Triage & Resolution

## Description

Fetch unresolved PR review comments, analyze each with explorer agents, triage them with the user, draft reply messages, and implement fixes — all in one interactive workflow.

## Usage

```
/pr-comments https://github.com/org/repo/pull/123
/pr-comments 123                                      # PR number (uses current repo)
```

## Workflow

```
1. FETCH PR COMMENTS
   • Extract repo/PR from argument
   • Use `gh` to list all unresolved review comments
   • Group by conversation thread

2. ANALYZE EACH COMMENT (parallel explorer agents)
   • For each comment, spawn an explorer agent
   • Agent reads the relevant code, understands context
   • Reports: should we address? why/why not? how if yes?
   • Confidence % on the recommendation

3. PRESENT TRIAGE REPORT
   • Show all comments with agent analysis
   • User reviews and we discuss

4. CLASSIFY COMMENTS
   • User tells which comments to dismiss (reply-only)
   • Remaining comments are marked as "worth fixing"

5. DRAFT REPLY MESSAGES (for dismissed comments)
   • Propose a professional reply for each dismissed comment
   • User approves/edits each reply

6. POST APPROVED REPLIES
   • Post replies via `gh` API

7. BRAINSTORM & FIX (for comments worth addressing)
   • For each fixable comment, discuss approach
   • Implement the fix
   • After each fix, draft a reply explaining how it was addressed

8. POST FIX REPLIES
   • Post fix-explanation replies via `gh` API
```

## Implementation

### Step 0: Orientation

1. Verify `gh` CLI is available and authenticated.

2. **EXTENSION CHECK (MANDATORY)**:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ CHECK FOR PROJECT EXTENSION                                     │
   │                                                                 │
   │ Look for: .ai/_project/commands/pr-comments.extend.md          │
   │                                                                 │
   │ If file EXISTS:                                                 │
   │   1. Read the extension file completely                         │
   │   2. Parse and extract these sections:                          │
   │      • Context     → Add to orientation announcements           │
   │      • Pre-Hooks   → Execute BEFORE Step 1                      │
   │      • Step Overrides → Replace matching steps                  │
   │      • Agents      → Use specified agents for phases            │
   │      • Post-Hooks  → Execute AFTER final step                   │
   │   3. Announce: "Project Extension Active"                       │
   │   4. FOLLOW ALL EXTENSION INSTRUCTIONS - they override defaults │
   │                                                                 │
   │ This check is NON-NEGOTIABLE. Extensions customize behavior.    │
   └─────────────────────────────────────────────────────────────────┘
   ```

3. Announce:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║ PR COMMENT TRIAGE & RESOLUTION                                   ║
   ╚══════════════════════════════════════════════════════════════════╝
   ```

### Step 1: Parse PR Argument & Fetch Comments

**Parse the argument:**
- If full URL: extract `owner/repo` and PR number from the URL
- If just a number: use the current git remote to determine `owner/repo`
- If no argument: error and show usage

**Fetch unresolved review comments:**

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate
```

Also fetch review threads to understand resolution status:

```bash
gh pr view {pr_number} --repo {owner}/{repo} --json reviewThreads
```

**Filter to unresolved only:**
- From `reviewThreads`, keep threads where `isResolved` is `false`
- Each thread has comments — collect the full conversation per thread
- Extract: file path, line number, comment body, author, thread ID

**If no unresolved comments:**
```
╔══════════════════════════════════════════════════════════════════╗
║ NO UNRESOLVED COMMENTS                                           ║
╚══════════════════════════════════════════════════════════════════╝

PR #{pr_number} has no unresolved review comments.
Nothing to do!
```
Then stop.

### Step 1.5: Gather Task Context for Agents

Before spawning explorer agents, gather the full context of what the PR is about so agents can make informed decisions:

1. **Fetch PR metadata:**
   ```bash
   gh pr view {pr_number} --repo {owner}/{repo} --json title,body,headRefName,baseRefName,files
   ```

2. **Build a task context summary** containing:
   - PR title and description/body
   - Branch name (often contains task ID)
   - List of all changed files in the PR
   - If a task ID is detected in the branch name, check for task docs:
     - `.ai/tasks/in_progress/{task_id}/README.md`
     - `.ai/tasks/in_progress/{task_id}/status.yaml`
   - If task docs exist, read them and include a summary of the task's goal, acceptance criteria, and current status

3. **Store as `{task_context}`** — this will be injected into every explorer agent prompt.

### Step 2: Analyze Comments with Explorer Agents

For each unresolved comment thread, spawn an **explorer agent** (in parallel where possible) with this prompt:

```
## Task Context

You are analyzing a PR review comment in the context of a specific task/feature.
Understanding the task's goal is CRITICAL to judging whether a comment is relevant
and worth addressing.

PR: #{pr_number} — {pr_title}
Branch: {branch_name}
Base: {base_branch}

### PR Description:
{pr_body}

### Changed files in this PR:
{list of changed files}

### Task Goal (if available):
{task README summary or "No task docs found — rely on PR description and code context"}

---

## Review Comment to Analyze

File: {file_path}:{line_number}
Comment by {author}: "{comment_body}"

{If there are reply comments in the thread, include them too}

## Instructions

1. Read the file at the specified location and understand the surrounding code
2. Read related files if needed to understand the broader change
3. Consider the comment IN THE CONTEXT OF THE TASK:
   - Does the comment align with the task's goals and scope?
   - Is the reviewer pointing out something that contradicts the task requirements?
   - Is this a valid concern within the scope of this PR, or is it out of scope?
   - Is it a real bug, a meaningful improvement, a style preference, or a nitpick?
   - Does the current code already handle the concern?
4. Provide your analysis in this EXACT format:
   - VERDICT: "ADDRESS" or "DISMISS" or "DISCUSS" (if you're unsure)
   - CONFIDENCE: 0-100%
   - REASONING: Why you recommend this verdict (2-3 sentences). Reference the task context.
   - HOW TO FIX: If ADDRESS, briefly describe the fix approach. If DISMISS, suggest a reply rationale.
```

**Important:** Launch agents in parallel batches (up to 4 at a time) to avoid overwhelming context.

### Step 3: Present Triage Report

After all agents complete, present the consolidated report:

```
╔══════════════════════════════════════════════════════════════════╗
║ TRIAGE REPORT — PR #{pr_number}                                  ║
║ {unresolved_count} unresolved comments                           ║
╚══════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ #1 — {file_path}:{line}                                         │
│ Author: {author}                                                │
│ Comment: "{truncated comment...}"                               │
│                                                                 │
│ Agent Analysis:                                                 │
│   Verdict:    ADDRESS | DISMISS | DISCUSS                       │
│   Confidence: {XX}%                                             │
│   Reasoning:  {agent reasoning}                                 │
│   Fix:        {how to fix, if applicable}                       │
└─────────────────────────────────────────────────────────────────┘

{repeat for each comment}

══════════════════════════════════════════════════════════════════

Summary:
  ADDRESS:  {count} comments
  DISMISS:  {count} comments
  DISCUSS:  {count} comments
```

Wait for user to review and discuss. Answer any questions about specific comments.

### Step 4: Classify Comments

After discussion, ask the user:

```
Which comments should we DISMISS (reply only, no code change)?

Enter comment numbers separated by commas (e.g., 1,3,5)
or type "agent" to use the agent recommendations as-is:
```

**If user says "agent":** Use the agent verdicts — DISMISS stays dismiss, ADDRESS stays address, DISCUSS defaults to ADDRESS.

**Otherwise:** Parse the user's selection. Comments NOT in the dismiss list become "fix" comments.

Confirm:
```
Classification:
  DISMISS (reply only): #{numbers}
  FIX (code change):    #{numbers}

Correct? (y/n)
```

### Step 5: Draft Reply Messages for Dismissed Comments

For each dismissed comment, propose a professional reply:

- Be respectful and constructive
- Explain WHY we're not making the change
- Reference code context if relevant
- Keep it concise (2-4 sentences)

Present each reply for approval:

```
┌─────────────────────────────────────────────────────────────────┐
│ REPLY for #{n} — {file_path}:{line}                             │
│                                                                 │
│ Original: "{comment}"                                           │
│                                                                 │
│ Proposed reply:                                                 │
│ "{draft reply}"                                                 │
│                                                                 │
│ [Approve / Edit / Skip]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**If Edit:** Ask user for their version or edits, then confirm.
**If Skip:** Do not reply to this comment.

### Step 6: Post Approved Replies

For each approved reply, post via `gh`:

```bash
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies \
  --method POST \
  -f body="{reply}"
```

Confirm each post:
```
Posted reply to #{n} ({file_path}:{line})
```

**Important:** Ask user for confirmation before posting all replies:
```
Ready to post {count} replies. Proceed? (y/n)
```

### Step 7: Brainstorm & Fix Comments Worth Addressing

For each "fix" comment, one at a time:

```
┌─────────────────────────────────────────────────────────────────┐
│ FIX #{n} — {file_path}:{line}                                   │
│                                                                 │
│ Comment: "{comment}"                                            │
│ Agent suggestion: "{how to fix}"                                │
│                                                                 │
│ Let's discuss the approach before implementing.                 │
└─────────────────────────────────────────────────────────────────┘
```

**For each fix:**
1. Show the relevant code context (read the file around the line)
2. Discuss approach with the user
3. Once agreed, implement the fix using Edit tool
4. After the fix is applied, draft a reply explaining how it was addressed:
   ```
   Proposed reply:
   "Addressed in {commit/latest push}. {Brief explanation of what was changed and why}."
   ```
5. Get user approval on the reply
6. Store approved reply for posting

### Step 8: Post Fix-Explanation Replies

After all fixes are implemented:

```
All fixes implemented. Ready to post {count} fix-explanation replies.
Proceed? (y/n)
```

Post each reply using the same `gh api` approach from Step 6.

### Step 9: Output Summary

```
╔══════════════════════════════════════════════════════════════════╗
║ PR COMMENTS — COMPLETE                                           ║
╚══════════════════════════════════════════════════════════════════╝

PR #{pr_number}:
  Analyzed:    {total} comments
  Dismissed:   {dismissed_count} (replies posted: {posted_dismiss_count})
  Fixed:       {fixed_count} (replies posted: {posted_fix_count})
  Skipped:     {skipped_count}

{if fixes were made}
Next steps:
  • Push your changes: git push
  • Re-request review if needed
{/if}
```

Then stop. Do not proceed further.

### Step 10: Auto-Sync (if enabled)

Check `.ai/_project/manifest.yaml` for `auto_sync.enabled`.

**If auto_sync is enabled:**
Use the [[ai-sync]] agent to sync the .ai folder changes.

**If auto_sync is disabled:** Skip this step.

Then stop. Do not proceed further.

## Notes

- Explorer agents run in parallel for speed but are capped at 4 concurrent to avoid context issues
- Always ask for user confirmation before posting any replies to GitHub
- Replies should be professional, concise, and constructive
- When fixing code, always show the user the approach before implementing
- The command works with any GitHub PR accessible via `gh` CLI
