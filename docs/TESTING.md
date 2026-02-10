# Testing Standards

## Overview

The framework uses **Vitest** for backend/core testing and **Jest** for UI package testing.

## Current Test Commands

From repository root:

```bash
# Full test suite
npm test

# Individual suites
npm run test:unit
npm run test:integration
npm run test:ui

# Coverage (framework Vitest suite)
npm run test:coverage

# Type checks
npm run typecheck
npm --prefix ui run type-check
```

## Test Runner Configuration

### Backend/Core (Vitest)

- Config: `vitest.config.ts`
- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- Shared setup: `tests/vitest.setup.ts`

### UI Package (Jest)

- Config: `ui/jest.config.js`
- Tests: `ui/tests/**/*.test.ts(x)` and `ui/components/**/*.test.tsx`
- Setup: `ui/tests/setup.ts`

## Recommended Categories

1. Unit tests (`tests/unit/`): isolated module behavior.
2. Integration tests (`tests/integration/`): cross-module and server behavior.
3. UI tests (`ui/tests/`, `ui/components/**/*.test.tsx`): component rendering and interaction.

## TestServer Utility

The framework exposes `TestServer` helpers for app/integration testing:

- `createTestServer`
- `setupTestServer`
- `teardownTestServer`
- `getTestServer`

Source: `src/testing/TestServer.ts`.

## Coverage Targets

- Unit: >= 80%
- Integration: >= 60%
- Overall: >= 70%

## Notes

- Prefer deterministic tests (no hard-coded external dependencies).
- Reset timer mocks and storage state in UI tests to avoid cross-test bleed.
- Keep framework docs and runner config in sync when scripts/config change.
