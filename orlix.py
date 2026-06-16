#!/usr/bin/env python3
"""ORLIX — Personal AI Operating System CLI."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    import readline  # noqa: F401
except ImportError:
    pass

try:
    from rich import box
    from rich.align import Align
    from rich.console import Console
    from rich.padding import Padding
    from rich.panel import Panel
    from rich.rule import Rule
    from rich.table import Table
    from rich.text import Text
except ImportError:
    sys.exit("Missing dependency.\nFix:  pip install rich\n      py -m pip install rich  (Windows)")

# ── version & paths ───────────────────────────────────────────────────────────
VERSION     = "0.5.0-beta"
ORLIX_DIR   = Path.home() / ".orlix"
CONFIG_FILE = ORLIX_DIR / "config.json"
MEMORY_FILE = ORLIX_DIR / "memory.json"

# ── palette ───────────────────────────────────────────────────────────────────
O1 = "#ffcc44"  # top highlight
O2 = "#ff9900"  # main orange
O3 = "#cc5500"  # bottom shadow
OD = "#884400"  # border dim
G  = "#22cc66"  # green — live
R  = "#ff4455"  # red   — missing
W  = "#e8e8e8"  # white text
M  = "#777777"  # muted
B  = "#444444"  # border

# ── static data ───────────────────────────────────────────────────────────────
LLM_PROVIDERS: list[tuple[str, str, str]] = [
    ("anthropic", "Anthropic Claude",  "claude-opus-4-8"),
    ("openai",    "OpenAI GPT",        "gpt-4o"),
    ("google",    "Google Gemini",     "gemini-2.0-flash"),
    ("xai",       "xAI Grok",          "grok-3"),
    ("deepseek",  "DeepSeek",          "deepseek-chat"),
    ("zhipu",     "Zhipu GLM",         "glm-4"),
    ("minimax",   "Minimax",           "abab6.5s-chat"),
    ("moonshot",  "Moonshot Kimi",     "moonshot-v1-128k"),
]

DATA_SOURCES: list[tuple[str, bool, str | None]] = [
    ("CoinGecko",   True,  None),
    ("YFinance",    True,  None),
    ("DexScreener", True,  None),
    ("Hyperliquid", True,  None),
    ("FRED",        False, "fred"),
    ("Y2 Intel",    False, "y2"),
    ("Elfa AI",     False, "elfa"),
    ("Aster DEX",   False, "asterdex"),
]

COMMANDS: list[tuple[str, str]] = [
    ("chat",       "Start AI conversation"),
    ("memory",     "View / edit memory store"),
    ("governance", "Goals, facts & policies"),
    ("research",   "Search data sources"),
    ("report",     "Generate reports"),
    ("setup",      "Configure LLM & API keys"),
    ("config",     "Edit configuration"),
    ("exit",       "Quit ORLIX"),
]

# ── pixel art glyphs — 7 wide × 9 tall ───────────────────────────────────────
_GLYPHS: list[list[list[int]]] = [
    # O — oval with diagonal corners
    [[0,0,1,1,1,0,0],[0,1,1,0,1,1,0],[1,1,0,0,0,1,1],[1,0,0,0,0,0,1],
     [1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,1,0,0,0,1,1],[0,1,1,0,1,1,0],[0,0,1,1,1,0,0]],
    # R — rounded bump + diagonal leg
    [[1,1,1,1,1,0,0],[1,1,0,0,1,1,0],[1,1,0,0,0,1,1],[1,1,0,0,1,1,0],
     [1,1,1,1,1,0,0],[1,1,1,0,0,0,0],[1,1,0,1,1,0,0],[1,1,0,0,1,1,0],[1,1,0,0,0,1,1]],
    # L — 2px stem + solid double base
    [[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],
     [1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],
    # I — double top/bottom bars + wide centre
    [[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],
     [0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],
    # X — 2px arms, diamond crossing
    [[1,1,0,0,0,1,1],[1,1,0,0,0,1,1],[0,1,1,0,1,1,0],[0,0,1,1,1,0,0],
     [0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,1,0,1,1,0],[1,1,0,0,0,1,1],[1,1,0,0,0,1,1]],
]


def _art_line(row: int) -> Text:
    """Build one row of the ORLIX pixel art with orange gradient."""
    # Vertical gradient: bright top → pure middle → dark bottom
    if row <= 1:
        color = O1
    elif row >= 7:
        color = O3
    else:
        color = O2

    t = Text()
    t.append("  ")  # left margin
    for li, glyph in enumerate(_GLYPHS):
        if li > 0:
            t.append("  ")  # gap between letters
        for pixel in glyph[row]:
            t.append("██" if pixel else "  ", style=f"bold {color}" if pixel else "")
    return t


def _art_banner() -> Text:
    lines = [_art_line(r) for r in range(9)]
    out = Text()
    for i, line in enumerate(lines):
        if i > 0:
            out.append("\n")
        out.append_text(line)
    return out


# ── data helpers ──────────────────────────────────────────────────────────────

def _load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text("utf-8")) if path.exists() else {}
    except Exception:
        return {}

def load_config() -> dict:
    return _load_json(CONFIG_FILE)

def load_memory() -> dict:
    d = _load_json(MEMORY_FILE)
    d.setdefault("goals", [])
    d.setdefault("facts", [])
    d.setdefault("policies", [])
    return d

def save_config(cfg: dict) -> None:
    ORLIX_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), "utf-8")


# ── UI panels ─────────────────────────────────────────────────────────────────

def _info_panel(cfg: dict, mem: dict) -> Panel:
    """Provider / model / status — like CLAUDE's info box."""
    llm  = cfg.get("llm")
    opt  = cfg.get("keys", {})
    connected = sum(1 for _, b, k in DATA_SOURCES if b or (k and opt.get(k)))
    goals    = len(mem["goals"])
    facts    = len(mem["facts"])
    policies = len(mem["policies"])

    t = Table(box=None, show_header=False, padding=(0, 2, 0, 0), show_edge=False)
    t.add_column(style=M,             min_width=12)
    t.add_column(style=f"bold {W}",   min_width=30)

    if llm:
        pid   = llm.get("provider", "")
        pname = next((n for p, n, _ in LLM_PROVIDERS if p == pid), pid)
        t.add_row("Provider", Text(pname,          style=f"bold {O2}"))
        t.add_row("Model",    Text(llm["model"],   style=W))
        t.add_row("Memory",   Text(f"{goals}g  {facts}f  {policies}p", style=M))
    else:
        t.add_row("Provider", Text("not configured", style=R))
        t.add_row("Model",    Text("—",             style=M))
        t.add_row("Memory",   Text(f"{goals}g  {facts}f  {policies}p", style=M))

    t.add_row("Sources",  Text(f"{connected}/{len(DATA_SOURCES)} connected", style=G))

    return Panel(t, box=box.ROUNDED, border_style=OD, padding=(0, 1))


def _status_bar(cfg: dict) -> Panel:
    """Single-line status — like CLAUDE's 'cloud  Ready' bar."""
    llm = cfg.get("llm")
    t = Text()
    if llm:
        t.append("●  ", style=f"bold {G}")
        pid   = llm.get("provider", "")
        pname = next((n for p, n, _ in LLM_PROVIDERS if p == pid), pid)
        t.append(f"{pname}", style=f"bold {W}")
        t.append("   Ready — type ", style=M)
        t.append("/help", style=f"bold {O2}")
        t.append(" to begin", style=M)
    else:
        t.append("○  ", style=f"bold {R}")
        t.append("LLM not configured — type ", style=M)
        t.append("/setup", style=f"bold {O2}")
        t.append(" to connect your first provider", style=M)

    return Panel(t, box=box.ROUNDED, border_style=OD, padding=(0, 1))


# ── startup screen ────────────────────────────────────────────────────────────

def startup(console: Console) -> None:
    cfg = load_config()
    mem = load_memory()

    console.print()
    # Big pixel art
    console.print(_art_banner())
    console.print()
    # Subtitle
    sub = Text()
    sub.append("  • ", style=M)
    sub.append("Personal AI Operating System", style=f"bold {W}")
    sub.append(" •", style=M)
    console.print(sub)
    console.print()
    # Info panel
    console.print(Padding(_info_panel(cfg, mem), (0, 0, 0, 2)))
    console.print()
    # Status bar
    console.print(Padding(_status_bar(cfg), (0, 0, 0, 2)))
    # Footer
    console.print()
    console.print(
        f"  [{M}]orlix v{VERSION}[/]"
    )
    console.print()


# ── setup wizard ──────────────────────────────────────────────────────────────

def run_setup(console: Console) -> None:
    cfg = load_config()
    console.print()
    console.print(Panel(
        f"[bold {O2}]ORLIX SETUP — Bring Your Own Key[/]",
        box=box.HEAVY, border_style=O2, padding=(0, 2),
    ))
    console.print()
    console.print(f"  [{O2}]Select LLM provider:[/]\n")

    for i, (_, name, model) in enumerate(LLM_PROVIDERS, 1):
        console.print(f"  [{O2}]{i}.[/]  [{W}]{name:<20}[/]  [{M}]{model}[/]")
    console.print(f"  [{M}]{len(LLM_PROVIDERS) + 1}.  Skip for now[/]")
    console.print()

    try:
        raw = console.input(f"  [{O2}]>[/] [{M}]Choice [1-{len(LLM_PROVIDERS)+1}]:[/] ")
        idx = int(raw.strip()) - 1
    except (ValueError, EOFError, KeyboardInterrupt):
        console.print(f"\n  [{M}]Setup cancelled.[/]")
        return

    if 0 <= idx < len(LLM_PROVIDERS):
        pid, pname, pmodel = LLM_PROVIDERS[idx]
        try:
            key = console.input(f"  [{O2}]>[/] [{M}]API key for {pname}:[/] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print(f"\n  [{M}]Setup cancelled.[/]")
            return
        if key:
            cfg["llm"] = {"provider": pid, "model": pmodel, "key": key}
            save_config(cfg)
            console.print(f"\n  [bold {G}]✓[/]  [{O2}]{pname}[/] configured  [{M}]→ {pmodel}[/]")
        else:
            console.print(f"  [{M}]No key entered — skipped.[/]")

    console.print()
    console.print(f"  [{M}]Optional data-source keys (Enter to skip):[/]\n")
    keys_cfg: dict[str, str] = dict(cfg.get("keys", {}))
    for name, _, key in DATA_SOURCES:
        if key is None:
            continue
        try:
            val = console.input(f"  [{M}]>[/]  [{W}]{name:<14}[/]  [{M}]API key:[/] ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if val:
            keys_cfg[key] = val

    cfg["keys"] = keys_cfg
    save_config(cfg)
    console.print(f"\n  [bold {G}]✓[/]  Config saved  [{M}]{CONFIG_FILE}[/]")
    console.print()


# ── REPL ──────────────────────────────────────────────────────────────────────

def _help(console: Console) -> None:
    console.print()
    t = Table(box=None, show_header=False, padding=(0, 2, 0, 2))
    t.add_column(style=f"bold {W}", min_width=14)
    t.add_column(style=M)
    for cmd, desc in COMMANDS:
        t.add_row(cmd, desc)
    console.print(Padding(t, (0, 0, 0, 2)))
    console.print()


def _dispatch(line: str, console: Console) -> bool:
    cmd = line.strip().lstrip("/").lower()
    if not cmd:
        return True
    if cmd in ("exit", "quit", "q", "bye"):
        console.print(f"\n  [{M}]Goodbye.[/]\n")
        return False
    if cmd in ("help", "?", "h"):
        _help(console)
        return True
    if cmd == "setup":
        run_setup(console)
        return True
    if cmd == "clear":
        console.clear()
        startup(console)
        return True
    known = {c for c, _ in COMMANDS}
    if cmd in known:
        console.print(f"  [{M}]`{cmd}` is not yet implemented in this preview.[/]")
    else:
        console.print(
            f"  [{R}]Unknown:[/] [{W}]{cmd}[/]  (type [{O2}]help[/] or [{O2}]exit[/])"
        )
    return True


def repl(console: Console) -> None:
    startup(console)
    while True:
        try:
            line = console.input(f"\n  [{O2}]orlix[/] [{M}]›[/] ")
        except (EOFError, KeyboardInterrupt):
            console.print(f"\n  [{M}]Goodbye.[/]\n")
            break
        if not _dispatch(line, console):
            break


# ── entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except AttributeError:
            pass
        try:
            os.system("chcp 65001 > nul 2>&1")
        except Exception:
            pass

    console = Console(highlight=False)
    repl(console)


if __name__ == "__main__":
    main()
