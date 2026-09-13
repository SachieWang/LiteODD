#!/usr/bin/env python3
# =============================================================================
# 方法论集成适配层 —— 单一网关 (gateway). harness 无关;不复制裁决语义。
# -----------------------------------------------------------------------------
# 解决什么:核心体系是"自持、过程驱动"的(check.py / bench.py / judge.py 三个
# 独立脚本,靠人手动跑),在 Claude Code / DSH 这类成熟 agent 工具里等于每次
# 都要人记得敲命令。本网关把"多步人工触发"收成**一个入口**,并把结果统一成
# **机器可读 JSON 信封**,让任何 harness 的适配壳(DSH 插件 / MCP server / CI
# / git hook)只需调用一次、解析一次,就能程序化反应。
#
# 设计红线(与核心解耦,不越权):
#   ① 网关**只搬运、不裁决**。它 subprocess 调 core 的 check.py / bench.py /
#      judge.py,取它们的 **exit code 作为唯一权威判决**,并把 judge 自己打印的
#      条件行原样解析成结构化字段。三条收敛条件仍只由 judge.py 定义与执行;
#      网关里没有任何一条"吸收是否合规"的判断逻辑 —— 防止裁决语义被复制分叉。
#   ② 网关**不就地吸收**,不写 meta、不碰对象层产物。吸收仍 = 发起一条方法论
#      change(Layer 3 纪律),由人/agent 在 change 流程里完成。
#   ③ 网关**不改核心契约**。它是只读消费者;core 三个脚本保持原样。
#
# 输出契约(stdout 单一 JSON 信封,stderr 人读日志,exit 0/1/2):
#   stdout : 恰好一个 JSON 对象,遵循 meta/integrations/schemas/verdict.schema.json
#   stderr : [gateway] 前缀的人读进度与子步骤输出
#   exit   : 0 = 全部通过;1 = 有步骤未通过;2 = 用法/基础设施错误(超时/缺文件)
#
# 用法:
#   python meta/integrations/gateway.py snapshot [--target T]
#   python meta/integrations/gateway.py check    --target T
#   python meta/integrations/gateway.py bench    --target T
#   python meta/integrations/gateway.py judge    --candidate C [--target T]
#   python meta/integrations/gateway.py gate     --target T [--candidate C]
# =============================================================================
from __future__ import annotations

import argparse
import glob
import json
import os
import pathlib
import re
import subprocess
import sys
from datetime import datetime, timezone

META = pathlib.Path(__file__).resolve().parent.parent
ROOT = META.parent

SCHEMA_VERSION = "1.0"
DEFAULT_TIMEOUT = 900  # seconds, per subprocess step

# judge 的条件序号 -> 结构化字段名(与 judge.py 的 ①②③ 一一对应)
JUDGE_CONDITIONS = {1: "record", 2: "bench", 3: "addonly"}

# 三个 core 入口(唯一权威)。适配层只引用,不复制。
CORE = {
    "check": META / "scripts" / "check.py",
    "bench": META / "evolution" / "bench.py",
    "judge": META / "evolution" / "judge.py",
    "engine": META / "engine" / "engine.py",
    "orchestrator": META / "engine" / "orchestrator.yaml",
    "frame": META / "ontology" / "frame.yaml",
    "retro": META / "evolution" / "retro",
    "metaschema": META / "metaschema",
}


def _log(msg: str) -> None:
    """人读日志一律走 stderr,保持 stdout 是单一可解析 JSON。"""
    print(f"[gateway] {msg}", file=sys.stderr)


def _env() -> dict:
    """给 uv 指到仓库内可写缓存(沙箱内 ~/.cache/uv 往往只读)。"""
    env = dict(os.environ)
    env.setdefault("UV_CACHE_DIR", str(ROOT / ".uv-cache"))
    env.setdefault("UV_PYTHON_INSTALL_DIR", str(ROOT / ".uv-python"))
    return env


def _step(name: str, cmd: list[str], timeout: int) -> dict:
    """跑一个 core 步骤。exit code 是唯一权威判决;stdout/stderr 只做人读明细。"""
    _log(f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(
            cmd, cwd=ROOT, env=_env(), capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        _log(f"[timeout] {name} exceeded {timeout}s")
        return {
            "name": name, "ok": False, "exitCode": 124,
            "summary": f"timeout after {timeout}s", "detail": "",
            "stdout": "",
        }
    out = proc.stdout or ""
    err = proc.stderr or ""
    for line in (out + err).strip().splitlines():
        _log(f"  | {line}")
    tail = (out or err).strip().splitlines()
    return {
        "name": name,
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "summary": (tail[-1].strip() if tail else "(no output)")[:400],
        "detail": "\n".join(tail[-8:])[:2000],
        "stdout": out,  # 供 judge 条件解析;出信封前剔除
    }


def _strip_internal(step: dict) -> dict:
    """内部字段(stdout)不进行为契约,出信封前剔除。"""
    return {k: v for k, v in step.items() if k != "stdout"}


def _parse_judge(stdout: str) -> tuple[dict, list[str], str]:
    """把 judge.py 自己打印的 `ok[N]` / `FAIL[N]` 行解析成结构化条件。

    只做搬运:判决仍以 exit code 为准,这里只把 judge 的**原话**结构化,
    便于 agent 程序化反应(自动 open change / 自动记录 reject 原因)。
    """
    conditions = {k: "unknown" for k in JUDGE_CONDITIONS.values()}
    notes: list[str] = []
    verdict_line = ""
    for raw in stdout.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^(ok|FAIL)\[(\d)\]\s*(.*)$", line)
        if m:
            kind, idx, text = m.group(1), int(m.group(2)), m.group(3)
            key = JUDGE_CONDITIONS.get(idx)
            if key:
                conditions[key] = "pass" if kind == "ok" else "fail"
            notes.append(f"{kind}[{idx}] {text}".strip())
            continue
        if line.startswith("[judge]"):
            verdict_line = line
    return conditions, notes, verdict_line


def _envelope(command: str, steps: list[dict], *, target: str | None,
              candidate: str | None, judge: dict | None, snapshot: dict | None,
              exit_code: int, error: str | None = None) -> dict:
    ok = all(s["ok"] for s in steps) if steps else exit_code == 0
    env: dict = {
        "gateway": {
            "schemaVersion": SCHEMA_VERSION,
            "command": command,
            "verdict": "pass" if ok else "fail",
            "exitCode": exit_code,
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "target": target,
        "candidate": candidate,
        "steps": [_strip_internal(s) for s in steps],
        "judge": judge,
        "snapshot": snapshot,
        "error": error,
    }
    return env


# ---------------------------------------------------------------------------
# snapshot —— 只读上下文快照(设计讨论「感知面」:免查文档,直接感知契约)
# ---------------------------------------------------------------------------
def _load_yaml(path: pathlib.Path):
    try:
        import yaml  # 由 meta/scripts 的 uv 环境提供
    except ImportError:  # pragma: no cover - 运行环境缺依赖
        return None
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 - 快照是尽力而为的只读视图
        return None


def build_snapshot(target: str | None) -> dict:
    frame = _load_yaml(CORE["frame"]) or {}
    orch = _load_yaml(CORE["orchestrator"]) or {}
    concept_types = [t.get("id") for t in frame.get("conceptTypes", []) if isinstance(t, dict)]
    relation_types = [t.get("id") for t in frame.get("relationTypes", []) if isinstance(t, dict)]

    candidates = []
    for p in sorted(glob.glob(str(CORE["retro"] / "*.yaml"))):
        doc = _load_yaml(pathlib.Path(p)) or {}
        body = doc.get("candidate", doc) if isinstance(doc, dict) else {}
        rec = str(body.get("changerecord") or "")
        candidates.append({
            "path": str(pathlib.Path(p).relative_to(ROOT)),
            "id": body.get("id"),
            "target": body.get("target"),
            "benchStatus": body.get("bench_status"),
            "addOnly": body.get("addonly"),
            "changeRecord": rec or None,
            "changeRecordExists": bool(rec) and (ROOT / rec).exists(),
        })

    targets = []
    tdir = ROOT / "targets"
    if tdir.exists():
        for d in sorted(p for p in tdir.iterdir() if p.is_dir()):
            arts = list((d / "artifacts").rglob("*.json")) if (d / "artifacts").exists() else []
            targets.append({
                "path": str(d.relative_to(ROOT)),
                "artifacts": len(arts),
                "hasObjectRealm": all(
                    (d / "ontology" / f).exists()
                    for f in ("instances.yaml", "components.yaml", "sources.yaml")
                ),
            })

    def _cmd(rel: str, *args: str) -> str:
        return f"uv run --project meta/scripts python {rel} {' '.join(args)}".strip()

    return {
        "root": str(ROOT),
        "frame": {
            "schemaVersion": frame.get("schemaVersion"),
            "conceptTypes": concept_types,
            "relationTypes": relation_types,
        },
        "metaschemas": sorted(p.name for p in CORE["metaschema"].glob("*.schema.json")),
        "orchestratorStages": [s.get("id") for s in orch.get("stages", []) if isinstance(s, dict)],
        "absorptionTargets": ["frame", "metaschema", "skill", "gate", "method"],
        "candidates": candidates,
        "targets": targets,
        "selectedTarget": target,
        "gates": {
            "check": _cmd("meta/scripts/check.py", "<target>"),
            "bench": _cmd("meta/evolution/bench.py", "<target>"),
            "judge": _cmd("meta/evolution/judge.py", "<candidate>", "[--target <target>]"),
            "engine": _cmd("meta/engine/engine.py", "<target>", "--assume-approval"),
            "gateway": "python meta/integrations/gateway.py gate --target <target> [--candidate <candidate>]",
        },
    }


# ---------------------------------------------------------------------------
# 子命令
# ---------------------------------------------------------------------------
def cmd_snapshot(a) -> dict:
    return _envelope("snapshot", [], target=a.target, candidate=None, judge=None,
                     snapshot=build_snapshot(a.target), exit_code=0)


def cmd_check(a) -> dict:
    step = _step("check.py", ["uv", "run", "--project", str(META / "scripts"), "python",
                              str(CORE["check"]), a.target], a.timeout)
    return _envelope("check", [step], target=a.target, candidate=None, judge=None,
                     snapshot=None, exit_code=0 if step["ok"] else 1)


def cmd_bench(a) -> dict:
    step = _step("bench.py", ["uv", "run", "--project", str(META / "scripts"), "python",
                              str(CORE["bench"]), a.target], a.timeout)
    return _envelope("bench", [step], target=a.target, candidate=None, judge=None,
                     snapshot=None, exit_code=0 if step["ok"] else 1)


def _judge_step(candidate: str, target: str | None, timeout: int) -> tuple[dict, dict]:
    cmd = ["uv", "run", "--project", str(META / "scripts"), "python", str(CORE["judge"]), candidate]
    if target:
        cmd += ["--target", target]
    step = _step("judge.py", cmd, timeout)
    conditions, notes, verdict_line = _parse_judge(step.get("stdout", ""))
    judge = {
        "id": None,
        "verdict": "ACCEPT" if step["ok"] else "REJECT/DEFER",
        "conditions": conditions,
        "notes": notes,
        "verdictLine": verdict_line,
    }
    # judge 自己打印的 candidate id(只做搬运展示,不参与判决)
    m = re.search(r"^candidate:\s*(.+)$", step.get("stdout", ""), re.MULTILINE)
    if m:
        judge["id"] = m.group(1).strip()
    return step, judge


def cmd_judge(a) -> dict:
    step, judge = _judge_step(a.candidate, a.target, a.timeout)
    return _envelope("judge", [step], target=a.target, candidate=a.candidate, judge=judge,
                     snapshot=None, exit_code=0 if step["ok"] else 1)


def cmd_gate(a) -> dict:
    """单一网关:bench(Layer 3 回归,内含 check + engine)→ judge(收敛裁判)。

    与设计讨论一致:check/bench/judge 串成一条命令;吸收(open change)仍不在网关内,
    因为吸收必须走版本化 change 并可能触发人工审批(human/approval 三态)。
    """
    bench = _step("bench.py", ["uv", "run", "--project", str(META / "scripts"), "python",
                               str(CORE["bench"]), a.target], a.timeout)
    steps = [bench]
    judge = None
    if a.candidate:
        jstep, judge = _judge_step(a.candidate, a.target, a.timeout)
        steps.append(jstep)
    ok = all(s["ok"] for s in steps)
    return _envelope("gate", steps, target=a.target, candidate=a.candidate, judge=judge,
                     snapshot=None, exit_code=0 if ok else 1)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Methodology integration gateway (single machine-readable entry point)")
    p.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="per-step timeout in seconds")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("snapshot", help="read-only context snapshot of the methodology contracts")
    s.add_argument("--target", default=None)

    for name in ("check", "bench"):
        q = sub.add_parser(name, help=f"run core {name} on one target")
        q.add_argument("--target", required=True)

    j = sub.add_parser("judge", help="run core judge on one candidate")
    j.add_argument("--candidate", required=True)
    j.add_argument("--target", default=None)

    g = sub.add_parser("gate", help="single gateway: bench (+candidate judge)")
    g.add_argument("--target", required=True)
    g.add_argument("--candidate", default=None)

    a = p.parse_args(argv)
    handlers = {"snapshot": cmd_snapshot, "check": cmd_check, "bench": cmd_bench,
                "judge": cmd_judge, "gate": cmd_gate}
    try:
        env = handlers[a.command](a)
    except Exception as exc:  # noqa: BLE001 - 基础设施错误统一 exit 2
        _log(f"[fatal] {exc}")
        env = _envelope(a.command, [], target=getattr(a, "target", None),
                        candidate=getattr(a, "candidate", None), judge=None, snapshot=None,
                        exit_code=2, error=str(exc))
        print(json.dumps(env, ensure_ascii=False, indent=2))
        return 2

    print(json.dumps(env, ensure_ascii=False, indent=2))
    return env["gateway"]["exitCode"]


if __name__ == "__main__":
    sys.exit(main())
