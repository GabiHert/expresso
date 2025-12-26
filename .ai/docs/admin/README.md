# Admin Documentation

## Overview

Internal admin dashboard - Nx monorepo with React. Multiple apps (admin, AILabs, OpsWorkbench) sharing common libraries.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18.3.1, TypeScript 5.7.2 |
| Build Tool | Vite 5.4.19 |
| Monorepo | Nx 19.5.3 |
| State Management | MobX 6.3.3, SWR 2.0.0 |
| Styling | Emotion 11.9.3, Bootstrap 4.6.0, Less |
| Design System | @letsdeel/ui |
| Routing | React Router 5.3.3 |
| Package Manager | pnpm 10.16.1 |

## Key Files & Entry Points

| File | Purpose |
|------|---------|
| `apps/admin/src/index.tsx` | Admin app entry point |
| `apps/admin/src/App.tsx` | Main App component |
| `apps/admin/vite.config.ts` | Vite configuration |
| `nx.json` | Nx workspace config |

## Directory Structure

**Main App** (`apps/admin/src/`)
| Directory | Purpose | Size |
|-----------|---------|------|
| `api/` | Auto-generated API client | 130+ files |
| `components/` | Reusable UI components | 129+ dirs |
| `views/` | Feature/page components | 125+ views |
| `stores/` | MobX state stores | - |
| `hooks/` | Custom React hooks | 95+ files |
| `providers/` | Context providers | - |

**Shared Libraries** (`libs/shared/`)
| Directory | Purpose |
|-----------|---------|
| `api/` | API client utilities |
| `components/` | Shared UI components |
| `hooks/` | Shared hooks |
| `views/` | Lookup views (Workers, Clients, Contracts) |
| `feature-flags/` | Feature flag management |

## Development

- **Port**: http://localhost:3001
- **Commands**:
  - `pnpm start` - Dev server
  - `pnpm build` - Production build
  - `pnpm test` - Vitest tests
  - `pnpm lint` - ESLint

## Patterns

- **Monorepo**: Nx with path aliases (@admin/shared-*, @/)
- **API Client**: Auto-generated from backend schema
- **State**: MobX + SWR for server state
- **Auth**: Google OAuth, token in cookies + MobX
