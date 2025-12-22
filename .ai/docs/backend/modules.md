# Backend Modules Guide

The backend contains ~200+ modules organized by domain.

## Module Structure Pattern

Each module follows this structure:

```
module_name/
├── __tests__/          # Module-specific tests
├── controllers/        # HTTP endpoints
├── models/             # Sequelize models
├── services/           # Business logic
├── events/             # Event handlers
├── schemas/            # Request/response schemas
├── utils/              # Helper functions
├── index.js            # Module exports
└── tsconfig.json       # Module TS config (if needed)
```

## Module Categories

### Core Business

| Module | Purpose |
|--------|---------|
| `invoicing` | Invoice management and generation |
| `billing` | Billing operations |
| `client_payments` | Client payment processing |
| `payment_orchestrator` | Payment coordination |
| `contracts` | Contract lifecycle |

### HR & Payroll

| Module | Purpose |
|--------|---------|
| `hris_core` | Core HRIS platform |
| `hris_automation` | Workflow automation |
| `hris_events` | HRIS event processing |
| `payroll` | Payroll processing |
| `payroll_events` | Payroll events |
| `payroll_calendar` | Calendar management |
| `payroll_hub` | Payroll aggregation |
| `payroll_onboarding` | Payroll setup |

### PEO & Employment

| Module | Purpose |
|--------|---------|
| `peo` | Professional Employer Organization |
| `eor` | Employer of Record |
| `employment` | Employment relationships |
| `employees` | Employee data management |
| `onboarding` | Employee onboarding |
| `offboarding` | Employee offboarding |
| `termination` | Employee termination |

### Compliance & Documents

| Module | Purpose |
|--------|---------|
| `compliance_documents` | Document compliance |
| `compliance_documents_revisions` | Versioning |
| `documents` | Document management |
| `document_templates` | Templating |
| `fillable_documents` | Dynamic docs |
| `tax_forms` | Tax forms |
| `tax_documents` | Tax documentation |

### Access & Security

| Module | Purpose |
|--------|---------|
| `access_and_authorization` | SpiceDB auth |
| `legal_entities` | Legal entity management |
| `legal_entities_registration` | Registration |
| `mobile_mfa` | Mobile 2FA |
| `ghost_authentication` | Auth service |
| `signatures` | Digital signatures |

### Integrations

| Module | Purpose |
|--------|---------|
| `salesforce` | Salesforce CRM |
| `hubspot` | HubSpot marketing |
| `slack` | Slack comms |
| `jira` | Jira integration |
| `zendesk` | Support |

### Data & Reporting

| Module | Purpose |
|--------|---------|
| `global_payroll` | Global payroll reporting |
| `ready_reports` | Report generation |
| `data_grid_custom_views` | Custom views |
| `variable_compensation` | Bonus tracking |
| `compensation_platform` | Compensation mgmt |

### Platform & Admin

| Module | Purpose |
|--------|---------|
| `core` | Core decorators/utilities |
| `backend_shared` | Shared utilities |
| `admin` | Admin panel |
| `users` | User management |
| `organizations` | Org management |
| `profiles` | User profiles |
| `teams` | Team management |
| `roles` | Role management |

## Working with Modules

### Finding a Module

```bash
# List all modules
ls -1 modules/

# Find module by name
ls -d modules/*payroll*

# Search in module
grep -r "keyword" modules/module_name/
```

### Module Dependencies

Most modules import from:
- `@backend_shared` - Shared utilities
- `models/` - Root models
- `services/` - Root services

### Adding to a Module

1. Add feature to appropriate layer (controller/service/model)
2. Export from module's `index.js`
3. Add tests in module's `__tests__/`
4. Update module's types if using TypeScript

### Creating a New Module

Use the generator:
```bash
npm run generate
```

Or manually create the structure and add to `modules/index.js`.
