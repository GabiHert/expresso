# Playwright Automation Documentation

## Overview

Comprehensive E2E testing framework for all Deel platforms including admin, frontend, website, and treasury management systems.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Playwright v1.53 |
| Language | TypeScript v5.5.3 |
| Package Manager | pnpm v10.13.1 |
| Reporting | Monocart, Slack integration, ReportPortal |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `tests/` | Test files for 6+ platforms |
| `setup/` | Commands, endpoints, mocks, payloads |
| `utils/` | 30+ utility modules |
| `selectors/` | Page element selectors |
| `data/` | Test data (72+ dirs) |
| `data-generator/` | Automated test data generation |
| `types/` | TypeScript definitions |
| `helpers/` | Helper functions |
| `env/` | Environment configs (dev, rc, dr, prod) |

## Tested Platforms

- deel-platform (frontend)
- admin-platform
- website
- treasury-management-systems
- And more...

## Patterns

- **Page Object Model**: Selectors organized by platform
- **Data Generation**: Faker.js based test data
- **Multi-Environment**: Configs for dev, rc, dr, giger, local, prod
