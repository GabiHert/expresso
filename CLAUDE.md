# AI Cockpit Project Instructions

## Task Context

When starting a session, check if you're bound to a specific task:

```bash
echo $COCKPIT_TASK
```

If `COCKPIT_TASK` is set, announce:
```
Working on task: {COCKPIT_TASK}
```

Then read the task README for context:
```
.ai/tasks/*/{ COCKPIT_TASK }/README.md
```

## Cockpit Integration

- All your edits are tracked by the AI Cockpit extension
- Use `/task-start TASK-ID` to begin work on a task
- Use `/task-work` to work through task items
- Use `/task-done` when complete
