#!/usr/bin/env python3
"""
Methodology Layer 0 — 单一合规校验脚本 (three invariants).

对任意目标项目(目标由调用方显式提供)的 artifact 集,以及该项目本体实例,
执行三段不变量(见 specs/methodology/meta-schemas):

  I1  schemaVersion 存在        —— 元层版本化
  I2  结构合法(适配对应 metaschema,含必填/枚举)—— 可把控
  I3  所有 conceptRef(+report.targetRef)能在项目 instances 中解析 —— 可追溯
  附  instance.instantiateOf 必须指向 frame 中存在的类型 —— 元层治理对象层

零数据库 / 推理引擎 / 图存储,仅依赖 PyYAML + jsonschema(uv 管理)。

用法:
  uv run --project meta/scripts check.py [target_dir]

退出码:0 全过;1 任一失败。
"""
from __future__ import annotations

import json
import pathlib
import sys

import yaml
from jsonschema import Draft7Validator

META = pathlib.Path(__file__).resolve().parent.parent
FRAME = META / "ontology" / "frame.yaml"
METASCHEMA = META / "metaschema"

# artifact 根键 -> 对应 metaschema 文件名
ARTIFACT_SCHEMA = {
    "requirement": "requirement.schema.json",
    "adr": "adr.schema.json",
    "report": "arch-report.schema.json",
    "domainModel": "domain-model.schema.json",
}


def load_yaml(path: pathlib.Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: check.py <target-project-dir>   # target is required; meta tooling embeds no default target")
        return 2
    target = pathlib.Path(sys.argv[1])
    if not target.exists():
        print(f"[fatal] target dir not found: {target}")
        return 1

    # --- 加载元层 frame 类型 ---
    frame = load_yaml(FRAME) if FRAME.exists() else {}
    frame_types = {t.get("id") for t in frame.get("conceptTypes", []) if isinstance(t, dict)}

    # --- 加载项目实例 ---
    instances = set()
    inst_file = target / "ontology" / "instances.yaml"
    if inst_file.exists():
        instdoc = load_yaml(inst_file)
        for it in instdoc.get("instances", []):
            if isinstance(it, dict) and it.get("id"):
                instances.add(it["id"])
    else:
        print(f"[warn] no instances.yaml at {inst_file}")

    # --- 逐份 artifact 校验 ---
    artifacts = sorted((target / "artifacts").rglob("*.json")) if (target / "artifacts").exists() else []
    failures = []
    for af in artifacts:
        doc = json.loads(af.read_text(encoding="utf-8"))
        key = next((k for k in ARTIFACT_SCHEMA if k in doc), None)
        if key is None:
            failures.append((af, "no recognized artifact root key"))
            continue
        body = doc[key]
        ms = METASCHEMA / ARTIFACT_SCHEMA[key]
        errs = []
        # I1: schemaVersion
        if not (body.get("meta", {}).get("schemaVersion")):
            errs.append("missing meta.schemaVersion (I1)")
        # I2: 结构合规
        schema = load_yaml(ms) if ms.suffix == ".yaml" else json.loads(ms.read_text(encoding="utf-8"))
        for e in sorted(
            Draft7Validator(schema).iter_errors(doc),
            key=lambda e: list(e.path),
        ):
            errs.append(f"schema: {e.message}")
        # I3: conceptRef 解析
        for cr in body.get("conceptRef", []):
            if cr not in instances:
                errs.append(f"conceptRef unresolvable: {cr!r} (I3)")
        if "targetRef" in body and body["targetRef"] not in instances:
            errs.append(f"targetRef unresolvable: {body['targetRef']!r} (I3)")
        if errs:
            failures.append((af, "; ".join(errs)))
        else:
            print(f"[ok] {af.relative_to(target)}")

    print(f"\nchecked {len(artifacts)} artifact(s); {len(failures)} failure(s).")
    if failures:
        for af, msg in failures:
            print(f"[fail] {af}: {msg}")
        return 1

    # --- 实例链抽查:每个实例 instantiateOf 必须指向 frame 类型 ---
    if inst_file.exists() and frame_types:
        bad = []
        for it in load_yaml(inst_file).get("instances", []):
            if isinstance(it, dict) and it.get("id"):
                tgt = it.get("instantiateOf")
                if tgt not in frame_types:
                    bad.append((it.get("id"), tgt))
        if bad:
            print("[fail] instance instantiateOf not in frame types:")
            for i, t in bad:
                print(f"       {i} -> {t}")
            return 1
        print(f"[ok] all {len(instances)} instance(s) resolve instantiateOf to a frame type.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
