---
type: migration-report
generated: 2026-03-16T11:46:17.470Z
total_issues: 429
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
- L81: manifest.yaml reference
- L146: in_progress/ folder reference
- L81: .yaml file reference

### .ai/_framework/commands/command-create.md
- L215: status.yaml reference
- L70: manifest.yaml reference
- L213: manifest.yaml reference
- L329: manifest.yaml reference
- L407: manifest.yaml reference
- L70: .yaml file reference
- L213: .yaml file reference
- L215: .yaml file reference
- L329: .yaml file reference
- L407: .yaml file reference

### .ai/_framework/commands/command-extend.md
- L239: manifest.yaml reference
- L56: .yaml file reference
- L68: .yaml file reference
- L134: .yaml file reference
- L209: .yaml file reference
- L239: .yaml file reference
- L777: .yaml file reference
- L912: .yaml file reference
- L919: .yaml file reference
- L1022: .yaml file reference

### .ai/_framework/commands/ctx.md
- L51: manifest.yaml reference
- L61: manifest.yaml reference
- L128: manifest.yaml reference
- L278: manifest.yaml reference
- L288: manifest.yaml reference
- L360: manifest.yaml reference
- L367: manifest.yaml reference
- L298: todo/ folder reference
- L68: in_progress/ folder reference
- L107: in_progress/ folder reference
- L110: in_progress/ folder reference
- L299: in_progress/ folder reference
- L51: .yaml file reference
- L61: .yaml file reference
- L128: .yaml file reference
- L234: .yaml file reference
- L278: .yaml file reference
- L288: .yaml file reference
- L360: .yaml file reference
- L367: .yaml file reference

### .ai/_framework/commands/document.md
- L98: manifest.yaml reference
- L148: manifest.yaml reference
- L396: manifest.yaml reference
- L98: .yaml file reference
- L148: .yaml file reference
- L396: .yaml file reference

### .ai/_framework/commands/enhance.md
- L54: manifest.yaml reference
- L55: manifest.yaml reference
- L56: manifest.yaml reference
- L57: manifest.yaml reference
- L64: manifest.yaml reference
- L78: manifest.yaml reference
- L144: manifest.yaml reference
- L195: manifest.yaml reference
- L221: manifest.yaml reference
- L264: manifest.yaml reference
- L269: manifest.yaml reference
- L281: manifest.yaml reference
- L310: manifest.yaml reference
- L318: manifest.yaml reference
- L54: .yaml file reference
- L55: .yaml file reference
- L56: .yaml file reference
- L57: .yaml file reference
- L64: .yaml file reference
- L78: .yaml file reference
- L144: .yaml file reference
- L195: .yaml file reference
- L221: .yaml file reference
- L264: .yaml file reference
- L269: .yaml file reference
- L281: .yaml file reference
- L310: .yaml file reference
- L318: .yaml file reference

### .ai/_framework/commands/expresso-tags.md
- L80: manifest.yaml reference
- L80: .yaml file reference
- L119: .yaml file reference

### .ai/_framework/commands/init.md
- L62: manifest.yaml reference
- L235: manifest.yaml reference
- L239: manifest.yaml reference
- L548: manifest.yaml reference
- L588: manifest.yaml reference
- L406: todo/ folder reference
- L407: in_progress/ folder reference
- L408: done/ folder reference
- L62: .yaml file reference
- L235: .yaml file reference
- L239: .yaml file reference
- L548: .yaml file reference
- L588: .yaml file reference

### .ai/_framework/commands/pr-comments.md
- L150: status.yaml reference
- L374: manifest.yaml reference
- L149: in_progress/ folder reference
- L150: in_progress/ folder reference
- L150: .yaml file reference
- L374: .yaml file reference

### .ai/_framework/commands/task-brief.md
- L66: manifest.yaml reference
- L32: todo/ folder reference
- L246: todo/ folder reference
- L303: todo/ folder reference
- L66: .yaml file reference

### .ai/_framework/commands/task-create.md
- L68: status.yaml reference
- L314: status.yaml reference
- L354: status.yaml reference
- L429: status.yaml reference
- L475: status.yaml reference
- L477: status.yaml reference
- L82: manifest.yaml reference
- L335: manifest.yaml reference
- L620: manifest.yaml reference
- L66: todo/ folder reference
- L69: todo/ folder reference
- L70: todo/ folder reference
- L319: todo/ folder reference
- L322: todo/ folder reference
- L332: todo/ folder reference
- L337: todo/ folder reference
- L338: todo/ folder reference
- L454: todo/ folder reference
- L465: todo/ folder reference
- L537: todo/ folder reference
- L561: todo/ folder reference
- L564: todo/ folder reference
- L581: todo/ folder reference
- L69: in_progress/ folder reference
- L323: in_progress/ folder reference
- L474: in_progress/ folder reference
- L474: old workflow instruction
- L477: old workflow instruction
- L475: status.yaml update instruction
- L596: cockpit/ reference
- L68: .yaml file reference
- L82: .yaml file reference
- L314: .yaml file reference
- L335: .yaml file reference
- L354: .yaml file reference
- L429: .yaml file reference
- L475: .yaml file reference
- L477: .yaml file reference
- L620: .yaml file reference

### .ai/_framework/commands/task-done.md
- L110: status.yaml reference
- L73: manifest.yaml reference
- L294: manifest.yaml reference
- L51: todo/ folder reference
- L46: in_progress/ folder reference
- L51: in_progress/ folder reference
- L91: in_progress/ folder reference
- L97: in_progress/ folder reference
- L165: in_progress/ folder reference
- L58: done/ folder reference
- L92: done/ folder reference
- L157: done/ folder reference
- L166: done/ folder reference
- L170: done/ folder reference
- L278: done/ folder reference
- L73: .yaml file reference
- L110: .yaml file reference
- L294: .yaml file reference

### .ai/_framework/commands/task-explore.md
- L97: manifest.yaml reference
- L97: .yaml file reference

### .ai/_framework/commands/task-orchestrate.md
- L48: status.yaml reference
- L102: status.yaml reference
- L116: status.yaml reference
- L271: status.yaml reference
- L388: status.yaml reference
- L80: manifest.yaml reference
- L490: manifest.yaml reference
- L506: manifest.yaml reference
- L270: todo/ folder reference
- L47: in_progress/ folder reference
- L90: in_progress/ folder reference
- L270: in_progress/ folder reference
- L271: status.yaml update instruction
- L388: status.yaml update instruction
- L48: .yaml file reference
- L80: .yaml file reference
- L102: .yaml file reference
- L116: .yaml file reference
- L271: .yaml file reference
- L388: .yaml file reference
- L490: .yaml file reference
- L506: .yaml file reference

### .ai/_framework/commands/task-resume.md
- L55: status.yaml reference
- L114: status.yaml reference
- L124: status.yaml reference
- L75: manifest.yaml reference
- L58: todo/ folder reference
- L127: todo/ folder reference
- L45: in_progress/ folder reference
- L57: in_progress/ folder reference
- L87: in_progress/ folder reference
- L91: in_progress/ folder reference
- L126: in_progress/ folder reference
- L129: in_progress/ folder reference
- L144: in_progress/ folder reference
- L246: in_progress/ folder reference
- L55: .yaml file reference
- L75: .yaml file reference
- L114: .yaml file reference
- L124: .yaml file reference

### .ai/_framework/commands/task-review.md
- L68: manifest.yaml reference
- L80: in_progress/ folder reference
- L80: done/ folder reference
- L68: .yaml file reference

### .ai/_framework/commands/task-start.md
- L193: status.yaml reference
- L256: status.yaml reference
- L309: status.yaml reference
- L313: status.yaml reference
- L99: manifest.yaml reference
- L279: manifest.yaml reference
- L376: manifest.yaml reference
- L69: todo/ folder reference
- L78: todo/ folder reference
- L91: todo/ folder reference
- L117: todo/ folder reference
- L123: todo/ folder reference
- L181: todo/ folder reference
- L308: todo/ folder reference
- L78: in_progress/ folder reference
- L118: in_progress/ folder reference
- L182: in_progress/ folder reference
- L186: in_progress/ folder reference
- L241: in_progress/ folder reference
- L251: in_progress/ folder reference
- L352: in_progress/ folder reference
- L309: status.yaml update instruction
- L99: .yaml file reference
- L193: .yaml file reference
- L256: .yaml file reference
- L279: .yaml file reference
- L309: .yaml file reference
- L313: .yaml file reference
- L376: .yaml file reference

### .ai/_framework/commands/task-status.md
- L81: status.yaml reference
- L149: status.yaml reference
- L60: manifest.yaml reference
- L43: todo/ folder reference
- L77: todo/ folder reference
- L138: todo/ folder reference
- L158: todo/ folder reference
- L43: in_progress/ folder reference
- L78: in_progress/ folder reference
- L138: in_progress/ folder reference
- L158: in_progress/ folder reference
- L79: done/ folder reference
- L60: .yaml file reference
- L81: .yaml file reference
- L149: .yaml file reference

### .ai/_framework/commands/task-work.md
- L59: status.yaml reference
- L63: status.yaml reference
- L84: status.yaml reference
- L131: status.yaml reference
- L136: status.yaml reference
- L152: status.yaml reference
- L160: status.yaml reference
- L325: status.yaml reference
- L333: status.yaml reference
- L552: status.yaml reference
- L97: manifest.yaml reference
- L109: manifest.yaml reference
- L369: manifest.yaml reference
- L371: manifest.yaml reference
- L380: manifest.yaml reference
- L389: manifest.yaml reference
- L472: manifest.yaml reference
- L481: manifest.yaml reference
- L628: manifest.yaml reference
- L61: todo/ folder reference
- L142: todo/ folder reference
- L147: todo/ folder reference
- L149: todo/ folder reference
- L531: todo/ folder reference
- L55: in_progress/ folder reference
- L62: in_progress/ folder reference
- L120: in_progress/ folder reference
- L140: in_progress/ folder reference
- L150: in_progress/ folder reference
- L157: in_progress/ folder reference
- L322: in_progress/ folder reference
- L547: in_progress/ folder reference
- L323: done/ folder reference
- L551: old workflow instruction
- L63: status.yaml update instruction
- L84: status.yaml update instruction
- L152: status.yaml update instruction
- L325: status.yaml update instruction
- L552: status.yaml update instruction
- L59: .yaml file reference
- L63: .yaml file reference
- L84: .yaml file reference
- L97: .yaml file reference
- L109: .yaml file reference
- L131: .yaml file reference
- L136: .yaml file reference
- L152: .yaml file reference
- L160: .yaml file reference
- L325: .yaml file reference
- L333: .yaml file reference
- L369: .yaml file reference
- L371: .yaml file reference
- L380: .yaml file reference
- L389: .yaml file reference
- L472: .yaml file reference
- L481: .yaml file reference
- L552: .yaml file reference
- L628: .yaml file reference

### .ai/_framework/commands/wi-create.md
- L48: status.yaml reference
- L61: status.yaml reference
- L71: status.yaml reference
- L105: status.yaml reference
- L154: status.yaml reference
- L188: status.yaml reference
- L190: status.yaml reference
- L260: status.yaml reference
- L81: manifest.yaml reference
- L146: manifest.yaml reference
- L320: manifest.yaml reference
- L70: todo/ folder reference
- L99: todo/ folder reference
- L178: todo/ folder reference
- L270: todo/ folder reference
- L303: todo/ folder reference
- L99: in_progress/ folder reference
- L100: in_progress/ folder reference
- L187: in_progress/ folder reference
- L187: old workflow instruction
- L190: old workflow instruction
- L71: status.yaml update instruction
- L188: status.yaml update instruction
- L260: status.yaml update instruction
- L48: .yaml file reference
- L61: .yaml file reference
- L71: .yaml file reference
- L81: .yaml file reference
- L105: .yaml file reference
- L146: .yaml file reference
- L154: .yaml file reference
- L188: .yaml file reference
- L190: .yaml file reference
- L260: .yaml file reference
- L320: .yaml file reference

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
