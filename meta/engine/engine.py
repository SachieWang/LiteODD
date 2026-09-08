#!/usr/bin/env python3
# =============================================================================
# 方法论 Layer 2 —— 确定性 DAG 编排执行器 (极薄引擎)
# -----------------------------------------------------------------------------
# 读 orchestrator.yaml -> 拓扑排序 -> 逐节点:
#   1) Producer(可换/有界):收集该节点声明 pattern 的产物文件
#   2) Gate(确定性):遍历闸门注册表规则,任一失败 -> 节点 failed、halt 下游
#   3) Approval(审批策略提供者三态):human 默认 hold(人环暂停);
#      --assume-approval 下将 hold 视为 approve;policy 为加性自动提供者
#   4) Audit: 写 <target>/.audit/run-<ts>.jsonl
# 与 OpenSpec/任何 harness 解耦;只消费 /meta 与 target 产物。
# =============================================================================
from __future__ import annotations

import argparse
import json
import pathlib
import sys
import time
from collections import defaultdict, deque

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import approval_policies as ap
import gate_rules as gr

import yaml

META = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_ORCH = META / "engine" / "orchestrator.yaml"


def log(msg):  # noqa: ANN001
    print(msg)


def load_orchestrator(path):
    return yaml.safe_load(pathlib.Path(path).read_text(encoding="utf-8"))


def _resolve_files(target: pathlib.Path, patterns):
    files = []
    for pat in patterns:
        for p in target.glob(pat):
            if p.is_file():
                files.append(p)
    return sorted({str(f) for f in files})


def topo_sort(stages):
    by_id = {s["id"]: s for s in stages}
    indeg = {s["id"]: len(s.get("deps") or []) for s in stages}
    adj = defaultdict(list)
    for s in stages:
        for d in s.get("deps") or []:
            adj[d].append(s["id"])
    q = deque([sid for sid, d in indeg.items() if d == 0])
    order = []
    while q:
        sid = q.popleft()
        order.append(sid)
        for nxt in adj[sid]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    if len(order) != len(stages):
        raise ValueError("cycle detected in DAG deps")
    return [by_id[sid] for sid in order]


def main(argv=None) -> int:  # noqa: ANN001
    p = argparse.ArgumentParser(description="Methodology Layer 2 deterministic orchestrator")
    p.add_argument("target", nargs="?", default=None, help="target project dir (default from orchestrator.yaml)")
    p.add_argument("--orchestrator", default=str(DEFAULT_ORCH))
    p.add_argument("--assume-approval", action="store_true", help="treat human HOLD as approved (non-interactive)")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args(argv)

    orch = load_orchestrator(a.orchestrator)
    target = pathlib.Path(a.target if a.target else orch["target"])
    if not target.exists():
        log(f"[fatal] target not found: {target}")
        return 1

    instances, itypes = gr.load_target_context(target)
    ctx = (instances, itypes)
    log(f"[engine] target={target} schemaVersion={orch.get('schemaVersion')}")
    log(f"[engine] forward-compat noted: {orch.get('forwardCompatibility', {}).get('note', '')}")

    try:
        order = topo_sort(orch.get("stages", []))
    except ValueError as exc:  # noqa: BLE001
        log(f"[fatal] {exc}")
        return 1

    audit = []
    exit_code = 0
    for stage in order:
        sid = stage["id"]
        log(f"\n== stage {sid} (deps={stage.get('deps') or []}) ==")
        files = _resolve_files(target, stage.get("artifacts", []))
        log(f"    files ({len(files)}): {[pathlib.Path(f).name for f in files]}")

        # Gate
        gate_errors, failed = gr.run_rules(stage.get("gate", []), files, ctx, log=log)
        if failed:
            log(f"[HALT] stage {sid} FAILED gates: {failed}")
            for e in gate_errors:
                log(f"       - {e}")
            audit.append({"stage": sid, "status": "gate_failed", "failedGates": failed, "files": files})
            exit_code = 1
            break

        # Approval
        provider = stage.get("approval") or "none"
        decision = None
        if provider != "none":
            decision = ap.decide(provider, {"passRate": 1.0, "policyThreshold": 1.0})
            if decision == "hold" and not a.assume_approval:
                log(f"[HOLD] stage {sid} approval {provider} awaiting human confirmation (run with --assume-approval to proceed)")
                audit.append({"stage": sid, "status": "hold", "approvalProvider": provider, "files": files})
                exit_code = 2
                break
            if decision == "hold":  # assume-approval
                log(f"[APPROVE] stage {sid} approval {provider}: assumed approved (--assume-approval)")
            elif decision == "reject":
                log(f"[REJECT] stage {sid} approval {provider}")
                audit.append({"stage": sid, "status": "rejected", "approvalProvider": provider, "files": files})
                exit_code = 2
                break
            else:
                log(f"[APPROVE] stage {sid} approval {provider}: auto-approved")
        else:
            log(f"[OK] stage {sid} gates passed; no approval")

        audit.append({
            "stage": sid,
            "status": "passed",
            "approvalProvider": provider,
            "decision": "approve" if provider != "none" else "n/a",
            "files": files,
        })

    # Audit trace
    audit_dir = target / ".audit"
    ts = time.strftime("%Y%m%d-%H%M%S")
    audit_path = audit_dir / f"run-{ts}.jsonl"
    if not a.dry_run:
        audit_dir.mkdir(parents=True, exist_ok=True)
        with audit_path.open("w", encoding="utf-8") as fh:
            fh.write(json.dumps({"target": str(target), "schemaVersion": orch.get("schemaVersion"), "exit": exit_code}, ensure_ascii=False) + "\n")
            for ent in audit:
                fh.write(json.dumps(ent, ensure_ascii=False) + "\n")
        log(f"\n[audit] written: {audit_path}")
    else:
        log(f"\n[dry-run] audit NOT written ({len(audit)} entries)")

    log(f"[engine] done. exit={exit_code}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
