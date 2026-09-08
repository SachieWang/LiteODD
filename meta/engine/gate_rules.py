# =============================================================================
# 方法论 Layer 2 —— 确定性闸门规则注册表 (单向 rule-id -> 确定性函数)
# -----------------------------------------------------------------------------
# add-only 纪律:引擎只遍历本注册表中的规则并判定;加新检查 = register 一条,
# 不改引擎核心、不改既有规则。规则全部确定性,LLM 不参与裁决。
# 复用 Layer 0 单一校验器(check.py)的 schema 与实例加载逻辑。
# =============================================================================
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
import check as checker  # 复用 ARTIFACT_SCHEMA / load_yaml / 实例加载

from jsonschema import Draft7Validator

META = pathlib.Path(__file__).resolve().parent.parent
METASCHEMA = META / "metaschema"

# 单向注册表:rule-id -> fn(files, ctx) -> list[str](错误)
RULES: dict[str, object] = {}


def register(rule_id: str):
    def deco(fn):
        RULES[rule_id] = fn
        return fn
    return deco


def _root_key(doc):
    return next((k for k in checker.ARTIFACT_SCHEMA if k in doc), None)


def _load_file(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return {"__parse_error__": str(exc)}


def _frame_types():
    if not checker.FRAME.exists():
        return set()
    d = checker.load_yaml(checker.FRAME)
    return {t.get("id") for t in d.get("conceptTypes", []) if isinstance(t, dict)}


def load_target_context(target: pathlib.Path):
    """返回 (instances, instance_types) 供规则使用。"""
    inst = pathlib.Path(target) / "ontology" / "instances.yaml"
    instances: set[str] = set()
    itypes: dict[str, str] = {}
    if inst.exists():
        d = checker.load_yaml(inst)
        for it in d.get("instances", []):
            if isinstance(it, dict) and it.get("id"):
                instances.add(it["id"])
                itypes[it["id"]] = it.get("instantiateOf")
    return instances, itypes


def _schema_of(key: str):
    return json.loads((METASCHEMA / checker.ARTIFACT_SCHEMA[key]).read_text(encoding="utf-8"))


def _for_each_key(files, keys):
    for f in files:
        doc = _load_file(f)
        if "__parse_error__" in doc:
            yield f, None, None, doc
            continue
        k = _root_key(doc)
        if k in keys:
            yield f, k, doc, None


# ---------- 种子规则 ----------

@register("schema_requirement")
def schema_requirement(files, ctx):
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"requirement"}):
        if perr:
            errs.append(f"{f}: parse error {perr['__parse_error__']}")
            continue
        for e in sorted(Draft7Validator(_schema_of("requirement")).iter_errors(doc), key=lambda e: list(e.path)):
            errs.append(f"{f}: schema_requirement -> {e.message}")
    return errs


@register("schema_arch_report")
def schema_arch_report(files, ctx):
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"report"}):
        if perr:
            errs.append(f"{f}: parse error {perr['__parse_error__']}")
            continue
        for e in sorted(Draft7Validator(_schema_of("report")).iter_errors(doc), key=lambda e: list(e.path)):
            errs.append(f"{f}: schema_arch_report -> {e.message}")
    return errs


@register("schema_adr")
def schema_adr(files, ctx):
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"adr"}):
        if perr:
            errs.append(f"{f}: parse error {perr['__parse_error__']}")
            continue
        for e in sorted(Draft7Validator(_schema_of("adr")).iter_errors(doc), key=lambda e: list(e.path)):
            errs.append(f"{f}: schema_adr -> {e.message}")
    return errs


@register("schema_domain_model")
def schema_domain_model(files, ctx):
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"domainModel"}):
        if perr:
            errs.append(f"{f}: parse error {perr['__parse_error__']}")
            continue
        for e in sorted(Draft7Validator(_schema_of("domainModel")).iter_errors(doc), key=lambda e: list(e.path)):
            errs.append(f"{f}: schema_domain_model -> {e.message}")
    return errs


@register("concept_ref")
def concept_ref(files, ctx):
    """所有 conceptRef / targetRef 必须在项目 instances 内解析。"""
    instances, _ = ctx
    errs = []
    for f, k, doc, perr in _for_each_key(files, set(checker.ARTIFACT_SCHEMA)):
        if perr:
            continue
        body = doc.get(k, doc)
        for cr in body.get("conceptRef", []) or []:
            if cr not in instances:
                errs.append(f"{f}: conceptRef unresolvable {cr!r}")
        if "targetRef" in body and body["targetRef"] not in instances:
            errs.append(f"{f}: targetRef unresolvable {body['targetRef']!r}")
    return errs


@register("target_ref_resolves")
def target_ref_resolves(files, ctx):
    instances, _ = ctx
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"report"}):
        if not doc:
            continue
        body = doc["report"]
        if body.get("targetRef") not in instances:
            errs.append(f"{f}: report.targetRef not resolvable {body.get('targetRef')!r}")
    return errs


@register("provenance_complete")
def provenance_complete(files, ctx):
    """需求条目必须带 source 与非空 acceptanceCriteria(溯源/可验证)。"""
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"requirement"}):
        if perr:
            continue
        body = doc["requirement"]
        if not body.get("source"):
            errs.append(f"{f}: requirement missing source (provenance)")
        if not (body.get("acceptanceCriteria") or []):
            errs.append(f"{f}: requirement missing acceptanceCriteria (verifiability)")
    return errs


@register("invariant_present")
def invariant_present(files, ctx):
    """领域模型必须含 boundedContexts 与 invariants。"""
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"domainModel"}):
        if perr:
            continue
        body = doc["domainModel"]
        if not (body.get("boundedContexts") or []):
            errs.append(f"{f}: domainModel missing boundedContexts")
        if not (body.get("invariants") or []):
            errs.append(f"{f}: domainModel missing invariants")
    return errs


@register("dangling_ref")
def dangling_ref(files, ctx):
    """一致性(增量示例):每个被引用的实例须存在,且其 instantiateOf 指向有效 frame 类型。"""
    instances, itypes = ctx
    ftypes = _frame_types()
    errs = []
    for f, k, doc, perr in _for_each_key(files, set(checker.ARTIFACT_SCHEMA)):
        if perr:
            continue
        body = doc.get(k, doc)
        refs = [x for x in (body.get("conceptRef") or [])]
        if "targetRef" in body:
            refs.append(body["targetRef"])
        for r in refs:
            if r not in instances:
                errs.append(f"{f}: dangling ref {r!r}")
            elif itypes.get(r) not in ftypes:
                errs.append(f"{f}: ref {r!r} instantiateOf not a valid frame type")
    return errs


def run_rules(rule_ids, files, ctx, log=print):
    """遍历阶段声明的规则;返回 (errors, failed_rule_ids)。"""
    errors = []
    failed = []
    for rid in rule_ids:
        fn = RULES.get(rid)
        if fn is None:
            log(f"  [gate] unknown rule {rid!r} (skip)")
            continue
        e = fn(files, ctx)
        if e:
            failed.append(rid)
            errors.extend(e)
        log(f"  [gate] {rid}: {'FAIL' if e else 'pass'}")
    return errors, failed
