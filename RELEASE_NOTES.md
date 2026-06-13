# Release Notes

## v0.5.0-beta — 2026-06-13

### Highlights
- **Policy Evolution** — policies now update from real outcomes, not just manual edits
- **TypeScript rewrite** — full TypeScript codebase with strict types and generated `.d.ts`
- **CLI v2** — `orlix` CLI with `init`, `status`, `run`, `tick`, `memory`, `audit`, `policy` commands
- **Test suite** — Vitest unit tests for Memory, AuditLog, PolicyEngine
- **Docker support** — multi-stage `Dockerfile` + `docker-compose.yml`
- **GitHub Actions** — CI (Node 18/20/22), release workflow, issue templates

### New commands
```
orlix init               initialise config + default policies
orlix run --interval N   start the governance loop
orlix tick               single loop cycle
orlix memory add-goal    interactive goal creation
orlix audit list         view recent receipts
```

### Breaking changes
- `Memory` constructor now requires `.load()` call before use
- `GovernanceLoop` is now an `EventEmitter` (remove old callback API)

---

## v0.4.0 — 2026-04-01

### Highlights
- **Verify step** — outcomes now link back to originating goals
- Goal drift detection (configurable threshold)
- Receipt `status: verified` field added

---

## v0.3.0 — 2026-02-14

### Highlights
- **Approval workflow** — supervised tier: act → notify → rollback available
- Action receipts for every governance action
- 30-day rollback window for all actions

---

## v0.2.0 — 2025-12-01

### Highlights
- Rules-based decision engine
- Priority weighting for goal conflicts
- Policy versioning

---

## v0.1.0 — 2025-10-01

### Highlights
- Persistent memory across sessions
- Source-tracked facts
- First integrations: Google Calendar, Notion
- Memory export as JSON
