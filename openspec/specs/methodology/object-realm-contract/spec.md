# object-realm-contract Specification

## Purpose

Defines the object-realm contract: the files a target project's realm must provide, their minimal shapes, a deterministic structure gate over them, and the rule that meta-layer tooling must not embed a specific target — keeping the toolkit generic and every target realm isomorphic.

## Requirements

### Requirement: Required object-realm files
A target project's object realm SHALL contain `ontology/instances.yaml`, `ontology/components.yaml`, and `ontology/sources.yaml`; a realm missing any of them is non-compliant.

#### Scenario: All three files present
- **WHEN** the realm structure gate inspects a target project
- **THEN** it requires the three ontology files and reports any missing one

### Requirement: Instances file minimal shape
`instances.yaml` SHALL provide an `instances` list whose entries each carry a unique `id` and an `instantiateOf` that resolves to a type declared in the meta ontology frame.

#### Scenario: Instance resolves to a frame type
- **WHEN** an instance entry lacks an `id`, duplicates an id, or has an `instantiateOf` absent from the frame
- **THEN** the structure gate reports it as non-compliant

### Requirement: Components file minimal shape
`components.yaml` SHALL provide a `components` list whose entries each carry a `ref` that resolves to an instance in `instances.yaml`, so the component index is machine-checkable rather than free text.

#### Scenario: Component ref resolves
- **WHEN** a component entry's `ref` does not resolve to an instance
- **THEN** the structure gate reports it as non-compliant

### Requirement: Sources file minimal shape
`sources.yaml` SHALL provide a `sources` list whose entries each carry a unique `id` and a `kind`, so provenance references can be machine-verified.

#### Scenario: Source has id and kind
- **WHEN** a source entry lacks an `id` or `kind`, or duplicates an id
- **THEN** the structure gate reports it as non-compliant

### Requirement: Deterministic realm structure gate
A deterministic gate rule SHALL validate the three object-realm files, and its failure SHALL halt downstream stages; the rule SHALL be registered additively (no engine-core change).

#### Scenario: Structure failure halts the pipeline
- **WHEN** a realm's instances/components/sources structure is invalid
- **THEN** the realm-check stage fails its gate and downstream stages are halted

### Requirement: Meta tooling target neutrality
Meta-layer tooling SHALL NOT embed a specific target project's name or default path; the target SHALL be supplied at run time, so the toolkit remains generic and no target-specific content lives in the meta realm.

#### Scenario: No hardcoded target default
- **WHEN** a meta tool is invoked without an explicit target
- **THEN** it reports that a target is required rather than silently defaulting to a specific project

#### Scenario: No target-specific practice records in meta
- **WHEN** the meta realm is inspected
- **THEN** it contains no target-specific practice records (those live in the target's object realm)
