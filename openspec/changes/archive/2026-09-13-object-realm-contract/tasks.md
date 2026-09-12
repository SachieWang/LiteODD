## 1. Q1:实践记录归位与示例中性化

- [x] 1.1 Move `meta/evolution/retro/takeaway-round2.yaml` and `takeaway-round2-provenance.yaml` to `targets/dsh/evolution/retro/` (object realm); verify they no longer exist under `meta/` and now exist under `targets/dsh/evolution/retro/`.
- [x] 1.2 Neutralize `meta/evolution/retro/accept-example.yaml` so it contains no target-specific reference (e.g. remove the `targets/dsh/.audit` evidence); verify no `targets/` or `dsh` string remains in it.
- [x] 1.3 Verify the meta realm contains no target-specific practice record: grep `meta/` for `targets/`, `dsh`, `REQ-`, `sp:` and confirm remaining hits are only generic template/example/parameterized references, with no target-specific record.

## 2. Q1:meta 工具去具体目标耦合

- [x] 2.1 Remove the hardcoded `targets/dsh` default in `meta/scripts/check.py`, `meta/engine/gate_rules.py`, `meta/evolution/bench.py`, `meta/evolution/judge.py`, and remove the `target:` key from `meta/engine/orchestrator.yaml`; verify each meta tool requires an explicit target and errors clearly when none is given.
- [x] 2.2 Update the affected READMEs (`meta/engine/README.md`, `meta/evolution/README.md`, `meta/skills/README.md`, `meta/README.md`) so examples pass the target explicitly; verify no meta doc still implies a default target.

## 3. Q2:对象层契约与模板

- [x] 3.1 Create `/meta/templates/instances.template.yaml`, `/meta/templates/components.template.yaml`, and `/meta/templates/sources.template.yaml` as generic (target-free) templates showing the minimal shape; verify each parses and contains no target-specific content.
- [x] 3.2 Add a registered deterministic rule `realm_structure` in `/meta/engine/gate_rules.py` validating the three object-realm files (instances: unique `id` + resolvable `instantiateOf`; components: `ref` resolves to an instance; sources: unique `id` + `kind`); verify it returns errors when a structure is broken.
- [x] 3.3 Add a `realm-check` stage (deps: []) to `meta/engine/orchestrator.yaml` with `gate: [realm_structure]` and make `req-understand` depend on it; verify the DAG has the new stage and ordering.

## 4. 验证

- [x] 4.1 Run `uv run --project meta/scripts python meta/evolution/bench.py targets/dsh`; verify PASS (the new realm-check stage passes over dsh's realm, engine + check.py both pass).
- [x] 4.2 Negatively verify `realm_structure`: temporarily break a component `ref` (or an instance `instantiateOf`) in `targets/dsh/ontology/` and confirm the engine halts on `realm_structure`; restore and verify it passes again.
- [x] 4.3 Run the Layer 0 checker with an explicit target (`check.py targets/dsh`) and verify 11 artifacts, 0 failures, all instances resolve.

## 5. 校验与归档

- [x] 5.1 Validate the change with `openspec validate <change>` and, after sync, `openspec validate --specs`; verify both pass.
