# ORLIX — Claude Code Guide

## What This Project Is

ORLIX is a personal AI operating system CLI. Users bring their own LLM API key (BYOK) and get a terminal interface with persistent memory (goals, facts, policies), multi-provider chat with streaming, and a governance layer.

The **primary CLI is `orlix.py`** (Python). The TypeScript files in `src/` and `bin/orlix.ts` are a secondary implementation — kept but not the focus.

---

## Primary File

**`orlix.py`** — single-file Python CLI. All features live here. Edit this file for any CLI work.

- No external runtime dependencies beyond `rich` and `pyfiglet`
- Uses only stdlib for HTTP (`urllib.request`) — no `requests`, no `httpx`
- Runs on Python 3.10+
- Works on Windows, Mac, Linux

---

## Run & Test

```bash
# Install deps
pip install rich pyfiglet

# Run
python orlix.py

# Quick smoke test (non-interactive)
echo "exit" | python orlix.py
```

---

## Architecture of orlix.py

### Constants & palette

```
O1 #ffcc44  O2 #ff9900  O3 #cc5500  OD #884400
G  #22cc66  R  #ff4455  W  #e8e8e8  M  #777777  B #444444
```

### Key functions (in order)

| Function                 | What it does                                                             |
| ------------------------ | ------------------------------------------------------------------------ |
| `_art_banner()`          | Renders ORLIX ASCII art via pyfiglet `ansi_shadow` font, orange gradient |
| `startup()`              | Full dashboard: art + status + commands + sources + footer               |
| `_dashboard()`           | Two-column Rich table: status left, commands right                       |
| `_sources_panel()`       | Built-in vs optional data sources panel                                  |
| `load_config()`          | Reads `~/.orlix/config.json`                                             |
| `load_memory()`          | Reads `~/.orlix/memory.json`, defaults goals/facts/policies to `[]`      |
| `save_config()`          | Writes config                                                            |
| `_save_memory()`         | Writes memory                                                            |
| `run_setup()`            | Interactive BYOK wizard — selects provider, stores API key               |
| `cmd_memory()`           | Displays goals (progress bars), facts, policies                          |
| `cmd_add_goal()`         | Parses `--deadline YYYY-MM-DD`, appends to memory                        |
| `cmd_add_fact()`         | Stores free-text fact                                                    |
| `cmd_add_policy()`       | Stores policy rule with versioning                                       |
| `cmd_progress()`         | Updates goal progress by name/id match                                   |
| `_build_system_prompt()` | Builds system prompt from current memory for AI                          |
| `cmd_chat()`             | Interactive chat loop — loads memory context, streams responses          |
| `_call_llm()`            | Dispatches to provider-specific streaming function                       |
| `_stream_anthropic()`    | SSE streaming via Anthropic Messages API                                 |
| `_stream_openai()`       | SSE streaming for OpenAI-compatible APIs                                 |
| `_stream_google()`       | SSE streaming via Google `streamGenerateContent`                         |
| `_dispatch()`            | REPL command router                                                      |
| `repl()`                 | Main loop                                                                |
| `main()`                 | Entry point, Windows UTF-8 setup                                         |

---

## Data Storage

All data lives in `~/.orlix/`:

**`config.json`**

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-8",
    "key": "sk-ant-..."
  },
  "keys": {
    "fred": "...",
    "y2": "...",
    "elfa": "...",
    "asterdex": "..."
  }
}
```

**`memory.json`**

```json
{
  "goals": [
    {
      "id": "...",
      "name": "Launch v1.0",
      "deadline": "2026-09-01",
      "progress": 0.4,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "facts": [
    {
      "id": "...",
      "content": "solo developer, Python and React",
      "source": "user",
      "confidence": 1.0,
      "createdAt": "..."
    }
  ],
  "policies": [
    {
      "id": "...",
      "rule": "alert if goal approaching deadline",
      "version": 1,
      "status": "active",
      "priority": 5,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## Supported LLM Providers

| Key         | Name             | Default model      |
| ----------- | ---------------- | ------------------ |
| `anthropic` | Anthropic Claude | `claude-opus-4-8`  |
| `openai`    | OpenAI GPT       | `gpt-4o`           |
| `google`    | Google Gemini    | `gemini-2.0-flash` |
| `xai`       | xAI Grok         | `grok-3`           |
| `deepseek`  | DeepSeek         | `deepseek-chat`    |
| `zhipu`     | Zhipu GLM        | `glm-4`            |
| `minimax`   | Minimax          | `abab6.5s-chat`    |
| `moonshot`  | Moonshot Kimi    | `moonshot-v1-128k` |

---

## Data Sources

Built-in (always active): CoinGecko, YFinance, DexScreener, Hyperliquid

Optional (need API key in `config.keys`): FRED (`fred`), Y2 Intel (`y2`), Elfa AI (`elfa`), Aster DEX (`asterdex`)

---

## CLI Commands

```
chat                   Start AI conversation (streaming, memory-aware)
memory                 View goals, facts & policies
add goal <name>        Add goal [--deadline YYYY-MM-DD]
add fact <text>        Store a fact
add policy <rule>      Activate a policy rule
progress <n> <n%>      Update goal progress by name or id
governance             Alias for memory
setup                  BYOK wizard — configure LLM & API keys
clear                  Clear screen and redraw dashboard
help                   Show all commands
exit                   Quit
```

---

## TypeScript (secondary)

`bin/orlix.ts` — original TS CLI, still works via `npm run start:ts`. Not the primary focus. Contains a pixel art banner (hand-drawn 7×9 glyphs) and basic REPL. Do not remove but do not prioritize.

`src/` — TypeScript library code. Has its own build/test pipeline (`npm run build`, `npm test`).

---

## What to Work On Next

Planned but not yet implemented (stubs exist):

1. **`done` command** — mark goal as complete: `done Launch v1.0`
2. **`delete` command** — remove goal/fact/policy: `delete goal <name>`
3. **`ask` command** — one-shot question without entering chat: `ask what is DeFi`
4. **`price` command** — live market data via CoinGecko: `price BTC`
5. **`export` command** — export memory to markdown: `export`
6. **`search` command** — search inside memory: `search launch`
7. **`report` command** — daily summary: goals + progress + market snapshot

---

## Style Rules

- All UI output via `rich` — use `console.print()` with markup, `Text()` for safe strings
- Never use `requests` or any non-stdlib HTTP library
- Keep everything in `orlix.py` — no new files unless absolutely necessary
- No type annotations beyond what's already there (`list[dict]`, `str | None`, etc.)
- Progress values stored as float `0.0–1.0`, displayed as `int * 100` percent
- IDs generated by `_new_id()` — do not use `uuid` module
- Timestamps via `_now()` — ISO 8601 UTC
- Windows compatibility: always guard `sys.stdout.reconfigure` with try/except

---

## Branch

Active development: `claude/orlix-open-source-repo-7n300p`
