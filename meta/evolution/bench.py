#!/usr/bin/env python3
# =============================================================================
# 方法论 Layer 3 —— 基准回归 (bench).确定性回归锚。
# -----------------------------------------------------------------------------
# 对指定目标(由调用方提供)重跑 Layer 2 确定性闸门(engine --assume-approval)
# 与 Layer 0 合规校验(check.py),两者全过才放行(exit 0)。吸收候选须过本回归,
# 否则 block(退化拦截)。完全确定性,LLM 不参与。
# =============================================================================
from __future__ import annotations

import argparse
import os
import pathlib
import subprocess
import sys

META = pathlib.Path(__file__).resolve().parent.parent
ROOT = META.parent


def _uv_env() -> dict:
    env = dict(os.environ)
    env.setdefault("UV_CACHE_DIR", str(ROOT / ".uv-cache"))
    env.setdefault("UV_PYTHON_INSTALL_DIR", str(ROOT / ".uv-python"))
    return env


def run_bench(target: pathlib.Path) -> tuple[bool, list[str]]:
    """重跑 engine(确定性闸门)+ check.py(合规).返回 (ok, 明细)."""
    results = []
    ok = True
    check_cmd = ["uv", "run", "--project", str(META / "scripts"),
                 "python", str(META / "scripts" / "check.py"), str(target)]
    eng_cmd = ["uv", "run", "--project", str(META / "scripts"),
               "python", str(META / "engine" / "engine.py"), str(target), "--assume-approval"]
    for name, cmd in (("check.py", check_cmd), ("engine", eng_cmd)):
        r = subprocess.run(cmd, cwd=ROOT, env=_uv_env(), capture_output=True, text=True)
        passed = r.returncode == 0
        results.append(f"{name}: {'PASS' if passed else 'FAIL (exit %d)' % r.returncode}")
        if not passed:
            ok = False
            tail = (r.stdout or r.stderr).strip().splitlines()
            results.append("    " + (tail[-1] if tail else "(no output)"))
    return ok, results


def main(argv=None) -> int:  # noqa: ANN001
    p = argparse.ArgumentParser(description="Methodology Layer 3 bench (regression)")
    p.add_argument("target", help="target project dir (required; no default target)")
    a = p.parse_args(argv)
    ok, detail = run_bench(pathlib.Path(a.target))
    for line in detail:
        print(line)
    print(f"[bench] {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
