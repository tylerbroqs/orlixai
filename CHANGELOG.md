# Changelog

All notable changes to Orlix are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — v1.0.0 — Symbiotic

### Planned
- Multi-agent coordination and orchestration
- Proactive goal management (Orlix surfaces blockers before you notice them)
- Full L5 autonomous operation
- Co-adaptive learning (system and user adapt to each other)
- Enterprise memory namespaces

---

## [0.5.0-beta] — 2026-06-13 — Evolve (in progress)

### Added
- Policy evolution engine — policies update from real outcomes
- Pattern detection across sessions
- Adaptive behaviour based on approval/override signals
- Open integration API (beta)
- Pricing tiers: Free, Operator, Autonomous
- 12 integrations (8 live, 4 coming soon)

### Changed
- Upgraded governance loop to v3
- Improved audit receipt format with rollback metadata
- Memory encryption now enabled by default

---

## [0.4.0] — 2026-04-01 — Verify

### Added
- Outcome tracking linked back to originating goals
- Goal drift detection (alert if goal untouched > N days, configurable)
- Verify step in governance loop (`04_verify.sh`)
- Receipt `status: verified` field

### Fixed
- Memory export missing `source` field on some facts
- Calendar integration missing recurring event support

---

## [0.3.0] — 2026-02-14 — Act

### Added
- Approval workflow: `supervised` tier (act → notify → rollback available)
- Action receipts — every action produces a signed `receipt.log` entry
- Supervised execution for email, calendar, and task integrations
- Rollback: any action can be undone within 30 days

### Changed
- Authority tier `autonomous` now requires explicit policy opt-in
- Receipt format v2 (adds `approval` and `rollback` fields)

---

## [0.2.0] — 2025-12-01 — Decide

### Added
- Rules-based decision engine (`02_decide.sh`)
- Priority weighting for goal conflicts
- Authority checks before any action is taken
- Policy versioning — every rule change is numbered

### Changed
- Memory schema upgraded to `orlix/v1`

---

## [0.1.0] — 2025-10-01 — Observe

### Added
- Persistent memory across sessions
- Source-tracked facts (every belief traces to an origin)
- First integrations: Google Calendar, Notion
- World model: goals, facts, policies stored locally
- Memory export as JSON

---

*Older pre-release history is available in git log.*
