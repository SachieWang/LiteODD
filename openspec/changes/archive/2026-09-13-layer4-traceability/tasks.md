## 1. 可追溯工具

- [x] 1.1 Create `/meta/trace/tracer.py` with `verify`/`report`/`refs` subcommands: `verify` runs the global link-integrity checks (refs resolvable, unique ids, ADR supersedes exist and are acyclic, superseded status consistent) and exits non-zero on error; verify it runs on `targets/dsh` and exits 0.
- [x] 1.2 Implement `report` in `tracer.py` (per-requirement downstream coverage + orphan concepts) and `refs` (concept/artifact reverse lookup, and a requirement downstream chain); verify `report` shows 5/5 requirements covered and `refs sp:capability-seam` lists referencing artifacts.

## 2. 闸门与阶段接入

- [x] 2.1 Add a registered rule `link_integrity` in `/meta/engine/gate_rules.py` that delegates to `tracer.verify_target(target)` (single source of truth); verify the rule is registered and returns errors on a broken chain.
- [x] 2.2 Add a `trace-check` stage to `/meta/engine/orchestrator.yaml` with `deps: [arch-assess, domain-model]`, `artifacts: ["artifacts/**/*.json"]`, `gate: [link_integrity]`; verify the stage exists and orders after both dependencies.

## 3. 验证

- [x] 3.1 Run `tracer.py verify targets/dsh` (exit 0), `tracer.py report targets/dsh` (coverage + orphan list), and `tracer.py refs targets/dsh sp:capability-seam` (lists referencing artifacts); verify all three outputs.
- [x] 3.2 Negatively verify integrity: temporarily add a `supersedes` entry pointing to a nonexistent ADR (or create a supersede cycle) in a copy of an ADR, confirm `verify` reports the error, then restore; verify the engine halts on `link_integrity`.
- [x] 3.3 Run `uv run --project meta/scripts python meta/evolution/bench.py targets/dsh` (now including the trace-check stage) and the checker `check.py targets/dsh`; verify both pass.

## 4. 文档与校验

- [x] 4.1 Create `/meta/trace/README.md` documenting verify/report/refs, the integrity-vs-metric split, and the no-graph-store rule; verify it exists with that content.
- [x] 4.2 Validate the change with `openspec validate <change>` and, after sync, `openspec validate --specs`; verify both pass.
