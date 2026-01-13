<!--
╔══════════════════════════════════════════════════════════════════╗
║ LAYER: DOMAIN                                                    ║
║ STATUS: Current                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ NAVIGATION:                                                      ║
║ • Parent: .ai/docs/                                              ║
║ • Related: backend, peo, eor-experience                          ║
║ • Index: .ai/INDEX.md                                           ║
╚══════════════════════════════════════════════════════════════════╝
-->

# Employment Service

The Employment service manages all aspects of employee-employer relationships, payroll processing, and employment lifecycle management for Deel's Global Payroll (GP), EOR, and embedded payroll products.

---

## Overview

- **What**: Microservice handling employment records, payroll events, payroll reports, tax filing, reconciliation, and payout management
- **Why**: Central service for employment lifecycle - from onboarding through payroll processing to termination
- **When**: Used whenever employee payroll data needs to be created, modified, or processed

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Employment | Core entity representing an employee's relationship with a legal entity |
| Payroll Event | A payroll cycle instance (e.g., monthly payroll run) |
| Payroll Settings | Configuration for a legal entity's payroll (cycle type, schedules) |
| Payroll Report | Generated payroll data for a payroll event |
| Payroll Report Item | Individual line items in a payroll report (salary, deductions, etc.) |
| Employment Term | Contract terms for an employment (salary, job title, dates) |
| Payout Package | Collection of payout requests for a payroll cycle |
| ICP | In-Country Partner - third-party payroll processor |
| Legal Entity | Company entity that employs workers |
| GP Contract | Global Payroll contract reference |
| EOR Contract | Employer of Record contract reference |

---

## Architecture / Structure

```
employment/
├── src/
│   ├── app.ts                    # Express app initialization
│   ├── server.ts                 # Server entry point
│   ├── cron.ts                   # Cron job runner
│   ├── controllers/              # REST API controllers
│   │   ├── embedded/             # Embedded payroll endpoints
│   │   ├── employment/           # Employment CRUD
│   │   ├── payroll/              # Payroll management
│   │   ├── payout/               # Payout processing
│   │   ├── tax-filing/           # Tax filing (W2, W2C, W3)
│   │   └── ...                   # Other domain controllers
│   ├── services/                 # Business logic
│   │   ├── nats/                 # NATS event handlers (86+ handlers)
│   │   ├── embedded-payroll/     # Embedded payroll logic
│   │   ├── employment/           # Employment services
│   │   ├── payroll/              # Payroll processing
│   │   ├── payout/               # Payout generation
│   │   └── ...                   # Other domain services
│   ├── models/                   # Sequelize models (117 models)
│   ├── prisma/                   # Prisma schema (2000+ lines)
│   ├── tasks/                    # Scheduled cron jobs (28 tasks)
│   ├── middlewares/              # Express middlewares
│   ├── repositories/             # Data access layer
│   └── utils/                    # Utilities and helpers
├── migrations/                   # Sequelize migrations (318)
└── specs/                        # OpenAPI/Swagger specs
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server with routing-controllers |
| TypeDI | Dependency injection |
| Sequelize + Prisma | ORMs (migrating from Prisma to Sequelize) |
| PostgreSQL | Database |
| NATS JetStream | Event messaging |
| Zod | Request validation and OpenAPI schema generation |
| Jest | Testing framework |
| SWC | TypeScript compilation |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Employment Controller | `src/controllers/employment/` | Employment CRUD operations |
| Payroll Controller | `src/controllers/payroll/` | Payroll event management |
| Embedded Payroll | `src/controllers/embedded/` | Embedded payroll APIs |
| NATS Handlers | `src/services/nats/` | Event-driven processing |
| Cron Tasks | `src/tasks/` | Scheduled jobs |

---

## Patterns & Conventions

### Pattern: Dependency Injection with TypeDI

**When to use**: All services and controllers

**Example from codebase**: `src/controllers/employment/Employment.controller.ts:86-97`

```typescript
@JsonController('/employments')
@Service()
class EmploymentController {
  constructor(
    private employmentService: EmploymentService,
    private employmentPayrollSettingsService: EmploymentPayrollSettingsService,
    // ... other services auto-injected
  ) {}
}
```

### Pattern: Zod DTOs for Validation

**When to use**: All API endpoints for request validation

**Example from codebase**: `src/controllers/employment/dtos/Employment.dto.ts`

```typescript
import { createZodDto } from '@abitia/zod-dto';
import { z } from 'zod';

export const createEmploymentSchema = z.object({
  email: z.string(),
  country: z.string(),
  // ...
});

export class CreateEmploymentDto extends createZodDto(createEmploymentSchema) {}
```

### Pattern: NATS Event Handlers

**When to use**: Asynchronous event-driven processing

**Example from codebase**: `src/services/nats/BuildPayrollReportUponContractUpdate.handler.ts`

Handlers extend `BaseHandler` and process events from NATS JetStream.

### Pattern: Sequelize Models with Decorators

**When to use**: Database entity definitions

**Example from codebase**: `src/models/Employment.ts`

```typescript
@Table({ tableName: 'employments' })
export class Employment extends Model<EmploymentAttributes, EmploymentCreationAttributes> {
  @PrimaryKey
  @Default(cuid)
  @Column(DataType.STRING)
  id!: string;

  @Column(DataType.INTEGER)
  eorContractId!: number | null;
  // ...
}
```

### Pattern: Cron Tasks

**When to use**: Scheduled background jobs

**Example from codebase**: `src/tasks/PayrollCalendarGenerator.ts`

```typescript
class PayrollCalendarGenerator extends BaseTask {
  async run() {
    // Task implementation
  }
}
export default PayrollCalendarGenerator;
```

---

## API Structure

### Controller Domains

| Domain | Path | Description |
|--------|------|-------------|
| Employment | `/employments` | Employment CRUD |
| Employee | `/employees` | Employee data |
| Employer | `/employers` | Employer/organization data |
| Payroll Events | `/payroll-events` | Payroll cycle management |
| Payroll Reports | `/payroll-reports` | Payroll report generation |
| Payroll Settings | `/payroll-settings` | Payroll configuration |
| Payroll Calendar | `/payroll-calendars` | Payroll schedule management |
| Payout | `/payout-packages`, `/payout-requests` | Payout processing |
| Tax Filing | `/tax-events`, `/tax-filing` | Tax document generation |
| Embedded | `/embedded/*` | Embedded payroll APIs |
| ICP | `/icp/*` | In-Country Partner APIs |
| Legal Entities | `/legal-entities` | Legal entity management |
| Global Ledger | `/global-ledger` | Accounting integration |

---

## NATS Events

The service publishes and consumes numerous NATS events:

### Key Event Categories

| Category | Events |
|----------|--------|
| Payroll Events | `DEEL.PAYROLL.EVENTS.CREATED`, `.STATE_UPDATED`, `.DELETED` |
| Payroll Calendar | `DEEL.PAYROLL.CALENDAR.CREATED`, `.UPDATED`, `.DATE_TRIGGER` |
| Payroll Settings | `DEEL.PAYROLL.SETTINGS.*` |
| Embedded Payroll | `embeddedPayroll.payrollReportItems.*`, `.g2n.*` |
| PEO | `peo.payroll_report_items.*` |
| Payout | `PAYOUT.PACKAGES.*`, `DEEL.PAYROLL.PAYOUT.*` |
| Contract | `globalPayroll.termination.*` |

---

## Cron Jobs (Tasks)

| Task | Purpose |
|------|---------|
| `PayrollCalendarGenerator` | Generate payroll calendars |
| `EORPayrollScheduler` | Schedule EOR payroll events |
| `GPPayrollScheduler` | Schedule GP payroll events |
| `PEOPayrollScheduler` | Schedule PEO payroll events |
| `AutoApprovePayrollPackage` | Auto-approve payout packages |
| `AutoSubmitPayrollReport` | Auto-submit payroll reports |
| `PeriodicReconciliationGenerator` | Generate reconciliation reports |
| `DailyTaxReportGenerator` | Generate daily tax reports |

---

## Database

### ORM Migration Status

The service is **migrating from Prisma to Sequelize**:
- New features should use Sequelize
- Both ORMs maintained in parallel
- Prisma schema: `src/prisma/schema.prisma` (2000+ lines)
- Sequelize models: `src/models/` (117 models)

### Key Tables

| Table | Purpose |
|-------|---------|
| `employees` | Employee personal data |
| `employments` | Employment records |
| `employment_terms` | Contract terms |
| `payroll_events` | Payroll cycles |
| `payroll_settings` | Payroll configuration |
| `payroll_report_items` | Payroll line items |
| `payout_packages` | Payout batches |
| `payout_requests` | Individual payouts |

---

## Testing

### Test Types

| Type | File Pattern | Command |
|------|--------------|---------|
| Unit Tests | `*.spec.ts` | `npm run test:unit` |
| E2E Tests | `*.test.ts` | `npm run test:e2e` |
| Model Tests | `tests/models/*.test.ts` | `npm run test:models` |

### Testing Patterns

- **AAA Pattern**: Arrange, Act, Assert
- **Fixtures**: `tests/fixtures/` with `DbFixtureBuilder`
- **Mocking**: `jest-mock-extended`, `axios-mock-adapter`
- **Date Mocking**: `mockdate` package
- **DI in Tests**: Scoped TypeDI containers per test suite

---

## Development Setup

```bash
# 1. Setup environment
cp .env.example .env

# 2. AWS authentication
aws sso login --profile shared
export CODEARTIFACT_AUTH_TOKEN=`aws codeartifact get-authorization-token --domain npm --domain-owner 974360507615 --query authorizationToken --output text --region eu-west-1 --profile shared`

# 3. Install dependencies
npm i

# 4. Run migrations
npm run migrate:deploy      # Prisma migrations
npm run prisma:generate     # Generate Prisma client
npm run migrations          # Sequelize migrations

# 5. Start NATS (required)
docker compose up -d nats-server

# 6. Run development server
npm run dev
```

### Docker Setup

```bash
cat .env.docker.example > .env
npm run build-docker
docker-compose up
```

Ports:
- Employment: 3031
- Backend: 3030
- EORX: 3032

---

## Path Aliases

| Alias | Path |
|-------|------|
| `@controllers/*` | `src/controllers/*` |
| `@services/*` | `src/services/*` |
| `@models/*` | `src/models/*` |
| `@middlewares/*` | `src/middlewares/*` |
| `@repositories/*` | `src/repositories/*` |
| `@utils/*` | `src/utils/*` |
| `@tasks/*` | `src/tasks/*` |
| `@tests/*` | `src/tests/*` |

---

## Common Pitfalls

1. **ORM Confusion**: Remember both Prisma and Sequelize are in use. New code should use Sequelize.

2. **NATS Connection**: Ensure NATS JetStream is running before starting the service.

3. **Docker Memory**: Docker requires at least 4GB RAM to avoid container kills.

4. **Migration Order**: Run Prisma migrations before Sequelize migrations.

5. **Soft Deletes**: Models like `PayoutPackage`, `PayoutRequest`, `PaymentInitiationRequest` use soft delete (`deletedAt`).

6. **DTO Naming**: Keep DTO names unique to avoid OpenAPI schema conflicts.

---

## Related Documentation

- [Backend Service](../backend/) - Main backend API
- [PEO Service](../peo/) - PEO-specific operations
- [Sequelize Patterns](../_shared/sequelize-patterns.md) - ORM conventions
- [NATS Events](../_shared/nats-events.md) - Event messaging patterns

---

## External Resources

- [Swagger Docs (Local)](http://localhost:3000/api-docs)
- [Swagger Docs (Internal)](https://swagger.srd.deel.tools/?source=e3626d8b-7a43-47eb-976c-73f24c683aad)
- [Backend Coding Guidelines](https://letsdeel.github.io/backend-standard/)

---

_Created: 2025-01-09_
_Last Updated: 2025-01-09_
