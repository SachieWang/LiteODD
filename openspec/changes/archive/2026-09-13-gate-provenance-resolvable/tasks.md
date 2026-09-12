## 1. 闸门规则与接入

- [x] 1.1 Add a registered deterministic rule `provenance_resolvable` in `/meta/engine/gate_rules.py`: a requirement's `source` must be either `file:<repo-relative path>` (path exists) or a source id present in the target's `ontology/sources.yaml`; verify the rule is registered and returns errors for an unverifiable source.
- [x] 1.2 Refactor the gate `ctx` to a dict `{target, instances, itypes}` and update existing rules to read from it without behavior change; verify the engine still runs and existing rules behave identically.
- [x] 1.3 Wire `provenance_resolvable` into the req-understand stage gate list in `/meta/engine/orchestrator.yaml`; verify the stage lists the rule.

## 2. 来源注册表与数据修正

- [x] 2.1 Create `/meta/../targets/dsh/ontology/sources.yaml` (i.e. `targets/dsh/ontology/sources.yaml`) registering ids `arch-analysis-dsh`, `vision-agent-scope`, `demo-round2-terminal-seam`, each with `kind`, `ref`, and an explanatory `note`; verify the YAML parses and the three ids are present.
- [x] 2.2 Update `source` in `/targets/dsh/artifacts/requirements/REQ-001..005.json` to the registered ids (`arch-analysis-dsh`, `arch-analysis-dsh`, `arch-analysis-dsh`, `vision-agent-scope`, `demo-round2-terminal-seam` respectively); verify no free-text source remains and each id is registered.

## 3. 技能约定更新

- [x] 3.1 Update `/meta/skills/requirement-understanding/SKILL.md` (output/quality-gate sections) to require `source` be a resolvable reference (`file:` path or registered id), and install the same update into `.agents/skills/requirement-understanding/SKILL.md`; verify both files match and state the convention.

## 4. 回归与验证

- [x] 4.1 Run `uv run --project meta/scripts python meta/evolution/bench.py targets/dsh`; verify it passes (engine gates include the new rule over the corrected seed set, plus check.py) — exit 0.
- [x] 4.2 Negatively verify the rule: temporarily point one requirement's `source` at an unregistered label and confirm the engine halts on `provenance_resolvable`; then restore. Verify the FAIL is observed.
- [x] 4.3 Run the Layer 0 checker (`check.py targets/dsh`) and verify 10 artifacts, 0 failures, and all instances resolve.

## 5. 校验与归档

- [x] 5.1 Validate the change with `openspec validate <change>` and, after sync, `openspec validate --specs`; verify both pass.
