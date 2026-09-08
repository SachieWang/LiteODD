# orchestration Specification

## Purpose

Defines the deterministic governance/orchestration contract for the methodology: a DAG-driven engine with deterministic gates, an additive pluggable rule registry, swappable producers, an add-only evolution policy, and audit output — all decoupled from any specific harness or tool.

## Requirements

### Requirement: Deterministic DAG orchestration
The methodology SHALL orchestrate its production pipeline as a declared DAG of stages executed in topological order; gates SHALL be deterministic rules, and the engine SHALL NOT consult the LLM to decide flow, ordering, or whether a stage passes its gate.

#### Scenario: Topological execution
- **WHEN** the orchestrator runs a declared DAG with dependencies
- **THEN** stages execute in topological order (dependencies before dependents), independent of any LLM judgment

#### Scenario: Halt on gate failure
- **WHEN** a stage's produced artifacts fail its deterministic gate
- **THEN** downstream stages are halted and the failing stage is marked failed, blocking pollution from propagating

### Requirement: Declarative, versioned DAG contract
The DAG SHALL be expressed as a declarative, versioned config where each stage declares deps, output patterns, gate rules, and optional approval; the contract SHALL carry its own version.

#### Scenario: Config parsed and versioned
- **WHEN** an orchestrator reads a DAG config
- **THEN** it parses stage deps/output/gate/approval and the config carries a version identifier

### Requirement: Extensible approval policy
Approval decisions SHALL be produced by a swappable, versioned approval-policy provider rather than a hardcoded rule. The default provider SHALL be human-in-loop (pausing for explicit confirmation); an automatic threshold/rule-based provider SHALL be introducible later as an additive registration without changing the engine, the DAG semantics, or the default human behavior.

#### Scenario: Human-in-loop is the default
- **WHEN** a stage declares an approval point and no override is configured
- **THEN** the engine pauses and waits for explicit human confirmation, releasing no artifact automatically

#### Scenario: Auto policy is additive
- **WHEN** a threshold-based approval-policy provider is registered as a new entry
- **THEN** it becomes an additional provider option (returning approve / reject / hold) while the human default and the engine's decision semantics remain unchanged

### Requirement: Additive gate rule registry
Gate checks SHALL be registered as `rule-id → deterministic function` entries in a registry, and the engine SHALL iterate registered rules without changing its core; adding a new check SHALL require only a new registration.

#### Scenario: New gate is additive
- **WHEN** a new consistency check is added (e.g. dangling-reference or relation-type legality)
- **THEN** it is added as a new registry entry and runs within the existing engine with no engine-core change

### Requirement: Stable producer interface
A stage node SHALL be defined by a stable interface `{ input, producer, gate }`; the producer (an LLM skill or a deterministic transform) SHALL be swappable per node without changing the engine, gates, or DAG semantics.

#### Scenario: Producer swapped without rework
- **WHEN** a node's producer is replaced (e.g. a different agent/harness or a deterministic transform)
- **THEN** the engine, gate set, and DAG semantics remain unchanged

### Requirement: Add-only evolution policy
Methodology contracts (DAG, gate rules, artifact schemas) SHALL evolve by adding optional fields and new registry/type entries; existing fields SHALL NOT be removed or made required, and a semantic change SHALL be introduced as a coexisting new version rather than overwriting old behavior.

#### Scenario: New optional field is additive
- **WHEN** a contract gains a new optional field
- **THEN** files written against the older version remain valid, and the change is additive rather than breaking

#### Scenario: Deprecation is non-breaking
- **WHEN** a field or rule is deprecated
- **THEN** it is marked deprecated and kept (with a warning) instead of removed, so consumers are not broken

### Requirement: Forward-compatible DAG fields
The DAG contract schema SHALL declare future-optional fields (e.g. `retry`, `parallel`, `on_fail`) without implementing their semantics yet, so later additions do not change the schema or break existing configs.

#### Scenario: Declared but unimplemented future field
- **WHEN** a consumer reads a DAG config
- **THEN** future-optional fields are recognized and tolerated even though their semantics are not yet implemented

### Requirement: Audit / provenance output
The orchestrator SHALL emit an audit trace (`run-<ts>.jsonl`) recording who ran it, when, each stage's gate outcome, and which artifacts were produced/admitted, to feed traceability and self-evolution.

#### Scenario: Audit written with deterministic outcome
- **WHEN** the orchestrator completes (or halts on) a run
- **THEN** an audit trace is written that includes each stage's deterministic gate pass/fail outcome and the produced artifact set

### Requirement: Tool and harness decoupling
The orchestrator SHALL depend only on the meta layer (`frame`, schemas, gate library) and the target project's instance/artifact files; it SHALL NOT require the OpenSpec CLI or any specific agent harness to run.

#### Scenario: Runs without OpenSpec installed
- **WHEN** the orchestrator runs on a target project
- **THEN** it operates solely on `/meta` and `targets/<project>/{instances,artifacts}`, with no dependency on any particular CLI or harness
