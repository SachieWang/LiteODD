# integration-adapter Specification

## Purpose

Defines the integration adapter layer: a harness-agnostic single gateway that turns the methodology's deterministic gates into one machine-readable entry point, plus a DSH Cordis plugin shell that surfaces those gates as agent tools, in-card UI, and trigger skills — without copying any verdict semantics or modifying the core five layers.

## Requirements

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
A DSH adapter under `/meta/integrations/dsh/` SHALL provide a Cordis dynamic plugin whose Host half registers model-visible tools (`methodology_status`, `methodology_check`, `methodology_bench`, `methodology_judge`, `methodology_gate`) and package-private RPCs, and whose Client half registers an in-card panel on the keyed slot `tool.view.cordis` under key `self`; both halves SHALL be plain-JavaScript function bodies that only transport the gateway's envelope. The Host half (and the resident bundle's Host half, which is segment-for-segment identical) SHALL invoke the host's shell service exclusively through the current `ShellExecutor` contract — `resolve()` to obtain a spec, `execute()` to obtain the process handle, and the handle's foreground `result()` projection — and SHALL NOT call any legacy convenience entry (such as `run()`) that the host no longer provides.

#### Scenario: Tools register and transport
- **WHEN** the Host half is evaluated in a sandbox-equivalent realm and applied
- **THEN** exactly the five tools and the `snapshot`/`judge`/`gate` handlers are registered, each tool declares only supported schema vocabulary, and executing a tool against a real gateway envelope returns a value that validates against its declared output schema

#### Scenario: Rejection stays structured
- **WHEN** the judge rejects the candidate passed to `methodology_judge`
- **THEN** the tool call succeeds and returns `ok: false` with `judgeVerdict: 'REJECT/DEFER'` and the named failing condition, rather than throwing

#### Scenario: Client panel registers on the queried slot
- **WHEN** the Client half is evaluated with the client closure's symbol table and applied
- **THEN** it registers a component on `tool.view.cordis` with `key: 'self'`, owns its styles through the styles helper, and renders without error

#### Scenario: Legacy shell entry is absent and tools still work
- **WHEN** the adapter halves run against a shell service that implements only `resolve()` / `execute()` (no `run()` method exists)
- **THEN** every `methodology_*` tool invocation that reaches the shell completes without a TypeError, because the adapter never references the legacy entry

### Requirement: Trigger skills with harness copies
The adapter SHALL ship DSH trigger skills as source under `/meta/integrations/dsh/skills/<name>/SKILL.md` with a consuming copy under `/.agents/skills/<name>/SKILL.md`, covering gate-running and retro capture, and each SHALL state that the shell only triggers and transports while absorption remains a versioned methodology change.

#### Scenario: Skill discoverable by DSH
- **WHEN** the repository is opened as a DSH workspace
- **THEN** `methodology-gate` and `methodology-capture-retro` appear in the session skill catalog

### Requirement: Host-contract regression check
A verification script SHALL check the adapter halves against the real DSH host contracts using DSH's own schema validators, covering function-body evaluation in a vm realm with the real wrapper, parameter/value schema subset membership, execution against real gateway envelopes, package-private RPC, and slot registration. The script's shell test double SHALL model the current `ShellExecutor` service shape — `resolve()` returning a fully-specified spec and `execute()` returning a process handle with a foreground `result()` projection — and the double SHALL NOT provide any legacy convenience entry; consequently any adapter half that falls back to a legacy shell call fails the check.

#### Scenario: Contract check passes on the delivered halves
- **WHEN** `node meta/integrations/dsh/tests/verify-adapter.mjs` runs with a resolvable DSH install
- **THEN** every assertion passes and the script exits `0`

#### Scenario: Legacy call drift is detectable
- **WHEN** an adapter half under test is modified to call a legacy shell entry (e.g. `shell.run`) while the double provides none
- **THEN** the verification script fails on that path, so a test-double model that silently re-enables a removed host API cannot mask adapter drift

### Requirement: Resident bundle form of the tool surface
The adapter SHALL ship, in addition to the dynamic Cordis plugin, a resident bundle package under `/meta/integrations/dsh/bundle/` whose Host half registers the same five `methodology_*` model tools via `ctx.tools.register(defineTool(...))` with `inject: ['tools', 'shell']`, so the tools are available from process start in any profile that installs the bundle, without any `cordis_define`/`cordis_run`.

#### Scenario: Tools registered at process start
- **WHEN** a profile that installed the methodology bundle starts a process
- **THEN** the five `methodology_status|check|bench|judge|gate` tools are registered without any dynamic plugin step

#### Scenario: Tool surface identical to the dynamic shell
- **WHEN** the resident bundle's tool names, descriptions, parameter specs, output schemas, and execute behaviour are compared with the dynamic Host half
- **THEN** they are segment-for-segment identical (verified by an equivalence assertion), so the two forms cannot drift apart silently

### Requirement: Resident-bundle regression check
The verification script SHALL exercise the resident bundle with the same rigour as the dynamic halves: import the bundle module, apply it against a Cordis-like context, assert exactly the five tools register, drive `execute` against a real gateway envelope, and assert the shared source and the dynamic Host half agree segment-for-segment.

#### Scenario: Bundle branch of the contract check passes
- **WHEN** `node meta/integrations/dsh/tests/verify-adapter.mjs` runs with a resolvable DSH install
- **THEN** the bundle assertions pass alongside the dynamic-half assertions, and a deliberate divergence between the two forms makes the script fail

### Requirement: Core stays untouched and harness-agnostic
The adapter layer SHALL NOT modify the five-layer core (frame, metaschemas, Layer 1 skills, engine, evolution scripts, `check.py`) nor any target artifact, and the gateway SHALL remain usable without DSH.

#### Scenario: Core files unchanged
- **WHEN** the change is applied
- **THEN** `meta/ontology/frame.yaml`, `meta/metaschema/*.schema.json`, `meta/skills/*/SKILL.md`, `meta/engine/*`, `meta/evolution/{judge,bench}.py`, and `meta/scripts/check.py` are byte-identical to before, and `gateway.py` runs under `uv run --project meta/scripts python` with no DSH present

### Requirement: Distribution-form independence of the bundle
The resident bundle's patch rows SHALL reference the plugin by package name (`dsh-methodology-adapter`) rather than a relative source path, so the same patch layer is correct under both development (linked checkout) and distributed (git spec or npm registry) installations, and installing the bundle creates no binding to the source repository's directory location.

#### Scenario: Linked checkout resolves by package name
- **WHEN** the bundle is installed with `dsh plugin --profile <name> add ./meta/integrations/dsh/bundle`
- **THEN** the profile's node_modules links the package and the patch row resolves by package name at boot

#### Scenario: Distributed install is location-independent
- **WHEN** the bundle is installed from a git spec or npm registry into a profile
- **THEN** the plugin code is copied into the profile's package store and no reference to any source checkout path remains

### Requirement: Missing-toolbox error points to installation
When the adapter cannot resolve a methodology repository root, its error message SHALL point to the remedy (install the methodology toolbox first, then pass `repo:` referencing that installation), in both the dynamic and resident forms.

#### Scenario: Actionable failure
- **WHEN** no candidate directory contains `meta/integrations/gateway.py`
- **THEN** the error lists the candidates and tells the user to install the toolbox and pass `repo:` explicitly
