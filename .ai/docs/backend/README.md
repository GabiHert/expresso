# Backend Documentation

## Overview

Main backend API - Express.js monolith with Sequelize ORM. Enterprise-scale backend with comprehensive testing, modular architecture, strong security/authorization patterns, and async event processing.

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | JavaScript (ES2023), TypeScript |
| Framework | Express.js |
| ORM | Sequelize |
| Database | PostgreSQL |
| Message Queue | NATS JetStream |
| Cache | Redis (ioredis) |
| Build | SWC (replaces Babel) |
| Runtime | Node.js 22.12+ |
| Package Manager | pnpm 10.12.4+ |

## Key Files & Entry Points

| File | Purpose |
|------|---------|
| `server.js` | HTTP server entry point (port 3000) |
| `app.js` | Express application configuration |
| `tasks.js` | Background task processing (102KB) |
| `email_tasks.js` | Email processing (103KB) |
| `container.ts` | Awilix DI container |

## Directory Structure

| Directory | Purpose | Size |
|-----------|---------|------|
| `controllers/` | HTTP request handlers | 245+ folders |
| `services/` | Business logic and utilities | 337+ modules |
| `models/` | Sequelize database models | 656+ models |
| `modules/` | Feature-specific encapsulated modules | Extensive |
| `middleware/` | Express middleware (auth, validation, logging) | 79+ files |
| `migrations/` | Database migrations | 2373+ files |
| `jetstream_consumers/` | NATS JetStream message consumers | 265+ consumers |
| `permissions/` | RBAC system with role-based access | - |
| `__tests__/` | Test files by domain | - |
| `jest/` | Test fixtures, helpers, scenarios | - |

## Testing

- **Framework**: Jest
- **Commands**:
  - `pnpm test` - Full test suite
  - `pnpm test:local` - Local development tests
  - `pnpm test:unit` - Unit tests only
  - `pnpm test:integration` - Integration tests
  - `pnpm smoke` - Smoke tests

## Patterns

- **Modular Architecture**: Feature-based modules with clean encapsulation
- **Service Locator**: Awilix container for dependency injection
- **Middleware Stack**: Permission/RBAC, logging, validation, rate limiting
- **Event-Driven**: NATS JetStream for async processing

## Additional Documentation

| Document | Description |
|----------|-------------|
| [modules.md](./modules.md) | Guide to ~200+ modules organized by domain |
| [entity_transfers/](./entity_transfers/) | Entity transfer feature documentation |
