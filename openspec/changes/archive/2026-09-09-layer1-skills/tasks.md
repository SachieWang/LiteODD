## 1. 需求理解技能

- [x] 1.1 Create `/meta/skills/requirement-understanding/SKILL.md` with the five-part contract (trigger, input schema, steps, output schema, quality gate) and an ontology-first term-alignment step; verify the file defines all five sections and mandates aligning terms to `conceptRef` before producing.
- [x] 1.2 Verify the requirements-understanding skill's output step produces items conforming to `requirement.schema.json` (id, source, conceptRef, acceptance criteria) and its quality gate runs `check.py` plus conceptRef resolution; verify these are stated in the SKILL.md.

## 2. 架构评估技能

- [x] 2.1 Create `/meta/skills/architecture-assessment/SKILL.md` with the five-part contract and steps (quality-attribute mapping, module/runtime views against `components.yaml`, gap analysis, evolution recommendations, ADR recording); verify all five sections and the stated steps are present.
- [x] 2.2 Verify the architecture-assessment output step produces an `arch-report` (with `targetRef`) and ADRs conforming to `arch-report.schema.json` / `adr.schema.json`, with quality gate running `check.py` plus `targetRef`/`conceptRef` resolution; verify these are stated in the SKILL.md.

## 3. 领域建模技能

- [x] 3.1 Create `/meta/skills/domain-modeling/SKILL.md` with the five-part contract and steps (concept extraction in DDD terms, entity alignment to ontology, bounded contexts, finalize entities/relationships/invariants); verify all five sections and the stated steps are present.
- [x] 3.2 Verify the domain-modeling output step produces a `domain-model` (entities with conceptRef, boundedContexts, relationships, invariants) conforming to `domain-model.schema.json`, with quality gate running `check.py` plus conceptRef resolution; verify these are stated in the SKILL.md.

## 4. 技能层归位与接入

- [x] 4.1 Create `/meta/skills/README.md` stating the dual-realm placement (skill sources live in `/meta/skills/`, harness copies in `.agents/skills/`, source is authoritative) and listing the three skills with their output schemas; verify the README exists with that content.
- [x] 4.2 Install copies of the three SKILL.md files under `.agents/skills/{requirement-understanding,architecture-assessment,domain-modeling}/SKILL.md` and verify each destination exists and matches its `/meta/skills/` source.

## 5. 整体验证

- [x] 5.1 Run the meta-layer compliance checker (`uv run --project meta/scripts python meta/scripts/check.py targets/dsh`) to confirm Layer 0 artifacts still pass (exit 0) after this change; verify output reports 2 artifacts, 0 failures, and 13 instances resolve.
- [x] 5.2 Validate the change with `openspec validate <change>` and confirm the three specs validate; verify the command reports the change valid.
