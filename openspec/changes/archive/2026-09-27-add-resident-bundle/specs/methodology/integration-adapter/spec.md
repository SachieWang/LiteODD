## ADDED Requirements

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
