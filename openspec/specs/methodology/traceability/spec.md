# traceability Specification

## Purpose

Defines the global traceability contract (Layer 4): deterministic cross-artifact link-integrity verification, a completeness/coverage metric, and reverse queries over provenance — all computed from files with no graph store or reasoning engine.

## Requirements

### Requirement: Global link integrity
A deterministic verifier SHALL check the whole artifact set as one provenance graph: every `conceptRef`/`targetRef` resolves to an instance; every artifact id is unique; every ADR `supersedes` entry references an existing ADR; the `supersedes` relation is acyclic; an ADR that is superseded is marked `superseded` and one marked `superseded` is in fact superseded.

#### Scenario: Dangling decision chain detected
- **WHEN** an ADR supersedes an id that does not exist, or a supersede cycle exists, or a superseded ADR is not marked `superseded`
- **THEN** the verifier reports the specific integrity error

#### Scenario: Duplicate artifact id detected
- **WHEN** two artifacts share the same id
- **THEN** the verifier reports a duplicate-id integrity error

### Requirement: Traceability gate
A registered deterministic gate rule (`link_integrity`) SHALL run the global verifier, and its failure SHALL halt the pipeline at a `trace-check` stage that depends on the architecture and domain-model stages.

#### Scenario: Integrity failure halts the pipeline
- **WHEN** the global provenance graph has a link-integrity error
- **THEN** the trace-check stage fails its gate and the run halts

### Requirement: Coverage / completeness metric
The traceability tool SHALL compute a completeness metric: whether each requirement is referenced downstream (by an architecture report/ADR/domain model sharing a concept), plus the set of concepts referenced by no artifact; this metric is reported, not used as a hard gate.

#### Scenario: Requirement chain completeness reported
- **WHEN** the report is run over a target's artifacts
- **THEN** it reports how many requirements are downstream-covered and lists any orphan concepts

### Requirement: Reverse query
The traceability tool SHALL answer reverse queries deterministically: given a concept id or an artifact id, list the artifacts that reference it; given a requirement, show its downstream chain through shared concepts.

#### Scenario: Concept reference lookup
- **WHEN** a query is made for a concept id
- **THEN** the tool lists every artifact that references that concept, grouped by artifact type

#### Scenario: Requirement downstream chain
- **WHEN** a query is made for a requirement id
- **THEN** the tool shows the requirement's concepts and the downstream artifacts that reference them

### Requirement: No graph store or reasoning engine
The traceability verifier and queries SHALL be computed in memory from the artifact and instance files, with no dependency on databases, graph stores, or reasoning engines.

#### Scenario: Runs on files alone
- **WHEN** the verifier runs on a target
- **THEN** it reads only that target's artifact/instance files and requires no external service
