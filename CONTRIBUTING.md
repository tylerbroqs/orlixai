# Contributing to Orlix

Thank you for your interest in contributing to Orlix! This document covers how to get started, what kinds of contributions are welcome, and the process for submitting changes.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What Can I Contribute?](#what-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Messages](#commit-messages)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1.

---

## What Can I Contribute?

- **Bug fixes** — typos, broken links, layout issues, JS errors
- **UI improvements** — accessibility, responsiveness, performance
- **New terminal commands** — extend the interactive shell in `index.html`
- **New integrations** — add cards to the integrations grid
- **Documentation** — improve README, add examples
- **Translations** — help localise the website

---

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/orlixai.git
cd orlixai
```

### 2. Create a branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make changes

This is a static site — no build step required. Edit `index.html` directly and open it in a browser to test.

```bash
# Quick local server
python3 -m http.server 8080
# visit http://localhost:8080
```

### 4. Test your changes

Before submitting, check:

- [ ] Works in Chrome, Firefox, and Safari (latest)
- [ ] Responsive on mobile (≤ 480px) and tablet (≤ 768px)
- [ ] No console errors in DevTools
- [ ] Accessible: keyboard-navigable, screen reader-friendly labels
- [ ] All terminal commands in the shell still work

---

## Development Workflow

```
main                  ← stable, deployed to orlixai.xyz
  └─ feat/<name>      ← your feature branch
  └─ fix/<name>       ← your bugfix branch
```

Never commit directly to `main`. Always open a PR.

---

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]
```

| Type | When to use |
|---|---|
| `feat` | New feature or section |
| `fix` | Bug fix |
| `style` | CSS / visual changes (no logic change) |
| `docs` | Documentation only |
| `chore` | Tooling, CI, configuration |
| `refactor` | Code restructuring (no behaviour change) |
| `a11y` | Accessibility improvements |
| `perf` | Performance improvements |

**Examples:**

```
feat(shell): add `policy` command to terminal
fix(mobile): correct overflow on diff grid at 375px
style(hero): increase line-height for boot sequence text
docs(readme): add integration table
a11y(form): add aria-label to access form inputs
```

---

## Pull Request Guidelines

1. **One thing per PR** — keep changes focused and reviewable
2. **Fill in the PR template** — describe what changed and why
3. **Link any related issues** — use `Closes #123` in the description
4. **Screenshots for visual changes** — attach before/after screenshots
5. **Keep it minimal** — avoid unrelated cleanups in the same PR

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/tylerbroqs/orlixai/issues/new) and include:

- **Browser and OS** (e.g. Chrome 125 / macOS 14)
- **Steps to reproduce**
- **Expected behaviour**
- **Actual behaviour**
- **Screenshot** (if relevant)

---

## Requesting Features

Open a [GitHub Issue](https://github.com/tylerbroqs/orlixai/issues/new) with the label `enhancement` and describe:

- **What you want** — the feature
- **Why you want it** — the problem it solves
- **Alternatives considered**

---

## Security Issues

Do **not** file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).

---

Thank you for contributing to Orlix.
