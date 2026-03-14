---
type: migration-report
generated: 2026-03-14T00:55:08.080Z
total_issues: 509
tags: [migration, vault]
---

# Vault Migration Report

## Files with old pattern references

These files contain references to the old filesystem-based structure and need
to be updated to use vault-native patterns (frontmatter, mcpvault MCP tools).

### .ai/tasks/LOCAL-026/01-manifest-protected-flag.md
- L9: manifest.yaml reference
- L44: manifest.yaml reference
- L73: manifest.yaml reference
- L95: manifest.yaml reference
- L9: .yaml file reference
- L44: .yaml file reference
- L73: .yaml file reference
- L95: .yaml file reference

### .ai/tasks/LOCAL-026/02-task-start-branch-protection.md
- L27: manifest.yaml reference
- L27: .yaml file reference

### .ai/tasks/LOCAL-026/03-task-create-exclude-protected.md
- L52: status.yaml reference
- L127: status.yaml reference
- L66: todo/ folder reference
- L48: .yaml file reference
- L52: .yaml file reference
- L127: .yaml file reference

### .ai/tasks/LOCAL-026/04-active-task-schema.md
- L65: in_progress/ folder reference
- L110: in_progress/ folder reference
- L9: cockpit/ reference
- L24: cockpit/ reference
- L106: cockpit/ reference
- L132: cockpit/ reference
- L202: cockpit/ reference

### .ai/tasks/LOCAL-026/05-task-work-git-guardrails.md
- L199: status.yaml reference
- L145: manifest.yaml reference
- L193: in_progress/ folder reference
- L199: status.yaml update instruction
- L29: cockpit/ reference
- L145: .yaml file reference
- L199: .yaml file reference

### .ai/tasks/LOCAL-026/06-work-item-template.md
- L66: status.yaml reference
- L68: status.yaml reference
- L84: todo/ folder reference
- L65: in_progress/ folder reference
- L65: old workflow instruction
- L68: old workflow instruction
- L66: status.yaml update instruction
- L66: .yaml file reference
- L68: .yaml file reference

### .ai/tasks/LOCAL-009/01-taskitem-click-description.md
- L50: todo/ folder reference
- L56: todo/ folder reference
- L50: in_progress/ folder reference
- L55: in_progress/ folder reference
- L57: done/ folder reference

### .ai/tasks/LOCAL-009/02-workitem-click-handler.md
- L17: todo/ folder reference
- L18: todo/ folder reference
- L17: in_progress/ folder reference

### .ai/tasks/LOCAL-009/03-register-openworkitem-command.md
- L90: todo/ folder reference
- L98: todo/ folder reference

### .ai/tasks/LOCAL-010/02-delete-session-method.md
- L58: cockpit/ reference

### .ai/tasks/LOCAL-012/05-link-session-command.md
- L26: status.yaml reference
- L26: .yaml file reference

### .ai/tasks/LOCAL-012/07-task-create-integration.md
- L22: cockpit/ reference

### .ai/tasks/LOCAL-013/04-task-create-integration.md
- L17: todo/ folder reference
- L28: todo/ folder reference
- L49: todo/ folder reference
- L18: in_progress/ folder reference

### .ai/tasks/LOCAL-014/07-wire-tree-view.md
- L45: todo/ folder reference

### .ai/tasks/LOCAL-015/04-cleanup-service.md
- L61: cockpit/ reference
- L63: cockpit/ reference
- L76: cockpit/ reference
- L78: cockpit/ reference
- L91: cockpit/ reference
- L173: cockpit/ reference
- L174: cockpit/ reference

### .ai/tasks/LOCAL-015/05-active-task-cleanup.md
- L21: cockpit/ reference

### .ai/tasks/LOCAL-015/06-tests.md
- L32: cockpit/ reference
- L33: cockpit/ reference
- L45: cockpit/ reference
- L57: cockpit/ reference
- L69: cockpit/ reference
- L90: cockpit/ reference
- L100: cockpit/ reference

### .ai/tasks/LOCAL-018/02-parse-color-yaml.md
- L5: status.yaml reference
- L18: status.yaml reference
- L23: status.yaml reference
- L36: status.yaml reference
- L38: status.yaml reference
- L49: status.yaml reference
- L56: status.yaml reference
- L1: .yaml file reference
- L5: .yaml file reference
- L18: .yaml file reference
- L23: .yaml file reference
- L34: .yaml file reference
- L36: .yaml file reference
- L38: .yaml file reference
- L49: .yaml file reference
- L56: .yaml file reference

### .ai/tasks/LOCAL-018/03-taskitem-color.md
- L101: status.yaml reference
- L101: .yaml file reference

### .ai/tasks/LOCAL-018/05-task-create-color-picker.md
- L41: status.yaml reference
- L44: status.yaml reference
- L49: status.yaml reference
- L93: status.yaml reference
- L101: status.yaml reference
- L103: status.yaml reference
- L44: status.yaml update instruction
- L41: .yaml file reference
- L44: .yaml file reference
- L49: .yaml file reference
- L93: .yaml file reference
- L101: .yaml file reference
- L103: .yaml file reference

### .ai/tasks/LOCAL-018/06-terminal-tab-color.md
- L59: status.yaml reference
- L69: status.yaml reference
- L59: .yaml file reference
- L69: .yaml file reference

### .ai/tasks/LOCAL-020/01-update-link-session-command.md
- L5: todo/ folder reference
- L5: in_progress/ folder reference

### .ai/tasks/LOCAL-021/WI-01-signal-file-task-start.md
- L25: cockpit/ reference
- L38: cockpit/ reference
- L39: cockpit/ reference
- L49: cockpit/ reference
- L59: cockpit/ reference
- L103: cockpit/ reference
- L112: cockpit/ reference

### .ai/tasks/LOCAL-021/WI-02-filewatcher-signal-monitor.md
- L183: cockpit/ reference
- L209: cockpit/ reference

### .ai/tasks/LOCAL-021/WI-03-session-update-method.md
- L115: cockpit/ reference

### .ai/tasks/LOCAL-021/WI-04-wire-signal-handler.md
- L211: cockpit/ reference

### .ai/tasks/LOCAL-021/WI-05-continuous-verification.md
- L254: cockpit/ reference
- L277: cockpit/ reference

### .ai/tasks/LOCAL-021/WI-06-edge-cases-cleanup.md
- L172: cockpit/ reference
- L399: cockpit/ reference

### .ai/tasks/LOCAL-023/02-refactor-session-manager.md
- L35: cockpit/ reference

### .ai/tasks/LOCAL-023/03-fix-cleanup-service.md
- L17: cockpit/ reference
- L78: cockpit/ reference

### .ai/tasks/LOCAL-023/04-extension-lifecycle.md
- L154: cockpit/ reference
- L160: cockpit/ reference

### .ai/tasks/LOCAL-023/05-update-tests.md
- L23: cockpit/ reference

### .ai/tasks/LOCAL-025/01-install-script.md
- L34: cockpit/ reference
- L36: cockpit/ reference

### .ai/tasks/LOCAL-025/03-test-script.md
- L32: cockpit/ reference
- L33: cockpit/ reference

### .ai/tasks/LOCAL-027/06-framework-command.md
- L89: manifest.yaml reference
- L89: .yaml file reference

### .ai/docs/_architecture/README.md
- L12: cockpit/ reference
- L30: cockpit/ reference

### .ai/docs/_architecture/active-task-schema.md
- L159: manifest.yaml reference
- L77: in_progress/ folder reference
- L4: cockpit/ reference
- L121: cockpit/ reference
- L122: cockpit/ reference
- L159: .yaml file reference

### .ai/docs/_architecture/ai-cockpit-mvp-v1.md
- L275: status.yaml reference
- L275: .yaml file reference

### .ai/docs/_architecture/ai-cockpit-mvp-v2.md
- L124: todo/ folder reference
- L157: todo/ folder reference
- L125: in_progress/ folder reference
- L141: in_progress/ folder reference
- L162: in_progress/ folder reference
- L210: in_progress/ folder reference
- L182: done/ folder reference
- L36: cockpit/ reference
- L62: cockpit/ reference
- L74: cockpit/ reference
- L112: cockpit/ reference
- L164: cockpit/ reference
- L184: cockpit/ reference
- L202: cockpit/ reference
- L232: cockpit/ reference
- L315: cockpit/ reference
- L349: cockpit/ reference
- L472: cockpit/ reference
- L484: cockpit/ reference
- L516: cockpit/ reference
- L553: cockpit/ reference
- L577: cockpit/ reference
- L583: cockpit/ reference
- L632: cockpit/ reference
- L701: cockpit/ reference
- L703: cockpit/ reference

### .ai/docs/_architecture/shadow-copy-system.md
- L45: cockpit/ reference
- L69: cockpit/ reference
- L263: cockpit/ reference
- L307: cockpit/ reference

### .ai/docs/_completed_tasks.md
- L7: done/ folder reference
- L8: done/ folder reference
- L9: done/ folder reference
- L10: done/ folder reference
- L11: done/ folder reference
- L12: done/ folder reference
- L13: done/ folder reference
- L14: done/ folder reference
- L15: done/ folder reference
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

### .ai/docs/ai-framework/README.md
- L12: manifest.yaml reference
- L36: manifest.yaml reference
- L23: todo/ folder reference
- L23: in_progress/ folder reference
- L12: .yaml file reference
- L36: .yaml file reference

### .ai/docs/feedback-system.md
- L18: in_progress/ folder reference

### .ai/docs/vscode-extension/README.md
- L22: cockpit/ reference
- L37: cockpit/ reference
- L42: cockpit/ reference

### .ai/_framework/commands/ask.md
- L78: manifest.yaml reference
- L143: in_progress/ folder reference
- L78: .yaml file reference

### .ai/_framework/commands/command-create.md
- L212: status.yaml reference
- L67: manifest.yaml reference
- L210: manifest.yaml reference
- L326: manifest.yaml reference
- L404: manifest.yaml reference
- L67: .yaml file reference
- L210: .yaml file reference
- L212: .yaml file reference
- L326: .yaml file reference
- L404: .yaml file reference

### .ai/_framework/commands/command-extend.md
- L236: manifest.yaml reference
- L53: .yaml file reference
- L65: .yaml file reference
- L131: .yaml file reference
- L206: .yaml file reference
- L236: .yaml file reference
- L774: .yaml file reference
- L909: .yaml file reference
- L916: .yaml file reference
- L1019: .yaml file reference

### .ai/_framework/commands/ctx.md
- L48: manifest.yaml reference
- L58: manifest.yaml reference
- L125: manifest.yaml reference
- L275: manifest.yaml reference
- L285: manifest.yaml reference
- L357: manifest.yaml reference
- L364: manifest.yaml reference
- L295: todo/ folder reference
- L65: in_progress/ folder reference
- L104: in_progress/ folder reference
- L107: in_progress/ folder reference
- L296: in_progress/ folder reference
- L48: .yaml file reference
- L58: .yaml file reference
- L125: .yaml file reference
- L231: .yaml file reference
- L275: .yaml file reference
- L285: .yaml file reference
- L357: .yaml file reference
- L364: .yaml file reference

### .ai/_framework/commands/document.md
- L95: manifest.yaml reference
- L145: manifest.yaml reference
- L393: manifest.yaml reference
- L95: .yaml file reference
- L145: .yaml file reference
- L393: .yaml file reference

### .ai/_framework/commands/enhance.md
- L51: manifest.yaml reference
- L52: manifest.yaml reference
- L53: manifest.yaml reference
- L54: manifest.yaml reference
- L61: manifest.yaml reference
- L75: manifest.yaml reference
- L141: manifest.yaml reference
- L192: manifest.yaml reference
- L218: manifest.yaml reference
- L261: manifest.yaml reference
- L266: manifest.yaml reference
- L278: manifest.yaml reference
- L307: manifest.yaml reference
- L315: manifest.yaml reference
- L51: .yaml file reference
- L52: .yaml file reference
- L53: .yaml file reference
- L54: .yaml file reference
- L61: .yaml file reference
- L75: .yaml file reference
- L141: .yaml file reference
- L192: .yaml file reference
- L218: .yaml file reference
- L261: .yaml file reference
- L266: .yaml file reference
- L278: .yaml file reference
- L307: .yaml file reference
- L315: .yaml file reference

### .ai/_framework/commands/expresso-tags.md
- L77: manifest.yaml reference
- L77: .yaml file reference
- L116: .yaml file reference

### .ai/_framework/commands/init.md
- L59: manifest.yaml reference
- L232: manifest.yaml reference
- L236: manifest.yaml reference
- L545: manifest.yaml reference
- L585: manifest.yaml reference
- L403: todo/ folder reference
- L404: in_progress/ folder reference
- L405: done/ folder reference
- L59: .yaml file reference
- L232: .yaml file reference
- L236: .yaml file reference
- L545: .yaml file reference
- L585: .yaml file reference

### .ai/_framework/commands/task-create.md
- L65: status.yaml reference
- L311: status.yaml reference
- L351: status.yaml reference
- L426: status.yaml reference
- L472: status.yaml reference
- L474: status.yaml reference
- L79: manifest.yaml reference
- L332: manifest.yaml reference
- L617: manifest.yaml reference
- L63: todo/ folder reference
- L66: todo/ folder reference
- L67: todo/ folder reference
- L316: todo/ folder reference
- L319: todo/ folder reference
- L329: todo/ folder reference
- L334: todo/ folder reference
- L335: todo/ folder reference
- L451: todo/ folder reference
- L462: todo/ folder reference
- L534: todo/ folder reference
- L558: todo/ folder reference
- L561: todo/ folder reference
- L578: todo/ folder reference
- L66: in_progress/ folder reference
- L320: in_progress/ folder reference
- L471: in_progress/ folder reference
- L471: old workflow instruction
- L474: old workflow instruction
- L472: status.yaml update instruction
- L593: cockpit/ reference
- L65: .yaml file reference
- L79: .yaml file reference
- L311: .yaml file reference
- L332: .yaml file reference
- L351: .yaml file reference
- L426: .yaml file reference
- L472: .yaml file reference
- L474: .yaml file reference
- L617: .yaml file reference

### .ai/_framework/commands/task-done.md
- L107: status.yaml reference
- L70: manifest.yaml reference
- L291: manifest.yaml reference
- L48: todo/ folder reference
- L43: in_progress/ folder reference
- L48: in_progress/ folder reference
- L88: in_progress/ folder reference
- L94: in_progress/ folder reference
- L162: in_progress/ folder reference
- L55: done/ folder reference
- L89: done/ folder reference
- L154: done/ folder reference
- L163: done/ folder reference
- L167: done/ folder reference
- L275: done/ folder reference
- L70: .yaml file reference
- L107: .yaml file reference
- L291: .yaml file reference

### .ai/_framework/commands/task-explore.md
- L94: manifest.yaml reference
- L94: .yaml file reference

### .ai/_framework/commands/task-orchestrate.md
- L45: status.yaml reference
- L99: status.yaml reference
- L113: status.yaml reference
- L268: status.yaml reference
- L385: status.yaml reference
- L77: manifest.yaml reference
- L487: manifest.yaml reference
- L503: manifest.yaml reference
- L267: todo/ folder reference
- L44: in_progress/ folder reference
- L87: in_progress/ folder reference
- L267: in_progress/ folder reference
- L268: status.yaml update instruction
- L385: status.yaml update instruction
- L45: .yaml file reference
- L77: .yaml file reference
- L99: .yaml file reference
- L113: .yaml file reference
- L268: .yaml file reference
- L385: .yaml file reference
- L487: .yaml file reference
- L503: .yaml file reference

### .ai/_framework/commands/task-resume.md
- L52: status.yaml reference
- L111: status.yaml reference
- L121: status.yaml reference
- L72: manifest.yaml reference
- L55: todo/ folder reference
- L124: todo/ folder reference
- L42: in_progress/ folder reference
- L54: in_progress/ folder reference
- L84: in_progress/ folder reference
- L88: in_progress/ folder reference
- L123: in_progress/ folder reference
- L126: in_progress/ folder reference
- L141: in_progress/ folder reference
- L243: in_progress/ folder reference
- L52: .yaml file reference
- L72: .yaml file reference
- L111: .yaml file reference
- L121: .yaml file reference

### .ai/_framework/commands/task-review.md
- L65: manifest.yaml reference
- L77: in_progress/ folder reference
- L77: done/ folder reference
- L65: .yaml file reference

### .ai/_framework/commands/task-start.md
- L190: status.yaml reference
- L253: status.yaml reference
- L306: status.yaml reference
- L310: status.yaml reference
- L96: manifest.yaml reference
- L276: manifest.yaml reference
- L373: manifest.yaml reference
- L66: todo/ folder reference
- L75: todo/ folder reference
- L88: todo/ folder reference
- L114: todo/ folder reference
- L120: todo/ folder reference
- L178: todo/ folder reference
- L305: todo/ folder reference
- L75: in_progress/ folder reference
- L115: in_progress/ folder reference
- L179: in_progress/ folder reference
- L183: in_progress/ folder reference
- L238: in_progress/ folder reference
- L248: in_progress/ folder reference
- L349: in_progress/ folder reference
- L306: status.yaml update instruction
- L96: .yaml file reference
- L190: .yaml file reference
- L253: .yaml file reference
- L276: .yaml file reference
- L306: .yaml file reference
- L310: .yaml file reference
- L373: .yaml file reference

### .ai/_framework/commands/task-status.md
- L78: status.yaml reference
- L146: status.yaml reference
- L57: manifest.yaml reference
- L40: todo/ folder reference
- L74: todo/ folder reference
- L135: todo/ folder reference
- L155: todo/ folder reference
- L40: in_progress/ folder reference
- L75: in_progress/ folder reference
- L135: in_progress/ folder reference
- L155: in_progress/ folder reference
- L76: done/ folder reference
- L57: .yaml file reference
- L78: .yaml file reference
- L146: .yaml file reference

### .ai/_framework/commands/task-work.md
- L56: status.yaml reference
- L60: status.yaml reference
- L81: status.yaml reference
- L128: status.yaml reference
- L133: status.yaml reference
- L149: status.yaml reference
- L157: status.yaml reference
- L322: status.yaml reference
- L330: status.yaml reference
- L549: status.yaml reference
- L94: manifest.yaml reference
- L106: manifest.yaml reference
- L366: manifest.yaml reference
- L368: manifest.yaml reference
- L377: manifest.yaml reference
- L386: manifest.yaml reference
- L469: manifest.yaml reference
- L478: manifest.yaml reference
- L625: manifest.yaml reference
- L58: todo/ folder reference
- L139: todo/ folder reference
- L144: todo/ folder reference
- L146: todo/ folder reference
- L528: todo/ folder reference
- L52: in_progress/ folder reference
- L59: in_progress/ folder reference
- L117: in_progress/ folder reference
- L137: in_progress/ folder reference
- L147: in_progress/ folder reference
- L154: in_progress/ folder reference
- L319: in_progress/ folder reference
- L544: in_progress/ folder reference
- L320: done/ folder reference
- L548: old workflow instruction
- L60: status.yaml update instruction
- L81: status.yaml update instruction
- L149: status.yaml update instruction
- L322: status.yaml update instruction
- L549: status.yaml update instruction
- L56: .yaml file reference
- L60: .yaml file reference
- L81: .yaml file reference
- L94: .yaml file reference
- L106: .yaml file reference
- L128: .yaml file reference
- L133: .yaml file reference
- L149: .yaml file reference
- L157: .yaml file reference
- L322: .yaml file reference
- L330: .yaml file reference
- L366: .yaml file reference
- L368: .yaml file reference
- L377: .yaml file reference
- L386: .yaml file reference
- L469: .yaml file reference
- L478: .yaml file reference
- L549: .yaml file reference
- L625: .yaml file reference

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
