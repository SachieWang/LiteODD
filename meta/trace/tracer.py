#!/usr/bin/env python3
# =============================================================================
# 方法论 Layer 4 —— 可追溯层 (traceability): 全局 provenance 校验与反向查询
# -----------------------------------------------------------------------------
# 子命令:
#   verify <target>          全局链接完整性(确定性,硬门):可解析 / id 唯一 /
#                            ADR supersedes 存在且无环 / 取代状态一致
#   report <target>          覆盖度指标(非门):需求下游覆盖 + 孤儿概念 + 关系类型一致性
#   refs   <target> <key>    反向查询:概念或 artifact id 被谁引用
#   why    <target> <REQ-id> 某需求的下游链(概念 -> 引用的下游 artifact)
# 纯内存计算,无图数据库/推理机。文件名 tracer.py 以避免与标准库 trace 冲突。
# =============================================================================
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
import check as checker  # 复用 ARTIFACT_SCHEMA / load_yaml

META = pathlib.Path(__file__).resolve().parent.parent
ROOT = META.parent

# 下游(会"承接"需求的)artifact 根键
DOWNSTREAM = {"report", "adr", "domainModel"}


def _root_key(doc):
    return next((k for k in checker.ARTIFACT_SCHEMA if k in doc), None)


def _concepts_of(body):
    """收集 artifact 自身的 conceptRef + domain model 实体的 conceptRef。"""
    refs = list(body.get("conceptRef") or [])
    if "targetRef" in body and body["targetRef"]:
        refs.append(body["targetRef"])
    for e in body.get("entities") or []:
        if isinstance(e, dict) and e.get("conceptRef"):
            refs.append(e["conceptRef"])
    return refs


def _load(target: pathlib.Path):
    """返回 artifacts 列表:[{file, key, id, body}]。"""
    out = []
    adir = target / "artifacts"
    for f in sorted(adir.rglob("*.json")) if adir.exists() else []:
        try:
            doc = json.loads(f.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        k = _root_key(doc)
        if not k:
            continue
        body = doc[k]
        out.append({"file": f, "key": k, "id": body.get("id"), "body": body})
    return out


def _instances(target: pathlib.Path):
    f = target / "ontology" / "instances.yaml"
    ids = set()
    if f.exists():
        d = checker.load_yaml(f) or {}
        for it in d.get("instances", []):
            if isinstance(it, dict) and it.get("id"):
                ids.add(it["id"])
    return ids


def verify_target(target) -> list[str]:
    """全局链接完整性校验;返回错误列表(空 = 通过)。"""
    target = pathlib.Path(target)
    arts = _load(target)
    inst = _instances(target)
    errs: list[str] = []

    # id 唯一
    seen: dict[str, str] = {}
    for a in arts:
        aid = a["id"]
        if not aid:
            errs.append(f"{a['file']}: artifact missing id")
            continue
        if aid in seen:
            errs.append(f"duplicate artifact id {aid!r}: {seen[aid]} 与 {a['file']}")
        else:
            seen[aid] = str(a["file"])

    # conceptRef / targetRef 可解析
    for a in arts:
        for c in _concepts_of(a["body"]):
            if c not in inst:
                errs.append(f"{a['file']}: link {c!r} does not resolve to an instance")

    # ADR 取代链
    adr_ids = {a["id"] for a in arts if a["key"] == "adr" and a["id"]}
    superseded_by: dict[str, str] = {}
    graph: dict[str, list[str]] = {}
    for a in arts:
        if a["key"] != "adr" or not a["id"]:
            continue
        sup = list(a["body"].get("supersedes") or [])
        graph[a["id"]] = sup
        for s in sup:
            if s not in adr_ids:
                errs.append(f"{a['file']}: supersedes {s!r} is not an existing ADR")
            else:
                superseded_by[s] = a["id"]

    # 无环
    def _has_cycle(nid, stack, visited):
        if nid in stack:
            return True
        if nid in visited:
            return False
        stack.add(nid)
        for nxt in graph.get(nid, []):
            if nxt in graph and _has_cycle(nxt, stack, visited):
                return True
        stack.discard(nid)
        visited.add(nid)
        return False

    visited: set[str] = set()
    for nid in graph:
        if _has_cycle(nid, set(), visited):
            errs.append(f"supersedes cycle detected involving {nid!r}")
            break

    # 取代状态一致
    for a in arts:
        if a["key"] != "adr" or not a["id"]:
            continue
        st = a["body"].get("status")
        is_sup = a["id"] in superseded_by
        if is_sup and st != "superseded":
            errs.append(f"{a['file']}: ADR {a['id']} is superseded by {superseded_by[a['id']]} but status={st!r}")
        if st == "superseded" and not is_sup:
            errs.append(f"{a['file']}: ADR {a['id']} marked superseded but no ADR supersedes it")

    return errs


def coverage(target) -> dict:
    """覆盖度指标:需求下游覆盖 + 孤儿概念。"""
    target = pathlib.Path(target)
    arts = _load(target)
    inst = _instances(target)
    referenced: dict[str, set[str]] = {c: set() for c in inst}

    for a in arts:
        for c in _concepts_of(a["body"]):
            if c in referenced:
                referenced[c].add(a["key"])

    reqs = [a for a in arts if a["key"] == "requirement"]
    covered, uncovered = [], []
    for r in reqs:
        cs = _concepts_of(r["body"])
        if any(referenced.get(c, set()) & DOWNSTREAM for c in cs):
            covered.append(r["id"])
        else:
            uncovered.append(r["id"])

    orphans = sorted(c for c, ks in referenced.items() if not ks)
    return {"total": len(reqs), "covered": covered, "uncovered": uncovered, "orphans": orphans}


def _frame_relation_types() -> set[str]:
    """frame 声明的通用关系类型 id(容忍 `- id: x` 与 `- x` 两种写法)。"""
    f = META / "ontology" / "frame.yaml"
    out: set[str] = set()
    if not f.exists():
        return out
    d = checker.load_yaml(f) or {}
    for r in d.get("relationTypes") or []:
        if isinstance(r, dict) and r.get("id"):
            out.add(str(r["id"]))
        elif isinstance(r, str) and r:
            out.add(r)
    return out


def relation_conformance(target) -> dict:
    """关系类型一致性(指标,**非门**):domain model 用到的关系类型是否落在 frame 声明内。

    只报告不拦截——frame 的关系类型目前尚无含义与方向约定,在有语义之前不设硬门。
    """
    target = pathlib.Path(target)
    declared = sorted(_frame_relation_types())
    dset = set(declared)
    used: dict[str, list[str]] = {}
    for a in _load(target):
        if a["key"] != "domainModel":
            continue
        for rel in a["body"].get("relationships") or []:
            if isinstance(rel, dict) and rel.get("type"):
                used.setdefault(str(rel["type"]), []).append(str(a["id"] or a["file"].name))
    return {
        "declared": declared,
        "used": used,
        "used_declared": sorted(t for t in used if t in dset),
        "undeclared": sorted(t for t in used if t not in dset),
        "unused": sorted(t for t in declared if t not in used),
    }


def refs(target, key: str) -> dict:
    target = pathlib.Path(target)
    arts = _load(target)
    by_type: dict[str, list[str]] = {}
    if key.startswith("sp:"):
        for a in arts:
            if key in _concepts_of(a["body"]):
                by_type.setdefault(a["key"], []).append(a["id"])
    else:
        for a in arts:
            if key in (a["body"].get("supersedes") or []):
                by_type.setdefault(a["key"], []).append(a["id"])
    return by_type


def why(target, req_id: str) -> dict:
    target = pathlib.Path(target)
    arts = _load(target)
    req = next((a for a in arts if a["id"] == req_id and a["key"] == "requirement"), None)
    if not req:
        return {}
    cs = _concepts_of(req["body"])
    out: dict[str, list[str]] = {}
    for a in arts:
        if a["key"] in DOWNSTREAM and set(_concepts_of(a["body"])) & set(cs):
            out.setdefault(a["key"], []).append(a["id"])
    return {"concepts": cs, "downstream": out}


def main(argv=None) -> int:  # noqa: ANN001
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print("usage: tracer.py {verify|report|refs|why} <target> [key]")
        return 2
    cmd, rest = argv[0], argv[1:]
    if not rest:
        print(f"usage: tracer.py {cmd} <target> [key]   # target is required; meta tooling embeds no default target")
        return 2
    target = pathlib.Path(rest[0])
    if not target.exists():
        print(f"[fatal] target not found: {target}")
        return 1

    if cmd == "verify":
        errs = verify_target(target)
        if errs:
            print(f"[verify] FAIL ({len(errs)} error(s)):")
            for e in errs:
                print(f"  - {e}")
            return 1
        print("[verify] PASS: link integrity OK")
        return 0
    if cmd == "report":
        r = coverage(target)
        print(f"[report] requirements: {len(r['covered'])}/{r['total']} downstream-covered")
        if r["uncovered"]:
            print(f"  uncovered: {r['uncovered']}")
        print(f"  orphan concepts (referenced by 0 artifacts): {len(r['orphans'])}")
        if r["orphans"]:
            print(f"    {r['orphans']}")
        rc = relation_conformance(target)
        print(f"  relation types: {len(rc['used_declared'])}/{len(rc['declared'])} declared types used")
        if rc["undeclared"]:
            print(f"    undeclared (used but not declared in frame): {rc['undeclared']}")
            for t in rc["undeclared"]:
                print(f"      {t} <- {', '.join(sorted(set(rc['used'][t])))}")
        if rc["unused"]:
            print(f"    declared but never used: {rc['unused']}")
        return 0
    if cmd == "refs":
        if len(rest) < 2:
            print("usage: tracer.py refs <target> <concept-or-id>")
            return 2
        by = refs(target, rest[1])
        print(f"[refs] {rest[1]}:")
        if not by:
            print("  (no references)")
        for k in sorted(by):
            print(f"  {k}: {by[k]}")
        return 0
    if cmd == "why":
        if len(rest) < 2:
            print("usage: tracer.py why <target> <REQ-id>")
            return 2
        w = why(target, rest[1])
        if not w:
            print(f"[why] requirement {rest[1]!r} not found")
            return 1
        print(f"[why] {rest[1]} concepts: {w['concepts']}")
        for k in sorted(w["downstream"]):
            print(f"  downstream {k}: {w['downstream'][k]}")
        return 0
    print(f"unknown command: {cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
