# Payroll Processing API Documentation

## Overview

Payroll processing service handling payroll calculations, vendor integrations, and processing pipelines. Currently transitioning from Prisma to Sequelize.

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Framework | Express.js |
| ORMs | Prisma + Sequelize (parallel migration) |
| Database | PostgreSQL |
| Message Queue | NATS |
| Build | SWC |
| Runtime | Node.js 22+ |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/controllers/` | API route handlers |
| `src/services/` | Business logic |
| `src/repositories/` | Data access layer |
| `src/models/` | Sequelize ORM models |
| `src/prisma/` | Prisma schema and migrations |
| `src/pipeline/` | Processing pipelines with decorators |
| `src/integrations/` | External vendor API integrations |
| `src/tasks/` | Cron tasks and scheduled jobs |
| `src/tests/` | E2E and unit tests |
| `specs/` | API specifications |

## Patterns

- **Pipeline Pattern**: Decorators for processing stages
- **Repository Pattern**: Data access abstraction
- **Dual ORM**: Prisma to Sequelize migration in progress
