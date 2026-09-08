## 1. 引擎骨架

- [x] 1.1 Create `/meta/engine/orchestrator.yaml` with the generic full-chain DAG (req-understand → arch-assess → domain-model), per-stage deps/artifacts/gate/approval, a `schemaVersion`, and forward-compat optional fields (retry/parallel/on_fail declared but unimplemented); verify the YAML parses and declares the three stages in dependency order with forward-compat fields present.
- [x] 1.2 Create `/meta/engine/engine.py` as the thin deterministic executor: reads the DAG, topologically sorts stages (Kahn), runs producers per node, applies registered gate rules, halts downstream on gate failure, handles approval (three-state, human default pause), and writes an audit `run-<ts>.jsonl`; verify `--help` and a dry/no-target run exit without dependency on OpenSpec or a harness.

## 2. 确定性闸门

- [x] 2.1 Create `/meta/engine/gate_rules.py` as the single-directional rule registry (`rule-id → deterministic function`) seeded with schema_requirement, schema_arch_report, schema_adr, schema_domain_model, concept_ref, target_ref_resolves, provenance_complete, invariant_present; verify each rule is a registered entry and runs against `/meta/metaschema` + target instances.
- [x] 2.2 Verify adding a new rule is additive: register a placeholder consistency rule (e.g. dangling_ref) as an extra entry and confirm the engine iterates it without engine-core change; verify the registry accepts the new entry and it executes.

## 3. 审批策略提供者

- [x] 3.1 Create `/meta/engine/approval_policies.py` with a swappable/versioned provider registry returning `approve / reject / hold`; register the default `human` provider (pauses for explicit confirmation) and a placeholder `policy` provider that computes approve/reject/hold from a threshold (additive, not the default); verify the default is `human` and `policy` exists without altering the human default or the three-state semantics.
- [x] 3.2 Verify approval is distinct from gates: an `--assume-approval` flag completes a declared human approval point while the default (no flag) holds at that stage; verify both behaviors are observable.

## 4. 审计输出

- [x] 4.1 Verify the engine writes an audit `run-<ts>.jsonl` recording target, per-stage gate outcomes, approval decisions, and produced artifact patterns for a completed run; verify the file exists with deterministic gate outcome fields.

## 5. 全链验证(targets/dsh)

- [x] 5.1 Run the engine on `targets/dsh` with `--assume-approval`; verify the three stages (req → arch → model) run in topological order, all gate rules pass over the existing REQ-*, ADR-001, REP-001, DM-001 artifacts, and the run completes with exit code 0.
- [x] 5.2 Run the engine on `targets/dsh` WITHOUT `--assume-approval`; verify the arch-assess human approval point holds (stage paused, artifacts not auto-released) as the default behavior.
- [x] 5.3 Run the Layer 0 checker (`uv run --project meta/scripts python meta/scripts/check.py targets/dsh`) after the change and verify it still passes (6 artifacts, 0 failures, 13 instances resolve).

## 6. 解耦与验证

- [x] 6.1 Create `/meta/engine/README.md` documenting the determinism boundary (DAG/topo/gates/approval/audit are deterministic; LLM only produces inside producers), the engine's decoupling from OpenSpec/any harness, and the add-only evolution policy; verify it exists with that content.
- [x] 6.2 Validate the change with `openspec validate <change>` and the synced main specs with `openspec validate --specs`; verify the change and all methodology specs validate.
