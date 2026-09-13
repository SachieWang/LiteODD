## Purpose

Defines the integration adapter layer: a harness-agnostic single gateway that turns the methodology's deterministic gates into one machine-readable entry point, plus a DSH Cordis plugin shell that surfaces those gates as agent tools, in-card UI, and trigger skills — without copying any verdict semantics or modifying the core five layers.

## ADDED Requirements

### Requirement: Single gateway entry point
A harness-agnostic gateway SHALL expose the methodology's deterministic steps through one CLI (`snapshot`, `check`, `bench`, `judge`, `gate`) whose stdout is exactly one machine-readable JSON envelope and whose exit code is the authoritative verdict (`0` pass, `1` step failed, `2` usage/infrastructure error).

#### Scenario: Full chain in one call
- **WHEN** `gate --target <target> --candidate <candidate>` runs on a target whose regression passes
- **THEN** stdout carries one envelope whose `steps` list includes `bench.py` and `judge.py` in order, and the exit code is `0`

#### Scenario: Domain failure is not an infrastructure error
- **WHEN** the judge rejects a candidate, or a regression fails
- **THEN** the exit code is `1` and the envelope reports the failing step with `ok: false`, while exit `2` is reserved for gateway faults (`error` non-null)

### Requirement: No duplicated verdict semantics
The gateway SHALL derive its verdict only from the core scripts' exit codes and from judge's own printed condition lines; it SHALL NOT implement, re-derive, or override any of the three convergence conditions, and it SHALL NOT write to the meta contracts or to any target's artifacts.

#### Scenario: Conditions are transported, not recomputed
- **WHEN** the gateway reports `judge.conditions`
- **THEN** each entry is a direct transcription of judge's `ok[N]`/`FAIL[N]` output, and an unparseable condition degrades to `unknown` while the verdict still follows the exit code

#### Scenario: No in-place absorption
- **WHEN** any gateway subcommand completes with `ACCEPT`
- **THEN** no file under `/meta/` (except nothing) and no file under `/targets/` has been modified; absorption still requires a versioned methodology change

### Requirement: Versioned envelope contract
The envelope SHALL be specified by a versioned JSON Schema at `/meta/integrations/schemas/verdict.schema.json`, and every gateway subcommand's stdout SHALL validate against it, including the error path.

#### Scenario: Snapshot and judge envelopes validate
- **WHEN** the `snapshot`, `judge` (accept), `judge` (reject), and a missing-candidate invocation are run
- **THEN** each stdout envelope validates against the schema

### Requirement: DSH Cordis plugin shell
A DSH adapter under `/meta/integrations/dsh/` SHALL provide a Cordis dynamic plugin whose Host half registers model-visible tools (`methodology_status`, `methodology_check`, `methodology_bench`, `methodology_judge`, `methodology_gate`) and package-private RPCs, and whose Client half registers an in-card panel on the keyed slot `tool.view.cordis` under key `self`; both halves SHALL be plain-JavaScript function bodies that only transport the gateway's envelope.

#### Scenario: Tools register and transport
- **WHEN** the Host half is evaluated in a sandbox-equivalent realm and applied
- **THEN** exactly the five tools and the `snapshot`/`judge`/`gate` handlers are registered, each tool declares only supported schema vocabulary, and executing a tool against a real gateway envelope returns a value that validates against its declared output schema

#### Scenario: Rejection stays structured
- **WHEN** the judge rejects the candidate passed to `methodology_judge`
- **THEN** the tool call succeeds and returns `ok: false` with `judgeVerdict: 'REJECT/DEFER'` and the named failing condition, rather than throwing

#### Scenario: Client panel registers on the queried slot
- **WHEN** the Client half is evaluated with the client closure's symbol table and applied
- **THEN** it registers a component on `tool.view.cordis` with `key: 'self'`, owns its styles through the styles helper, and renders without error

### Requirement: Trigger skills with harness copies
The adapter SHALL ship DSH trigger skills as source under `/meta/integrations/dsh/skills/<name>/SKILL.md` with a consuming copy under `/.agents/skills/<name>/SKILL.md`, covering gate-running and retro capture, and each SHALL state that the shell only triggers and transports while absorption remains a versioned methodology change.

#### Scenario: Skill discoverable by DSH
- **WHEN** the repository is opened as a DSH workspace
- **THEN** `methodology-gate` and `methodology-capture-retro` appear in the session skill catalog

### Requirement: Host-contract regression check
A verification script SHALL check the adapter halves against the real DSH host contracts using DSH's own schema validators, covering function-body evaluation in a vm realm with the real wrapper, parameter/value schema subset membership, execution against real gateway envelopes, package-private RPC, and slot registration.

#### Scenario: Contract check passes on the delivered halves
- **WHEN** `node meta/integrations/dsh/tests/verify-adapter.mjs` runs with a resolvable DSH install
- **THEN** every assertion passes and the script exits `0`

### Requirement: Core stays untouched and harness-agnostic
The adapter layer SHALL NOT modify the five-layer core (frame, metaschemas, Layer 1 skills, engine, evolution scripts, `check.py`) nor any target artifact, and the gateway SHALL remain usable without DSH.

#### Scenario: Core files unchanged
- **WHEN** the change is applied
- **THEN** `meta/ontology/frame.yaml`, `meta/metaschema/*.schema.json`, `meta/skills/*/SKILL.md`, `meta/engine/*`, `meta/evolution/{judge,bench}.py`, and `meta/scripts/check.py` are byte-identical to before, and `gateway.py` runs under `uv run --project meta/scripts python` with no DSH present
