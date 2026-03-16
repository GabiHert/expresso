---
type: migration-report
generated: 2026-03-16T11:51:35.076Z
total_issues: 451
tags: [migration, vault]
---

# Vault Migration Report

## Files with old pattern references

These files contain references to the old filesystem-based structure and need
to be updated to use vault-native patterns (frontmatter, mcpvault MCP tools).

### .ai/docs/_architecture/active-task-schema.md
- L168: manifest.yaml reference
- L86: in_progress/ folder reference
- L13: cockpit/ reference
- L130: cockpit/ reference
- L131: cockpit/ reference
- L168: .yaml file reference

### .ai/docs/_architecture/ai-cockpit-mvp-v1.md
- L284: status.yaml reference
- L284: .yaml file reference

### .ai/docs/_architecture/ai-cockpit-mvp-v2.md
- L133: todo/ folder reference
- L166: todo/ folder reference
- L134: in_progress/ folder reference
- L150: in_progress/ folder reference
- L171: in_progress/ folder reference
- L219: in_progress/ folder reference
- L191: done/ folder reference
- L45: cockpit/ reference
- L71: cockpit/ reference
- L83: cockpit/ reference
- L121: cockpit/ reference
- L173: cockpit/ reference
- L193: cockpit/ reference
- L211: cockpit/ reference
- L241: cockpit/ reference
- L324: cockpit/ reference
- L358: cockpit/ reference
- L481: cockpit/ reference
- L493: cockpit/ reference
- L525: cockpit/ reference
- L562: cockpit/ reference
- L586: cockpit/ reference
- L592: cockpit/ reference
- L641: cockpit/ reference
- L710: cockpit/ reference
- L712: cockpit/ reference

### .ai/docs/_architecture/docs-architecture-overview.md
- L21: cockpit/ reference
- L39: cockpit/ reference

### .ai/docs/_architecture/docs-overview.md
- L21: cockpit/ reference
- L39: cockpit/ reference

### .ai/docs/_architecture/shadow-copy-system.md
- L54: cockpit/ reference
- L78: cockpit/ reference
- L272: cockpit/ reference
- L316: cockpit/ reference

### .ai/docs/ai-framework/README.md
- L23: manifest.yaml reference
- L47: manifest.yaml reference
- L34: todo/ folder reference
- L34: in_progress/ folder reference
- L23: .yaml file reference
- L47: .yaml file reference

### .ai/docs/ai-framework/docs-ai-framework-overview.md
- L23: manifest.yaml reference
- L47: manifest.yaml reference
- L34: todo/ folder reference
- L34: in_progress/ folder reference
- L23: .yaml file reference
- L47: .yaml file reference

### .ai/docs/completed-tasks-log.md
- L16: done/ folder reference
- L17: done/ folder reference
- L18: done/ folder reference
- L19: done/ folder reference
- L20: done/ folder reference
- L21: done/ folder reference
- L22: done/ folder reference
- L23: done/ folder reference
- L24: done/ folder reference
- L25: done/ folder reference
- L26: done/ folder reference
- L27: done/ folder reference
- L28: done/ folder reference
- L29: done/ folder reference
- L30: done/ folder reference
- L31: done/ folder reference
- L32: done/ folder reference
- L33: done/ folder reference
- L34: done/ folder reference
- L35: done/ folder reference
- L36: done/ folder reference
- L37: done/ folder reference
- L38: done/ folder reference
- L39: done/ folder reference

### .ai/docs/feedback-system.md
- L27: in_progress/ folder reference

### .ai/docs/vscode-extension/README.md
- L33: cockpit/ reference
- L48: cockpit/ reference
- L53: cockpit/ reference

### .ai/docs/vscode-extension/docs-vscode-extension-overview.md
- L33: cockpit/ reference
- L48: cockpit/ reference
- L53: cockpit/ reference

### .ai/_framework/commands/ask.md
- L89: manifest.yaml reference
- L154: in_progress/ folder reference
- L89: .yaml file reference

### .ai/_framework/commands/command-create.md
- L223: status.yaml reference
- L78: manifest.yaml reference
- L221: manifest.yaml reference
- L337: manifest.yaml reference
- L415: manifest.yaml reference
- L78: .yaml file reference
- L221: .yaml file reference
- L223: .yaml file reference
- L337: .yaml file reference
- L415: .yaml file reference

### .ai/_framework/commands/command-extend.md
- L247: manifest.yaml reference
- L64: .yaml file reference
- L76: .yaml file reference
- L142: .yaml file reference
- L217: .yaml file reference
- L247: .yaml file reference
- L785: .yaml file reference
- L920: .yaml file reference
- L927: .yaml file reference
- L1030: .yaml file reference

### .ai/_framework/commands/commands-index.md
- L92: status.yaml reference
- L125: status.yaml reference
- L204: status.yaml reference
- L237: status.yaml reference
- L58: manifest.yaml reference
- L100: manifest.yaml reference
- L170: manifest.yaml reference
- L212: manifest.yaml reference
- L126: todo/ folder reference
- L238: todo/ folder reference
- L123: in_progress/ folder reference
- L128: in_progress/ folder reference
- L235: in_progress/ folder reference
- L240: in_progress/ folder reference
- L58: .yaml file reference
- L92: .yaml file reference
- L100: .yaml file reference
- L125: .yaml file reference
- L170: .yaml file reference
- L204: .yaml file reference
- L212: .yaml file reference
- L237: .yaml file reference

### .ai/_framework/commands/ctx.md
- L59: manifest.yaml reference
- L69: manifest.yaml reference
- L136: manifest.yaml reference
- L286: manifest.yaml reference
- L296: manifest.yaml reference
- L368: manifest.yaml reference
- L375: manifest.yaml reference
- L306: todo/ folder reference
- L76: in_progress/ folder reference
- L115: in_progress/ folder reference
- L118: in_progress/ folder reference
- L307: in_progress/ folder reference
- L59: .yaml file reference
- L69: .yaml file reference
- L136: .yaml file reference
- L242: .yaml file reference
- L286: .yaml file reference
- L296: .yaml file reference
- L368: .yaml file reference
- L375: .yaml file reference

### .ai/_framework/commands/document.md
- L106: manifest.yaml reference
- L156: manifest.yaml reference
- L404: manifest.yaml reference
- L106: .yaml file reference
- L156: .yaml file reference
- L404: .yaml file reference

### .ai/_framework/commands/enhance.md
- L62: manifest.yaml reference
- L63: manifest.yaml reference
- L64: manifest.yaml reference
- L65: manifest.yaml reference
- L72: manifest.yaml reference
- L86: manifest.yaml reference
- L152: manifest.yaml reference
- L203: manifest.yaml reference
- L229: manifest.yaml reference
- L272: manifest.yaml reference
- L277: manifest.yaml reference
- L289: manifest.yaml reference
- L318: manifest.yaml reference
- L326: manifest.yaml reference
- L62: .yaml file reference
- L63: .yaml file reference
- L64: .yaml file reference
- L65: .yaml file reference
- L72: .yaml file reference
- L86: .yaml file reference
- L152: .yaml file reference
- L203: .yaml file reference
- L229: .yaml file reference
- L272: .yaml file reference
- L277: .yaml file reference
- L289: .yaml file reference
- L318: .yaml file reference
- L326: .yaml file reference

### .ai/_framework/commands/expresso-tags.md
- L88: manifest.yaml reference
- L88: .yaml file reference
- L127: .yaml file reference

### .ai/_framework/commands/init.md
- L70: manifest.yaml reference
- L243: manifest.yaml reference
- L247: manifest.yaml reference
- L556: manifest.yaml reference
- L596: manifest.yaml reference
- L414: todo/ folder reference
- L415: in_progress/ folder reference
- L416: done/ folder reference
- L70: .yaml file reference
- L243: .yaml file reference
- L247: .yaml file reference
- L556: .yaml file reference
- L596: .yaml file reference

### .ai/_framework/commands/pr-comments.md
- L158: status.yaml reference
- L382: manifest.yaml reference
- L157: in_progress/ folder reference
- L158: in_progress/ folder reference
- L158: .yaml file reference
- L382: .yaml file reference

### .ai/_framework/commands/task-brief.md
- L74: manifest.yaml reference
- L40: todo/ folder reference
- L254: todo/ folder reference
- L311: todo/ folder reference
- L74: .yaml file reference

### .ai/_framework/commands/task-create.md
- L76: status.yaml reference
- L322: status.yaml reference
- L362: status.yaml reference
- L437: status.yaml reference
- L483: status.yaml reference
- L485: status.yaml reference
- L90: manifest.yaml reference
- L343: manifest.yaml reference
- L628: manifest.yaml reference
- L74: todo/ folder reference
- L77: todo/ folder reference
- L78: todo/ folder reference
- L327: todo/ folder reference
- L330: todo/ folder reference
- L340: todo/ folder reference
- L345: todo/ folder reference
- L346: todo/ folder reference
- L462: todo/ folder reference
- L473: todo/ folder reference
- L545: todo/ folder reference
- L569: todo/ folder reference
- L572: todo/ folder reference
- L589: todo/ folder reference
- L77: in_progress/ folder reference
- L331: in_progress/ folder reference
- L482: in_progress/ folder reference
- L482: old workflow instruction
- L485: old workflow instruction
- L483: status.yaml update instruction
- L604: cockpit/ reference
- L76: .yaml file reference
- L90: .yaml file reference
- L322: .yaml file reference
- L343: .yaml file reference
- L362: .yaml file reference
- L437: .yaml file reference
- L483: .yaml file reference
- L485: .yaml file reference
- L628: .yaml file reference

### .ai/_framework/commands/task-done.md
- L118: status.yaml reference
- L81: manifest.yaml reference
- L302: manifest.yaml reference
- L59: todo/ folder reference
- L54: in_progress/ folder reference
- L59: in_progress/ folder reference
- L99: in_progress/ folder reference
- L105: in_progress/ folder reference
- L173: in_progress/ folder reference
- L66: done/ folder reference
- L100: done/ folder reference
- L165: done/ folder reference
- L174: done/ folder reference
- L178: done/ folder reference
- L286: done/ folder reference
- L81: .yaml file reference
- L118: .yaml file reference
- L302: .yaml file reference

### .ai/_framework/commands/task-explore.md
- L105: manifest.yaml reference
- L105: .yaml file reference

### .ai/_framework/commands/task-orchestrate.md
- L56: status.yaml reference
- L110: status.yaml reference
- L124: status.yaml reference
- L279: status.yaml reference
- L396: status.yaml reference
- L88: manifest.yaml reference
- L498: manifest.yaml reference
- L514: manifest.yaml reference
- L278: todo/ folder reference
- L55: in_progress/ folder reference
- L98: in_progress/ folder reference
- L278: in_progress/ folder reference
- L279: status.yaml update instruction
- L396: status.yaml update instruction
- L56: .yaml file reference
- L88: .yaml file reference
- L110: .yaml file reference
- L124: .yaml file reference
- L279: .yaml file reference
- L396: .yaml file reference
- L498: .yaml file reference
- L514: .yaml file reference

### .ai/_framework/commands/task-resume.md
- L63: status.yaml reference
- L122: status.yaml reference
- L132: status.yaml reference
- L83: manifest.yaml reference
- L66: todo/ folder reference
- L135: todo/ folder reference
- L53: in_progress/ folder reference
- L65: in_progress/ folder reference
- L95: in_progress/ folder reference
- L99: in_progress/ folder reference
- L134: in_progress/ folder reference
- L137: in_progress/ folder reference
- L152: in_progress/ folder reference
- L254: in_progress/ folder reference
- L63: .yaml file reference
- L83: .yaml file reference
- L122: .yaml file reference
- L132: .yaml file reference

### .ai/_framework/commands/task-review.md
- L76: manifest.yaml reference
- L88: in_progress/ folder reference
- L88: done/ folder reference
- L76: .yaml file reference

### .ai/_framework/commands/task-start.md
- L201: status.yaml reference
- L264: status.yaml reference
- L317: status.yaml reference
- L321: status.yaml reference
- L107: manifest.yaml reference
- L287: manifest.yaml reference
- L384: manifest.yaml reference
- L77: todo/ folder reference
- L86: todo/ folder reference
- L99: todo/ folder reference
- L125: todo/ folder reference
- L131: todo/ folder reference
- L189: todo/ folder reference
- L316: todo/ folder reference
- L86: in_progress/ folder reference
- L126: in_progress/ folder reference
- L190: in_progress/ folder reference
- L194: in_progress/ folder reference
- L249: in_progress/ folder reference
- L259: in_progress/ folder reference
- L360: in_progress/ folder reference
- L317: status.yaml update instruction
- L107: .yaml file reference
- L201: .yaml file reference
- L264: .yaml file reference
- L287: .yaml file reference
- L317: .yaml file reference
- L321: .yaml file reference
- L384: .yaml file reference

### .ai/_framework/commands/task-status.md
- L89: status.yaml reference
- L157: status.yaml reference
- L68: manifest.yaml reference
- L51: todo/ folder reference
- L85: todo/ folder reference
- L146: todo/ folder reference
- L166: todo/ folder reference
- L51: in_progress/ folder reference
- L86: in_progress/ folder reference
- L146: in_progress/ folder reference
- L166: in_progress/ folder reference
- L87: done/ folder reference
- L68: .yaml file reference
- L89: .yaml file reference
- L157: .yaml file reference

### .ai/_framework/commands/task-work.md
- L67: status.yaml reference
- L71: status.yaml reference
- L92: status.yaml reference
- L139: status.yaml reference
- L144: status.yaml reference
- L160: status.yaml reference
- L168: status.yaml reference
- L333: status.yaml reference
- L341: status.yaml reference
- L560: status.yaml reference
- L105: manifest.yaml reference
- L117: manifest.yaml reference
- L377: manifest.yaml reference
- L379: manifest.yaml reference
- L388: manifest.yaml reference
- L397: manifest.yaml reference
- L480: manifest.yaml reference
- L489: manifest.yaml reference
- L636: manifest.yaml reference
- L69: todo/ folder reference
- L150: todo/ folder reference
- L155: todo/ folder reference
- L157: todo/ folder reference
- L539: todo/ folder reference
- L63: in_progress/ folder reference
- L70: in_progress/ folder reference
- L128: in_progress/ folder reference
- L148: in_progress/ folder reference
- L158: in_progress/ folder reference
- L165: in_progress/ folder reference
- L330: in_progress/ folder reference
- L555: in_progress/ folder reference
- L331: done/ folder reference
- L559: old workflow instruction
- L71: status.yaml update instruction
- L92: status.yaml update instruction
- L160: status.yaml update instruction
- L333: status.yaml update instruction
- L560: status.yaml update instruction
- L67: .yaml file reference
- L71: .yaml file reference
- L92: .yaml file reference
- L105: .yaml file reference
- L117: .yaml file reference
- L139: .yaml file reference
- L144: .yaml file reference
- L160: .yaml file reference
- L168: .yaml file reference
- L333: .yaml file reference
- L341: .yaml file reference
- L377: .yaml file reference
- L379: .yaml file reference
- L388: .yaml file reference
- L397: .yaml file reference
- L480: .yaml file reference
- L489: .yaml file reference
- L560: .yaml file reference
- L636: .yaml file reference

### .ai/_framework/commands/wi-create.md
- L56: status.yaml reference
- L69: status.yaml reference
- L79: status.yaml reference
- L113: status.yaml reference
- L162: status.yaml reference
- L196: status.yaml reference
- L198: status.yaml reference
- L268: status.yaml reference
- L89: manifest.yaml reference
- L154: manifest.yaml reference
- L328: manifest.yaml reference
- L78: todo/ folder reference
- L107: todo/ folder reference
- L186: todo/ folder reference
- L278: todo/ folder reference
- L311: todo/ folder reference
- L107: in_progress/ folder reference
- L108: in_progress/ folder reference
- L195: in_progress/ folder reference
- L195: old workflow instruction
- L198: old workflow instruction
- L79: status.yaml update instruction
- L196: status.yaml update instruction
- L268: status.yaml update instruction
- L56: .yaml file reference
- L69: .yaml file reference
- L79: .yaml file reference
- L89: .yaml file reference
- L113: .yaml file reference
- L154: .yaml file reference
- L162: .yaml file reference
- L196: .yaml file reference
- L198: .yaml file reference
- L268: .yaml file reference
- L328: .yaml file reference

## What the AI agent should do

1. **Replace folder-based status** with frontmatter queries
   - `tasks/todo/` → `search_notes` with `status: todo` tag
   - `tasks/in_progress/` → `search_notes` with `status: in_progress` tag
   - `Move to done/` → `update_frontmatter` to set `status: done`

2. **Replace status.yaml reads** with frontmatter reads
   - `Read status.yaml` → `get_frontmatter` on the task note
   - `Update status.yaml` → `update_frontmatter` on the task note

3. **Replace manifest.yaml reads** with manifest.md
   - `Read manifest.yaml` → `Read manifest.md` or `get_frontmatter("_project/manifest.md")`

4. **Update work item workflow instructions**
   - Remove "Move this file to in_progress/" instructions
   - Replace with "Update frontmatter status to in_progress"

5. **Remove cockpit references**
   - Any references to `cockpit/`, `shadows/`, session events

6. **Test mcpvault integration**
   - Verify `search_notes` returns tasks by status tag
   - Verify `read_note` parses frontmatter correctly
   - Verify `write_note` creates proper notes
   - Verify `update_frontmatter` updates status correctly
   - Verify `patch_note` can update work item checkboxes

7. **Test Obsidian**
   - Open .ai/ as vault in Obsidian
   - Verify Git plugin is configured and auto-syncs
   - Verify graph view shows note connections
   - Verify search finds notes by tags and content
