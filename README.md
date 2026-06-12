# Orlix — Personal AI Operating System

> Stop prompt-chasing. Own the control layer.

Orlix is a **governance layer for personal AI** — a persistent world model that turns any assistant into a system that observes, decides, acts, and reports back. Every action is policy-bound and fully auditable.

[![License: MIT](https://img.shields.io/badge/License-MIT-ff9a52.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.0--beta-b9a4ff.svg?style=flat-square)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-early%20access-7ee0a8.svg?style=flat-square)](https://orlixai.xyz)

---

## What is Orlix?

Most AI tools optimize for the next reply. Orlix optimizes for the **outcome** — running a five-step governance loop continuously, in the background.

```
observe → decide → act → verify → learn
```

| Without Orlix | With Orlix |
|---|---|
| Context lives in the vendor's UI | Memory is portable, versioned, yours |
| Rules reset every session | Policies persist — set once, enforced everywhere |
| Output is a draft you still have to send | Actions execute and are verified against the goal |
| No record of why a suggestion was made | Every decision ships with a reviewable receipt |
| Your context can't be exported | Swap models anytime — your system stays intact |

---

## The Governance Loop

```
01_observe.sh   →  Watches calendar, goals, signals, and memory
02_decide.sh    →  Weighs priorities against policies; checks authority
03_act.sh       →  Executes or requests approval (depending on tier)
04_verify.sh    →  Checks results against the original goal
05_learn.sh     →  Updates policy from real outcomes (versioned)
```

**Key difference:** agents do tasks. Orlix governs outcomes.

---

## Autonomy Levels

| Level | Name | Description |
|---|---|---|
| L1 | Informational | Read-only. Answers questions, takes no action. |
| L2 | Reactive | Responds within a single session, no memory. |
| L3 | Mixed-initiative | Can suggest or warn, human drives every step. |
| L4 | Agentic | Executes multi-step tasks; ends when the task ends. |
| **L5** | **Symbiotic** | Persistent memory, evolving policies, full audit trail. **Orlix runs here.** |

---

## Authority Tiers

You decide how much Orlix is allowed to do:

| Tier | Behaviour |
|---|---|
| `observe` | Log activity only — Orlix watches, nothing else |
| `suggest` | Recommendations only — you decide everything |
| `confirm` | Orlix asks before acting on anything |
| `supervised` | Orlix acts, notifies you, can roll back ← **default** |
| `autonomous` | Orlix acts independently within policy bounds |

---

## Memory & Ownership

Memory in Orlix is yours by design — **persistent, versioned, and exportable** at any time.

- **Portable** — nothing locked to a vendor; export your memory, switch providers
- **Versioned** — every fact, goal, and policy carries a timestamp; roll back anytime
- **Sourced** — every belief traces back to an email, event, or decision
- **Encrypted** — memory store is encrypted at rest; only you hold the keys

```json
{
  "schema": "orlix/v1",
  "goals":    [{ "name": "Ship MVP", "deadline": "2026-07-15", "progress": 0.6 }],
  "policies": [{ "rule": "notify_if_blocker_gt_48h", "version": 14, "status": "active" }],
  "facts":    [{ "content": "Alex owns the design review", "source": "email · 2026-06-02", "confidence": 0.95 }]
}
```

---

## Integrations

| Category | Integration | Status |
|---|---|---|
| Calendar | Google Calendar | live |
| Calendar | Apple Calendar | live |
| Calendar | Outlook Calendar | coming soon |
| Email | Gmail | live |
| Email | Outlook Mail | coming soon |
| Tasks | Notion | live |
| Tasks | Linear | live |
| Tasks | Todoist | coming soon |
| Comms | Slack | live |
| Code | GitHub | live |
| Files | Google Drive | live |
| Files | Dropbox | coming soon |

Build your own via the open integration API — see [docs](https://orlixai.xyz/#product).

---

## Pricing

| Plan | Price | Authority Tier | Memory | Policies |
|---|---|---|---|---|
| Free | $0/mo | observe + suggest | 30 days | 5 rules |
| Operator | $29/mo | up to supervised | Unlimited · versioned | Unlimited |
| Autonomous | $79/mo | Full L5 | Unlimited · versioned | Unlimited |

Early access pricing is **locked for life**. Cancel anytime. No lock-in — export your data whenever you want.

---

## Roadmap

```
✓ v0.1 — Observe   persistent memory, source-tracked facts, calendar integrations
✓ v0.2 — Decide    rules-based engine, priority weighting, authority checks
✓ v0.3 — Act       approval workflows, action receipts, supervised execution
✓ v0.4 — Verify    outcome tracking linked to goals
● v0.5 — Evolve    policy evolution, pattern detection, adaptive behavior   ← building now
◌ v1.0 — Symbiotic multi-agent coordination, proactive goal management, full L5
```

---

## Project Structure

```
orlixai/
├── index.html          # Main single-page application
├── README.md           # This file
├── LICENSE             # MIT License
├── CONTRIBUTING.md     # How to contribute
├── SECURITY.md         # Security policy
├── CHANGELOG.md        # Version history
└── .gitignore
```

This is a **static single-page application** — no build step required. Open `index.html` in any browser and it works.

---

## Running Locally

```bash
# Clone the repository
git clone https://github.com/tylerbroqs/orlixai.git
cd orlixai

# Option 1: open directly
open index.html

# Option 2: serve with Python
python3 -m http.server 8080

# Option 3: serve with Node
npx serve .
```

Then visit `http://localhost:8080`.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Quick start:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Open a pull request against `main`

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Security

For security disclosures, please read [SECURITY.md](SECURITY.md).

Do **not** file public GitHub issues for security vulnerabilities.

---

## License

[MIT](LICENSE) © 2026 Orlix

---

## Links

- Website: [orlixai.xyz](https://orlixai.xyz)
- Early access: [orlixai.xyz/#access](https://orlixai.xyz/#access)
- Issues: [github.com/tylerbroqs/orlixai/issues](https://github.com/tylerbroqs/orlixai/issues)
