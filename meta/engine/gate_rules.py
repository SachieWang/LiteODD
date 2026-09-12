# =============================================================================
# 方法论 Layer 2 —— 确定性闸门规则注册表 (单向 rule-id -> 确定性函数)
# -----------------------------------------------------------------------------
# add-only 纪律:引擎只遍历本注册表中的规则并判定;加新检查 = register 一条,
# 不改引擎核心、不改既有规则。规则全部确定性,LLM 不参与裁决。
# 复用 Layer 0 单一校验器(check.py)的 schema 与实例加载逻辑。
#
# ctx 现为字典:{ "target": Path, "instances": set, "itypes": dict }
# (为兼容,读取 helper 同时接受旧的元组形式)
# =============================================================================
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "trace"))
import check as checker  # 复用 ARTIFACT_SCHEMA / load_yaml
import tracer  # Layer 4:全局链接完整性(单一事实来源)

from jsonschema import Draft7Validator

META = pathlib.Path(__file__).resolve().parent.parent
ROOT = META.parent
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
    """返回 (instances, instance_types)。"""
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


def load_sources(target: pathlib.Path):
    """读取目标侧来源注册表 ontology/sources.yaml,返回 (ids, entries)。"""
    f = pathlib.Path(target) / "ontology" / "sources.yaml"
    ids: set[str] = set()
    entries: dict[str, dict] = {}
    if f.exists():
        d = checker.load_yaml(f)
        for s in d.get("sources", []):
            if isinstance(s, dict) and s.get("id"):
                ids.add(s["id"])
                entries[s["id"]] = s
    return ids, entries


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


def _ctx_instances(ctx):
    return ctx["instances"] if isinstance(ctx, dict) else ctx[0]


def _ctx_itypes(ctx):
    return ctx["itypes"] if isinstance(ctx, dict) else ctx[1]


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
    instances = _ctx_instances(ctx)
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
    instances = _ctx_instances(ctx)
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


@register("provenance_resolvable")
def provenance_resolvable(files, ctx):
    """source 必须可机器校验:`file:<存在的相对路径>` 或 目标侧 sources.yaml 登记的 id。

    自由文本(不可校验)一律不合规 —— 杜绝伪溯源(如编造的访谈标签)。
    """
    target = pathlib.Path(ctx["target"])  # 目标由运行时提供;meta 不内嵌默认目标
    ids, _ = load_sources(target)
    errs = []
    for f, k, doc, perr in _for_each_key(files, {"requirement"}):
        if perr:
            continue
        src = doc["requirement"].get("source")
        if not isinstance(src, str) or not src:
            errs.append(f"{f}: source missing/not a string")
            continue
        if src.startswith("file:"):
            p = (ROOT / src[len("file:"):]).resolve()
            if not p.exists():
                errs.append(f"{f}: source file not found: {src}")
        elif src not in ids:
            errs.append(
                f"{f}: source not verifiable: {src!r} "
                f"(use file:<existing path> or register an id in {target}/ontology/sources.yaml)"
            )
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
    """一致性:每个被引用的实例须存在,且其 instantiateOf 指向有效 frame 类型。"""
    instances = _ctx_instances(ctx)
    itypes = _ctx_itypes(ctx)
    ftypes = _frame_types()
    errs = []
    for f, k, doc, perr in _for_each_key(files, set(checker.ARTIFACT_SCHEMA)):
        if perr:
            continue
        body = doc.get(k, doc)
        refs = list(body.get("conceptRef") or [])
        if "targetRef" in body:
            refs.append(body["targetRef"])
        for r in refs:
            if r not in instances:
                errs.append(f"{f}: dangling ref {r!r}")
            elif itypes.get(r) not in ftypes:
                errs.append(f"{f}: ref {r!r} instantiateOf not a valid frame type")
    return errs


@register("link_integrity")
def link_integrity(files, ctx):
    """全局链接完整性(确定性,硬门):委托 tracer.verify_target,单一事实来源。"""
    return tracer.verify_target(pathlib.Path(ctx["target"]))


@register("realm_structure")
def realm_structure(files, ctx):
    """对象层契约校验:目标仓必须含 ontology/{instances,components,sources}.yaml 且结构合法。

    - instances: `instances` 非空,每项 id 唯一 + instantiateOf 指向有效 frame 类型
    - components: `components` 每项 ref 必须解析到某个实例(首次使 components.yaml 被校验)
    - sources: `sources` 每项 id 唯一 + kind 存在
    """
    target = pathlib.Path(ctx["target"])
    onto = target / "ontology"
    ftypes = _frame_types()
    errs: list[str] = []

    # --- instances.yaml ---
    inst_file = onto / "instances.yaml"
    inst_ids: set[str] = set()
    if not inst_file.exists():
        errs.append("missing ontology/instances.yaml")
    else:
        d = checker.load_yaml(inst_file) or {}
        entries = d.get("instances") or []
        if not entries:
            errs.append("instances.yaml: empty or missing `instances`")
        for i, it in enumerate(entries):
            if not isinstance(it, dict):
                errs.append(f"instances[{i}]: not a mapping")
                continue
            iid = it.get("id")
            if not iid:
                errs.append(f"instances[{i}]: missing id")
                continue
            if iid in inst_ids:
                errs.append(f"instances[{i}]: duplicate id {iid!r}")
            inst_ids.add(iid)
            if it.get("instantiateOf") not in ftypes:
                errs.append(f"instance {iid!r}: instantiateOf {it.get('instantiateOf')!r} is not a frame type")

    # --- components.yaml ---
    comp_file = onto / "components.yaml"
    if not comp_file.exists():
        errs.append("missing ontology/components.yaml")
    else:
        d = checker.load_yaml(comp_file) or {}
        entries = d.get("components") or []
        if not entries:
            errs.append("components.yaml: empty or missing `components`")
        for i, c in enumerate(entries):
            if not isinstance(c, dict):
                errs.append(f"components[{i}]: not a mapping")
                continue
            ref = c.get("ref")
            if not ref:
                errs.append(f"components[{i}]: missing ref")
            elif ref not in inst_ids:
                errs.append(f"components[{i}]: ref {ref!r} does not resolve to an instance")

    # --- sources.yaml ---
    src_file = onto / "sources.yaml"
    if not src_file.exists():
        errs.append("missing ontology/sources.yaml")
    else:
        d = checker.load_yaml(src_file) or {}
        entries = d.get("sources") or []
        if not entries:
            errs.append("sources.yaml: empty or missing `sources`")
        seen: set[str] = set()
        for i, s in enumerate(entries):
            if not isinstance(s, dict):
                errs.append(f"sources[{i}]: not a mapping")
                continue
            sid = s.get("id")
            if not sid:
                errs.append(f"sources[{i}]: missing id")
            elif sid in seen:
                errs.append(f"sources[{i}]: duplicate id {sid!r}")
            if sid:
                seen.add(sid)
            if not s.get("kind"):
                errs.append(f"sources[{i}]: missing kind")
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
