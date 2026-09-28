## MODIFIED Requirements

### Requirement: DSH Cordis plugin shell
A DSH adapter under `/meta/integrations/dsh/` SHALL provide a Cordis dynamic plugin whose Host half registers model-visible tools (`methodology_status`, `methodology_check`, `methodology_bench`, `methodology_judge`, `methodology_gate`) and package-private RPCs, and whose Client half registers an in-card panel on the keyed slot `tool.view.cordis` under key `self`; both halves SHALL be plain-JavaScript function bodies that only transport the gateway's envelope. The Host half (and the resident bundle's Host half, which is segment-for-segment identical) SHALL invoke the host's shell service exclusively through the current `ShellExecutor` contract — `resolve()` to obtain a spec, `execute()` to obtain the process handle, and the handle's foreground `result()` projection — and SHALL NOT call any legacy convenience entry (such as `run()`) that the host no longer provides.

#### Scenario: Tools register and transport
- **WHEN** the Host half is evaluated in a sandbox-equivalent realm and applied against a context whose shell service exposes only `resolve()` / `execute()`
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

### Requirement: Host-contract regression check
A verification script SHALL check the adapter halves against the real DSH host contracts using DSH's own schema validators, covering function-body evaluation in a vm realm with the real wrapper, parameter/value schema subset membership, execution against real gateway envelopes, package-private RPC, and slot registration. The script's shell test double SHALL model the current `ShellExecutor` service shape — `resolve()` returning a fully-specified spec and `execute()` returning a process handle with a foreground `result()` projection — and the double SHALL NOT provide any legacy convenience entry; consequently any adapter half that falls back to a legacy shell call fails the check.

#### Scenario: Contract check passes on the delivered halves
- **WHEN** `node meta/integrations/dsh/tests/verify-adapter.mjs` runs with a resolvable DSH install
- **THEN** every assertion passes and the script exits `0`

#### Scenario: Legacy call drift is detectable
- **WHEN** an adapter half under test is modified to call a legacy shell entry (e.g. `shell.run`) while the double provides none
- **THEN** the verification script fails on that path, so a test-double model that silently re-enables a removed host API cannot mask adapter drift
