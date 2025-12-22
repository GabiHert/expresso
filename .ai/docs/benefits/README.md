# Benefits Documentation

## Overview

Benefits management service API handling employee benefits enrollment, administration, and vendor integrations.

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Framework | Express.js, routing-controllers |
| ORM | Sequelize + sequelize-typescript |
| Database | PostgreSQL |
| Message Queue | NATS JetStream |
| DI | TypeDI |
| Runtime | Node.js 22+ |

## Key Directories

| Directory | Purpose | Size |
|-----------|---------|------|
| `src/controllers/` | Route handlers | 49 handlers |
| `src/services/` | Service modules | 21 modules |
| `src/models/` | Database models | 115+ models |
| `src/tasks/` | Background jobs | - |
| `src/modules/` | Feature modules (SFTP, NATS) | - |
| `migrations/` | Schema migrations | 366+ files |
| `post_deployment_migrations/` | Post-deploy ops | 66+ files |
| `src/integration_tests/` | E2E tests | - |

## Patterns

- **Service-based Architecture**: Controllers delegate to services
- **Background Tasks**: Task runner system for async jobs
- **Event Streaming**: NATS consumers for events
- **Custom ESLint**: Project-specific lint rules
