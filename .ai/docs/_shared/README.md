<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ LOCATION: .ai/docs/_shared/                                     ║
╠══════════════════════════════════════════════════════════════════╣
║ Cross-cutting patterns and shared knowledge.                     ║
║ Document patterns that apply across multiple repositories.       ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Shared Patterns

This directory contains documentation for patterns that span multiple repositories.

## Contents

| Pattern | Description |
|---------|-------------|
| [sequelize-patterns.md](./sequelize-patterns.md) | Sequelize ORM patterns used across services |
| [nats-events.md](./nats-events.md) | NATS JetStream event-driven architecture |

## When to Add Here

Add documentation here when:
- A pattern is used in 2+ repositories
- A convention applies project-wide
- Knowledge is not specific to one repo

## See Also

- [INDEX.md](../INDEX.md) - Navigation hub
- [_architecture/](../_architecture/) - System architecture
