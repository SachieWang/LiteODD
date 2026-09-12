#!/usr/bin/env python3
# =============================================================================
# 方法论 Layer 3 —— 收敛裁判 (judge). 确定性;LLM 不参与裁决。
# -----------------------------------------------------------------------------
# 判定候选可否吸收,三条条件(全过才 accept):
#   ① 已记录为"版本化的方法论 change"(changerecord 存在 + version_bump 存在
#      + target 合法 + id 存在)
#   ② 基准回归通过(bench_status==pass;或 auto 时实跑 bench.py;否则 fail)
#   ③ add-only 兼容(addonly==true)
# 任一不满足 → reject/defer 并点名失败条件。judge 只当"准入门",不就地吸收;
# 真正应用=发起一条方法论 change。
# =============================================================================
from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

import yaml

META = pathlib.Path(__file__).resolve().parent.parent
ROOT = META.parent

ALLOWED_TARGETS = {"frame", "metaschema", "skill", "gate", "method"}


def _run_bench(target: pathlib.Path):  # noqa: ANN001
    """实跑 bench.py 返回 exit code(judge 条件②的 auto 分支)。"""
    cmd = ["uv", "run", "--project", str(META / "scripts"), "python",
           str(META / "evolution" / "bench.py"), str(target)]
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True).returncode


def judge(candidate: dict, target: pathlib.Path) -> tuple[bool, list[str]]:
    """返回 (accept, 说明/失败条件)。三条全过才 accept。"""
    accepted = True
    notes = []

    # --- ① 已记录为版本化的方法论 change ---
    rec = str(candidate.get("changerecord") or "")
    version = str(candidate.get("version_bump") or "")
    tgt = candidate.get("target")
    cid = candidate.get("id")
    c_ok = (bool(rec) and (ROOT / rec).exists() and bool(version)
            and (tgt in ALLOWED_TARGETS) and bool(cid))
    if not c_ok:
        accepted = False
        notes.append("FAIL[1] 未记录为版本化方法论 change(缺存在且版的 change 记录 / 版本 / 合法 target / id)")
    else:
        notes.append("ok[1] 记录为版本化方法论 change")

    # --- ② 基准回归通过 ---
    bstat = candidate.get("bench_status")
    bench_ok = False
    if bstat == "pass":
        bench_ok = True
    elif bstat == "auto":
        if target is None:
            notes.append("FAIL[2] bench_status=auto 但未提供 --target(meta 工具不内嵌默认目标)")
        else:
            bench_ok = (_run_bench(target) == 0)
    if bstat == "auto" and target is None:
        accepted = False
    elif not bench_ok:
        accepted = False
        notes.append(f"FAIL[2] 基准回归未通过(bench_status={bstat!r};回归决定吸收许可)")
    else:
        notes.append("ok[2] 基准回归通过")

    # --- ③ add-only 兼容 ---
    addonly = candidate.get("addonly") is True
    if not addonly:
        accepted = False
        notes.append("FAIL[3] 非 add-only(破坏性/把可选变必填/静默改语义)——吸收不兼容")
    else:
        notes.append("ok[3] add-only 兼容")

    return accepted, notes


def main(argv=None) -> int:  # noqa: ANN001
    p = argparse.ArgumentParser(description="Methodology Layer 3 convergence judge")
    p.add_argument("candidate", help="路径到候选 YAML")
    p.add_argument("--target", default=None, help="benchmark target (required only when bench_status=auto)")
    a = p.parse_args(argv)
    cand = yaml.safe_load(pathlib.Path(a.candidate).read_text(encoding="utf-8"))
    body = cand.get("candidate", cand)
    accepted, notes = judge(body, pathlib.Path(a.target) if a.target else None)
    print(f"candidate: {body.get('id', '(none)')}")
    for n in notes:
        print("  " + n)
    verdict = "ACCEPT" if accepted else "REJECT/DEFER"
    print(f"[judge] {verdict}", "(可发起方法论 change 吸收)" if accepted else "")
    return 0 if accepted else 1


if __name__ == "__main__":
    sys.exit(main())
