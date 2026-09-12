## Purpose

Defines the self-evolution governance contract (Layer 3): how practice feedback is captured, judged by a convergence gateway (recorded change + regression bench + add-only compatibility), absorbed into the meta realm only, and versioned/traced — while remaining reversible and non-breaking, decoupled from any harness.

## ADDED Requirements

### Requirement: Feedback capture contract
The methodology SHALL capture practice feedback into a retro/feedback record. Each candidate improvement SHALL identify a signal (what worked or failed), supporting evidence (e.g. a Layer 2 audit run reference), and an absorption target among `frame type/relation`, `metaschema field`, `skill step/heuristic`, `gate rule`, or `method anti-pattern`; the candidate SHALL be recorded as a methodology change before absorption.

#### Scenario: Retro record captures a candidate
- **WHEN** a practice run surfaces an effective or failing approach
- **THEN** a retro record is created stating the signal, evidence, and absorption target, and references a methodology change

#### Scenario: Candidate classified to a target
- **WHEN** a retro candidate is recorded
- **THEN** it is classified to exactly one allowed absorption target (frame / metaschema / skill / gate / method)

### Requirement: Convergence judge (accept only verified)
A candidate SHALL be absorbed only when a deterministic judge confirms all of: (1) it is recorded as a versioned methodology change, (2) a regression bench over the seed practice set passes, and (3) it is add-only compatible. Any candidate failing a criterion SHALL be rejected or deferred, preventing prompt drift.

#### Scenario: Verified candidate accepted
- **WHEN** a candidate is recorded as a change, the bench passes, and it is add-only compatible
- **THEN** the judge accepts it for absorption

#### Scenario: Unverifiable candidate rejected
- **WHEN** a candidate has no recorded change, or the bench fails, or it is not add-only compatible
- **THEN** the judge rejects or defers it with the failing criterion named

### Requirement: Regression / benchmark gate
The methodology SHALL maintain a deterministic seed/benchmark set (seeded from target practice, e.g. `targets/dsh`) and SHALL re-run the Layer 2 gates and the compliance checker over it after any candidate absorption; a bench failure SHALL block the absorption.

#### Scenario: Bench pass required after absorption
- **WHEN** a candidate absorption is being evaluated for absorption
- **THEN** the bench re-runs the deterministic gates on the seed set, and only a pass allows absorption

#### Scenario: Bench failure blocks absorption
- **WHEN** the bench fails on the seed set
- **THEN** the judge blocks the absorption

### Requirement: Meta-only absorption
Self-evolution SHALL absorb only into the meta realm (frame types/relations, metaschema optional fields, skill steps/heuristics, gate-registry entries, method anti-patterns); it SHALL NOT modify target-project products. Target products feed the meta realm only by surfacing a generic type, recorded as a methodology change.

#### Scenario: Absorption targets meta only
- **WHEN** an accepted candidate is absorbed
- **THEN** the change applies to a meta-realm artifact, not to any target-project product

#### Scenario: Target feeds by surfacing a generic type
- **WHEN** analyzing a target project reveals a still-generic pattern absent from the frame
- **THEN** it enters the frame as a new generic type through a methodology change, not as a target artifact

### Requirement: Versioned trail
Every absorption SHALL carry a version update for the affected contract (frame/schema/skill/gate) and leave a methodology change record, so evolution is auditable and reversible.

#### Scenario: Version bumped and recorded
- **WHEN** an absorption is applied
- **THEN** the affected contract's version is bumped and a methodology change record points to the absorption

### Requirement: Add-only compatibility in evolution
Absorption SHALL always be additive (new optional field, new registry entry, new type); SHALL NOT remove or make-required existing fields; a semantic change SHALL be introduced as a coexisting new version rather than overwriting old behavior, so absorption never triggers breaking changes.

#### Scenario: Absorption is additive
- **WHEN** an accepted candidate is applied to a contract
- **THEN** it adds an optional field, registry entry, or type without removing or tightening existing ones

#### Scenario: Semantic change coexists by version
- **WHEN** an absorption changes semantics of an existing contract
- **THEN** it is introduced as a coexisting new version, leaving the old version intact
