# PEO Documentation

## Overview

PEO (Professional Employer Organization) service API. Handles PEO-specific business logic including employee management, payroll integration, and benefits coordination.

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Framework | Express.js |
| ORM | Sequelize |
| Database | PostgreSQL |
| Message Queue | NATS JetStream |
| DI | TypeDI |
| API Framework | routing-controllers |
| Cache | Redis (ioredis) |
| Runtime | Node.js 22+ |

## Key Files & Entry Points

| File | Purpose |
|------|---------|
| `src/server.ts` | HTTP server entry point |
| `src/app.ts` | Express application setup |

## Directory Structure

| Directory | Purpose | Size |
|-----------|---------|------|
| `src/controllers/` | REST API endpoints | 47+ dirs |
| `src/services/` | Business logic | redis, NATS, benefits, etc. |
| `src/models/` | Sequelize ORM models | 55+ models |
| `src/config/` | Configuration services | NATS, Employment, S3, Feature flags |
| `src/jetstream-consumers/` | NATS event consumers | - |
| `src/tasks/` | Background tasks | - |
| `src/middlewares/` | Express middleware | - |
| `src/gateway/` | API gateway integration | - |
| `migrations/` | Database migrations | 240+ files |
| `tools/` | CLI tools (generator, task runner) | - |

## Development

- **Commands**:
  - `npm run build && node dist/src/server.js` - Start
  - `npm run dev` - Development with hot reload
  - `npm test` - Run tests

## Patterns

- **Service-based**: Business logic in services, HTTP in controllers
- **Dependency Injection**: TypeDI for service management
- **Event-Driven**: NATS JetStream consumers
- **Feature Flags**: Configurable toggles via FeatureFlag service
- **Swagger**: Auto-generated API documentation

## Feature Documentation

| Feature | Description |
|---------|-------------|
| [entity_transfers/](./entity_transfers/) | Entity transfer rollback handlers, document sharing |
| [hris_integration/](./hris_integration/) | HRIS integration with BambooHR, Hibob, Workday |
