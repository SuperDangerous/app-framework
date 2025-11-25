# TODO: Electron Migration, Snap Packaging, and Logging Standardization

## Scope
- Replace Tauri with Electron across framework and apps.
- Standardize on a single virtualized LogViewer everywhere.
- Add Edge-style snap packaging for all apps.
- Build a snap-builder Electron app (cpcodebase-inspired UI) that drives Multipass builds.

## Phased Plan

### Phase 1: Logging Standardization (in progress)
- [x] Remove legacy/simple log viewers in the framework; keep single virtualized LogViewer.
- [ ] Expose shared log utilities (normalization, ANSI strip, date/level formatting) from the framework UI.
- [ ] Update all apps (cpcodebase, app-template, modbus-simulator) to use the single LogViewer + helpers; remove any custom log shims.
- [ ] Add UI/integration tests: streaming updates without setState loops, filters/search, archives download/delete.

### Phase 2: Electron Migration (replace Tauri)
- [ ] Framework: remove Tauri scaffolding (desktop/rust templates, tauri CLI commands, tauri bundler/sidecar code, docs). Add Electron main/preload templates and IPC bridge helpers.
- [ ] Add Electron build scripts (dev/prod) and package config (electron-builder/forge) for the framework templates.
- [ ] Apps:
  - [ ] cpcodebase: swap Tauri for Electron (dev launcher, packaged build), replace any Tauri API calls with IPC equivalents.
  - [ ] app-template: same as cpcodebase.
  - [ ] modbus-simulator: same as cpcodebase.
- [ ] Update docs: development, packaging, IPC API surface, and migration notes.

### Phase 3: Snap Packaging (Edge-style)
- [ ] Create a shared snapcraft template + build script (non-electron-builder target) modeled on epi-edge.
- [ ] Add per-app snap build commands that consume the shared template (supply app name/summary/ports/icons).
- [ ] Document prerequisites and workflow; optional CI hook for snap build smoke.

### Phase 4: Snap-Builder Electron App
- [ ] Design cpcodebase-like UI: select repo dir, fill snap metadata, generate snapcraft.yaml, run Multipass build, stream logs via the standard LogViewer.
- [ ] Implement core build orchestrator (Multipass, snapcraft) reusable by GUI and CLI.
- [ ] Add Playwright/e2e coverage for happy path (mock Multipass where possible).

## References / Borrowed Patterns
- Electron scaffolding reference: `~/Code/mila-ai` (main/preload, assets, forge/builder approach) — adopt only patterns we agree with.
- Snap packaging reference: `~/Code/epi-edge/snap` and `~/Code/epi-snap-builder`.

## Branching / Rollout
- Work in feature branches per phase (e.g., `feature/electron-migration`, `feature/snap-packaging`, `feature/logging-standardization`).
- Keep commits small and runnable; avoid breaking main during the migration.

