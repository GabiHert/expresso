# Deel Architecture Overview

High-level architecture of the Deel platform.

## Service Map

```
                    ┌─────────────┐     ┌─────────────┐
                    │  frontend   │     │    admin    │
                    │   (React)   │     │   (React)   │
                    └──────┬──────┘     └──────┬──────┘
                           │                    │
                           └────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │           backend             │
                    │   (Main monorepo - Express)   │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │       ~200 modules      │  │
                    │  │  invoicing, billing,    │  │
                    │  │  hris, payroll, peo...  │  │
                    │  └─────────────────────────┘  │
                    └───────────────┬───────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌──────────┐          ┌──────────┐          ┌──────────┐
       │   peo    │          │employment│          │ payments │
       │(Express) │          │(Express) │          │(Express) │
       └────┬─────┘          └────┬─────┘          └────┬─────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │  PostgreSQL  │
                           │   (per svc)  │
                           └──────────────┘
```

## Communication Patterns

### Synchronous (REST APIs)
- Frontend/Admin → Backend (primary API gateway)
- Backend → PEO/Employment/Payments (service-to-service)
- Backend modules → External integrations (Prism, Salesforce, etc.)

### Asynchronous (NATS JetStream)
- Backend publishes domain events
- Services consume events for async processing
- Transactional outbox for guaranteed delivery

## Data Flow

### User Request Flow
```
User → Frontend → Backend API → Business Logic → Database
                                       │
                                       ├── Other Services (if needed)
                                       └── Event Publication (NATS)
```

### Event-Driven Flow
```
Service A → Outbox Table → CDC → NATS → Consumer → Service B
```

## Core Technologies

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, NX |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Sequelize/Prisma |
| Events | NATS JetStream |
| Auth | SpiceDB (fine-grained) |
| Cache | Redis |
| Storage | AWS S3 |
| Monitoring | Datadog |

## Service Responsibilities

### Backend (Monorepo)
- Primary API gateway
- Core business logic (contracts, invoicing, billing)
- User/organization management
- Authorization (SpiceDB)
- Integration hub

### PEO Service
- Professional Employer Organization logic
- Employee benefits management
- Payroll processing integration
- Compliance & risk underwriting
- Prism HR integration

### Employment Service
- Employment relationship data
- Payroll settings/events
- Contract employment details

### Payments Service
- Payment processing
- Transaction management
- Payment reconciliation

### Frontend/Admin
- User interfaces
- React applications
- NX monorepo structure

## Database Strategy

- Each service has its own PostgreSQL database
- No direct cross-database queries
- Data synchronization via events/APIs
- Sequelize (most services) or Prisma ORM

## Deployment

- Kubernetes (Helm charts in gitops-applications)
- ArgoCD for GitOps
- Multiple environments: dev, demo, giger, prod
- Datadog for observability
