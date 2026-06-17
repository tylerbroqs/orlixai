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
    ("chat",             "Start AI conversation"),
    ("memory",           "View goals, facts & policies"),
    ("add goal <name>",  "Add a goal  [--deadline YYYY-MM-DD]"),
    ("add fact <text>",  "Store a fact"),
    ("add policy <rule>","Activate a policy rule"),
    ("progress <n> <n%>","Update goal progress"),
    ("governance",       "View governance state"),
    ("setup",            "Configure LLM & API keys"),
    ("exit",             "Quit ORLIX"),
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


# ── memory commands ───────────────────────────────────────────────────────────

def _new_id() -> str:
    import random, time
    return f"{int(time.time()*1000):x}-{random.randint(0,0xfffff):05x}"

def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

def cmd_memory(console: Console) -> None:
    mem = load_memory()
    goals    = mem["goals"]
    facts    = mem["facts"]
    policies = mem["policies"]

    console.print()

    # ── goals ──────────────────────────────────────────────────────────────────
    console.print(f"  [bold {O2}]GOALS[/]  [{M}]({len(goals)})[/]")
    if not goals:
        console.print(f"  [{M}]No goals yet.  Try: add goal Launch product --deadline 2026-09-01[/]")
    else:
        for g in goals:
            pct  = int((g.get("progress") or 0) * 100)
            bar  = "█" * (pct // 10) + "░" * (10 - pct // 10)
            dl   = g.get("deadline") or "no deadline"
            over = g.get("deadline") and g["deadline"] < _now()[:10]
            console.print(
                f"  [{O2}]{g['name']}[/]  [{M}]{dl}{'  ⚠ overdue' if over else ''}[/]"
            )
            console.print(f"    [{G}]{bar}[/] {pct}%   [{M}]{g['id']}[/]")
    console.print()

    # ── facts ──────────────────────────────────────────────────────────────────
    console.print(f"  [bold {O2}]FACTS[/]  [{M}]({len(facts)})[/]")
    if not facts:
        console.print(f"  [{M}]No facts yet.  Try: add fact team size is 4 people[/]")
    else:
        for f in facts:
            console.print(f"  [{W}]◆[/] {f['content']}  [{M}][{f.get('source','manual')}][/]")
    console.print()

    # ── policies ───────────────────────────────────────────────────────────────
    console.print(f"  [bold {O2}]POLICIES[/]  [{M}]({len(policies)})[/]")
    if not policies:
        console.print(f"  [{M}]No policies yet.  Try: add policy alert_if_goal_overdue[/]")
    else:
        for p in policies:
            dot = f"[{G}]●[/]" if p.get("status") == "active" else f"[{M}]○[/]"
            console.print(f"  {dot} [{W}]{p['rule']}[/]  [{M}]v{p.get('version',1)}  {p.get('status','active')}[/]")
    console.print()


def cmd_add_goal(console: Console, args: str) -> None:
    name = args.strip()
    if not name:
        console.print(f"  [{R}]Usage:[/] add goal <name> [--deadline YYYY-MM-DD]")
        return
    import re
    dl_match = re.search(r"--deadline\s+(\d{4}-\d{2}-\d{2})", name)
    deadline = dl_match.group(1) if dl_match else None
    name = re.sub(r"--deadline\s+\S+", "", name).strip()

    mem  = load_memory()
    goal = {
        "id":        _new_id(),
        "name":      name,
        "deadline":  deadline,
        "progress":  0,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    mem["goals"].append(goal)
    _save_memory(mem)
    console.print(f"\n  [bold {G}]✓[/]  Goal added: [{O2}]{name}[/]" +
                  (f"  [{M}]deadline: {deadline}[/]" if deadline else ""))
    console.print(f"     [{M}]id: {goal['id']}[/]\n")


def cmd_add_fact(console: Console, args: str) -> None:
    content = args.strip()
    if not content:
        console.print(f"  [{R}]Usage:[/] add fact <content>")
        return
    mem  = load_memory()
    fact = {"id": _new_id(), "content": content, "source": "user",
            "confidence": 1.0, "createdAt": _now()}
    mem["facts"].append(fact)
    _save_memory(mem)
    console.print(f"\n  [bold {G}]✓[/]  Fact stored: [{W}]{content}[/]\n")


def cmd_add_policy(console: Console, args: str) -> None:
    rule = args.strip()
    if not rule:
        console.print(f"  [{R}]Usage:[/] add policy <rule>")
        return
    mem    = load_memory()
    ver    = sum(1 for p in mem["policies"] if p["rule"] == rule) + 1
    policy = {"id": _new_id(), "rule": rule, "version": ver,
              "status": "active", "priority": 5,
              "createdAt": _now(), "updatedAt": _now()}
    mem["policies"].append(policy)
    _save_memory(mem)
    console.print(f"\n  [bold {G}]✓[/]  Policy added: [{W}]{rule}[/]  [{M}]v{ver}[/]\n")


def cmd_progress(console: Console, args: str) -> None:
    import re
    m = re.match(r"(.+?)\s+(\d+(?:\.\d+)?)\s*%?$", args.strip())
    if not m:
        console.print(f"  [{R}]Usage:[/] progress <goal name or id> <0-100>")
        return
    query, raw = m.group(1).strip(), float(m.group(2))
    pct = raw / 100 if raw > 1 else raw

    mem   = load_memory()
    query_lower = query.lower()
    goal  = next(
        (g for g in mem["goals"]
         if query_lower in g["name"].lower() or g["id"].startswith(query)),
        None,
    )
    if not goal:
        console.print(f"  [{R}]Goal not found:[/] {query}")
        return
    goal["progress"]  = pct
    goal["updatedAt"] = _now()
    _save_memory(mem)
    bar = "█" * int(pct * 10) + "░" * (10 - int(pct * 10))
    console.print(f"\n  [bold {G}]✓[/]  [{O2}]{goal['name']}[/]")
    console.print(f"     [{G}]{bar}[/] {int(pct*100)}%\n")


def _save_memory(mem: dict) -> None:
    ORLIX_DIR.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(mem, indent=2), "utf-8")


# ── chat ───────────────────────────────────────────────────────────────────────

def cmd_chat(console: Console) -> None:
    cfg = load_config()
    llm = cfg.get("llm")
    if not llm:
        console.print(f"\n  [{R}]No LLM configured.[/]  Run [{O2}]setup[/] first.\n")
        return

    provider = llm.get("provider", "")
    model    = llm.get("model", "")
    api_key  = llm.get("key", "")

    console.print()
    console.print(Panel(
        f"[{M}]Provider:[/] [{O2}]{provider}[/]   [{M}]Model:[/] [{W}]{model}[/]\n"
        f"[{M}]Type your message. Empty line to send. [{O2}]exit[/] [{M}]to leave chat.[/]",
        border_style=OD, box=box.ROUNDED, padding=(0, 2),
    ))
    console.print()

    history: list[dict] = []

    while True:
        lines: list[str] = []
        try:
            while True:
                chunk = console.input(f"  [{W}]You[/] [{M}]›[/] ")
                if chunk.strip().lower() in ("exit", "quit", "/exit"):
                    console.print(f"\n  [{M}]Leaving chat.[/]\n")
                    return
                if chunk == "":
                    break
                lines.append(chunk)
        except (EOFError, KeyboardInterrupt):
            console.print(f"\n  [{M}]Leaving chat.[/]\n")
            return

        user_msg = "\n".join(lines).strip()
        if not user_msg:
            continue

        history.append({"role": "user", "content": user_msg})

        # ── call API ──────────────────────────────────────────────────────────
        reply = _call_llm(provider, model, api_key, history, console)
        if reply:
            history.append({"role": "assistant", "content": reply})
        console.print()


def _call_llm(provider: str, model: str, api_key: str,
              history: list[dict], console: Console) -> str | None:
    import urllib.request, urllib.error

    console.print(f"\n  [{O2}]ORLIX[/] [{M}]›[/] ", end="")

    try:
        if provider == "anthropic":
            return _call_anthropic(model, api_key, history, console)
        elif provider == "openai":
            return _call_openai("https://api.openai.com/v1/chat/completions",
                                model, api_key, history, console)
        elif provider == "google":
            return _call_google(model, api_key, history, console)
        elif provider == "xai":
            return _call_openai("https://api.x.ai/v1/chat/completions",
                                model, api_key, history, console)
        elif provider == "deepseek":
            return _call_openai("https://api.deepseek.com/chat/completions",
                                model, api_key, history, console)
        elif provider == "moonshot":
            return _call_openai("https://api.moonshot.cn/v1/chat/completions",
                                model, api_key, history, console)
        elif provider == "minimax":
            return _call_openai("https://api.minimax.chat/v1/text/chatcompletion_v2",
                                model, api_key, history, console)
        elif provider == "zhipu":
            return _call_openai("https://open.bigmodel.cn/api/paas/v4/chat/completions",
                                model, api_key, history, console)
        else:
            console.print(f"[{R}]Unsupported provider: {provider}[/]")
            return None
    except Exception as e:
        console.print(f"\n  [{R}]Error: {e}[/]\n")
        return None


def _call_anthropic(model: str, api_key: str,
                    history: list[dict], console: Console) -> str:
    import urllib.request, json as _json
    payload = _json.dumps({
        "model":      model,
        "max_tokens": 1024,
        "messages":   history,
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key":         api_key,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = _json.loads(resp.read())
    text = data["content"][0]["text"]
    console.print(f"[{W}]{text}[/]")
    return text


def _call_openai(url: str, model: str, api_key: str,
                 history: list[dict], console: Console) -> str:
    import urllib.request, json as _json
    payload = _json.dumps({
        "model":    model,
        "messages": history,
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = _json.loads(resp.read())
    text = data["choices"][0]["message"]["content"]
    console.print(f"[{W}]{text}[/]")
    return text


def _call_google(model: str, api_key: str,
                 history: list[dict], console: Console) -> str:
    import urllib.request, json as _json
    # convert openai-style history to Google format
    contents = [
        {"role": "user" if m["role"] == "user" else "model",
         "parts": [{"text": m["content"]}]}
        for m in history
    ]
    payload = _json.dumps({"contents": contents}).encode()
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent?key={api_key}")
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = _json.loads(resp.read())
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    console.print(f"[{W}]{text}[/]")
    return text


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
    if cmd in ("memory", "mem", "m"):
        cmd_memory(console)
        return True
    if cmd == "chat":
        cmd_chat(console)
        return True
    if cmd.startswith("add goal "):
        cmd_add_goal(console, line.strip()[9:])
        return True
    if cmd.startswith("add fact "):
        cmd_add_fact(console, line.strip()[9:])
        return True
    if cmd.startswith("add policy "):
        cmd_add_policy(console, line.strip()[11:])
        return True
    if cmd.startswith("progress "):
        cmd_progress(console, line.strip()[9:])
        return True
    if cmd == "governance":
        cmd_memory(console)   # shows goals + policies
        return True
    known = {c for c, _ in COMMANDS}
    if cmd in known:
        console.print(f"  [{M}]`{cmd}` — coming soon.[/]")
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
