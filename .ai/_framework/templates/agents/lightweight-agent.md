

> Parent: [[commands-index]]
# Lightweight Agent Template
#
# Use this template to create a new lightweight agent that runs on a
# faster/cheaper model (Haiku) instead of the default model.
#
# Instructions:
# 1. Copy this file to .claude/agents/{command-name}.md
# 2. Replace all {placeholders} with actual values
# 3. Adjust tools list based on what the command needs
#
# Available models: haiku, sonnet, opus
# Available tools: Read, Glob, Bash, Grep, Write, Edit, WebFetch, WebSearch, etc.

---
name: {command-name}
description: {Brief description}. Use for quick {command-name} operations.
model: haiku
tools: Read, Glob, Bash
---

Follow the instructions in .ai/_framework/commands/{command-name}.md

Arguments: $ARGUMENTS
