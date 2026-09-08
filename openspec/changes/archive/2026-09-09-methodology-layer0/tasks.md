## 1. Meta 层 — frame.yaml 通用本体类型

- [x] 1.1 Create `/meta/ontology/frame.yaml` defining the seven concept types (Assembly, Component, Seam, ExecutionUnit, PersistentState, EventStream, ContextBoundary), the eight relation types (composes, providedBy, usedBy, triggers, writes, reads, dependsOn, constrains), and the per-type lightweight attributes; verify the file lists exactly those seven types and no project-specific names such as capability-seam/turn.
- [x] 1.2 Document the type/instance separation rule in `frame.yaml` (types live here, instances in target projects with `instantiateOf`) and verify the note states `instantiateOf` is the meta→object link.

## 2. Meta 层 — 四份元模型 schema

- [x] 2.1 Create `/meta/metaschema/requirement.schema.json` and `/meta/metaschema/adr.schema.json` per the meta-schemas spec (mandatory `conceptRef`, `meta.schemaVersion`; ADR additionally `status`/`supersedes`; requirement additionally `source`); verify each is valid JSON Schema and validates/dumps cleanly.
- [x] 2.2 Create `/meta/metaschema/arch-report.schema.json` and `/meta/metaschema/domain-model.schema.json` per the meta-schemas spec (arch-report additionally `targetRef`; domain-model additionally `boundedContexts`/`invariants`); verify each is valid JSON Schema.
- [x] 2.3 Verify all four schemas share the same `conceptRef` and `meta.schemaVersion` invariants so a single checker can apply one policy to all four.

## 3. 双层布局 + 单一校验脚本

- [x] 3.1 Create the `/meta/` and `/targets/dsh/` directory roots with READMEs stating the two-realm placement rule (meta products vs target-project products must not be mixed); verify each root has a README and the layout matches design.md.
- [x] 3.2 Create a `pyproject.toml` under `/meta/scripts/` (uv-managed) and write the single compliance checker script `check.py` implementing the three invariants (schemaVersion present, valid structure/enums, all `conceptRef` resolvable against the target's instances) for any artifact; verify it runs via `uv run check.py` on an empty/absent instance set without dependency on databases, reasoning engines, or graph stores.

## 4. 对象层 — dsh 实例与组件索引

- [x] 4.1 Create `/targets/dsh/ontology/instances.yaml` with the 13 spine instances (`sp:profile`, `sp:bundle`, `sp:plugin`, `sp:config-layer`, `sp:service-definition`, `sp:service-provider`, `sp:consumer`, `sp:capability-seam`, `sp:agent`, `sp:turn`, `sp:step`, `sp:session-log`, `sp:event`), each with an `instantiateOf` mapping to a frame type; verify every `instantiateOf` resolves to one of the seven frame types.
- [x] 4.2 Create `/targets/dsh/ontology/components.yaml` as the thin index of the package groups (e.g. core, llm, shell, fs, session, web, subagent), each mapped to a spine instance; verify each entry references a resolvable instance.

## 5. 第一条示范链 — capability-seam

- [x] 5.1 Create one ADR under `/targets/dsh/artifacts/adr/` about the capability-seam pattern (service-definition/provider/consumer), with `conceptRef` pointing to `sp:capability-seam` and a `supersedes` chain; verify it conforms to `adr.schema.json`.
- [x] 5.2 Create one architecture report under `/targets/dsh/artifacts/arch-reports/` assessing the capability-seam, with `targetRef: sp:capability-seam`; verify it conforms to `arch-report.schema.json` and its `conceptRef` resolves.

## 6. 校验与验收

- [x] 6.1 Run the checker over all created artifacts; verify every artifact passes the three invariants and the ADR/report's `conceptRef`/`targetRef` resolve to `sp:capability-seam`, whose `instantiateOf` resolves to `frame#Seam`, forming the full frame→instance→artifact chain.
- [x] 6.2 Document in `/targets/dsh/artifacts/README.md` how this chain demonstrates the four goals (reusable template, traceable conceptRef, controllable via checkpoint, self-evolving via generic type surfacing) and how to reproduce it for a new project; verify the README exists with that content.
