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

# ── ASCII art banner via pyfiglet ─────────────────────────────────────────────
try:
    from pyfiglet import Figlet as _Figlet
    _figlet_available = True
except ImportError:
    _figlet_available = False

def _art_banner() -> Text:
    """ORLIX in orange block chars. Uses pyfiglet 'banner3' if available."""
    if _figlet_available:
        raw = _Figlet(font="ansi_shadow").renderText("ORLIX")
        lines = raw.rstrip("\n").split("\n")
        total = len(lines)
        out = Text()
        for i, line in enumerate(lines):
            if i > 0:
                out.append("\n")
            # gradient: bright top → orange middle → dim bottom
            if i < 2:
                color = O1
            elif i >= total - 2:
                color = O3
            else:
                color = O2
            out.append("  ")  # left margin
            for ch in line:
                if ch != " ":
                    out.append(ch, style=f"bold {color}")
                else:
                    out.append(" ")
        return out

    # ── fallback: hand-drawn 7×9 glyphs ──────────────────────────────────────
    G = [
        # O
        [[0,0,1,1,1,0,0],[0,1,1,0,1,1,0],[1,1,0,0,0,1,1],[1,0,0,0,0,0,1],
         [1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,1,0,0,0,1,1],[0,1,1,0,1,1,0],[0,0,1,1,1,0,0]],
        # R
        [[1,1,1,1,1,0,0],[1,1,0,0,1,1,0],[1,1,0,0,0,1,1],[1,1,0,0,1,1,0],
         [1,1,1,1,1,0,0],[1,1,1,0,0,0,0],[1,1,0,1,1,0,0],[1,1,0,0,1,1,0],[1,1,0,0,0,1,1]],
        # L
        [[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],
         [1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],
        # I
        [[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],
         [0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],
        # X
        [[1,1,0,0,0,1,1],[1,1,0,0,0,1,1],[0,1,1,0,1,1,0],[0,0,1,1,1,0,0],
         [0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,1,0,1,1,0],[1,1,0,0,0,1,1],[1,1,0,0,0,1,1]],
    ]
    out = Text()
    for r in range(9):
        if r > 0:
            out.append("\n")
        color = O1 if r <= 1 else (O3 if r >= 7 else O2)
        out.append("  ")
        for li, glyph in enumerate(G):
            if li > 0:
                out.append("  ")
            for pixel in glyph[r]:
                out.append("██" if pixel else "  ", style=f"bold {color}" if pixel else "")
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


# ── dashboard components ───────────────────────────────────────────────────────

def _status_table(cfg: dict, mem: dict) -> Table:
    llm  = cfg.get("llm")
    opt  = cfg.get("keys", {})
    connected = sum(1 for _, b, k in DATA_SOURCES if b or (k and opt.get(k)))
    goals    = len(mem["goals"])
    facts    = len(mem["facts"])
    policies = len(mem["policies"])

    rows: list[tuple[bool, str, str]] = [
        (bool(llm),  "LLM",          llm["model"] if llm else "not configured"),
        (True,       "Memory",        f"{goals}g  {facts}f  {policies}p"),
        (True,       "Governance",    "supervised"),
        (True,       "Data Sources",  f"{connected}/{len(DATA_SOURCES)} connected"),
    ]

    t = Table(box=None, show_header=True, header_style=f"bold {O2}",
              padding=(0, 1, 0, 0), show_edge=False, expand=False)
    t.add_column("STATUS",  min_width=15)
    t.add_column("",        min_width=20)

    for ok, label, detail in rows:
        t.add_row(
            Text(f"{'●' if ok else '○'}  {label}", style=f"bold {G if ok else R}"),
            Text(detail, style=G if ok else R),
        )
    return t


def _commands_table() -> Table:
    t = Table(box=None, show_header=True, header_style=f"bold {O2}",
              padding=(0, 1, 0, 0), show_edge=False, expand=False)
    t.add_column("COMMANDS", min_width=12)
    t.add_column("",         min_width=22)

    for cmd, desc in COMMANDS:
        t.add_row(Text(cmd, style=f"bold {W}"), Text(desc, style=M))
    return t


def _dashboard(cfg: dict, mem: dict) -> Table:
    outer = Table(box=None, show_header=False, padding=(0, 2, 0, 0),
                  show_edge=False, expand=False)
    outer.add_column(min_width=38)
    outer.add_column(min_width=38)
    outer.add_row(_status_table(cfg, mem), _commands_table())
    return outer


def _sources_panel(cfg: dict) -> Panel:
    opt = cfg.get("keys", {})
    builtin_row = Text()
    optional_row = Text()
    first_b = first_o = True

    for name, builtin, key in DATA_SOURCES:
        active = builtin or bool(key and opt.get(key))
        if builtin:
            if not first_b:
                builtin_row.append("   ")
            first_b = False
            builtin_row.append("● ", style=f"bold {G}")
            builtin_row.append(name, style=W)
        else:
            if not first_o:
                optional_row.append("   ")
            first_o = False
            optional_row.append("● " if active else "○ ", style=f"bold {G if active else B}")
            optional_row.append(name, style=W if active else M)

    content = Text()
    content.append_text(builtin_row)
    content.append("\n")
    content.append_text(optional_row)

    return Panel(content, title=f"[bold {O2}]CONNECTED SOURCES[/]",
                 border_style=OD, box=box.SIMPLE_HEAVY, padding=(0, 1))


def _footer(cfg: dict) -> Text:
    t = Text()
    if not cfg.get("llm"):
        t.append("  /setup", style=f"bold {O2}")
        t.append(" — connect your first LLM provider    ", style=M)
        t.append("/help", style=f"bold {W}")
        t.append(" for all commands", style=M)
    else:
        pid   = cfg["llm"].get("provider", "")
        pname = next((n for p, n, _ in LLM_PROVIDERS if p == pid), pid)
        t.append(f"  {pname} ready", style=f"bold {G}")
        t.append("    type ", style=M)
        t.append("chat", style=f"bold {O2}")
        t.append(" to begin    ", style=M)
        t.append("/help", style=f"bold {W}")
        t.append(" for all commands", style=M)
    return t


# ── startup screen ────────────────────────────────────────────────────────────

def startup(console: Console) -> None:
    cfg = load_config()
    mem = load_memory()

    console.print()
    console.print(_art_banner())                                   # big ORLIX art
    console.print()
    console.print(Padding(_dashboard(cfg, mem), (0, 0, 0, 2)))    # status + commands
    console.print()
    console.print(_sources_panel(cfg))                             # connected sources
    console.print(Rule(style=B))
    console.print(_footer(cfg))
    console.print()


# ── setup wizard ──────────────────────────────────────────────────────────────

def run_setup(console: Console) -> None:
    cfg = load_config()
    console.print()
    console.print(Panel(f"[bold {O2}]ORLIX SETUP — Bring Your Own Key[/]",
                        box=box.HEAVY, border_style=O2, padding=(0, 2)))
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
            console.print(f"\n  [bold {G}]✓[/]  [{O2}]{pname}[/]  [{M}]→ {pmodel}[/]")
        else:
            console.print(f"  [{M}]No key entered.[/]")

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

def _dispatch(line: str, console: Console) -> bool:
    cmd = line.strip().lstrip("/").lower()
    if not cmd:
        return True
    if cmd in ("exit", "quit", "q"):
        console.print(f"\n  [{M}]Goodbye.[/]\n")
        return False
    if cmd in ("help", "?", "h"):
        console.print()
        t = Table(box=None, show_header=False, padding=(0, 2, 0, 2))
        t.add_column(style=f"bold {W}", min_width=14)
        t.add_column(style=M)
        for c, d in COMMANDS:
            t.add_row(c, d)
        console.print(Padding(t, (0, 0, 0, 2)))
        console.print()
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
        console.print(f"  [{R}]Unknown:[/] [{W}]{cmd}[/]  (type [{O2}]help[/])")
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
