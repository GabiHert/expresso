# Frontend Documentation

## Overview

Client-facing React application with MobX state management. Nx monorepo supporting web and mobile (iOS/Android via Capacitor).

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18, TypeScript |
| Build Tool | Vite |
| Testing | Vitest |
| State Management | MobX |
| Routing | React Router v5 |
| Styling | Emotion (CSS-in-JS), Bootstrap 5 |
| Mobile | Capacitor (iOS/Android) |
| i18n | i18next |
| Monorepo | Nx |

## Key Files & Entry Points

| File | Purpose |
|------|---------|
| `app/src/index.tsx` | Application entry point |
| `app/src/App.jsx` | Main App component with routing |
| `app/vite.config.ts` | Vite build configuration |
| `app/vitest.config.ts` | Test configuration |
| `nx.json` | Monorepo configuration |

## Directory Structure

| Directory | Purpose | Size |
|-----------|---------|------|
| `app/src/components/` | Reusable UI components | 561 dirs |
| `app/src/scenes/` | Page-level feature screens | 180 dirs |
| `app/src/hooks/` | Custom React hooks | 241 files |
| `app/src/stores/` | MobX store definitions | - |
| `app/src/utils/` | Utility functions | 189 dirs |
| `app/src/types/` | TypeScript definitions | 109 dirs |
| `app/src/context/` | React Context definitions | 64 dirs |
| `app/src/native/` | Native mobile integration | 41 dirs |
| `app/src/mocks/` | Test mocks and MSW handlers | - |
| `packages/` | Shared workspace packages | - |

## Testing

- **Framework**: Vitest with jsdom
- **API Mocking**: MSW (Mock Service Worker)
- **Commands**:
  - `npm run test` - Run all tests
  - `npm run test:watch` - Watch mode

## Patterns

- **Monorepo**: Nx workspace with shared packages
- **State**: MobX stores + React Context
- **Testing**: Co-located tests with MSW mocking
- **Native**: Capacitor integration with web fallback
